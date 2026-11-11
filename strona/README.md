# meshcoresouth.pl — wersja PHP

Zwykły PHP z `include` — działa na dowolnym hostingu, który obsługuje PHP
(prawie każdy). Zero build-tooli, zero Node.js. Wgrywasz pliki i działa.

## Struktura

```
index.php              ← strona główna (cała treść)
includes/
  config.php            ← WSZYSTKIE linki i stałe w jednym miejscu (edytuj tu)
  header.php            ← wspólny <head> + nawigacja, dołączany na każdej stronie
  footer.php             ← wspólna stopka, dołączany na każdej stronie
  map-svg.php            ← generuje mapę województw z danych geograficznych
  voivodeships.json      ← surowe dane granic 16 województw (nie ruszaj)
api/
  rpt.php                ← serwerowy endpoint: pobiera nodes.json, filtruje
                            repeatery, przelicza współrzędne na piksele
assets/
  style.css              ← wszystkie style, współdzielone przez każdą stronę
  rpt-map.js              ← JS rysujący mapę i węzły w przeglądarce
```

## Jak to działa (mapa + węzły RPT)

1. Przeglądarka odwiedzającego woła `/api/rpt.php` (Wasz własny serwer) — NIE
   `stats.meshcoresouth.pl` bezpośrednio. Dzięki temu nie ma ryzyka blokady
   CORS, bo to żądanie w obrębie tej samej domeny.
2. `api/rpt.php` po stronie serwera pobiera `nodes.json`, filtruje węzły
   z rolą zawierającą "repeat" i przelicza ich lat/lon na piksele mapy.
3. Wynik jest cache'owany na 20 sekund (plik w `sys_get_temp_dir()`), żeby
   nie odpytywać źródła przy każdym pojedynczym odświeżeniu strony przez
   każdego odwiedzającego.
4. `assets/rpt-map.js` w przeglądarce odpytuje `/api/rpt.php` co 30 sekund,
   rysuje kropki i automatycznie podświetla tylko te województwa, w których
   faktycznie jest przynajmniej jeden repeater (test geometryczny
   `isPointInFill`, nie żadna sztywna lista).

## Dodawanie nowej podstrony

Każda nowa strona (np. `sf6.php`) wygląda tak:

```php
<?php
$page_title = 'Preset SF6';
$page_description = 'Opis dla meta tagów...';
require __DIR__ . '/includes/header.php';
?>

<section>
  <div class="wrap">
    ...treść...
  </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
```

Nagłówek i stopka (w tym nawigacja) są wspólne — zmieniasz je raz
w `includes/header.php` / `includes/footer.php`, a nie na każdej stronie osobno.

## Do zrobienia przed publikacją

- [ ] Sprawdzić, czy hosting ma włączone `allow_url_fopen` w PHP (potrzebne
      w `api/rpt.php` do `file_get_contents` na zewnętrzny URL). Jeśli nie —
      zamienić na `curl_init()` w tym samym pliku (typowa alternatywa).
- [ ] Wgrać `voivodeships.json` razem z resztą `includes/` — jest wymagany
      do narysowania mapy.
- [ ] Sprawdzić uprawnienia zapisu do `sys_get_temp_dir()` na hostingu
      (potrzebne pod cache w `api/rpt.php`) — jeśli hosting tego nie
      pozwala, można cache wyłączyć (usunąć logikę `$cache_file`).
- [ ] Podmienić "Analiza & Symulator" — obecnie link donikąd; oryginalny
      kod źródłowy (React) miał tu modal z kalkulatorem SF6 vs SF8.
