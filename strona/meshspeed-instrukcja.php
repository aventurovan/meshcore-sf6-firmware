<?php
$page_title = 'Instrukcja MeshSpeed';
$page_description = 'Instrukcja aplikacji MeshSpeed dla MeshCore: połączenie z radiem, czaty, węzły, narzędzia radiowe, repeatery, zasięg i teren, Mapper SF6 – z ekranami aplikacji.';
require __DIR__ . '/includes/header.php';

// najnowsza wersja APK (jak na meshspeed.php)
$ms_ver = null;
foreach (glob(__DIR__ . '/meshspeed/apk/meshspeed-*.apk') ?: [] as $f) {
  if (preg_match('/meshspeed-(\d+\.\d+\.\d+)\.apk$/', $f, $m) && (!$ms_ver || version_compare($m[1], $ms_ver, '>'))) $ms_ver = $m[1];
}
// zrzuty ekranów i lista zmian robi workflow „MeshSpeed – zrzuty do instrukcji” (scripts/meshspeed_zrzuty.py)
$MSI = __DIR__ . '/assets/msi';
$info = @json_decode(@file_get_contents("$MSI/zrzuty.json"), true) ?: [];
$zmiany = @json_decode(@file_get_contents("$MSI/zmiany.json"), true) ?: [];

/** telefon ze zrzutem ekranu; $p = podpis pod telefonem */
function msi_shot($name, $p = '') {
  $f = __DIR__ . "/assets/msi/$name.webp";
  if (!is_file($f)) return '';
  $src = "/assets/msi/$name.webp?v=" . filemtime($f);
  $alt = htmlspecialchars($p ?: $name);
  return '<figure class="msi-shot"><a href="' . $src . '" class="msi-zoom" aria-label="Powiększ: ' . $alt . '"><img src="' . $src
    . '" alt="Ekran MeshSpeed: ' . $alt . '" width="390" height="844" loading="lazy" decoding="async"></a>'
    . ($p ? '<figcaption>' . htmlspecialchars($p) . '</figcaption>' : '') . '</figure>';
}
function msi_shots(array $l) {
  $h = '';
  foreach ($l as $n => $p) $h .= msi_shot($n, $p);
  return $h ? '<div class="msi-shots">' . $h . '</div>' : '';
}
$SPIS = [
  'start' => 'Pierwsze kroki', 'pulpit' => 'Pulpit', 'czaty' => 'Czaty', 'wezly' => 'Węzły', 'narzedzia' => 'Sieć na żywo',
  'repeatery' => 'Moje repeatery', 'urzadzenia' => 'Konsola i kopia', 'teren' => 'Zasięg i teren', 'mapper' => 'Mapper SF6',
  'radio' => 'Radio i ustawienia', 'telefon' => 'Widżety i powiadomienia', 'prywatnosc' => 'Prywatność', 'zmiany' => 'Co nowego',
];
?>

<div class="ms msi">
  <section class="ms-hero msi-hero">
    <div class="wrap">
      <div class="ms-logo">Mesh<span>Speed</span></div>
      <h1>Instrukcja aplikacji</h1>
      <p class="ms-lead">Wszystko, co potrafi MeshSpeed – krok po kroku, z ekranami aplikacji. Kliknij ekran, żeby go powiększyć.</p>
      <p class="ms-meta">
        <?php if ($ms_ver): ?><span class="ms-chip">Wersja <?= htmlspecialchars($ms_ver) ?></span><?php endif; ?>
        <?php if (!empty($info['wersja'])): ?><span class="ms-chip">Ekrany z wersji <?= htmlspecialchars($info['wersja']) ?></span><?php endif; ?>
        <a class="ms-chip msi-chip-link" href="/meshspeed.php">← O aplikacji i pobieranie</a>
      </p>
      <nav class="msi-toc" aria-label="Spis treści">
        <?php $i = 0; foreach ($SPIS as $id => $t): $i++; ?><a href="#<?= $id ?>"><b><?= $i ?></b><?= htmlspecialchars($t) ?></a><?php endforeach; ?>
      </nav>
    </div>
  </section>

  <!-- 1 -->
  <section class="ms-sec msi-sec" id="start">
    <div class="wrap msi-grid">
      <div class="msi-text">
        <span class="ms-kicker">1 · Pierwsze kroki</span>
        <h2>Pobierz i połącz radio</h2>
        <p>MeshSpeed to aplikacja do radia MeshCore z firmware <b>companion (Bluetooth)</b> – np. Heltec V3/V4, RAK4631, T-Echo, ThinkNode, XIAO. Działa w każdej sieci MeshCore; mapper włącza się tylko przy presecie SF6.</p>
        <ul class="msi-list">
          <li><b>Android</b> – plik APK ze strony <a href="/meshspeed/apk/">meshcoresouth.pl/meshspeed/apk</a>. Aplikacja sama powie, gdy pojawi się nowa wersja.</li>
          <li><b>iPhone</b> – TestFlight, w przygotowaniu.</li>
          <li><b>Przeglądarka</b> – <a href="/meshspeed/">meshcoresouth.pl/meshspeed</a> w Chrome lub Edge (komputer, Android), przez Web Bluetooth.</li>
        </ul>
        <ol class="msi-steps">
          <li>Włącz radio i <b>odłącz je od innych aplikacji</b> (np. oficjalnej MeshCore) – radio rozmawia naraz tylko z jedną.</li>
          <li>Otwórz MeshSpeed i wybierz radio z listy „Znalezione przez Bluetooth”.</li>
          <li>Przy pierwszym połączeniu telefon może poprosić o PIN radia (domyślnie <span class="mono">123456</span>).</li>
          <li>Radio z WiFi (firmware 1.18+) możesz też połączyć przez WiFi – Ustawienia → WiFi radia.</li>
        </ol>
        <p class="msi-tip">Nowa sieć SF6? W <b>Czaty → Kanały w radiu → Konfiguracja MeshCore Południe</b> jednym dotknięciem ustawisz preset SF6 i kanały sieci (Public, #test, #bot, #sf6). Działa też kod QR od znajomego.</p>
      </div>
      <?= msi_shots(['polacz' => 'Ekran połączenia']) ?>
    </div>
  </section>

  <!-- 2 -->
  <section class="ms-sec msi-sec" id="pulpit">
    <div class="wrap">
      <div class="msi-text msi-wide">
        <span class="ms-kicker">2 · Pulpit</span>
        <h2>Wszystko o radiu na jednym ekranie</h2>
        <p>Pierwszy ekran po połączeniu. Na górze nazwa radia i jego parametry, niżej pierścienie: bateria, kontakty w radiu i węzły w zasięgu. Pod nimi skróty, ostatnie rozmowy i ostatnio usłyszany advert.</p>
        <ul class="msi-list">
          <li><b>Dostosuj</b> (ikona ołówka) – zmieniasz kolejność widżetów, dodajesz nowe (np. status Twoich repeaterów) i usuwasz zbędne. „Przywróć pulpit startowy” cofa zmiany.</li>
          <li><b>Dotknięcie pierścieni</b> otwiera stronę <b>„O radiu”</b>: bateria, szum tła, pakiety na minutę, zajętość eteru, czas pracy, odebrane i wysłane pakiety, szybkie akcje (Advert, Restart, Wyłącz) oraz zegar radia porównany z telefonem.</li>
          <li><b>Dotknięcie nazwy radia</b> otwiera ustawienia nazwy i radia.</li>
        </ul>
      </div>
      <?= msi_shots(['pulpit' => 'Pulpit', 'pulpit-dostosuj' => 'Dostosuj pulpit', 'o-radiu' => 'O radiu']) ?>
    </div>
  </section>

  <!-- 3 -->
  <section class="ms-sec msi-sec" id="czaty">
    <div class="wrap">
      <div class="msi-text msi-wide">
        <span class="ms-kicker">3 · Czaty</span>
        <h2>Kanały, wiadomości prywatne i roomy</h2>
        <p>Historia rozmów jest zapisana <b>tylko na telefonie</b>. Filtry u góry: wszystkie, nieprzeczytane, ulubione, kanały. Po dłuższej przerwie rozmowa otwiera się na najstarszej nieprzeczytanej wiadomości.</p>
        <div class="msi-cols">
          <ul class="msi-list">
            <li><b>Pod wiadomością</b> (do włączenia w Ustawienia → Czaty): liczba hopów, trasa (kody repeaterów), ile razy odebrano i SNR. Trasę można pokazać na mapie.</li>
            <li><b>Dotknij wiadomości</b>: odpowiedz, reakcja, przekaż dalej, „Napisz prywatnie” (doda kontakt z advertu albo poprosi o advert), zablokuj nadawcę.</li>
            <li><b>Wiadomości prywatne</b>: potwierdzenie doręczenia, 1–5 prób (domyślnie 3), ostatnia próba floodem, „Anuluj” i „Wyślij ponownie”.</li>
            <li><b>Kanały</b>: opcjonalnie jedno ponowienie, gdy żaden repeater nie powtórzył wiadomości.</li>
          </ul>
          <ul class="msi-list">
            <li><b>Podpowiedzi <span class="mono">@nick</span></b>, szybkie wiadomości (szablony) i wstawianie swojej pozycji.</li>
            <li><b>Przytrzymaj rozmowę</b> → wycisz, ulubione albo „Przenieś do archiwum” (bez powiadomień, wiadomości dalej się zapisują).</li>
            <li><b>Dźwięk i wibracja</b> przy nowej wiadomości w niewyciszonej rozmowie – Ustawienia → Czaty.</li>
            <li><b>Kanały w radiu</b> (przycisk # na górze): dodawanie kanału #hashtag albo prywatnego, usuwanie, wykrywanie duplikatów, konfiguracja z kodu QR i linków <span class="mono">meshcore://</span>, „Udostępnij moją konfigurację”.</li>
          </ul>
        </div>
      </div>
      <?= msi_shots(['czaty' => 'Lista rozmów', 'rozmowa' => 'Rozmowa na kanale', 'wiadomosc-opcje' => 'Opcje wiadomości', 'ustawienia-czaty' => 'Ustawienia czatów', 'kanaly' => 'Kanały w radiu']) ?>
    </div>
  </section>

  <!-- 4 -->
  <section class="ms-sec msi-sec" id="wezly">
    <div class="wrap">
      <div class="msi-text msi-wide">
        <span class="ms-kicker">4 · Węzły</span>
        <h2>Kontakty z radia i węzły z advertów</h2>
        <p><b>Zapisane</b> to kontakty w pamięci radia (z ulubionymi na górze), <b>Usłyszane</b> – węzły z advertów, których jeszcze nie ma w radiu. Każda karta pokazuje pełną nazwę, typ, kod, trasę, SNR i czas ostatniego advertu.</p>
        <ul class="msi-list">
          <li><b>Dotknij karty</b>: repeater otwiera ekran repeatera, kontakt i room – rozmowę.</li>
          <li><b>„⋯”</b>: Trace, Napisz albo Wejdź (room), ulubione, telemetria, <b>Znajdź trasę</b> (trasa tam i z powrotem z nazwami repeaterów, zapis w radiu, podgląd na mapie), udostępnienie kodem QR, usunięcie.</li>
          <li><b>Mapa</b> (przełącznik Lista / Mapa): ciemna mapa z kontaktami, usłyszanymi węzłami i bazą repeaterów MeshCore Południe.</li>
          <li>Automatyczne dodawanie i porządkowanie kontaktów – ikona ustawień obok przełącznika.</li>
        </ul>
      </div>
      <?= msi_shots(['wezly' => 'Lista węzłów', 'wezel-menu' => 'Menu „⋯” węzła', 'wezly-mapa' => 'Mapa węzłów']) ?>
    </div>
  </section>

  <!-- 5 -->
  <section class="ms-sec msi-sec" id="narzedzia">
    <div class="wrap">
      <div class="msi-text msi-wide">
        <span class="ms-kicker">5 · Narzędzia · Sieć na żywo</span>
        <h2>Kto Cię słyszy i co dzieje się w eterze</h2>
        <div class="msi-cols">
          <ul class="msi-list">
            <li><b>Discovery</b> – repeatery i roomy w zasięgu bezpośrednim: SNR w obie strony, RSSI, odległość.</li>
            <li><b>Trace</b> – wybierz repeatery po kolei; pakiet przejdzie trasą i wróci z SNR na każdym hopie.</li>
          </ul>
          <ul class="msi-list">
            <li><b>Widmo</b> – szum tła, ruch i zajętość eteru: wykres z 1 min, 10 min albo godziny i lista pakietów.</li>
            <li><b>Obserwator</b> – pakiety usłyszane przez Twoje radio na mapie, jak na mapie live MeshCore Południe: kometa biegnie trasą skok po skoku. Filtr typów, pauza i szczegóły pakietu.</li>
          </ul>
        </div>
      </div>
      <?= msi_shots(['narzedzia' => 'Narzędzia', 'discovery' => 'Discovery', 'trace' => 'Trace', 'widmo' => 'Widmo', 'obserwator' => 'Obserwator']) ?>
    </div>
  </section>

  <!-- 6 -->
  <section class="ms-sec msi-sec" id="repeatery">
    <div class="wrap msi-grid">
      <div class="msi-text">
        <span class="ms-kicker">6 · Moje repeatery</span>
        <h2>Zarządzanie repeaterem z telefonu</h2>
        <ol class="msi-steps">
          <li>Narzędzia → <b>Moje repeatery</b> → wyszukaj repeater wśród kontaktów i dodaj go.</li>
          <li>Wpisz hasło – zapisze się w bezpiecznym magazynie telefonu (Keychain / Keystore).</li>
          <li>Po zalogowaniu: status, telemetria, sąsiedzi, filtr pakietów, advert, restart i konsola CLI.</li>
        </ol>
        <ul class="msi-list">
          <li>Jako administrator: <b>zmiana nazwy</b>, <b>synchronizacja zegara</b> (ręczna albo automatyczna po zalogowaniu) i ostrzeżenie, gdy zegar repeatera różni się o ponad 3 minuty.</li>
          <li>Status Twoich repeaterów odczytuje się raz na dobę albo na żądanie – można go dodać jako widżet na Pulpit.</li>
        </ul>
        <p class="msi-tip"><b>Funkcja testowa:</b> aktualizacja firmware repeatera <b>przez Bluetooth</b> (Ustawienia → O aplikacji → „Funkcje testowe”) – dla płytek nRF52 z bootloaderem <b>OTAFIX</b>. Aplikacja robi kopię ustawień, pobiera firmware SF6 z flashera, wysyła go z postępem, a po przerwaniu pozwala wznowić. Bez OTAFIX aktualizacja jest zablokowana.</p>
      </div>
      <?= msi_shots(['moje-repeatery' => 'Moje repeatery', 'repeater' => 'Repeater po zalogowaniu']) ?>
    </div>
  </section>

  <!-- 7 -->
  <section class="ms-sec msi-sec" id="urzadzenia">
    <div class="wrap msi-grid">
      <div class="msi-text">
        <span class="ms-kicker">7 · Moje urządzenia</span>
        <h2>Konsola radia i kopia konfiguracji</h2>
        <ul class="msi-list">
          <li><b>Konsola radia</b> – polecenia tekstowe do połączonego radia (firmware 1.18+), np. <span class="mono">ver</span>, <span class="mono">get radio</span>, <span class="mono">clock</span>. Konsola repeatera jest w Moich repeaterach.</li>
          <li><b>Kopia konfiguracji</b> – zapis do pliku: kanały z kluczami, kontakty, parametry radia, region i ustawienia aplikacji. Przywracanie z pliku albo wklejonej treści, z ekranem potwierdzenia zmian.</li>
          <li><b>Zrzut z trackera</b> – dane z firmware SF6 Mapper wysyłane do bazy pomiarów.</li>
        </ul>
        <p class="msi-tip">Kopia zawiera klucze kanałów prywatnych – traktuj plik jak hasło.</p>
      </div>
      <?= msi_shots(['konsola' => 'Konsola radia', 'kopia' => 'Kopia konfiguracji']) ?>
    </div>
  </section>

  <!-- 8 -->
  <section class="ms-sec msi-sec" id="teren">
    <div class="wrap">
      <div class="msi-text msi-wide">
        <span class="ms-kicker">8 · Narzędzia · Zasięg i teren</span>
        <h2>Gdzie jest zasięg i gdzie postawić repeater</h2>
        <p>Narzędzia liczą z modelu samej rzeźby terenu – bez zabudowy i lasu, więc w mieście i w lesie realny zasięg będzie mniejszy.</p>
        <div class="msi-cols">
          <ul class="msi-list">
            <li><b>LOS do repeatera</b> – profil terenu i strefa Fresnela z dowolnego punktu na mapie albo ze współrzędnych.</li>
            <li><b>Zasięg LOS</b> – łączny zasięg 1–10 anten (repeatery albo dowolne punkty) z wkładem każdej, albo <b>Wspólny LOS</b>: część wspólna zasięgów, tryb „min. N z M”, zawężenie ramką, zapis zestawów.</li>
          </ul>
          <ul class="msi-list">
            <li><b>Co tu słychać?</b> – które repeatery słyszano w wybranym miejscu (z pomiarów Mappera). Bez pomiarów: szacunek z terenu i propozycja, gdzie postawić repeater.</li>
            <li><b>Nowy repeater</b> – co widać z planowanego miejsca, ocena łączy do istniejących repeaterów, ile zmierzonych miejsc obejmie; <b>punkty pośrednie</b>, gdy miejsce nie widzi sieci.</li>
          </ul>
        </div>
      </div>
      <?= msi_shots(['los' => 'LOS do repeatera', 'zasieg-los' => 'Zasięg LOS', 'co-tu-slychac' => 'Co tu słychać?', 'nowy-repeater' => 'Nowy repeater']) ?>
    </div>
  </section>

  <!-- 9 -->
  <section class="ms-sec msi-sec" id="mapper">
    <div class="wrap">
      <div class="msi-text msi-wide">
        <span class="ms-kicker">9 · Mapper SF6</span>
        <h2>Mapowanie zasięgu sieci</h2>
        <p>Wbudowany następca aplikacji <a href="/mapper-sf6.php">Mapper SF6</a> – ta sama baza pomiarów. Zakładka działa tylko przy presecie SF6.</p>
        <ol class="msi-steps">
          <li>Zakładka <b>Mapper</b> → <b>Start</b>. Aplikacja co 20–120 s wysyła ping z pozycją (GPS telefonu albo radia) i zapisuje, które repeatery odpowiedziały.</li>
          <li><b>Okno LIVE</b> pokazuje ostatnie odpowiedzi, pasek mapowania – stan Bluetooth, GPS, ekranu i serwera oraz odliczanie do pingu. Na postoju mapowanie samo się wstrzymuje.</li>
          <li>Bez internetu pingi czekają w kolejce. Na Androidzie mapowanie działa przy zgaszonym ekranie.</li>
        </ol>
        <div class="msi-cols">
          <ul class="msi-list">
            <li><b>Mapa</b> – kratki pomiarów (kolor = najlepszy sygnał, szara = brak odpowiedzi) z suwakiem wielkości; kolor według SNR odbioru, SNR u repeatera albo RSSI; filtry: repeater z obrysem zasięgu, profil, okres.</li>
            <li><b>Dotknij kratki albo repeatera</b>: kto i kiedy mierzył, zasięg maksymalny i praktyczny, „Pokaż tylko ten repeater”, profil terenu, Trace.</li>
          </ul>
          <ul class="msi-list">
            <li><b>Statystyki</b> – baza pomiarów, Twoje pomiary i sesje na mapie, rankingi repeaterów, zdrowie repeatera, top mapujący; <b>Statystyki RPT</b> z bilansem łącza i aktywnością z 30 dni.</li>
            <li><b>Ustawienia mappera</b> (ikona w prawym górnym rogu): odstęp pingów, źródło GPS, pauza, profil pomiaru, lista wykluczonych repeaterów (CAR RPT), konto i instrukcja.</li>
          </ul>
        </div>
        <p class="msi-tip">Pomiary zostają w pamięci telefonu – mapa i statystyki działają też bez sieci. Moderacja pomiarów i Planer zostają na stronie Mappera.</p>
      </div>
      <?= msi_shots(['mapper' => 'Mapa pomiarów', 'mapper-live' => 'Mapowanie – okno LIVE', 'mapper-statystyki' => 'Statystyki', 'mapper-ustawienia' => 'Ustawienia mappera']) ?>
    </div>
  </section>

  <!-- 10 -->
  <section class="ms-sec msi-sec" id="radio">
    <div class="wrap">
      <div class="msi-text msi-wide">
        <span class="ms-kicker">10 · Radio i ustawienia</span>
        <h2>Radio, połączenie i wygląd</h2>
        <ul class="msi-list">
          <li><b>Nazwa i radio</b> – nazwa węzła, <b>preset SF6</b> albo własne parametry, moc, strojenie, hash ścieżki.</li>
          <li><b>Lokalizacja i telemetria</b>, <b>PIN Bluetooth</b>, strefa czasowa, <b>region</b> (zasięg floodu), restart i reset radia.</li>
          <li><b>WiFi radia</b> – połączenie przez WiFi (firmware 1.18+, płytki z WiFi) i ustawienia sieci radia z aplikacji.</li>
          <li><b>Wygląd</b> – szkło na tle Grafit, Morski albo z telefonu (zdjęcie, na Androidzie także tapeta), z przyciemnieniem.</li>
          <li>Ostrzeżenie, gdy z tym samym radiem rozmawia druga aplikacja.</li>
        </ul>
      </div>
      <?= msi_shots(['ustawienia' => 'Ustawienia', 'radio' => 'Nazwa i radio', 'wyglad' => 'Wygląd']) ?>
    </div>
  </section>

  <!-- 11 -->
  <section class="ms-sec msi-sec" id="telefon">
    <div class="wrap">
      <div class="msi-text msi-wide">
        <span class="ms-kicker">11 · Telefon</span>
        <h2>Widżety, powiadomienia i Android Auto</h2>
        <div class="msi-cols">
          <div class="msi-card">
            <h3>Android</h3>
            <ul class="msi-list">
              <li>Widżety na ekranie głównym.</li>
              <li>Stałe powiadomienie z przyciskami: Discovery, Advert, Rozłącz.</li>
              <li>Kafelki szybkich ustawień i skróty z ikony aplikacji.</li>
              <li>Odpowiedź prosto z powiadomienia.</li>
              <li>Android Auto.</li>
            </ul>
          </div>
          <div class="msi-card">
            <h3>iPhone</h3>
            <ul class="msi-list">
              <li>Karta na ekranie blokady i w Dynamic Island.</li>
              <li>Widżety ekranu głównego i blokady.</li>
              <li>Powiadomienia z „Odpowiedz” i „Przeczytane”.</li>
              <li>Licznik nieprzeczytanych na ikonie.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- 12 -->
  <section class="ms-sec msi-sec" id="prywatnosc">
    <div class="wrap">
      <div class="msi-text msi-wide">
        <span class="ms-kicker">12 · Prywatność</span>
        <h2>Twoje dane zostają w telefonie</h2>
        <ul class="msi-list">
          <li>Historia wiadomości, kontakty i ustawienia są tylko na telefonie. Aplikacja nie ma konta ani analityki.</li>
          <li>Z internetem łączy się tylko po: kafelki mapy (OpenStreetMap), model terenu dla narzędzi LOS, listę repeaterów, pomiary z bazy Mappera SF6, sprawdzenie nowej wersji APK i firmware z flashera (tylko przy aktualizacji repeatera). Gdy włączysz mapper – wysyła pingi do bazy Mappera SF6 (kod węzła, pozycja, wynik pingu, profil pomiaru).</li>
          <li>Hasła repeaterów są w bezpiecznym magazynie systemu (Keychain / Keystore).</li>
        </ul>
      </div>
    </div>
  </section>

  <!-- 13 -->
  <section class="ms-sec msi-sec" id="zmiany">
    <div class="wrap">
      <div class="msi-text msi-wide">
        <span class="ms-kicker">13 · Co nowego</span>
        <h2>Ostatnie wersje</h2>
      </div>
      <?php if ($zmiany): ?>
      <div class="msi-changes">
        <?php foreach ($zmiany as $i => $z): ?>
        <details class="msi-change"<?= $i === 0 ? ' open' : '' ?>>
          <summary><span class="ms-chip"><?= htmlspecialchars($z['wersja']) ?></span><b><?= htmlspecialchars($z['tytul']) ?></b></summary>
          <ul class="msi-list"><?php foreach ($z['punkty'] as $p): ?><li><?= $p ?></li><?php endforeach; ?></ul>
        </details>
        <?php endforeach; ?>
      </div>
      <?php endif; ?>
      <p class="msi-tip">Pełna historia zmian: <a href="https://github.com/aventurovan/meshspeed/blob/main/CHANGELOG.md" target="_blank" rel="noopener">CHANGELOG na GitHubie</a>.</p>
    </div>
  </section>
</div>

<dialog class="msi-lb" id="msiLb" aria-label="Powiększony ekran"><img alt=""><button type="button" aria-label="Zamknij">×</button></dialog>
<script>
(() => {
  const lb = document.getElementById('msiLb'), img = lb.querySelector('img');
  document.addEventListener('click', (e) => {
    const a = e.target.closest('.msi-zoom'); if (!a || !lb.showModal) return;
    e.preventDefault(); img.src = a.href; img.alt = a.querySelector('img').alt; lb.showModal();
  });
  lb.addEventListener('click', () => lb.close());
})();
</script>
<?php require __DIR__ . '/includes/footer.php'; ?>
