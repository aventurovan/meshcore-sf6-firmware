<?php
$page_title = 'Strona główna';
$page_description = 'Niezależna sieć LoRa off-grid dla Śląska, Podbeskidzia i Małopolski, działająca na presecie SF6.';
require __DIR__ . '/includes/header.php';
require __DIR__ . '/includes/map-svg.php';
?>

<section style="padding-top:48px;">
  <div class="wrap">
    <div style="text-align:center; max-width:680px; margin:0 auto;">
      <h1 style="font-size:clamp(30px,5vw,48px); line-height:1.12; margin-bottom:18px;">Sieć, której <span style="color:var(--green);">nikt nie wyłączy.</span></h1>
      <p style="color:var(--muted); font-size:16.5px; margin-bottom:28px;">Działamy bez operatorów, bez prądu i bez abonamentu. MeshCore Południe to Twoja niezależność komunikacyjna w świecie off-grid.</p>
      <div style="display:flex; gap:14px; justify-content:center; flex-wrap:wrap;">
        <a href="#pobierz" class="btn btn-white">⬇ Pobierz Aplikację</a>
        <a href="<?= URL_COMMUNITY ?>" class="btn btn-blue" target="_blank" rel="noopener">💬 Dołącz do Społeczności</a>
      </div>
    </div>

    <div class="card preset-card" style="margin-top:40px;">
      <div class="preset-head">
        <span class="warn">⚠ Parametry sieci (Południe custom)</span>
        <span class="pill">PRESET: POŁUDNIE SF6</span>
      </div>
      <div class="preset-grid">
        <div class="preset-cell"><div class="lbl">Freq</div><div class="val mono"><?= PRESET_FREQ ?></div><div class="unit">MHz</div></div>
        <div class="preset-cell active"><div class="lbl">SF</div><div class="val mono"><?= PRESET_SF ?></div><div class="unit">Custom</div></div>
        <div class="preset-cell"><div class="lbl">BW</div><div class="val mono"><?= PRESET_BW ?></div><div class="unit">kHz</div></div>
        <div class="preset-cell"><div class="lbl">CR</div><div class="val mono"><?= PRESET_CR ?></div><div class="unit">Long</div></div>
        <div class="preset-cell"><div class="lbl">ID</div><div class="val mono"><?= PRESET_ID_BYTES ?></div><div class="unit">Bytes</div></div>
      </div>
    </div>
  </div>
</section>

<section id="co-to-jest" style="border-top:1px solid var(--line);">
  <div class="wrap">
    <div class="sec-head">
      <h2>Co to jest <span>MeshCore</span></h2>
      <p>Zbudowana przez pasjonatów, rozproszona sieć radiowa LoRa do tekstowej komunikacji bezpośredniej.</p>
    </div>
    <div class="grid-3" style="margin-bottom:16px;">
      <div class="card feat">
        <div class="ico-box"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 6L4 12l5 6M15 6l5 6-5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <h3>Open Source</h3>
        <p>Pełna transparentność kodu i narzędzi. Żadnych ukrytych furtek, tylko czysta technologia.</p>
      </div>
      <div class="card feat">
        <div class="ico-box"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="currentColor" stroke-width="1.8"/></svg></div>
        <h3>End-to-End</h3>
        <p>Szyfrowanie AES-256 zapewnia, że Twoje wiadomości przeczytasz tylko Ty i Twój odbiorca.</p>
      </div>
      <div class="card feat">
        <div class="ico-box"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 12a7 7 0 0114 0M8 12a4 4 0 018 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg></div>
        <h3>Duży Zasięg (LoRa)</h3>
        <p>Dzięki LoRa i systemowi przekaźników (repeaterów), sieć sięga dziesiątki kilometrów poza miasto.</p>
      </div>
    </div>
    <div class="grid-3">
      <div class="card feat">
        <div class="ico-box"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.8"/><path d="M17 9.5l4-2.5v10l-4-2.5" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></div>
        <h3>Niski Pobór Mocy</h3>
        <p>Zoptymalizowane zużycie energii pozwala urządzeniom działać dniami, a nawet tygodniami na jednej baterii.</p>
      </div>
      <div class="card feat">
        <div class="ico-box"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.8"/><path d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></div>
        <h3>Węzły Solarne</h3>
        <p>Nasza infrastruktura to głównie bezobsługowe punkty na wzniesieniach zasilane czystym słońcem.</p>
      </div>
      <div class="card feat">
        <div class="ico-box"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 6l6-2 5 2 5-2v14l-5 2-5-2-6 2V6z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 4v14M15 6v14" stroke="currentColor" stroke-width="1.8"/></svg></div>
        <h3>Wspólna Mapa</h3>
        <p>Twórz sieć i zaznaczaj swój węzeł na mapie topologii, aby inni mogli budować mosty w Twoją stronę.</p>
      </div>
    </div>
  </div>
</section>

<section id="jak-zaczac" style="border-top:1px solid var(--line);">
  <div class="wrap">
    <div class="sec-head">
      <h2>Jak <span>zacząć?</span></h2>
      <p>Dołączenie do nas to tylko 3 proste kroki techniczne.</p>
    </div>
    <div class="grid-3">
      <div class="card step-card">
        <div class="step-circle">1</div>
        <h3>ZDOBĄDŹ APLIKACJĘ</h3>
        <p>Pobierz i zainstaluj darmową aplikację na swój telefon lub komputer (Android/iOS/PC).</p>
        <a href="#pobierz" class="btn btn-green" style="width:100%; justify-content:center;">Idź do pobierania</a>
      </div>
      <div class="card step-card">
        <div class="step-circle">2</div>
        <h3>KUP WĘZEŁ LORA</h3>
        <p>Wybierz płytkę z radiem LoRa (np. Heltec v3). To ona będzie sercem Twojej komunikacji.</p>
        <a href="#sprzet" class="btn btn-green" style="width:100%; justify-content:center;">Zobacz sprzęt</a>
      </div>
      <div class="card step-card">
        <div class="step-circle">3</div>
        <h3>SKONFIGURUJ POŁUDNIE</h3>
        <p>Ustaw parametry radia zgodnie z naszym presetem SF6, aby widzieć innych w regionie.</p>
        <a href="#konfiguracja" class="btn btn-green" style="width:100%; justify-content:center;">Instrukcja konfiguracji</a>
      </div>
    </div>
  </div>
</section>

<section id="pobierz" style="border-top:1px solid var(--line);">
  <div class="wrap">
    <div class="sec-head">
      <div class="ico-box" style="margin:0 auto 18px;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 19h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <h2>Pobierz <span>Aplikację</span></h2>
      <p>Wszystkie narzędzia są darmowe i otwarte.</p>
    </div>
    <div class="grid-3" style="margin-bottom:16px;">
      <a href="<?= URL_GOOGLE_PLAY ?>" target="_blank" rel="noopener" class="card dl-card">
        <div class="dl-ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="7" y="2" width="10" height="20" rx="2" stroke="currentColor" stroke-width="1.8"/></svg></div>
        <div><span class="label lbl">Wersja Android</span><span class="name">Google Play</span></div>
      </a>
      <a href="<?= URL_APP_STORE ?>" target="_blank" rel="noopener" class="card dl-card">
        <div class="dl-ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="7" y="2" width="10" height="20" rx="2" stroke="currentColor" stroke-width="1.8"/></svg></div>
        <div><span class="label lbl">Wersja iOS</span><span class="name">App Store</span></div>
      </a>
      <a href="<?= URL_WEB_APP ?>" target="_blank" rel="noopener" class="card dl-card">
        <div class="dl-ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14 3h7v7M21 3L10 14M11 5H5a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <div><span class="label lbl">Przeglądarka</span><span class="name">Web App</span></div>
      </a>
    </div>
    <div class="grid-3">
      <a href="<?= URL_WINDOWS ?>" class="card dl-card">
        <div class="dl-ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="12" rx="1.5" stroke="currentColor" stroke-width="1.8"/><path d="M8 20h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></div>
        <div><span class="label lbl">Instalator .exe</span><span class="name">Windows</span></div>
      </a>
      <a href="<?= URL_MACOS ?>" class="card dl-card">
        <div class="dl-ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="12" rx="1.5" stroke="currentColor" stroke-width="1.8"/><path d="M8 20h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></div>
        <div><span class="label lbl">Instalator .app</span><span class="name">macOS</span></div>
      </a>
      <a href="<?= URL_LINUX ?>" target="_blank" rel="noopener" class="card dl-card">
        <div class="dl-ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 17l6-5-6-5M12 19h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <div><span class="label lbl">Dla terminala</span><span class="name">Linux / Inne</span></div>
      </a>
    </div>
  </div>
</section>

<section id="sprzet" style="border-top:1px solid var(--line);">
  <div class="wrap">
    <div class="sec-head">
      <h2>Rekomendowany <span>Sprzęt</span></h2>
      <p>Podzespoły, które najlepiej radzą sobie w naszej topologii.</p>
    </div>

    <div class="subsection-head">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="7" y="2" width="10" height="20" rx="2" stroke="currentColor" stroke-width="1.8"/></svg>
      <h3>Węzły mobilne (Companions)</h3>
    </div>
    <?php
    $companions = [
        ['Wio Tracker L1 Pro', 'Seeed Studio', 'Kompaktowy moduł z zaawansowanymi funkcjami pozycjonowania.'],
        ['ThinkNode M1', 'Elecrow', 'Solidny węzeł osobisty zamknięty w gotowej, wytrzymałej obudowie.'],
        ['T-Deck', 'Lilygo', 'Urządzenie Standalone z wbudowaną klawiaturą i ekranem. Nie wymaga telefonu do działania!'],
        ['SenseCAP T1000-A', 'Seeed Studio', 'Zamknięty w obudowie z baterią o wielkości karty. Świetny węzeł mobilny.'],
        ['Heltec V3 / V4', 'Heltec Automation', 'Najpopularniejszy, tani, posiada ekran OLED. Wymaga podłączenia do telefonu po Bluetooth.'],
        ['Heltec DIY', 'Konstrukcja własna', 'Bazuje na płytkach rodziny Heltec. Dopasuj baterię, antenę i obudowę pod swoje potrzeby.'],
    ];
    $chip_icon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="6" y="6" width="12" height="12" rx="1.5" stroke="currentColor" stroke-width="1.6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    ?>
    <div class="grid-3" style="margin-bottom:16px;">
      <?php foreach (array_slice($companions, 0, 3) as [$name, $brand, $desc]): ?>
        <div class="card hw-card">
          <div class="hw-chip"><?= $chip_icon ?></div>
          <h3><?= $name ?></h3>
          <span class="brand-tag"><?= $brand ?></span>
          <p><?= $desc ?></p>
        </div>
      <?php endforeach; ?>
    </div>
    <div class="grid-3">
      <?php foreach (array_slice($companions, 3, 3) as [$name, $brand, $desc]): ?>
        <div class="card hw-card">
          <div class="hw-chip"><?= $chip_icon ?></div>
          <h3><?= $name ?></h3>
          <span class="brand-tag"><?= $brand ?></span>
          <p><?= $desc ?></p>
        </div>
      <?php endforeach; ?>
    </div>

    <div class="subsection-head" style="margin-top:44px;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12a7 7 0 0114 0M8 12a4 4 0 018 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg>
      <h3>Węzły przekaźnikowe (Repeatery)</h3>
    </div>
    <?php
    $repeaters = [
        ['RAK WisBlock DIY (RAK4631)', 'RAK Wireless', 'Modułowy, niezwykle energooszczędny system. Zbuduj profesjonalny repeater z panelem słonecznym.'],
        ['SenseCAP Solar', 'Seeed Studio', 'Gotowe, zamknięte i bezobsługowe rozwiązanie bazujące na zasilaniu słonecznym.'],
        ['XIAO nRF52 WIO DIY', 'Seeed Studio', 'Bazuje na miniaturowym mikrokontrolerze. Rewelacyjna baza kosztowa dla autorskiego routera.'],
    ];
    ?>
    <div class="grid-3">
      <?php foreach ($repeaters as [$name, $brand, $desc]): ?>
        <div class="card hw-card">
          <div class="hw-chip"><?= $chip_icon ?></div>
          <h3><?= $name ?></h3>
          <span class="brand-tag"><?= $brand ?></span>
          <p><?= $desc ?></p>
        </div>
      <?php endforeach; ?>
    </div>
  </div>
</section>

<section id="konfiguracja" style="border-top:1px solid var(--line);">
  <div class="wrap">
    <div class="sec-head">
      <h2>Centrum <span>Konfiguracji</span></h2>
      <p>Narzędzia potrzebne do aktywacji Twojego urządzenia.</p>
    </div>
    <div class="grid-3">
      <div class="card tool-card">
        <div class="ico-box"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></div>
        <h3>Web Flasher</h3>
        <p>Wgraj najnowszy oficjalny MeshCore z ustawieniami SF6 naszej sieci, bezpośrednio z przeglądarki Chrome/Edge.</p>
        <a href="<?= URL_FLASHER ?>" class="go">Uruchom flasher SF6 ›</a>
      </div>
      <div class="card tool-card">
        <div class="ico-box"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 3h8l4 4v14H6V3z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 12l1.5 1.5L14 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <h3>Baza Prefiksów (ID)</h3>
        <p>Sprawdź przypisane już ID, aby uniknąć duplikowania identyfikatorów i tworzenia kolizji w sieci.</p>
        <a href="<?= URL_PREFIX_DB ?>" target="_blank" rel="noopener" class="go">Sprawdź prefiks ›</a>
      </div>
      <div class="card tool-card">
        <div class="ico-box"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/><path d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></div>
        <h3>Konfiguracja RPT</h3>
        <p>Specjalistyczne narzędzie konfiguracyjne dla węzłów przekaźnikowych podłączonych przez USB do komputera.</p>
        <a href="<?= URL_RPT_CONFIG ?>" target="_blank" rel="noopener" class="go">Ustawienia USB ›</a>
      </div>
    </div>

    <div class="card preset-card" style="margin-top:32px; text-align:center;">
      <div style="display:flex; justify-content:flex-end;"><span class="pill">Preset: Południe SF6</span></div>
      <h2 style="margin-top:6px;">Ustawienia radia SF6</h2>
      <p style="color:var(--muted); margin:12px 0 26px;">Skonfiguruj radio dokładnie tak, aby widzieć użytkowników w regionie.</p>
      <div class="preset-grid" style="text-align:center;">
        <div class="preset-cell"><div class="lbl">Freq</div><div class="val mono"><?= PRESET_FREQ ?></div><div class="unit">MHz</div></div>
        <div class="preset-cell active"><div class="lbl">SF</div><div class="val mono"><?= PRESET_SF ?></div><div class="unit">Custom</div></div>
        <div class="preset-cell"><div class="lbl">BW</div><div class="val mono"><?= PRESET_BW ?></div><div class="unit">kHz</div></div>
        <div class="preset-cell"><div class="lbl">CR</div><div class="val mono"><?= PRESET_CR ?></div><div class="unit">Long</div></div>
        <div class="preset-cell"><div class="lbl">ID</div><div class="val mono"><?= PRESET_ID_BYTES ?></div><div class="unit">Bytes</div></div>
      </div>
    </div>
  </div>
</section>

<section style="border-top:1px solid var(--line);">
  <div class="wrap">
    <div class="card analysis-card">
      <h2>Dlaczego <span>SF6</span>, a nie SF8?</h2>
      <p>W sieci Meshcore Południe priorytetem jest dla nas szybkość i płynność działania, a nie wyłącznie maksymalny zasięg. Dlatego w przeciwieństwie do SF8, opieramy się na konfiguracji SF6. Przejście na ten standard pozwala na blisko czterokrotnie szybszą wymianę pakietów i znacznie zwiększa przepustowość sieci, umożliwiając stabilną i jednoczesną pracę nawet 500 nodów.</p>
    </div>
  </div>
</section>

<section id="zasieg" style="border-top:1px solid var(--line);">
  <div class="wrap map-cta">
    <div class="ico-box" style="color:var(--green);"><svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M4 6l6-2 5 2 5-2v14l-5 2-5-2-6 2V6z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 4v14M15 6v14" stroke="currentColor" stroke-width="1.8"/></svg></div>
    <h2>Sprawdź zasięg w swojej okolicy</h2>
    <div class="actions">
      <a href="<?= URL_LIVE_MAP ?>" class="btn btn-green" target="_blank" rel="noopener">Otwórz Mapę ↗</a>
      <a href="#mapper" class="btn btn-line">Mapper ↓</a>
    </div>
    <p id="rpt-status" class="mono" style="color:var(--muted); font-size:12.5px; margin-top:16px;">Ładowanie węzłów RPT…</p>

    <div class="map-figure">
      <?php render_coverage_map(); ?>
    </div>
  </div>
</section>

<section id="mapper" style="border-top:1px solid var(--line);">
  <div class="wrap">
    <div class="sec-head">
      <h2>Mapper <span>SF6</span></h2>
      <p>Aplikacja do mapowania zasięgu sieci. Łączysz się przez Bluetooth ze swoim companionem, a Mapper wysyła ping discovery i zapisuje na mapie każdy punkt, w którym odezwał się repeater. Mapuj z telefonu — wyniki od razu trafiają na wspólną mapę.</p>
    </div>

    <div class="mapper-os">
      <a href="<?= URL_MAPPER_APK ?>" class="card os-card" target="_blank" rel="noopener">
        <div class="os-ico os-android">
          <svg width="46" height="46" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M6.5 10a5.5 5.5 0 0111 0z"/>
            <circle cx="9.8" cy="7.6" r=".75" fill="#0D1420"/>
            <circle cx="14.2" cy="7.6" r=".75" fill="#0D1420"/>
            <path d="M8.6 5.2L7.4 3.1M15.4 5.2l1.2-2.1" stroke="currentColor" stroke-width="1" stroke-linecap="round" fill="none"/>
            <rect x="6.5" y="10.8" width="11" height="7.7" rx="1.6"/>
            <rect x="3.4" y="10.8" width="2.3" height="5.8" rx="1.15"/>
            <rect x="18.3" y="10.8" width="2.3" height="5.8" rx="1.15"/>
            <rect x="8.7" y="17.6" width="2.2" height="3.8" rx="1.1"/>
            <rect x="13.1" y="17.6" width="2.2" height="3.8" rx="1.1"/>
          </svg>
        </div>
        <div class="os-body">
          <span class="label">Android</span>
          <h3>Pobierz plik APK</h3>
          <p>Instalacja bezpośrednio z pliku, poza Google Play — wymaga zgody na instalację z nieznanych źródeł.</p>
          <span class="go">Pobierz APK ›</span>
        </div>
      </a>

      <a href="<?= URL_MAPPER_IOS ?>" class="card os-card" target="_blank" rel="noopener">
        <div class="os-ico os-ios">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
          </svg>
        </div>
        <div class="os-body">
          <span class="label">iOS</span>
          <h3>Dołącz przez TestFlight</h3>
          <p>Wersja testowa dla iPhone'a — wymaga zainstalowanej aplikacji TestFlight od Apple.</p>
          <span class="go">Otwórz TestFlight ›</span>
        </div>
      </a>
    </div>

    <div class="actions" style="display:flex; justify-content:center; margin-top:32px;">
      <a href="<?= URL_MAPPER ?>" class="btn btn-green" target="_blank" rel="noopener">Otwórz mapę Mappera ↗</a>
    </div>
  </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
