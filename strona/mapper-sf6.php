<?php
$page_title = 'Mapper SF6 – mapa zasięgu sieci';
$page_description = 'Mapper SF6: aplikacja do mapowania zasięgu sieci MeshCore Południe. Jeździsz z companionem, a każdy punkt trafia na wspólną mapę zasięgu.';
require __DIR__ . '/includes/header.php';

// najnowsza wersja APK na serwerze (/mapper/apk/mapper-sf6-X.Y.Z.apk)
$mp_ver = null;
foreach (glob(__DIR__ . '/mapper/apk/mapper-sf6-*.apk') ?: [] as $f) {
  if (preg_match('/mapper-sf6-(\d+\.\d+\.\d+)\.apk$/', $f, $m) && (!$mp_ver || version_compare($m[1], $mp_ver, '>'))) $mp_ver = $m[1];
}
$URL_MP_GUIDE = '/mapper/instrukcja.html';
$URL_MP_FW = 'https://github.com/aventurovan/meshcore-sf6-mapper-firmware/releases/tag/latest-build';
?>

<div class="mp">
  <!-- ============ HERO ============ -->
  <section class="mp-hero">
    <div class="mp-rings" aria-hidden="true"><span></span><span></span><span></span><span></span><i></i></div>
    <div class="wrap mp-hero-grid">
      <div class="mp-hero-text">
        <span class="mp-kicker">Mapper MeshCore SF6</span>
        <h1>Zobacz, gdzie <em>naprawdę</em> działa sieć.</h1>
        <p class="mp-lead">Jedziesz albo idziesz z telefonem i swoim companionem, a Mapper co kilkanaście sekund pyta repeatery „słyszysz mnie?”. Każda odpowiedź i każda cisza trafia na wspólną mapę zasięgu sieci Południe.</p>
        <div class="mp-cta">
          <a href="<?= URL_MAPPER_APK ?>" class="mp-btn mp-btn-main">Pobierz na Androida</a>
          <a href="<?= URL_MAPPER_IOS ?>" class="mp-btn mp-btn-line" target="_blank" rel="noopener">iPhone – TestFlight</a>
          <a href="<?= URL_MAPPER ?>" class="mp-btn mp-btn-line" target="_blank" rel="noopener">Otwórz mapę ↗</a>
        </div>
        <p class="mp-meta"><?php if ($mp_ver): ?><span class="mp-chip">Android <?= htmlspecialchars($mp_ver) ?></span><?php endif; ?><span class="mp-chip">Preset SF6</span><span class="mp-chip">Discovery</span></p>
      </div>

      <!-- makieta: telefon z mapą punktów -->
      <div class="mp-phone" role="img" aria-label="Podgląd mapy w aplikacji Mapper SF6">
        <div class="mp-screen">
          <div class="mp-bar"><b>Mapper SF6</b><span class="mp-live"><i></i>mapuje</span></div>
          <svg class="mp-map" viewBox="0 0 260 300" aria-hidden="true">
            <defs><pattern id="mpgrid" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0H0V26" fill="none" stroke="#1d3b4e" stroke-width="1"/></pattern></defs>
            <rect width="260" height="300" fill="#0b2230"/>
            <rect width="260" height="300" fill="url(#mpgrid)"/>
            <path d="M-10 230 C40 210 70 250 110 220 S170 150 200 160 S250 120 280 110" fill="none" stroke="#2c5a73" stroke-width="7" stroke-linecap="round"/>
            <path d="M30 300 L60 250 L95 228 L130 205 L165 168 L200 160 L235 128" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="3 5" opacity=".6"/>
            <g stroke="#0b2230" stroke-width="2">
              <circle cx="60" cy="250" r="7" fill="#4ade80"/><circle cx="95" cy="228" r="7" fill="#4ade80"/>
              <circle cx="130" cy="205" r="7" fill="#f5b942"/><circle cx="165" cy="168" r="7" fill="#ff8a80"/>
              <circle cx="200" cy="160" r="7" fill="#4ade80"/><circle cx="235" cy="128" r="8" fill="#4ade80"/>
            </g>
            <g fill="none" stroke="#a78bfa" stroke-width="1.5" opacity=".75">
              <path d="M95 228 L70 90"/><path d="M200 160 L190 52"/><path d="M235 128 L190 52"/>
            </g>
            <g>
              <path d="M70 80 l8 14 h-16z" fill="#a78bfa"/><text x="80" y="78" fill="#eaf2f6" font-size="10" font-family="system-ui">RPT A1B2</text>
              <path d="M190 42 l8 14 h-16z" fill="#a78bfa"/><text x="140" y="38" fill="#eaf2f6" font-size="10" font-family="system-ui">RPT 7F3C</text>
            </g>
            <circle cx="235" cy="128" r="16" fill="none" stroke="#38bdf8" stroke-width="2" opacity=".5"/>
          </svg>
          <div class="mp-stats">
            <div><b>184</b><span>pingów</span></div>
            <div><b class="ok">71%</b><span>trafień</span></div>
            <div><b>9</b><span>repeaterów</span></div>
          </div>
          <div class="mp-last"><span class="mp-dot"></span><div><b>RPT 7F3C odpowiedział</b><small>SNR 6.25 dB · 14 s temu</small></div></div>
        </div>
      </div>
    </div>
  </section>

  <!-- ============ JAK DZIAŁA ============ -->
  <section class="mp-sec">
    <div class="wrap">
      <div class="mp-head"><span class="mp-kicker">Jak to działa</span><h2>Trzy kroki do wspólnej mapy</h2></div>
      <ol class="mp-steps">
        <li><b>Połącz companion</b><span>Aplikacja łączy się przez Bluetooth z Twoim companionem MeshCore ustawionym na preset SF6. Pierwsze połączenie zakłada konto – podajesz tylko nick.</span></li>
        <li><b>Ruszaj w teren</b><span>Mapper wysyła ping discovery do repeaterów. Każdy punkt zapisuje się z pozycją: trafienie z listą repeaterów i jakością sygnału albo pudło.</span></li>
        <li><b>Zobacz wyniki</b><span>Punkty trafiają na wspólną mapę zasięgu, którą widzą wszyscy. Na komputerze możesz je przeanalizować.</span></li>
      </ol>
    </div>
  </section>

  <!-- ============ FUNKCJE ============ -->
  <section class="mp-sec">
    <div class="wrap">
      <div class="mp-head"><span class="mp-kicker">Funkcje</span><h2>Zrobione do mapowania w ruchu</h2></div>
      <div class="mp-features">
        <article class="mp-feat"><div class="mp-ico"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2.5"/><path d="M7 7a7 7 0 0 0 0 10M17 7a7 7 0 0 1 0 10M4 4a11 11 0 0 0 0 16M20 4a11 11 0 0 1 0 16"/></svg></div><h3>Ping discovery</h3><p>Pyta tylko repeatery w zasięgu, bez zaśmiecania sieci. Zapisuje, kto odpowiedział i z jakim sygnałem w obie strony.</p></article>
        <article class="mp-feat"><div class="mp-ico"><svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="4"/><path d="M16 9l5 5M21 9l-5 5"/></svg></div><h3>Trafienia i pudła</h3><p>Zapisywane są też miejsca bez odpowiedzi. Dzięki temu mapa pokazuje prawdziwe dziury w zasięgu, a nie tylko dobre miejsca.</p></article>
        <article class="mp-feat"><div class="mp-ico"><svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 13l4-3M12 3v2"/></svg></div><h3>Interwał wg prędkości</h3><p>Domyślnie ping co 20 sekund, a przy szybszej jeździe częściej. Na postoju mapowanie samo się wstrzymuje i wraca, gdy ruszysz.</p></article>
        <article class="mp-feat"><div class="mp-ico"><svg viewBox="0 0 24 24"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M10 18h4"/><path d="M12 7v4l2 1"/></svg></div><h3>Ekran nie gaśnie</h3><p>Podczas mapowania ekran zostaje włączony, więc telefon w uchwycie cały czas pokazuje mapę i ostatnie trafienia.</p></article>
        <article class="mp-feat"><div class="mp-ico"><svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/></svg></div><h3>Konto bez haseł</h3><p>Rozpoznaje Cię klucz publiczny Twojego companiona. Podajesz tylko nick – bez rejestracji i czekania na akceptację.</p></article>
        <article class="mp-feat"><div class="mp-ico"><svg viewBox="0 0 24 24"><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/></svg></div><h3>Wspólna mapa</h3><p>Wszystkie punkty od wszystkich mapujących na jednej mapie, z nazwami repeaterów sieci Południe.</p></article>
        <article class="mp-feat"><div class="mp-ico"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4M7 12l3-3 2 2 4-4"/></svg></div><h3>Analiza na komputerze</h3><p>Na komputerze mapa służy do analizy: pokrycie terenu, linia widoczności do repeaterów i statystyki.</p></article>
        <article class="mp-feat"><div class="mp-ico"><svg viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M10 7h4M12 3V1"/><circle cx="12" cy="14" r="2"/></svg></div><h3>Mapowanie bez telefonu</h3><p>Firmware Companion + Mapper dla Wio Tracker L1 i T-Echo zbiera punkty samodzielnie. Dane przesyłasz później przez Bluetooth do aplikacji.</p></article>
      </div>
    </div>
  </section>

  <!-- ============ URZĄDZENIA ============ -->
  <section class="mp-sec mp-dev">
    <div class="wrap mp-dev-grid">
      <div>
        <span class="mp-kicker">Czego potrzebujesz</span>
        <h2>Companion na presecie SF6</h2>
        <p>Do mapowania z telefonu wystarczy zwykły companion MeshCore (Bluetooth) ustawiony na preset sieci Południe: <span class="mp-mono"><?= PRESET_FREQ ?> MHz · SF<?= PRESET_SF ?> · BW <?= PRESET_BW ?></span>. Najprościej wgrać go przez nasz <a href="<?= URL_FLASHER ?>">Flasher SF6</a>.</p>
      </div>
      <div class="mp-dev-cards">
        <a class="mp-dev-card" href="<?= URL_FLASHER ?>">
          <b>Companion + Mapper SF6</b>
          <span>Wio Tracker L1, T-Echo – zwykły companion z mapowaniem bez telefonu i polskim ekranem.</span>
          <em>Wgraj przez flasher ›</em>
        </a>
        <a class="mp-dev-card" href="<?= $URL_MP_FW ?>" target="_blank" rel="noopener">
          <b>SF6 Mapper (tracker)</b>
          <span>Wio Tracker L1 jako samodzielny tracker – tylko mapuje, ma własne konto w Mapperze.</span>
          <em>Pobierz firmware ↗</em>
        </a>
      </div>
    </div>
  </section>

  <!-- ============ POBIERZ ============ -->
  <section class="mp-sec">
    <div class="wrap">
      <div class="mp-head"><span class="mp-kicker">Pobierz</span><h2>Zacznij mapować</h2></div>
      <div class="mp-dl">
        <a class="mp-dl-card" href="<?= URL_MAPPER_APK ?>">
          <span class="mp-dl-os">Android</span><b>Plik APK</b>
          <p>Instalacja spoza Sklepu Play. Przy pierwszej instalacji zezwól przeglądarce na instalowanie aplikacji.</p>
          <span class="mp-go">Pobierz<?= $mp_ver ? ' ' . htmlspecialchars($mp_ver) : '' ?> ›</span>
        </a>
        <a class="mp-dl-card" href="<?= URL_MAPPER_IOS ?>" target="_blank" rel="noopener">
          <span class="mp-dl-os">iPhone</span><b>TestFlight</b>
          <p>Zainstaluj TestFlight z App Store, potem otwórz zaproszenie do Mappera SF6.</p>
          <span class="mp-go">Dołącz w TestFlight ›</span>
        </a>
        <a class="mp-dl-card" href="<?= URL_MAPPER ?>" target="_blank" rel="noopener">
          <span class="mp-dl-os">Komputer</span><b>Mapa i analiza</b>
          <p>Wspólna mapa zasięgu w przeglądarce, z narzędziami do analizy.</p>
          <span class="mp-go">Otwórz mapę ↗</span>
        </a>
        <a class="mp-dl-card" href="<?= $URL_MP_GUIDE ?>" target="_blank" rel="noopener">
          <span class="mp-dl-os">Pomoc</span><b>Instrukcja</b>
          <p>Wszystko o mapowaniu krok po kroku: połączenie, ustawienia, przyciski i ekrany.</p>
          <span class="mp-go">Czytaj instrukcję ↗</span>
        </a>
      </div>
    </div>
  </section>

  <!-- ============ FAQ ============ -->
  <section class="mp-sec mp-faq">
    <div class="wrap">
      <div class="mp-head"><span class="mp-kicker">Pytania</span><h2>Najczęstsze pytania</h2></div>
      <details><summary>Czy mogę mapować z laptopa?</summary><p>Nie. Mapuje się tylko telefonem albo urządzeniem z firmware mappera. Na komputerze mapa służy do przeglądania i analizy wyników.</p></details>
      <details><summary>Dlaczego zapisywane są też pudła?</summary><p>Bez miejsc, w których nikt nie odpowiedział, mapa pokazywałaby tylko dobre punkty i wyglądała lepiej niż rzeczywistość. Pudła wysyła każdy mapujący – nie da się tego wyłączyć.</p></details>
      <details><summary>Co trafia na serwer?</summary><p>Pozycja każdego pingu, jego wynik (repeatery, które odpowiedziały, i jakość sygnału) oraz Twój nick powiązany z kluczem publicznym companiona. Wiadomości z czatu nie są wysyłane.</p></details>
      <details><summary>Mój companion nie jest na SF6 – co teraz?</summary><p>Mapper działa tylko z presetem sieci Południe. Ustaw radio według <a href="/instrukcja.php#companion">instrukcji companiona</a> albo wgraj firmware przez nasz flasher.</p></details>
    </div>
  </section>
</div>

<?php require __DIR__ . '/includes/footer.php'; ?>
