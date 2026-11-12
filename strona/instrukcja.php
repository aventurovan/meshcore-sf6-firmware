<?php
$page_title = 'Instrukcja';
$page_description = 'Krok po kroku: jak uruchomić companion i repeater w sieci MeshCore Południe SF6.';
require __DIR__ . '/includes/header.php';
$radio = PRESET_FREQ . ',' . PRESET_BW . ',' . PRESET_SF . ',' . PRESET_CR;
?>

<section class="in-page">
  <div class="wrap in-wrap">
    <div class="in-head">
      <span class="pill">Preset: Południe SF6</span>
      <h1>Instrukcja <span>krok po kroku</span></h1>
      <p>Jak uruchomić swoje urządzenie w sieci MeshCore Południe. Wybierz, co konfigurujesz.</p>
    </div>

    <div class="in-tabs" role="tablist">
      <button class="in-tab" role="tab" id="tab-companion" aria-controls="companion" aria-selected="true">Companion<small>urządzenie do rozmów</small></button>
      <button class="in-tab" role="tab" id="tab-repeater" aria-controls="repeater" aria-selected="false">Repeater<small>przekaźnik sieci (RPT)</small></button>
    </div>

    <!-- ================= COMPANION ================= -->
    <div class="in-panel" id="companion" role="tabpanel" aria-labelledby="tab-companion">
      <p class="in-intro">Companion to Twoje osobiste urządzenie LoRa. Łączysz się z nim telefonem (Bluetooth) albo komputerem (USB) i przez nie piszesz wiadomości w sieci.</p>

      <ol class="in-steps">
        <li>
          <h3>Wybierz urządzenie</h3>
          <p>Dowolna płytka LoRa 868 MHz obsługiwana przez MeshCore, np. Heltec V3/V4, RAK4631, T114, T-Echo, Wio Tracker L1. Polecane modele znajdziesz w sekcji <a href="/#sprzet">Sprzęt</a>.</p>
        </li>
        <li>
          <h3>Wgraj firmware przez nasz flasher</h3>
          <p>Otwórz <a href="<?= URL_FLASHER ?>">Flasher SF6</a> w Chrome lub Edge na komputerze i wybierz rolę:</p>
          <ul>
            <li><b>Companion Bluetooth</b> – do telefonu (najczęstszy wybór),</li>
            <li><b>Companion USB</b> – do komputera,</li>
            <li><b>Companion + Mapper SF6</b> – nasz firmware dla Wio Tracker L1 i T-Echo, z mapowaniem bez telefonu.</li>
          </ul>
          <p>Jeśli to pierwsza instalacja albo wcześniej było inne oprogramowanie (np. Meshtastic), zaznacz <b>„Najpierw wyczyść całą pamięć”</b>. Firmware z flashera ma od razu ustawione radio SF6.</p>
        </li>
        <li>
          <h3>Zainstaluj aplikację i połącz się</h3>
          <p>Pobierz aplikację MeshCore (<a href="/#pobierz">Pobierz</a>), włącz Bluetooth i połącz się z urządzeniem z listy. Przy parowaniu podaj PIN: urządzenia z ekranem pokazują go na ekranie, urządzenia bez ekranu mają domyślnie <code>123456</code>.</p>
        </li>
        <li>
          <h3>Sprawdź ustawienia radia</h3>
          <p>W ustawieniach radia w aplikacji muszą być dokładnie te wartości. Jeśli firmware nie był wgrany z naszego flashera, wpisz je ręcznie:</p>
          <div class="in-preset">
            <div><span>Częstotliwość</span><b><?= PRESET_FREQ ?> MHz</b></div>
            <div><span>Szerokość (BW)</span><b><?= PRESET_BW ?> kHz</b></div>
            <div><span>Spreading factor</span><b>SF<?= PRESET_SF ?></b></div>
            <div><span>Coding rate</span><b>CR<?= PRESET_CR ?></b></div>
          </div>
        </li>
        <li>
          <h3>Ustaw prefiks 2 bajty</h3>
          <p class="in-path">Ustawienia → Ustawienia eksperymentalne → <b>2 bajty (maks. 32 skoki)</b></p>
        </li>
        <li>
          <h3>Nazwa i pozycja</h3>
          <p>Ustaw nazwę – zobaczą ją inni użytkownicy. Udostępnianie pozycji jest opcjonalne, decydujesz sam.</p>
        </li>
        <li>
          <h3>Pokaż się w sieci</h3>
          <p>Wyślij advert (ogłoszenie) z aplikacji, żeby inni Cię zobaczyli, i napisz na kanale <b>Public</b>. Kontakty i repeatery w zasięgu pojawią się na liście w ciągu kilku minut.</p>
        </li>
        <li>
          <h3>Mapowanie zasięgu (opcjonalnie)</h3>
          <p>Pomóż budować mapę sieci aplikacją <a href="/mapper-sf6.php">Mapper SF6</a> – z telefonu albo z urządzeniem z firmware Companion + Mapper.</p>
        </li>
      </ol>

      <div class="in-faq">
        <h2>Najczęstsze problemy</h2>
        <details><summary>Nikogo nie widzę</summary><p>Sprawdź ustawienia radia (krok 4) i prefiks 2 bajty (krok 5), wyślij advert i poczekaj kilka minut. Na mapie w sekcji <a href="/#zasieg">Zasięg</a> sprawdź, czy w Twojej okolicy jest repeater.</p></details>
        <details><summary>Telefon nie łączy się przez Bluetooth</summary><p>Usuń urządzenie z listy sparowanych w ustawieniach telefonu i połącz się ponownie z aplikacji. Sprawdź PIN (krok 3).</p></details>
        <details><summary>Urządzenie działa dziwnie po innym oprogramowaniu</summary><p>Wgraj firmware jeszcze raz przez flasher z zaznaczonym „Najpierw wyczyść całą pamięć”.</p></details>
      </div>
    </div>

    <!-- ================= REPEATER ================= -->
    <div class="in-panel" id="repeater" role="tabpanel" aria-labelledby="tab-repeater" hidden>
      <p class="in-intro">Repeater (RPT) przekazuje wiadomości innych i buduje zasięg sieci. Stoi na stałe w dobrym miejscu i działa bez telefonu.</p>

      <div class="in-alert"><b>Wymagany firmware 1.14 lub nowszy.</b> Starsze repeatery odrzucają pakiety z prefiksem 2-bajtowym i psują sieć. Najprościej: wgraj najnowszy firmware z naszego flashera.</div>

      <ol class="in-steps">
        <li>
          <h3>Miejsce i antena</h3>
          <p>Im wyżej i z lepszym widokiem, tym lepiej. Użyj dobrej anteny 868 MHz, stabilnego zasilania (np. panel słoneczny z akumulatorem) i szczelnej obudowy.</p>
        </li>
        <li>
          <h3>Wgraj firmware przez nasz flasher</h3>
          <p>W <a href="<?= URL_FLASHER ?>">Flasherze SF6</a> wybierz rolę <b>Repeater</b>.</p>
          <ul>
            <li><b>Nowy repeater</b> albo urządzenie po innym oprogramowaniu: zaznacz „Najpierw wyczyść całą pamięć”.</li>
            <li><b>Aktualizacja</b> działającego repeatera: <b>bez</b> kasowania – zostaje jego klucz, nazwa i ustawienia.</li>
          </ul>
          <p>Po czystej instalacji z naszego flashera radio SF6, prefiks 2 bajty i czasy advertów są już ustawione.</p>
        </li>
        <li>
          <h3>Ustaw repeater w aplikacji na telefonie</h3>
          <p>Najprostszy sposób – bez kabla i komend. Potrzebujesz działającego companiona (patrz zakładka <a href="#companion" data-tab="companion">Companion</a>) i aplikacji MeshCore albo naszej <a href="/meshspeed.php">MeshSpeed</a>.</p>
          <ol class="in-sub">
            <li>Włącz repeater w pobliżu i poczekaj, aż pojawi się w aplikacji na liście kontaktów (możesz w konsoli wysłać <code>advert</code>).</li>
            <li>Wybierz repeater i zaloguj się jako administrator. Domyślne hasło nowego repeatera to <code>password</code>.</li>
            <li>W ustawieniach repeatera wpisz wartości z tabeli i zapisz. Zmiana radia działa po restarcie repeatera.</li>
          </ol>
          <table class="in-table in-settings">
            <tr><td>Nazwa</td><td>dowolna, widoczna dla wszystkich</td></tr>
            <tr><td>Hasło administratora</td><td><b>zmień</b> domyślne <code>password</code> na własne</td></tr>
            <tr><td>Pozycja</td><td>szerokość i długość geograficzna miejsca montażu</td></tr>
            <tr><td>Radio</td><td><?= PRESET_FREQ ?> MHz · BW <?= PRESET_BW ?> kHz · SF<?= PRESET_SF ?> · CR<?= PRESET_CR ?></td></tr>
            <tr><td>Moc nadawania</td><td>maksymalna (22 dBm)</td></tr>
            <tr><td>Advert lokalny (0-hop)</td><td>co 60 minut</td></tr>
            <tr><td>Advert flood</td><td>co 12 godzin</td></tr>
            <tr><td>Prefiks (hash mode)</td><td><b>2 bajty</b> – obowiązkowo</td></tr>
          </table>
          <p>Jeśli któregoś ustawienia nie ma w aplikacji (np. prefiksu 2 bajty), wpisz komendę w konsoli repeatera dostępnej w aplikacji po zalogowaniu – np. <code>set path.hash.mode 1</code>. Pełna lista komend jest w następnym kroku.</p>
          <p class="in-note">Po czystej instalacji z naszego flashera radio SF6, prefiks 2 bajty i adverty są już ustawione – zostaje nazwa, hasło, pozycja i moc. Repeater z innymi ustawieniami radia nie będzie widoczny w aplikacji – wtedy skonfiguruj go przez USB (krok 4).</p>
        </li>
        <li>
          <h3>…albo przez konsolę CLI</h3>
          <p>Dla zaawansowanych i gdy aplikacja nie widzi repeatera. Konsolę otworzysz:</p>
          <ul>
            <li><b>przez USB:</b> narzędzie <a href="<?= URL_RPT_CONFIG ?>" target="_blank" rel="noopener">Konfiguracja RPT</a> (Chrome/Edge na komputerze),</li>
            <li><b>zdalnie:</b> w aplikacji, po zalogowaniu do repeatera jako administrator.</li>
          </ul>
          <p>Wpisz komendy po kolei. Wartości w nawiasach &lt; &gt; zastąp swoimi (pozycja w stopniach dziesiętnych, np. <code>49.8224</code> i <code>19.0444</code>).</p>
          <div class="in-code">
<pre id="rptCmds">set name &lt;nazwa repeatera&gt;
password &lt;nowe hasło administratora&gt;
set lat &lt;szerokość&gt;
set lon &lt;długość&gt;
set radio <?= $radio ?>

set tx 22
set path.hash.mode 1
set advert.interval 60
set flood.advert.interval 12
reboot</pre>
            <button type="button" class="cmd-copy" data-copy-from="rptCmds">Kopiuj wszystko</button>
          </div>
          <table class="in-table">
            <tr><td><code>set radio <?= $radio ?></code></td><td>preset SF6: <?= PRESET_FREQ ?> MHz, BW <?= PRESET_BW ?>, SF<?= PRESET_SF ?>, CR<?= PRESET_CR ?> (działa po restarcie)</td></tr>
            <tr><td><code>set tx 22</code></td><td>maksymalna moc nadawania (zakres komendy 1–22 dBm)</td></tr>
            <tr><td><code>set path.hash.mode 1</code></td><td>prefiks 2 bajty – <b>obowiązkowy</b> w regionie Południe</td></tr>
            <tr><td><code>set advert.interval 60</code></td><td>advert lokalny (0-hop) co 60 minut</td></tr>
            <tr><td><code>set flood.advert.interval 12</code></td><td>advert do całej sieci (flood) co 12 godzin</td></tr>
            <tr><td><code>reboot</code></td><td>restart – zapisuje i włącza nowe ustawienia radia</td></tr>
          </table>
          <p class="in-note">Płytki ze wzmacniaczem mocy (np. moduły 1 W) przy <code>set tx 22</code> nadają mocniej niż 22 dBm. Pamiętaj o limicie dla pasma 869,4–869,65 MHz: 500 mW ERP.</p>
        </li>
        <li>
          <h3>Sprawdź, czy wszystko działa</h3>
          <table class="in-table">
            <tr><td><code>ver</code></td><td>wersja firmware – musi być 1.14 lub nowsza</td></tr>
            <tr><td><code>get radio</code></td><td>powinno zwrócić <code><?= $radio ?></code></td></tr>
            <tr><td><code>get path.hash.mode</code></td><td>powinno zwrócić <code>1</code></td></tr>
            <tr><td><code>advert</code></td><td>wysyła advert od razu, żeby repeater pojawił się w sieci</td></tr>
            <tr><td><code>neighbors</code></td><td>lista repeaterów, które słyszy – po kilkunastu minutach nie powinna być pusta</td></tr>
          </table>
          <p>Te komendy wpiszesz w konsoli – przez USB albo w aplikacji. Po kilku godzinach repeater powinien być widoczny na <a href="/#zasieg">mapie zasięgu</a>.</p>
        </li>
        <li>
          <h3>Aktualizacje</h3>
          <p>Nowe wersje pojawiają się we flasherze automatycznie po oficjalnym wydaniu MeshCore. Aktualizuj <b>bez</b> kasowania pamięci, a potem sprawdź <code>get path.hash.mode</code>.</p>
        </li>
      </ol>

      <div class="in-soon"><b>Wkrótce: regiony.</b> Gdy wdrożymy podział sieci na regiony, dopiszemy tutaj potrzebne ustawienia.</div>

      <div class="in-faq">
        <h2>Najczęstsze problemy</h2>
        <details><summary><code>neighbors</code> jest puste</summary><p>Sprawdź <code>get radio</code>, antenę i jej podłączenie. Repeater mógł też jeszcze nie usłyszeć advertów sąsiadów – poczekaj albo poproś kogoś w zasięgu o wysłanie advertu.</p></details>
        <details><summary>Nie mogę zalogować się zdalnie</summary><p>Sprawdź hasło administratora i czy jesteś w zasięgu repeatera (bezpośrednio lub przez inne repeatery).</p></details>
        <details><summary>Zapomniałem hasła administratora</summary><p>Podłącz repeater przez USB, otwórz konsolę w narzędziu Konfiguracja RPT i ustaw nowe: <code>password &lt;nowe hasło&gt;</code>.</p></details>
      </div>
    </div>
  </div>
</section>

<script>
(() => {
  const tabs = [...document.querySelectorAll(".in-tab")];
  function show(id, push) {
    tabs.forEach(t => {
      const on = t.getAttribute("aria-controls") === id;
      t.setAttribute("aria-selected", on);
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    if (push) history.replaceState(null, "", "#" + id);
  }
  tabs.forEach(t => t.addEventListener("click", () => show(t.getAttribute("aria-controls"), true)));
  document.querySelectorAll("[data-tab]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); show(a.dataset.tab, true); window.scrollTo({ top: 0 }); }));
  const start = () => show(location.hash === "#repeater" ? "repeater" : "companion", false);
  window.addEventListener("hashchange", start);
  start();
  document.querySelectorAll(".cmd-copy").forEach(b => b.addEventListener("click", async () => {
    const text = b.dataset.copyFrom ? document.getElementById(b.dataset.copyFrom).textContent : b.dataset.copy;
    const label = b.textContent;
    try { await navigator.clipboard.writeText(text.trim()); b.textContent = "Skopiowano"; }
    catch { b.textContent = "Zaznacz i skopiuj"; }
    setTimeout(() => b.textContent = label, 2000);
  }));
})();
</script>
<?php require __DIR__ . '/includes/footer.php'; ?>
