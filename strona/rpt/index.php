<?php
$page_title = 'Konfigurator RPT';
$page_description = 'Konfiguracja repeatera MeshCore przez USB w przeglądarce – preset Południe SF6, adverty, hasła, klucz i ID.';
require __DIR__ . '/../includes/header.php';
$asset = fn($f) => '/assets/' . $f . '?v=' . filemtime(__DIR__ . '/../assets/' . $f);
?>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">

<section class="rp-page">
  <div class="wrap rp-wrap">

    <div class="rp-head">
      <div>
        <span class="pill">Preset: Południe SF6</span>
        <h1>Konfigurator <span>RPT</span></h1>
        <p>Ustawienia repeatera podłączonego kablem USB – w Chrome lub Edge na komputerze. Wolisz telefon? Repeater ustawisz też w aplikacji: zobacz <a href="/instrukcja.php#repeater">instrukcję repeatera</a>.</p>
      </div>
      <div class="rp-conn card">
        <div class="rp-status">
          <span id="statusDot" class="rp-dot"></span>
          <span id="statusText">Rozłączono</span>
          <span id="status_info_id" class="rp-node" hidden></span>
        </div>
        <button type="button" id="btnConnect" class="btn btn-green">Połącz przez USB</button>
        <button type="button" id="btnDisconnect" class="btn btn-line" hidden>Rozłącz</button>
      </div>
    </div>

    <div class="fl-notice" id="rpNoSerial" hidden>Ta przeglądarka nie obsługuje połączenia USB (Web Serial). Otwórz stronę w Chrome lub Edge na komputerze.</div>

    <div class="rp-grid">
      <div class="rp-forms is-off" id="configForms">

        <!-- REPEATER -->
        <div class="card rp-card">
          <h2><span class="fl-num">1</span>Repeater</h2>
          <div class="rp-info">
            <div><span>Płytka</span><b id="info_board">-</b></div>
            <div><span>Firmware</span><b id="info_fw">-</b></div>
            <div><span>Przekazywanie</span><b id="info_repeat">-</b></div>
            <div><span>Zegar (UTC)</span><b id="info_clock">-</b>
              <span id="clock_warning" class="rp-badge rp-err" hidden>zły czas</span>
              <button type="button" id="btnSyncClock" class="rp-mini" hidden>Synchronizuj</button>
            </div>
          </div>
          <p id="board_note" class="rp-hint" hidden></p>
          <div class="rp-actions">
            <button type="button" id="btnAdvert" class="btn btn-line">Wyślij advert</button>
            <button type="button" id="btnToggleRepeat" class="btn btn-line">Włącz / wyłącz przekazywanie</button>
            <button type="button" id="btnOTA" class="btn btn-line">Aktualizacja OTA</button>
            <button type="button" id="btnReboot" class="btn btn-line">Restart</button>
            <button type="button" id="btnFactory" class="btn rp-btn-danger">Ustawienia fabryczne</button>
          </div>
          <div class="rp-actions rp-actions-sub">
            <button type="button" id="btnReload" class="btn btn-green-line">Odśwież dane</button>
            <span class="rp-spacer"></span>
            <button type="button" id="btnApplyImport" class="btn rp-btn-warn" hidden>Zastosuj import i restart</button>
            <button type="button" id="btnExport" class="btn btn-line">Eksportuj do pliku</button>
            <button type="button" id="btnImport" class="btn btn-line">Importuj z pliku</button>
            <input type="file" id="fileImportConfig" accept=".json,application/json" hidden>
          </div>
        </div>

        <!-- SZYBKA KONFIGURACJA -->
        <div class="card rp-card rp-quick">
          <div>
            <h2>Szybka konfiguracja Południe SF6</h2>
            <p>Jednym kliknięciem ustawia standard naszej sieci: radio <b><?= PRESET_FREQ ?> MHz · BW <?= PRESET_BW ?> · SF<?= PRESET_SF ?> · CR<?= PRESET_CR ?></b>, moc maksymalna (22 dBm), prefiks 2 bajty, advert lokalny co 60 min, flood co 12 h. Potem sprawdza odczytem, czy wszystko się zapisało.</p>
          </div>
          <button type="button" id="btnQuickSf6" class="btn btn-green">Ustaw preset Południe SF6</button>
        </div>

        <div class="rp-two">
          <!-- NAZWA I LOKALIZACJA -->
          <div class="card rp-card">
            <h2><span class="fl-num">2</span>Nazwa i lokalizacja</h2>
            <label class="rp-field"><span>Nazwa repeatera</span>
              <input type="text" id="conf_name" maxlength="31" placeholder="np. RPT Skrzyczne" autocomplete="off"></label>
            <p class="rp-hint">Do 31 znaków, bez znaków [ ] \ : , ? *</p>
            <div class="rp-row2">
              <label class="rp-field"><span>Szerokość (lat)</span><input type="text" id="conf_lat" inputmode="decimal" placeholder="np. 49.822"></label>
              <label class="rp-field"><span>Długość (lon)</span><input type="text" id="conf_lon" inputmode="decimal" placeholder="np. 19.044"></label>
            </div>
            <button type="button" id="btnOpenMap" class="btn btn-green-line rp-full">Wybierz z mapy</button>
            <button type="button" id="btnApplyLoc" class="btn btn-green rp-full">Zapisz nazwę i lokalizację</button>
          </div>

          <!-- ADVERTY -->
          <div class="card rp-card">
            <h2><span class="fl-num">3</span>Adverty</h2>
            <div class="rp-row2">
              <label class="rp-field"><span>Advert lokalny (min)</span><input type="number" id="conf_adv_int" min="0" max="240" step="2" placeholder="60"></label>
              <label class="rp-field"><span>Advert flood (godz.)</span><input type="number" id="conf_flood_adv_int" min="0" max="168" placeholder="12"></label>
            </div>
            <div id="zero_hop_status" class="rp-check"></div>
            <div id="flood_adv_status" class="rp-check"></div>
            <p class="rp-hint">Standard sieci: lokalny co 60 min, flood co 12 h. Dozwolone: lokalny 0 (wył.) lub 60–240 min, flood 0 (wył.) lub 3–168 h.</p>
            <label class="rp-field"><span>Maks. liczba skoków (flood.max)</span><input type="number" id="conf_flood_max" min="0" max="64" placeholder="32"></label>
            <div id="flood_max_status" class="rp-check"></div>
            <button type="button" id="btnApplyAdvert" class="btn btn-green rp-full">Zapisz adverty</button>
          </div>

          <!-- RADIO -->
          <div class="card rp-card">
            <h2><span class="fl-num">4</span>Radio</h2>
            <div class="rp-row2">
              <label class="rp-field"><span>Częstotliwość (MHz)</span><input type="number" step="0.001" id="conf_freq" placeholder="869.618"></label>
              <label class="rp-field"><span>Szerokość pasma (kHz)</span>
                <select id="conf_bw">
                  <option value="62.5">62.5</option><option value="125">125</option><option value="250">250</option><option value="500">500</option>
                </select></label>
              <label class="rp-field"><span>Spreading factor</span>
                <select id="conf_sf">
                  <option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option>
                  <option value="9">9</option><option value="10">10</option><option value="11">11</option><option value="12">12</option>
                </select></label>
              <label class="rp-field"><span>Coding rate</span>
                <select id="conf_cr"><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option></select></label>
              <label class="rp-field"><span>Moc TX (dBm)</span><input type="number" id="conf_tx" min="-9" max="30" placeholder="22"></label>
              <label class="rp-field"><span>Prefiks ID (path.hash.mode)</span>
                <select id="conf_path_hash_mode">
                  <option value="0">1 bajt (0)</option>
                  <option value="1">2 bajty (1) – obowiązkowo</option>
                  <option value="2">3 bajty (2)</option>
                </select></label>
            </div>
            <div id="radio_warning" class="rp-alert" hidden><b>Uwaga:</b> radio albo prefiks różnią się od standardu Południe SF6 (<?= PRESET_FREQ ?> / <?= PRESET_BW ?> / SF<?= PRESET_SF ?>, 2 bajty; CR może być dowolny). Repeater nie będzie działał w naszej sieci – użyj szybkiej konfiguracji.</div>
            <p class="rp-hint">Zmiana radia działa po restarcie repeatera. Płytki ze wzmacniaczem (np. 1 W) przy 22 dBm nadają mocniej – limit pasma 869,4–869,65 MHz to 500 mW ERP.</p>
            <button type="button" id="btnApplyRadio" class="btn btn-green rp-full">Zapisz radio</button>
          </div>

          <!-- DOSTĘP -->
          <div class="card rp-card">
            <h2><span class="fl-num">5</span>Hasła i dostęp</h2>
            <label class="rp-field"><span>Hasło administratora</span>
              <span class="rp-pass"><input type="password" id="conf_admin_pass" maxlength="15" placeholder="nowe hasło" autocomplete="new-password"><button type="button" class="rp-eye" data-toggle="conf_admin_pass" aria-label="Pokaż hasło">Pokaż</button></span></label>
            <label class="rp-field"><span>Hasło gościa</span>
              <span class="rp-pass"><input type="password" id="conf_guest_pass" maxlength="15" placeholder="opcjonalnie" autocomplete="new-password"><button type="button" class="rp-eye" data-toggle="conf_guest_pass" aria-label="Pokaż hasło">Pokaż</button></span></label>
            <p class="rp-hint">Maks. 15 znaków. Domyślne hasło nowego repeatera to <code>password</code> – zmień je.</p>
            <button type="button" id="btnSetPasswords" class="btn btn-green rp-full">Zapisz hasła</button>
            <div class="rp-sep"></div>
            <label class="rp-field"><span>Uprawnienia dla klucza publicznego (ACL)</span>
              <input type="text" id="conf_acl_key" class="rp-mono" placeholder="pełny klucz publiczny (64 znaki hex)" autocomplete="off"></label>
            <div class="rp-row-btn">
              <select id="conf_acl_perm" aria-label="Uprawnienia">
                <option value="3">Administrator</option>
                <option value="2">Odczyt i zapis</option>
                <option value="1">Tylko odczyt</option>
                <option value="0">Usuń z listy (gość)</option>
              </select>
              <button type="button" id="btnSetACL" class="btn btn-line">Zapisz</button>
            </div>
          </div>
        </div>

        <!-- KLUCZ I ID -->
        <div class="card rp-card">
          <h2><span class="fl-num">6</span>Klucz i ID repeatera</h2>
          <div class="rp-keygrid">
            <div>
              <label class="rp-field"><span>Wybrane ID (4 znaki hex)</span>
                <input type="text" id="conf_desired_id" maxlength="4" class="rp-mono rp-upper" placeholder="np. AB12" autocomplete="off"></label>
              <div id="id_length_status" class="rp-check"></div>
              <p class="rp-hint">ID to pierwsze 2 bajty klucza publicznego. Wygenerujemy klucz, który zaczyna się od wybranego ID. Puste pole = losowe ID.</p>
            </div>
            <div class="rp-keys">
              <label class="rp-field"><span>Klucz prywatny</span>
                <span class="rp-pass"><input type="password" id="conf_priv_key" class="rp-mono" placeholder="odczytany klucz prywatny" autocomplete="off"><button type="button" class="rp-eye" data-toggle="conf_priv_key" aria-label="Pokaż klucz">Pokaż</button></span></label>
              <label class="rp-field"><span>Klucz publiczny</span><input type="text" id="conf_pub_key" class="rp-mono" readonly placeholder="odczytany klucz publiczny"></label>
              <div class="rp-idnow">Aktualne ID: <b id="current_id_prefix">--</b></div>
            </div>
          </div>
          <div class="rp-actions">
            <button type="button" id="btnGenerateKey" class="btn btn-green"><span id="genSpinner" class="rp-spin" hidden></span>Generuj klucz</button>
            <span id="genSpinnerStatus" class="rp-gen"></span>
            <span class="rp-spacer"></span>
            <button type="button" id="btnApplyKey" class="btn btn-line">Zapisz klucz w repeaterze</button>
          </div>
        </div>

        <!-- ZAAWANSOWANE -->
        <details class="card rp-card rp-adv" id="advancedBox">
          <summary><h2>Ustawienia zaawansowane</h2></summary>
          <div class="rp-row3">
            <label class="rp-field"><span>Duty cycle (%)</span><input type="number" id="conf_dutycycle" min="1" max="100" step="0.1" placeholder="50"></label>
            <label class="rp-field"><span>Wykrywanie pętli</span>
              <select id="conf_loop_detect"><option value="off">off</option><option value="minimal">minimal</option><option value="moderate">moderate</option><option value="strict">strict</option></select></label>
            <label class="rp-field"><span>Próg zakłóceń (int.thresh)</span><input type="number" id="conf_int_thresh" placeholder="0"></label>
            <label class="rp-field"><span>Reset AGC (s)</span><input type="number" step="4" min="0" max="1020" id="conf_agc_reset" placeholder="0"></label>
            <label class="rp-field"><span>RX delay</span><input type="number" step="0.1" min="0" max="20" id="conf_rxdelay" placeholder="0"></label>
            <label class="rp-field"><span>TX delay</span><input type="number" step="0.1" min="0" max="2" id="conf_txdelay" placeholder="0.5"></label>
            <label class="rp-field"><span>Direct TX delay</span><input type="number" step="0.1" min="0" max="2" id="conf_direct_txdelay" placeholder="0.3"></label>
          </div>
          <label class="rp-field"><span>Informacje o właścicielu (owner.info)</span>
            <textarea id="conf_owner_info" rows="3" placeholder="kontakt do opiekuna repeatera"></textarea></label>
          <div class="rp-counter"><span id="owner_info_counter">0 / 119 bajtów</span></div>
          <label class="rp-checkline"><input type="checkbox" id="conf_multi_acks"> Multi ACKs (multi.acks)</label>
          <button type="button" id="btnApplyAdvanced" class="btn btn-green rp-full">Zapisz ustawienia zaawansowane</button>
        </details>
      </div>

      <!-- TERMINAL -->
      <aside class="rp-term" aria-label="Terminal">
        <div class="rp-term-head"><b>Terminal</b><button type="button" id="btnClear">Wyczyść</button></div>
        <div id="terminalOutput" class="rp-term-out" role="log" aria-live="polite"></div>
        <div class="rp-term-in"><span>&gt;</span><input type="text" id="terminalInput" placeholder="komenda, np. get name" autocomplete="off" disabled aria-label="Komenda CLI"></div>
      </aside>
    </div>
  </div>
</section>

<!-- okno komunikatów -->
<div id="customModal" class="rp-modal" hidden>
  <div class="rp-modal-box" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
    <h3 id="modalTitle"></h3>
    <p id="modalText"></p>
    <div class="rp-modal-btns" id="modalButtons"></div>
  </div>
</div>

<!-- mapa -->
<div id="mapModal" class="rp-modal" hidden>
  <div class="rp-modal-box rp-map-box" role="dialog" aria-modal="true" aria-label="Wybierz lokalizację repeatera">
    <div class="rp-map-head"><h3>Wybierz lokalizację repeatera</h3><button type="button" id="btnCloseMap" class="rp-x" aria-label="Zamknij">×</button></div>
    <div id="mapContainer"></div>
    <div class="rp-map-foot">
      <span>Pinezka: <b id="mapSelectedCoords">brak</b></span>
      <button type="button" id="btnConfirmMap" class="btn btn-green">Użyj tych współrzędnych</button>
    </div>
  </div>
</div>

<script>window.RP_PRESET = { freq: "<?= PRESET_FREQ ?>", bw: "<?= PRESET_BW ?>", sf: "<?= PRESET_SF ?>", cr: "<?= PRESET_CR ?>" };</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/tweetnacl/1.0.3/nacl.min.js"></script>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="<?= $asset('rpt.js') ?>"></script>
<?php require __DIR__ . '/../includes/footer.php'; ?>
