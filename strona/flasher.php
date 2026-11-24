<?php
$page_title = 'Flasher SF6';
$page_description = 'Wgraj oficjalny MeshCore z ustawieniami sieci MeshCore Południe SF6 prosto z przeglądarki.';
require __DIR__ . '/includes/header.php';
?>

<section class="fl-page">
  <div class="wrap fl-wrap">
    <div class="fl-head">
      <div>
        <span class="pill">Preset: Południe SF6</span>
        <h1>Flasher <span>SF6</span></h1>
        <p>Oficjalny MeshCore z ustawieniami naszej sieci: <span class="mono"><?= PRESET_FREQ ?> MHz · SF<?= PRESET_SF ?> · BW <?= PRESET_BW ?> · CR<?= PRESET_CR ?></span>. Nowe wersje pojawiają się tu automatycznie po oficjalnym wydaniu.</p>
      </div>
      <div class="fl-ver card" id="flVer"><div class="lbl">Wersja</div><div class="val mono">…</div><div class="sub">wczytywanie</div></div>
    </div>

    <div class="fl-notice" id="flNoSerial" hidden>Ta przeglądarka nie obsługuje wgrywania przez USB. Otwórz stronę w Chrome lub Edge na komputerze albo w Chrome na Androidzie (iPhone nie pozwala na to żadnej przeglądarce). Pliki możesz nadal pobrać ręcznie.</div>
    <div class="fl-notice" id="flAndroid" hidden><b>Telefon z Androidem:</b> podłącz urządzenie kablem USB-C ↔ USB-C (albo przez przejściówkę OTG) i używaj Chrome. Działają płytki z wbudowanym USB – ESP32-S3/C3/C6 z natywnym USB (np. ThinkNode M9), nRF52 (RAK 4631, T114, T-Echo, Wio) i RP2040. Płytki z osobnym układem USB (CP2102, CH340 – np. Heltec V3, T-Beam) wgrasz tylko z komputera. Gdy Chrome zapyta o dostęp do urządzenia USB, wybierz je i zezwól.</div>
    <div class="fl-notice err" id="flLoadErr" hidden></div>

    <div class="card fl-step" id="flS1">
      <h2><span class="fl-num">1</span>Rola urządzenia</h2>
      <div class="fl-roles" id="flRoles"></div>
    </div>

    <div class="card fl-step off" id="flS2">
      <h2><span class="fl-num">2</span>Urządzenie</h2>
      <input class="fl-search" id="flSearch" type="search" placeholder="Szukaj, np. Heltec, RAK, T114" aria-label="Szukaj urządzenia">
      <div class="fl-devices" id="flDevices"></div>
    </div>

    <div class="card fl-step off" id="flS3">
      <h2><span class="fl-num">3</span>Wgrywanie</h2>
      <div class="fl-s3grid">
        <div class="fl-s3main">
          <div id="flArea"><p class="fl-hint">Wybierz rolę i urządzenie.</p></div>
          <p class="fl-hint"><b>Po aktualizacji companiona:</b> usuń urządzenie z listy Bluetooth w telefonie („Zapomnij urządzenie”) i sparuj je od nowa. Po wgraniu firmware radio nie ma już starych kluczy parowania, a telefon dalej ich używa — połączenie działa wtedy tylko częściowo, np. kontakty się wczytują, a wiadomości nie przychodzą.</p>
        </div>
        <aside class="fl-run" id="flRun" aria-label="Przebieg wgrywania">
          <div class="fl-run-h">Przebieg</div>
          <p class="fl-run-idle" id="flRunIdle">Tu zobaczysz każdy etap – kasowanie pamięci, tryb DFU, bootloader OTAFIX i firmware SF6 – z postępem i czasem.</p>
          <ol class="fl-steps" id="flSteps" hidden aria-label="Kroki"></ol>
          <div class="fl-barlbl" id="flBarLbl"></div>
          <div class="fl-progress" aria-hidden="true"><div id="flBar"></div></div>
          <div class="fl-status" id="flStatus" role="status" aria-live="polite"></div>
          <div class="fl-actions fl-cont"><button class="btn btn-green" id="flCont" hidden>Kontynuuj – wybierz port DFU</button></div>
          <div class="fl-note fl-next" id="flNext" hidden></div>
          <div class="fl-run-logh">Dziennik</div>
          <pre id="flLog" class="fl-runlog"></pre>
        </aside>
      </div>
    </div>

    <p class="fl-foot">Firmware budowany automatycznie z oficjalnych wydań <a href="https://github.com/meshcore-dev/MeshCore/releases" target="_blank" rel="noopener">meshcore-dev/MeshCore</a>. Źródła i wszystkie pliki: <a href="<?= URL_SF6_FIRMWARE_REPO ?>" target="_blank" rel="noopener">GitHub</a>. Ustawienia SF6 obowiązują przy czystej instalacji; aktualizacja zachowuje to, co już jest zapisane w urządzeniu.</p>
  </div>
</section>

<script>
window.FL_NRF_DFU = "/assets/nrf-dfu.js?v=<?= filemtime(__DIR__ . '/assets/nrf-dfu.js') ?>";
window.FL_NRF_ERASE = {
  v6: "/assets/nrf52-erase-s140v6.bin?v=<?= filemtime(__DIR__ . '/assets/nrf52-erase-s140v6.bin') ?>",
  v7: "/assets/nrf52-erase-s140v7.bin?v=<?= filemtime(__DIR__ . '/assets/nrf52-erase-s140v7.bin') ?>"
};
</script>
<script type="module" src="/assets/flasher.js?v=<?= filemtime(__DIR__ . '/assets/flasher.js') ?>"></script>
<?php require __DIR__ . '/includes/footer.php'; ?>
