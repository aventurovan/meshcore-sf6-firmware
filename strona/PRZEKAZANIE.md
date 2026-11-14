# PRZEKAZANIE — strona meshcoresouth.pl (MeshCore Południe, wersja PHP)

Dokument do wklejenia na start nowego czatu razem z paczką plików (`meshcoresouth-przekazanie.zip`).
Stan: koniec dotychczasowych prac nad stroną główną + sekcją Mapper.

## 1. Czym jest projekt

Strona społeczności **MeshCore Południe** (sieć LoRa mesh off-grid, preset **SF6**, południe Polski).
Jedna długa strona z sekcjami-kotwicami + podstrona `statystyki.php` (w budowie).
Styl odtworzony z działającej wcześniej wersji strony (React): granat `#0A0E17` + szmaragdowa zieleń `#10B981`,
fonty Manrope / Inter / JetBrains Mono, karty w stylu dashboardu. Niebieski (`#6C7BFF`) tylko na przycisku „Dołącz do Społeczności".

## 2. Środowisko i sposób pracy

- Hosting: **zwykły hosting PHP (bez VPS)**, pliki wgrywane ręcznie (FTP/panel). Bez Node, bez builda.
- Po każdej zmianie: oddaj **zip z całym projektem** i wypisz **dokładnie, które pliki wgrać**.
  Częściowe wgranie to realne ryzyko: raz wgrano `index.php` bez `assets/style.css` i sekcja Mapper wyglądała na zepsutą.
- Cache: `header.php` i `footer.php` doklejają `?v=filemtime(...)` do `style.css` i `rpt-map.js`, więc po wgraniu wystarczy zwykłe odświeżenie.
- Kontener roboczy Claude’a się resetuje: trzeba rozpakować zip, a do lintu `apt-get update && apt-get install -y php-cli`.
  Do zrzutów ekranu działa Playwright (Chromium) + `php -S 127.0.0.1:PORT`.

## 3. Struktura plików

```
index.php                strona główna (całość treści)
statystyki.php           placeholder „w budowie"
favicon.svg              (w głównym katalogu na serwerze; NIE ma go w paczce — użytkownik ma własny)
includes/
  config.php             WSZYSTKIE linki i stałe presetu — edytuj tylko tu
  header.php             <head>, favicon, nawigacja (wersjonowany style.css)
  footer.php             stopka + <script rpt-map.js> (wersjonowany)
  map-svg.php            render_coverage_map(): 16 województw jako osobne <path class="voi">
  voivodeships.json      granice województw (dane simplemaps.com / Map-of-Poland, MIT)
api/rpt.php              serwerowy proxy do nodes.json + migawka awaryjna
assets/
  style.css              wszystkie style
  rpt-map.js             pobieranie węzłów, rysowanie mapy, podświetlanie województw
README.md                krótka instrukcja uruchomienia/dodawania stron
```

Nowa podstrona = plik `.php`: ustaw `$page_title`/`$page_description`, `require includes/header.php`, treść, `require includes/footer.php`.

## 4. Menu i sekcje strony głównej

Menu: Co to jest? · Jak zacząć? · Pobierz · Sprzęt · Konfiguracja · **Zasięg** · **Mapper** (kotwica `/#mapper`) · Statystyki (`/statystyki.php`) · przycisk „Mapa ↗".

Kolejność sekcji w `index.php`: hero („Sieć, której nikt nie wyłączy." + przyciski + karta **Parametry sieci**) → Co to jest MeshCore (6 kart) → Jak zacząć (3 kroki) → Pobierz aplikację (6 kart) → Rekomendowany sprzęt (companiony i repeatery) → Centrum konfiguracji (3 narzędzia + panel „Ustawienia radia SF6") → Dlaczego SF6, a nie SF8? → **Zasięg** (`#zasieg`: mapa Polski) → **Mapper** (`#mapper`: karty Android/iOS + przycisk mapy Mappera).

## 5. Ustalone treści i decyzje

- Preset (z `config.php`): **869.618 MHz · SF6 · BW 62.5 kHz · CR8 · ID 2 bytes**; plakietka „PRESET: POŁUDNIE SF6".
- Stopka: „MeshCore Południe SF6 — niezależna komunikacja off-grid." + GitHub / Dokumentacja / Kontakt (mailto).
- „Dołącz do Społeczności" → grupa na Facebooku (`URL_COMMUNITY`). Discord (`URL_DISCORD`) zostaje w configu, ale nieużywany.
- Usunięte na prośbę użytkownika: karty „Status sieci", „Pogoda", „Infrastruktura regionu", formularz kontaktowy, przycisk „Analiza & Symulator" (nie istnieje), opis z listą regionów.
- Tekst „Dlaczego SF6" jest wpisany dokładnie według użytkownika (zawiera tezę o „nawet 500 nodach" — jego sformułowanie, nie weryfikowane przeze mnie).
- Mapa w menu i „Otwórz Mapę ↗" → `URL_LIVE_MAP` = **https://meshcorekk.xyz/** (zmienione ostatnio).
- Sekcja Mapper: APK → `https://meshcoresouth.pl/mapper/apk/`, iOS → TestFlight `https://testflight.apple.com/join/er4ZSaRm`,
  przycisk „Otwórz mapę Mappera ↗" → `https://meshcoresouth.pl/mapper` (osobna aplikacja; tego kodu w tym projekcie nie ma). Ikony Android/iOS to inline SVG.
- Przycisk „Mapper ↓" w sekcji Zasięg przewija do `#mapper`.

## 6. Mapa zasięgu i dane węzłów (najważniejsza i najwrażliwsza część)

- Źródło: `https://stats.meshcoresouth.pl/nodes.json` (to **własna** strona użytkownika, nie ma tam teraz dostępu do zmian). Rekord:
  `city, id_byte, id_full, last_advert, lat, lon, name, role` (`role`: `REPEATER` / `ROOMSERVER`).
- Filtr: tylko role pasujące do `/repeat/i`. Napis pod mapą: „N węzłów RPT · dane z 24h · na żywo" (przy migawce: „migawka · źródło chwilowo niedostępne").
- **Ścieżka A (działa):** `rpt-map.js` robi `fetch` prosto z przeglądarki do `nodes.json?t=<timestamp>` co 30 s. CORS na `stats.meshcoresouth.pl` jest poprawny (potwierdzone w produkcji).
- **Ścieżka B (nie działa na tym hostingu):** `api/rpt.php` próbuje pobrać plik serwer→serwer. Diagnostyka z produkcji:
  `curl_errno 7 "Couldn't connect to server"` po ~200 ms, `fopen: Network is unreachable`, `curl_available:true`, `allow_url_fopen:true`;
  wymuszenie IPv4 nie pomogło → blokada ruchu wychodzącego po stronie hostingu. Nie da się tego obejść kodem PHP.
  Endpoint zwraca wtedy **wbudowaną migawkę** (225 rekordów z 2026-09-16) i `fallback:true`, plus pole `debug` z przyczyną.
- **Uwaga:** migawka jest już nieaktualna (na żywo było 281 węzłów w październiku). Warto ją odświeżyć albo usunąć, jeśli ścieżka A wystarcza.
- Rzutowanie lat/lon → piksele SVG (viewBox 1000×950): `x=|lon−14.07|·(1000/10.20)`, `y=|lat−54.90|·(950/5.90)` — ten sam wzór w `config.php` (`project_lat_lon`) i w `rpt-map.js`.
- Podświetlanie województw jest automatyczne: `isPointInFill` sprawdza, w którym polygonie leży repeater; aktywne województwo dostaje klasę `voi-active` i jest przenoszone na wierzch DOM (inaczej sąsiad zasłania kontur).
  Nieaktywne mają szary kontur, aktywne zielony kontur + półprzezroczyste wypełnienie.

## 7. Stan na koniec i otwarte sprawy

1. **Informacja o aplikacjach (Android APK / iOS TestFlight) w instrukcji Mappera oraz na stronie Mappera w wersji desktop** — prośba użytkownika;
   wymaga plików aplikacji Mapper (osobny projekt, `meshcoresouth.pl/mapper`). Do zrobienia po wgraniu jego kodu/instrukcji HTML.
2. **Strona Statystyki** — na razie placeholder; docelowo dane z bota (użytkownik zapowiedział „później").
3. Migawka w `api/rpt.php` do odświeżenia lub usunięcia; ewentualnie zapytać hosting o odblokowanie ruchu wychodzącego do `stats.meshcoresouth.pl`.
4. Sekcje „Pobierz" i „Konfiguracja" prowadzą na zewnętrzne adresy (liamcottle, flasher.meshcore.io, meshcoresouth.pl/rpt/) — warto okresowo sprawdzić, czy wersje plików (np. v1.42.0) nie są nieaktualne.
5. Nie testowano ostatnich zmian na żywym serwerze użytkownika (tylko lokalnie: lint PHP + zrzut ekranu sekcji Mapper).

## 8. Ścieżka bezpieczeństwa przy zmianach

- Zmiany tekstów/linków: tylko `index.php` i `includes/config.php`.
- Zmiany wyglądu: `assets/style.css` (po zmianie wgraj też `includes/header.php`, jeśli ruszano link do arkusza).
- Przed oddaniem: `php -l` na zmienionych plikach, `node --check assets/rpt-map.js`, w razie zmian wizualnych zrzut przez Playwright.

## 9. Flasher SF6 (dodany 2026-11-11)

- Strona `flasher.php` + `assets/flasher.js` (+ style `.fl-*` na końcu `assets/style.css`), link „Flasher” w menu, karta „Web Flasher” w Konfiguracji prowadzi teraz na `/flasher.php` (`URL_FLASHER`; oficjalny flasher został w `URL_FLASHER_OFFICIAL`).
- Dane: `/flasher/manifest.json` + `/flasher/firmware/<rola>/<wersja>/…` — NIE są w tej paczce. Wgrywa je automatycznie repo
  `aventurovan/meshcore-sf6-firmware` (GitHub Actions, co 3 h sprawdza oficjalne wydania MeshCore, buduje wszystkie płytki z `sf6.conf`, wgrywa przez FTP).
- ESP32: wgrywanie przez esptool-js (Web Serial), aktualizacja 0x10000 / czysta instalacja merged 0x0.
- Rola „Companion + Mapper SF6” (Wio Tracker L1, T-Echo z ekranem): nasz firmware z repo meshcore-sf6-mapper-firmware (wydanie latest-build), synchronizowany raz dziennie workflow „Firmware Companion + Mapper SF6” (index/companion-mapper.json, pliki w /flasher/firmware/companion-mapper/).
- Opcja „Najpierw wyczyść całą pamięć urządzenia”: ESP32 – erase all + obraz merged od 0x0; nRF52 – najpierw DFU programu `assets/nrf52-erase-s140v6/v7.bin` (źródło w repo `tools/nrf52-erase`), który kasuje aplikację i dane i wraca do DFU, potem automatycznie DFU MeshCore.
- nRF52: wgrywanie z przeglądarki przez bootloader (serial DFU jak adafruit-nrfutil, paczka .zip) – `assets/nrf-dfu.js`; najpierw 1200 bps touch, potem wybór nowego portu DFU. Zapasowo: tryb DFU + przeciągnięcie .uf2. RP2040: tryb DFU + .uf2.
- Room Server usunięty z flashera i z automatycznych buildów (decyzja 2026-11-12).
- Karta „Baza Prefiksów” usunięta (prefix.meshcoresouth.pl nie istnieje); zamiast niej karta „Prefiks 2 bajty (ID)” i blok #rpt-config w sekcji Konfiguracja: `set path.hash.mode 1` dla RPT + ścieżka w aplikacji dla companionów.
- Podstrona instrukcja.php: zakładki Companion / Repeater (#companion, #repeater), komendy RPT z presetu w config.php (set radio, tx 22 = max, path.hash.mode 1, advert 60 min, flood 12 h), miejsce na przyszłe „regiony”. Link w menu „Instrukcja”, w kroku 3 „Jak zacząć” i w bloku #rpt-config. Menu chowa się poniżej 1000 px (brak menu mobilnego).
- Menu: 3 rozwijane grupy (Sieć / Start / Aplikacje) + Flasher, definiowane w tablicy `$menu` w includes/header.php; poniżej 1000 px przycisk ☰ z pełnym menu mobilnym.
- Podstrona meshspeed.php: strona produktowa aplikacji MeshSpeed w kolorach aplikacji (style `.ms-*`, fonty IBM Plex z /meshspeed/fonts). Wersję APK odczytuje sama z /meshspeed/apk/. Link TestFlight: stała URL_MESHSPEED_IOS w config.php (dopóki brak – karta „Wkrótce”).
- Instrukcja repeatera: najpierw konfiguracja w aplikacji na telefonie (tabela ustawień), potem CLI.
- Podstrona mapper-sf6.php: strona produktowa Mappera SF6 w kolorach aplikacji Mapper (style `.mp-*`, granat + błękit). Wersję APK odczytuje sama z /mapper/apk/. Menu Aplikacje → Mapper SF6 i sekcja #mapper na głównej („Więcej o Mapperze ›”) prowadzą tutaj.
- 2026-11-12: strona główna w nowym, jasnym stylu edukacyjnym (index.php ustawia `$body_class = 'theme-light'`; header.php dokłada wtedy fonty Nunito i klasę na <body>; style `.theme-light` i `.hl-*` na końcu style.css). Pozostałe podstrony nadal w ciemnym stylu. Licznik repeaterów: element #rpt-count uzupełniany przez rpt-map.js. Kotwice (#co-to-jest, #jak-zaczac, #pobierz, #sprzet, #konfiguracja, #rpt-config, #zasieg, #mapper) zachowane. Poprzednia wersja index.php jest w historii repo.
- Region w tekstach strony: zawsze „Południe Polski” (nie wymieniać Śląska, Podbeskidzia i Małopolski).
- 2026-11-12: wszystkie podstrony w jasnym stylu edukacyjnym – header.php domyślnie ustawia `$body_class = 'theme-light'`. Style podstron (.fl-*, .in-*, .ms-*, .mp-*) dostają jasne kolory przez nadpisanie zmiennych w sekcji „PODSTRONY w jasnym stylu” na końcu style.css. MeshSpeed i Mapper zachowują swój akcent (pomarańczowy / błękitny), a makiety telefonów zostają w ciemnych kolorach aplikacji.
- 2026-11-14: Konfigurator RPT przebudowany: `rpt/index.php` (header/footer strony, jasny styl, klasy `.rp-*` w style.css) + `assets/rpt.js`. Stary `rpt/index.html` zastąpiony przekierowaniem na `/rpt/index.php`, `rpt/.htaccess` = `DirectoryIndex index.php index.html`. Bez Tailwind/lucide; zostają tweetnacl 1.0.3 (generator klucza) i Leaflet 1.9.4 (mapa). CLI repeatera nie ma promptu: każda komenda czeka na linię „  -> ” (timeout 1,5 s). Poprawki względem starej wersji: zamykanie mapy, odczyt BW/SF/duty cycle, maskowanie hasła i klucza prywatnego w terminalu, etykiety ACL (0=usuń/gość, 1=odczyt, 2=odczyt+zapis, 3=admin; pełny klucz 64 hex), wykrywanie płytki po USB VID, zegar spieszący się → clkreboot, przycisk „Szybka konfiguracja Południe SF6” (radio, tx 22, hash 1, advert 60 min/12 h, flood.max 32 + weryfikacja odczytem), walidacja nazwy/haseł/advertów/tx, potwierdzenie OTA i zmiany klucza, generator nie tworzy ID 00/FF, eksport pyta o klucz prywatny. Na serwerze zostały stare `rpt/index3.html`, `rpt/index4.html`, pusty `rpt/rpt.zip`.
