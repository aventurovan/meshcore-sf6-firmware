<?php
$page_title = 'Strona główna';
$page_description = 'Niezależna sieć LoRa off-grid dla Śląska, Podbeskidzia i Małopolski, działająca na presecie SF6.';
$body_class = 'theme-light';
require __DIR__ . '/includes/header.php';
require __DIR__ . '/includes/map-svg.php';

$chip_icon = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1.5" stroke="currentColor" stroke-width="1.7"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
$companions = [
    ['Wio Tracker L1 Pro', 'Seeed Studio', 'Kompaktowy moduł z zaawansowanymi funkcjami pozycjonowania.'],
    ['ThinkNode M1', 'Elecrow', 'Solidny węzeł osobisty zamknięty w gotowej, wytrzymałej obudowie.'],
    ['T-Deck', 'Lilygo', 'Urządzenie Standalone z wbudowaną klawiaturą i ekranem. Nie wymaga telefonu do działania!'],
    ['SenseCAP T1000-A', 'Seeed Studio', 'Zamknięty w obudowie z baterią o wielkości karty. Świetny węzeł mobilny.'],
    ['Heltec V3 / V4', 'Heltec Automation', 'Najpopularniejszy, tani, posiada ekran OLED. Wymaga podłączenia do telefonu po Bluetooth.'],
    ['Heltec DIY', 'Konstrukcja własna', 'Bazuje na płytkach rodziny Heltec. Dopasuj baterię, antenę i obudowę pod swoje potrzeby.'],
];
$repeaters = [
    ['RAK WisBlock DIY (RAK4631)', 'RAK Wireless', 'Modułowy, niezwykle energooszczędny system. Zbuduj profesjonalny repeater z panelem słonecznym.'],
    ['SenseCAP Solar', 'Seeed Studio', 'Gotowe, zamknięte i bezobsługowe rozwiązanie bazujące na zasilaniu słonecznym.'],
    ['XIAO nRF52 WIO DIY', 'Seeed Studio', 'Bazuje na miniaturowym mikrokontrolerze. Rewelacyjna baza kosztowa dla autorskiego routera.'],
];
?>

<!-- ================= HERO ================= -->
<section class="hl-hero">
  <div class="wrap hl-hero-grid">
    <svg class="hl-hero-art" viewBox="0 0 560 420" role="img" aria-label="Ilustracja: Beskidy, las, maszt repeatera i dwoje ludzi z radiami LoRa">
      <rect width="560" height="420" fill="#F3E9D8"/>
      <circle cx="470" cy="70" r="34" fill="#F6C76B"/>
      <g fill="#FFFFFF" opacity=".95"><ellipse cx="110" cy="72" rx="46" ry="16"/><ellipse cx="140" cy="60" rx="30" ry="18"/><ellipse cx="350" cy="96" rx="40" ry="13"/></g>
      <path d="M0 270 L120 150 L200 220 L300 110 L420 230 L500 170 L560 220 L560 420 L0 420Z" fill="#B9CFC0"/>
      <path d="M300 110 L330 140 L310 138 L300 150 L290 136 L272 138Z" fill="#FFFFFF"/>
      <path d="M0 320 C90 280 170 300 250 290 S420 250 560 290 L560 420 L0 420Z" fill="#8DB59D"/>
      <path d="M0 370 C120 340 220 360 330 350 S480 330 560 350 L560 420 L0 420Z" fill="#5E9478"/>
      <path d="M150 420 C190 380 230 370 260 350 S330 320 360 300" fill="none" stroke="#E7D3B0" stroke-width="16" stroke-linecap="round"/>
      <g fill="#3F7A5F"><path d="M40 360 L62 300 L84 360Z"/><path d="M70 372 L96 296 L122 372Z"/><path d="M470 352 L492 290 L514 352Z"/><path d="M505 362 L527 306 L549 362Z"/></g>
      <g fill="#6B4E3D"><rect x="60" y="358" width="4" height="12"/><rect x="94" y="370" width="4" height="12"/><rect x="490" y="350" width="4" height="12"/></g>
      <g stroke="#3B4A44" stroke-width="3" fill="none" stroke-linecap="round"><path d="M410 236 L430 120 L450 236"/><path d="M416 200 L444 200M420 170 L440 170M424 145 L436 145M413 222 L447 222"/></g>
      <circle cx="430" cy="116" r="6" fill="#E8833A"/>
      <g fill="none" stroke="#E8833A" stroke-width="3" stroke-linecap="round" class="hl-waves"><path d="M412 98 A26 26 0 0 1 448 98"/><path d="M400 84 A44 44 0 0 1 460 84"/></g>
      <g fill="none" stroke="#2E6B5A" stroke-width="2.5" stroke-dasharray="6 7" stroke-linecap="round"><path d="M200 250 C260 150 340 130 410 120"/><path d="M285 250 C320 190 370 160 420 130"/></g>
      <g transform="translate(170 250)">
        <circle cx="24" cy="18" r="16" fill="#F2C9A5"/><path d="M8 14 C10 0 40 -2 40 16 C34 8 18 8 8 14Z" fill="#5A3B2A"/>
        <rect x="6" y="36" width="36" height="58" rx="12" fill="#F4F1EA"/><rect x="-6" y="36" width="18" height="46" rx="8" fill="#C46B35"/>
        <rect x="34" y="50" width="10" height="18" rx="2" fill="#2F3B37"/><rect x="12" y="94" width="10" height="34" rx="4" fill="#6B4E3D"/><rect x="26" y="94" width="10" height="34" rx="4" fill="#6B4E3D"/>
      </g>
      <g transform="translate(250 256)">
        <circle cx="24" cy="18" r="15" fill="#F2C9A5"/><path d="M6 22 C4 -2 44 -4 42 24 L40 40 C38 20 12 18 8 40Z" fill="#B4552B"/>
        <rect x="6" y="34" width="36" height="56" rx="12" fill="#F2A93B"/><rect x="38" y="44" width="8" height="22" rx="2" fill="#2F3B37"/><path d="M42 44 L42 30" stroke="#2F3B37" stroke-width="2"/>
        <rect x="12" y="90" width="10" height="34" rx="4" fill="#47605A"/><rect x="26" y="90" width="10" height="34" rx="4" fill="#47605A"/>
      </g>
    </svg>
    <div class="hl-hero-text">
      <p class="hl-kicker">Sieć LoRa off-grid · preset SF6</p>
      <h1>Buduj z nami sieć MeshCore Południe</h1>
      <p class="hl-lead">Darmowa łączność przez radio – bez operatora, bez abonamentu i bez internetu. Dla Śląska, Podbeskidzia i Małopolski.</p>
      <div class="hl-cta">
        <a href="/instrukcja.php" class="hl-btn hl-btn-main">Uruchom swój węzeł</a>
        <a href="#zasieg" class="hl-btn hl-btn-line">Zobacz mapę</a>
      </div>
    </div>
  </div>
</section>

<!-- ================= CO TO JEST ================= -->
<section id="co-to-jest" class="hl-sec">
  <div class="wrap">
    <div class="hl-cards3">
      <a href="#mesh" class="hl-edu hl-blue">
        <h2>Czym jest sieć mesh?</h2>
        <svg viewBox="0 0 300 150" aria-hidden="true">
          <g stroke="#3D86B8" stroke-width="3" stroke-dasharray="5 6" fill="none"><path d="M50 110 L130 50 L220 90 L270 40"/><path d="M130 50 L170 125 L220 90"/></g>
          <g fill="#FFFFFF" stroke="#3D86B8" stroke-width="3"><circle cx="50" cy="110" r="16"/><circle cx="130" cy="50" r="16"/><circle cx="220" cy="90" r="16"/><circle cx="270" cy="40" r="14"/><circle cx="170" cy="125" r="14"/></g>
          <g fill="#E8833A"><circle cx="50" cy="110" r="6"/><circle cx="270" cy="40" r="6"/></g>
        </svg>
        <p>Każde urządzenie przekazuje wiadomości dalej. Nie ma centrali – sieć działa, nawet gdy padną maszty komórkowe.</p>
        <span class="hl-more">Dowiedz się więcej ›</span>
      </a>
      <a href="#zasieg" class="hl-edu hl-mint">
        <h2>Gdzie mamy zasięg?</h2>
        <svg viewBox="0 0 300 150" aria-hidden="true">
          <path d="M20 40 L90 20 L170 30 L250 18 L285 60 L270 120 L190 138 L110 128 L40 132 L14 90Z" fill="#FFFFFF" stroke="#7FB696" stroke-width="2"/>
          <ellipse cx="120" cy="80" rx="70" ry="38" fill="#9ED2B3" opacity=".7"/><ellipse cx="200" cy="96" rx="52" ry="28" fill="#9ED2B3" opacity=".6"/>
          <g fill="#2E6B5A"><circle cx="90" cy="72" r="5"/><circle cx="130" cy="96" r="5"/><circle cx="150" cy="62" r="5"/><circle cx="210" cy="100" r="5"/><circle cx="232" cy="80" r="5"/></g>
        </svg>
        <p>Repeatery stoją na wzgórzach i dachach. Mapa pokazuje je na żywo, a Mapper SF6 – realny zasięg z terenu.</p>
        <span class="hl-more">Otwórz mapę ›</span>
      </a>
      <a href="#sprzet" class="hl-edu hl-peach">
        <h2>Co kupić na start?</h2>
        <svg viewBox="0 0 300 150" aria-hidden="true">
          <rect x="40" y="58" width="130" height="62" rx="10" fill="#2F3B37"/><rect x="54" y="70" width="58" height="30" rx="4" fill="#9ED2B3"/><circle cx="140" cy="88" r="9" fill="#E8833A"/>
          <rect x="150" y="16" width="8" height="46" rx="4" fill="#2F3B37"/>
          <rect x="200" y="34" width="60" height="104" rx="14" fill="#FFFFFF" stroke="#2F3B37" stroke-width="4"/><rect x="210" y="48" width="40" height="64" rx="6" fill="#E3F0F8"/>
          <g fill="none" stroke="#3D86B8" stroke-width="3" stroke-linecap="round"><path d="M178 82 C184 76 184 70 178 64"/><path d="M186 90 C196 80 196 62 186 54"/></g>
        </svg>
        <p>Płytka LoRa 868 MHz (np. Heltec V3, RAK4631, T114) i telefon. Firmware wgrasz jednym kliknięciem.</p>
        <span class="hl-more">Zobacz sprzęt ›</span>
      </a>
    </div>

    <div id="mesh" class="hl-feats">
      <div class="hl-feat"><span class="hl-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6L4 12l5 6M15 6l5 6-5 6"/></svg></span><div><h3>Open Source</h3><p>Pełna transparentność kodu i narzędzi. Żadnych ukrytych furtek, tylko czysta technologia.</p></div></div>
      <div class="hl-feat"><span class="hl-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/></svg></span><div><h3>End-to-End</h3><p>Szyfrowanie AES-256 zapewnia, że Twoje wiadomości przeczytasz tylko Ty i Twój odbiorca.</p></div></div>
      <div class="hl-feat"><span class="hl-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 0114 0M8 12a4 4 0 018 0"/><circle cx="12" cy="12" r="1.6"/></svg></span><div><h3>Duży zasięg (LoRa)</h3><p>Dzięki LoRa i systemowi przekaźników (repeaterów), sieć sięga dziesiątki kilometrów poza miasto.</p></div></div>
      <div class="hl-feat"><span class="hl-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="14" height="10" rx="1.5"/><path d="M17 9.5l4-2.5v10l-4-2.5"/></svg></span><div><h3>Niski pobór mocy</h3><p>Zoptymalizowane zużycie energii pozwala urządzeniom działać dniami, a nawet tygodniami na jednej baterii.</p></div></div>
      <div class="hl-feat"><span class="hl-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg></span><div><h3>Węzły solarne</h3><p>Nasza infrastruktura to głównie bezobsługowe punkty na wzniesieniach zasilane czystym słońcem.</p></div></div>
      <div class="hl-feat"><span class="hl-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6l6-2 5 2 5-2v14l-5 2-5-2-6 2V6z"/><path d="M10 4v14M15 6v14"/></svg></span><div><h3>Wspólna mapa</h3><p>Twórz sieć i zaznaczaj swój węzeł na mapie topologii, aby inni mogli budować mosty w Twoją stronę.</p></div></div>
    </div>
  </div>
</section>

<!-- ================= JAK ZACZĄĆ ================= -->
<section id="jak-zaczac" class="hl-sec">
  <div class="wrap">
    <h2 class="hl-h2">Krok po kroku do sieci</h2>
    <p class="hl-sub">Pierwsza wiadomość w kwadrans – bez lutowania i bez programowania.</p>
    <div class="hl-steps">
      <a href="#sprzet" class="hl-step hl-sand"><span class="hl-num">1</span><h3>Wybierz urządzenie</h3><p>Companion do telefonu albo repeater do wzmocnienia sieci.</p></a>
      <a href="<?= URL_FLASHER ?>" class="hl-step hl-mint"><span class="hl-num">2</span><h3>Wgraj firmware</h3><p>Nasz Flasher SF6 w przeglądarce – radio od razu ustawione dla sieci Południe.</p></a>
      <a href="#pobierz" class="hl-step hl-blue"><span class="hl-num">3</span><h3>Połącz z telefonem</h3><p>Aplikacja MeshSpeed albo MeshCore, połączenie przez Bluetooth.</p></a>
      <a href="/instrukcja.php#companion" class="hl-step hl-peach"><span class="hl-num">4</span><h3>Przywitaj się</h3><p>Ustaw prefiks 2 bajty, wyślij advert i napisz na kanale Public.</p></a>
    </div>
    <p class="hl-link"><a href="/instrukcja.php">Pełna instrukcja krok po kroku ›</a></p>
  </div>
</section>

<!-- ================= PRESET SF6 ================= -->
<section class="hl-sec hl-cream">
  <div class="wrap">
    <div class="hl-head-row">
      <div>
        <h2 class="hl-h2">Ustawienia radia SF6</h2>
        <p class="hl-sub">Wszyscy w sieci nadają na tych samych ustawieniach. Co one znaczą?</p>
      </div>
      <span class="hl-pill">Preset: Południe SF6</span>
    </div>
    <div class="hl-preset">
      <div class="hl-pcell"><span>Częstotliwość</span><b><?= PRESET_FREQ ?> <small>MHz</small></b><p>Kanał, na którym rozmawia cała sieć.</p></div>
      <div class="hl-pcell hl-pmain"><span>Spreading factor</span><b>SF<?= PRESET_SF ?></b><p>Krótkie pakiety – sieć mieści więcej rozmów naraz.</p></div>
      <div class="hl-pcell"><span>Szerokość pasma</span><b><?= PRESET_BW ?> <small>kHz</small></b><p>Wąski kanał – lepszy zasięg i mniej zakłóceń.</p></div>
      <div class="hl-pcell"><span>Coding rate</span><b>CR<?= PRESET_CR ?></b><p>Mocna korekcja błędów na trudnym terenie.</p></div>
      <div class="hl-pcell"><span>Prefiks ID</span><b><?= PRESET_ID_BYTES ?> <small>bajty</small></b><p>Więcej unikalnych identyfikatorów, mniej kolizji.</p></div>
    </div>
    <div class="hl-why">
      <h3>Dlaczego SF6, a nie SF8?</h3>
      <p>W sieci Meshcore Południe priorytetem jest dla nas szybkość i płynność działania, a nie wyłącznie maksymalny zasięg. Dlatego w przeciwieństwie do SF8, opieramy się na konfiguracji SF6. Przejście na ten standard pozwala na blisko czterokrotnie szybszą wymianę pakietów i znacznie zwiększa przepustowość sieci, umożliwiając stabilną i jednoczesną pracę nawet 500 nodów.</p>
    </div>
  </div>
</section>

<!-- ================= ZASIĘG ================= -->
<section id="zasieg" class="hl-sec">
  <div class="wrap">
    <h2 class="hl-h2">Gdzie dociera nasza sieć?</h2>
    <div class="hl-map">
      <div class="hl-map-svg"><?php render_coverage_map(); ?></div>
      <div class="hl-map-box">
        <span>Repeatery w sieci</span>
        <b id="rpt-count">…</b>
        <p id="rpt-status">Ładowanie węzłów RPT…</p>
        <a href="<?= URL_LIVE_MAP ?>" class="hl-btn hl-btn-main hl-btn-sm" target="_blank" rel="noopener">Mapa na żywo ↗</a>
      </div>
    </div>
    <div class="hl-cards2">
      <a href="/instrukcja.php#repeater" class="hl-wide hl-sand">
        <svg width="74" height="74" viewBox="0 0 74 74" aria-hidden="true"><path d="M10 40 L37 18 L64 40 L64 66 L10 66Z" fill="#FCE6D4" stroke="#A44F1A" stroke-width="3"/><rect x="22" y="30" width="30" height="12" fill="#3D86B8" transform="rotate(-20 37 36)"/><path d="M37 18 L37 4" stroke="#2F3B37" stroke-width="3"/><path d="M30 6 A9 9 0 0 1 44 6" fill="none" stroke="#E8833A" stroke-width="3"/></svg>
        <div><h3>Postaw repeater</h3><p>Masz dach albo działkę na wzniesieniu? Twój repeater poszerzy zasięg dla wszystkich.</p></div>
      </a>
      <a href="/mapper-sf6.php" class="hl-wide hl-blue">
        <svg width="74" height="74" viewBox="0 0 74 74" aria-hidden="true"><path d="M37 66 C37 66 14 44 14 28 A23 23 0 0 1 60 28 C60 44 37 66 37 66Z" fill="#FFFFFF" stroke="#1F5F8C" stroke-width="3"/><circle cx="37" cy="28" r="8" fill="#3D86B8"/></svg>
        <div><h3>Mapuj zasięg</h3><p>Z Mapperem SF6 każdy spacer i każda trasa dopisuje punkty do wspólnej mapy.</p></div>
      </a>
    </div>
  </div>
</section>

<!-- ================= APLIKACJE ================= -->
<section id="pobierz" class="hl-sec hl-cream">
  <div class="wrap">
    <h2 class="hl-h2">Aplikacje</h2>
    <p class="hl-sub">Do rozmów potrzebujesz aplikacji, która łączy się z Twoim urządzeniem przez Bluetooth.</p>
    <div class="hl-apps">
      <a href="/meshspeed.php" class="hl-app hl-app-ms">
        <span class="hl-app-name">Mesh<span>Speed</span></span>
        <p>Nasza aplikacja: czat, węzły, narzędzia radiowe, zarządzanie repeaterami i wbudowany Mapper – po polsku.</p>
        <span class="hl-app-go">Android · iPhone · WWW ›</span>
      </a>
      <a href="/mapper-sf6.php" id="mapper" class="hl-app hl-app-mp">
        <span class="hl-app-name">Mapper <span>SF6</span></span>
        <p>Jeździsz z companionem, a każda odpowiedź repeatera i każda cisza trafia na wspólną mapę zasięgu.</p>
        <span class="hl-app-go">Android · iPhone · mapa ›</span>
      </a>
    </div>
    <h3 class="hl-h3">Oficjalna aplikacja MeshCore</h3>
    <div class="hl-dl">
      <a href="<?= URL_GOOGLE_PLAY ?>" target="_blank" rel="noopener"><span>Android</span><b>Google Play</b></a>
      <a href="<?= URL_APP_STORE ?>" target="_blank" rel="noopener"><span>iPhone</span><b>App Store</b></a>
      <a href="<?= URL_WEB_APP ?>" target="_blank" rel="noopener"><span>Przeglądarka</span><b>Web App</b></a>
      <a href="<?= URL_WINDOWS ?>"><span>Instalator .exe</span><b>Windows</b></a>
      <a href="<?= URL_MACOS ?>"><span>Instalator .app</span><b>macOS</b></a>
      <a href="<?= URL_LINUX ?>" target="_blank" rel="noopener"><span>Dla terminala</span><b>Linux / inne</b></a>
    </div>
  </div>
</section>

<!-- ================= SPRZĘT ================= -->
<section id="sprzet" class="hl-sec">
  <div class="wrap">
    <h2 class="hl-h2">Polecany sprzęt</h2>
    <p class="hl-sub">Podzespoły, które najlepiej radzą sobie w naszej topologii.</p>
    <h3 class="hl-h3">Urządzenia osobiste (companion)</h3>
    <div class="hl-hw">
      <?php foreach ($companions as $i => [$name, $brand, $desc]): ?>
        <div class="hl-hwc <?= ['hl-blue','hl-mint','hl-peach'][$i % 3] ?>">
          <span class="hl-hw-ico"><?= $chip_icon ?></span>
          <h4><?= $name ?></h4>
          <span class="hl-brand"><?= $brand ?></span>
          <p><?= $desc ?></p>
        </div>
      <?php endforeach; ?>
    </div>
    <h3 class="hl-h3">Przekaźniki (repeater)</h3>
    <div class="hl-hw">
      <?php foreach ($repeaters as [$name, $brand, $desc]): ?>
        <div class="hl-hwc hl-sand">
          <span class="hl-hw-ico"><?= $chip_icon ?></span>
          <h4><?= $name ?></h4>
          <span class="hl-brand"><?= $brand ?></span>
          <p><?= $desc ?></p>
        </div>
      <?php endforeach; ?>
    </div>
  </div>
</section>

<!-- ================= KONFIGURACJA ================= -->
<section id="konfiguracja" class="hl-sec hl-cream">
  <div class="wrap">
    <h2 class="hl-h2">Narzędzia i konfiguracja</h2>
    <p class="hl-sub">Wszystko, czego potrzebujesz, żeby uruchomić i ustawić urządzenie.</p>
    <div class="hl-tools">
      <a href="<?= URL_FLASHER ?>" class="hl-tool">
        <span class="hl-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg></span>
        <h3>Flasher SF6</h3><p>Najnowszy oficjalny MeshCore z ustawieniami naszej sieci – prosto z przeglądarki Chrome/Edge.</p><span class="hl-more">Uruchom flasher ›</span>
      </a>
      <a href="/instrukcja.php" class="hl-tool">
        <span class="hl-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11l3 3v13H5z"/><path d="M8 10h8M8 14h8M8 18h5"/></svg></span>
        <h3>Instrukcja</h3><p>Companion i repeater krok po kroku – przez aplikację albo konsolę CLI.</p><span class="hl-more">Czytaj instrukcję ›</span>
      </a>
      <a href="<?= URL_RPT_CONFIG ?>" class="hl-tool" target="_blank" rel="noopener">
        <span class="hl-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg></span>
        <h3>Konfiguracja RPT</h3><p>Narzędzie do ustawiania repeaterów podłączonych przez USB do komputera.</p><span class="hl-more">Ustawienia USB ›</span>
      </a>
    </div>

    <div class="hl-prefix" id="rpt-config">
      <div class="hl-head-row">
        <div><h3>Prefiks MeshCore Południe – 2 bajty</h3><p class="hl-sub">Obowiązkowe ustawienie w regionie Południe.</p></div>
        <span class="hl-pill">ID: 2 bajty</span>
      </div>
      <div class="hl-prefix-grid">
        <div>
          <h4>Repeatery (firmware 1.14 i nowszy)</h4>
          <p>Na <b>wszystkich</b> urządzeniach pełniących rolę repeatera ustaw tryb 2-bajtowy (hash mode). Wpisz komendę w konsoli CLI repeatera:</p>
          <div class="hl-cmd"><code>set path.hash.mode 1</code><button type="button" class="cmd-copy" data-copy="set path.hash.mode 1">Kopiuj</button></div>
          <p class="hl-small">Sprawdzenie: <code>get path.hash.mode</code> powinno zwrócić <code>1</code>. Repeatery wgrane z czystą instalacją przez nasz <a href="<?= URL_FLASHER ?>">flasher SF6</a> mają to ustawione od razu.</p>
          <p class="hl-warn"><b>Ważne:</b> ta zmiana jest niezbędna do poprawnej obsługi rozszerzonej przestrzeni adresowej i uniknięcia kolizji w sieci.</p>
        </div>
        <div>
          <h4>Użytkownicy (companion)</h4>
          <p>W aplikacji mobilnej przełącz prefiks na 2 bajty:</p>
          <p class="hl-path">Ustawienia → Ustawienia eksperymentalne → <b>2 bajty (maks. 32 skoki)</b></p>
          <p>Pełna konfiguracja krok po kroku: <a href="/instrukcja.php#companion">instrukcja companion</a> i <a href="/instrukcja.php#repeater">instrukcja repeatera</a>.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ================= DOŁĄCZ ================= -->
<section id="dolacz" class="hl-sec">
  <div class="wrap hl-join">
    <div class="hl-join-text">
      <h2 class="hl-h2">Dołącz do nas</h2>
      <p class="hl-sub">Sieć budują ludzie z regionu – każdy nowy węzeł się liczy. Pytania, pomoc i nowości znajdziesz w naszej grupie.</p>
      <a href="<?= URL_COMMUNITY ?>" class="hl-fb" target="_blank" rel="noopener">
        <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true"><path fill="#FFFFFF" d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.4H8v3h2.5V21z"/></svg>
        <span><b>Grupa na Facebooku</b><small>MeshCore Południe</small></span>
      </a>
    </div>
    <svg class="hl-join-art" viewBox="0 0 320 220" aria-hidden="true">
      <rect width="320" height="220" rx="28" fill="#FCE6D4"/>
      <g fill="#F2C9A5"><circle cx="80" cy="86" r="24"/><circle cx="160" cy="74" r="27"/><circle cx="240" cy="86" r="24"/></g>
      <path d="M58 80 C60 56 104 54 104 82 C96 68 70 68 58 80Z" fill="#5A3B2A"/><path d="M134 70 C134 40 188 40 188 70 C180 54 142 54 134 70Z" fill="#B4552B"/><path d="M218 80 C220 58 262 56 262 82 C254 70 230 68 218 80Z" fill="#2F3B37"/>
      <rect x="52" y="114" width="56" height="86" rx="24" fill="#2E6B5A"/><rect x="130" y="106" width="60" height="94" rx="26" fill="#E8833A"/><rect x="212" y="114" width="56" height="86" rx="24" fill="#3D86B8"/>
      <g fill="#FFFFFF" stroke="#2F3B37" stroke-width="2"><rect x="100" y="24" width="40" height="26" rx="8"/><rect x="190" y="16" width="40" height="26" rx="8"/></g>
      <g fill="#2F3B37"><circle cx="112" cy="37" r="2.5"/><circle cx="120" cy="37" r="2.5"/><circle cx="128" cy="37" r="2.5"/><circle cx="202" cy="29" r="2.5"/><circle cx="210" cy="29" r="2.5"/><circle cx="218" cy="29" r="2.5"/></g>
    </svg>
  </div>
</section>

<script>
document.querySelectorAll(".cmd-copy").forEach(b => b.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = "Skopiowano"; }
  catch { b.textContent = "Zaznacz i skopiuj"; }
  setTimeout(() => b.textContent = "Kopiuj", 2000);
}));
</script>

<?php require __DIR__ . '/includes/footer.php'; ?>
