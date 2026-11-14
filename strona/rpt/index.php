<?php
$page_title = 'Konfigurator RPT';
$page_description = 'Konfiguracja repeatera MeshCore przez USB w przeglądarce – zgodność z siecią Południe SF6, kreator krok po kroku, stan na żywo.';
require __DIR__ . '/../includes/header.php';
$asset = fn($f) => '/assets/' . $f . '?v=' . filemtime(__DIR__ . '/../assets/' . $f);
?>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">

<section class="rp-page">
  <div class="wrap rp-wrap">

    <!-- ===== START (przed połączeniem) ===== -->
    <div id="rpStart" class="rp-start">
      <div class="rp-start-text">
        <span class="pill">Preset: Południe SF6</span>
        <h1>Konfigurator <span>RPT</span></h1>
        <p>Podłącz repeater kablem USB i ustaw go w przeglądarce (Chrome lub Edge na komputerze). Sprawdzimy, czy jest zgodny z siecią Południe SF6, i jednym kliknięciem poprawimy to, co odbiega od standardu.</p>
        <div class="fl-notice" id="rpNoSerial" hidden>Ta przeglądarka nie obsługuje połączenia USB (Web Serial). Otwórz stronę w Chrome lub Edge na komputerze.</div>
        <div class="rp-start-actions">
          <button type="button" id="btnConnect" class="btn btn-green rp-big">Połącz przez USB</button>
          <a class="rp-link" href="/instrukcja.php#repeater">Wolisz telefon? Instrukcja repeatera →</a>
        </div>
        <p class="rp-hint">Nie widać portu? Sprawdź kabel (musi przesyłać dane) i zamknij inne programy, które mogą używać portu.</p>
      </div>
      <ol class="rp-start-steps">
        <li><b>Połącz</b><span>wybierz port repeatera z listy</span></li>
        <li><b>Sprawdź</b><span>odczytamy ustawienia i porównamy ze standardem</span></li>
        <li><b>Napraw</b><span>preset SF6, nazwa, miejsce, hasła – krok po kroku</span></li>
      </ol>
    </div>

    <!-- ===== PULPIT (po połączeniu) ===== -->
    <div id="rpDash" hidden>
      <div class="rp-top">
        <div class="rp-device">
          <div class="rp-score" id="scoreRing" role="img" aria-label="Zgodność z siecią">
            <div><b id="scoreText">–</b><small>zgodne</small></div>
          </div>
          <div class="rp-device-info">
            <div class="rp-status"><span id="statusDot" class="rp-dot"></span><span id="statusText">Rozłączono</span></div>
            <h1 id="devName">Repeater</h1>
            <p class="rp-device-meta"><span id="devId">ID ----</span> · <span id="info_board">-</span> · <span id="info_fw">-</span></p>
            <div class="rp-device-actions">
              <button type="button" id="btnFixAll" class="btn rp-btn-mint">Napraw wszystko</button>
              <button type="button" id="btnWizard" class="btn rp-btn-ghost">Ustaw krok po kroku</button>
              <button type="button" id="btnReboot" class="btn rp-btn-ghost">Restart</button>
              <button type="button" id="btnDisconnect" class="btn rp-btn-ghost">Rozłącz</button>
            </div>
          </div>
        </div>
        <div class="rp-live card">
          <div class="rp-live-head"><b>Na żywo</b><button type="button" id="btnLive" class="rp-mini-btn" title="Odśwież stan">Odśwież</button></div>
          <dl class="rp-live-grid">
            <div><dt>Zasilanie</dt><dd id="live_batt">–</dd></div>
            <div><dt>Sąsiedzi</dt><dd><button type="button" id="live_nb" class="rp-nb-btn" aria-expanded="false" disabled>–</button></dd></div>
            <div><dt>Szum radia</dt><dd id="live_noise">–</dd></div>
            <div><dt>Czas pracy</dt><dd id="live_up">–</dd></div>
            <div><dt>Pakiety odebrane / wysłane</dt><dd id="live_pkts">–</dd></div>
            <div><dt>Przekazywanie</dt><dd id="info_repeat">–</dd></div>
          </dl>
          <ul id="nbList" class="rp-nb-list" hidden></ul>
          <p class="rp-live-foot" id="live_time">odświeżanie co 30 s</p>
        </div>
      </div>

      <div class="rp-checks" id="checks"></div>

      <div class="rp-wizard-hint" id="wizardHint" hidden>
        <div><b>Ten repeater wymaga ustawienia.</b> Przeprowadzimy Cię przez preset SF6, nazwę, miejsce i hasła – zajmie to ok. 2 minut.</div>
        <button type="button" id="btnWizard2" class="btn btn-green">Ustaw krok po kroku</button>
      </div>

      <div class="rp-main">
        <!-- ZAKŁADKI -->
        <section class="rp-tabs card" id="configForms">
          <div class="rp-tablist" role="tablist" aria-label="Ustawienia repeatera">
            <button type="button" role="tab" id="tab-basic" aria-controls="pan-basic" aria-selected="true">Podstawowe</button>
            <button type="button" role="tab" id="tab-radio" aria-controls="pan-radio" aria-selected="false" tabindex="-1">Radio</button>
            <button type="button" role="tab" id="tab-access" aria-controls="pan-access" aria-selected="false" tabindex="-1">Dostęp</button>
            <button type="button" role="tab" id="tab-key" aria-controls="pan-key" aria-selected="false" tabindex="-1">Klucz i ID</button>
            <button type="button" role="tab" id="tab-adv" aria-controls="pan-adv" aria-selected="false" tabindex="-1">Zaawansowane</button>
            <button type="button" role="tab" id="tab-backup" aria-controls="pan-backup" aria-selected="false" tabindex="-1">Kopia i serwis</button>
          </div>

          <!-- Podstawowe -->
          <div class="rp-panel" role="tabpanel" id="pan-basic" aria-labelledby="tab-basic">
            <h2>Nazwa i miejsce</h2>
            <label class="rp-field"><span>Nazwa repeatera</span>
              <input type="text" id="conf_name" maxlength="31" placeholder="np. RPT Skrzyczne" autocomplete="off"></label>
            <p class="rp-hint">Do 31 znaków, bez znaków [ ] \ : , ? *</p>
            <div class="rp-row2">
              <label class="rp-field"><span>Szerokość (lat)</span><input type="text" id="conf_lat" inputmode="decimal" placeholder="np. 49.822"></label>
              <label class="rp-field"><span>Długość (lon)</span><input type="text" id="conf_lon" inputmode="decimal" placeholder="np. 19.044"></label>
            </div>
            <div class="rp-btnrow">
              <button type="button" class="btn btn-line" data-map="conf_lat,conf_lon">Wybierz z mapy</button>
              <button type="button" class="btn btn-line" data-gps="conf_lat,conf_lon">Użyj mojej lokalizacji</button>
              <span class="rp-spacer"></span>
              <button type="button" id="btnApplyLoc" class="btn btn-green">Zapisz nazwę i miejsce</button>
            </div>

            <div class="rp-sep"></div>
            <h2>Adverty</h2>
            <div class="rp-row3">
              <label class="rp-field"><span>Advert lokalny (min)</span><input type="number" id="conf_adv_int" min="0" max="240" step="2" placeholder="60"></label>
              <label class="rp-field"><span>Advert flood (godz.)</span><input type="number" id="conf_flood_adv_int" min="0" max="168" placeholder="12"></label>
              <label class="rp-field"><span>Maks. skoków (flood.max)</span><input type="number" id="conf_flood_max" min="0" max="64" placeholder="32"></label>
            </div>
            <div id="zero_hop_status" class="rp-check"></div>
            <div id="flood_adv_status" class="rp-check"></div>
            <div id="flood_max_status" class="rp-check"></div>
            <p class="rp-hint">Standard sieci: lokalny co 60 min, flood co 12 h, flood.max 32. Dozwolone: lokalny 0 (wył.) lub 60–240 min, flood 0 (wył.) lub 3–168 h.</p>
            <div class="rp-btnrow"><span class="rp-spacer"></span><button type="button" id="btnApplyAdvert" class="btn btn-green">Zapisz adverty</button></div>
          </div>

          <!-- Radio -->
          <div class="rp-panel" role="tabpanel" id="pan-radio" aria-labelledby="tab-radio" hidden>
            <h2>Radio</h2>
            <div class="rp-row3">
              <label class="rp-field"><span>Częstotliwość (MHz)</span><input type="number" step="0.001" id="conf_freq" placeholder="869.618"></label>
              <label class="rp-field"><span>Szerokość pasma (kHz)</span>
                <select id="conf_bw"><option value="62.5">62.5</option><option value="125">125</option><option value="250">250</option><option value="500">500</option></select></label>
              <label class="rp-field"><span>Spreading factor</span>
                <select id="conf_sf"><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option><option value="9">9</option><option value="10">10</option><option value="11">11</option><option value="12">12</option></select></label>
              <label class="rp-field"><span>Coding rate</span>
                <select id="conf_cr"><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option></select></label>
              <label class="rp-field"><span>Moc TX (dBm)</span><input type="number" id="conf_tx" min="-9" max="30" placeholder="22"></label>
              <label class="rp-field"><span>Prefiks ID</span>
                <select id="conf_path_hash_mode"><option value="0">1 bajt (0)</option><option value="1">2 bajty (1) – obowiązkowo</option><option value="2">3 bajty (2)</option></select></label>
            </div>
            <div id="radio_warning" class="rp-alert" hidden><b>Uwaga:</b> radio albo prefiks różnią się od standardu Południe SF6 (<?= PRESET_FREQ ?> / <?= PRESET_BW ?> / SF<?= PRESET_SF ?>, prefiks 2 bajty; CR może być dowolny). Repeater nie będzie działał w naszej sieci.</div>
            <p class="rp-hint">Zmiana radia działa po restarcie. Płytki ze wzmacniaczem (np. 1 W) przy 22 dBm nadają mocniej – limit pasma 869,4–869,65 MHz to 500 mW ERP.</p>
            <div class="rp-btnrow"><span class="rp-spacer"></span><button type="button" id="btnApplyRadio" class="btn btn-green">Zapisz radio</button></div>
          </div>

          <!-- Dostęp -->
          <div class="rp-panel" role="tabpanel" id="pan-access" aria-labelledby="tab-access" hidden>
            <h2>Hasła</h2>
            <div class="rp-row2">
              <label class="rp-field"><span>Nowe hasło administratora</span>
                <span class="rp-pass"><input type="password" id="conf_admin_pass" maxlength="15" autocomplete="new-password"><button type="button" class="rp-eye" data-toggle="conf_admin_pass">Pokaż</button></span></label>
              <label class="rp-field"><span>Hasło gościa</span>
                <span class="rp-pass"><input type="password" id="conf_guest_pass" maxlength="15" placeholder="opcjonalnie" autocomplete="new-password"><button type="button" class="rp-eye" data-toggle="conf_guest_pass">Pokaż</button></span></label>
            </div>
            <p class="rp-hint">Maks. 15 znaków. Nowy repeater ma hasło administratora <code>password</code> – zmień je, inaczej każdy może nim zarządzać zdalnie.</p>
            <div class="rp-btnrow"><span class="rp-spacer"></span><button type="button" id="btnSetPasswords" class="btn btn-green">Zapisz hasła</button></div>
            <div class="rp-sep"></div>
            <h2>Uprawnienia (ACL)</h2>
            <label class="rp-field"><span>Klucz publiczny użytkownika</span>
              <input type="text" id="conf_acl_key" class="rp-mono" placeholder="pełny klucz publiczny – 64 znaki hex" autocomplete="off"></label>
            <div class="rp-row-btn">
              <select id="conf_acl_perm" aria-label="Uprawnienia">
                <option value="3">Administrator</option><option value="2">Odczyt i zapis</option><option value="1">Tylko odczyt</option><option value="0">Usuń z listy (gość)</option>
              </select>
              <button type="button" id="btnSetACL" class="btn btn-line">Zapisz uprawnienia</button>
            </div>
          </div>

          <!-- Klucz -->
          <div class="rp-panel" role="tabpanel" id="pan-key" aria-labelledby="tab-key" hidden>
            <h2>Klucz i ID repeatera</h2>
            <div class="rp-keygrid">
              <div>
                <label class="rp-field"><span>Wybrane ID (4 znaki hex)</span>
                  <input type="text" id="conf_desired_id" maxlength="4" class="rp-mono rp-upper" placeholder="np. AB12" autocomplete="off"></label>
                <div id="id_length_status" class="rp-check"></div>
                <p class="rp-hint">ID to pierwsze 2 bajty klucza publicznego. Wygenerujemy klucz zaczynający się od wybranego ID (nie może zaczynać się od 00 ani FF).</p>
              </div>
              <div>
                <label class="rp-field"><span>Klucz prywatny</span>
                  <span class="rp-pass"><input type="password" id="conf_priv_key" class="rp-mono" autocomplete="off"><button type="button" class="rp-eye" data-toggle="conf_priv_key">Pokaż</button></span></label>
                <label class="rp-field"><span>Klucz publiczny</span><input type="text" id="conf_pub_key" class="rp-mono" readonly></label>
                <div class="rp-idnow">Aktualne ID: <b id="current_id_prefix">--</b></div>
              </div>
            </div>
            <div class="rp-btnrow">
              <button type="button" id="btnGenerateKey" class="btn btn-green"><span id="genSpinner" class="rp-spin" hidden></span>Generuj klucz</button>
              <span id="genSpinnerStatus" class="rp-gen"></span>
              <span class="rp-spacer"></span>
              <button type="button" id="btnApplyKey" class="btn btn-line">Zapisz klucz w repeaterze</button>
            </div>
          </div>

          <!-- Zaawansowane -->
          <div class="rp-panel" role="tabpanel" id="pan-adv" aria-labelledby="tab-adv" hidden>
            <h2>Ustawienia zaawansowane</h2>
            <p class="rp-hint">Zmieniaj tylko, jeśli wiesz, do czego służą. Domyślne wartości są dobre dla większości repeaterów.</p>
            <div class="rp-row3">
              <label class="rp-field"><span>Duty cycle (%)</span><input type="number" id="conf_dutycycle" min="1" max="100" step="0.1"></label>
              <label class="rp-field"><span>Wykrywanie pętli</span>
                <select id="conf_loop_detect"><option value="off">off</option><option value="minimal">minimal</option><option value="moderate">moderate</option><option value="strict">strict</option></select></label>
              <label class="rp-field"><span>Próg zakłóceń (int.thresh)</span><input type="number" id="conf_int_thresh"></label>
              <label class="rp-field"><span>Reset AGC (s)</span><input type="number" step="4" min="0" max="1020" id="conf_agc_reset"></label>
              <label class="rp-field"><span>RX delay</span><input type="number" step="0.1" min="0" max="20" id="conf_rxdelay"></label>
              <label class="rp-field"><span>TX delay</span><input type="number" step="0.1" min="0" max="2" id="conf_txdelay"></label>
              <label class="rp-field"><span>Direct TX delay</span><input type="number" step="0.1" min="0" max="2" id="conf_direct_txdelay"></label>
            </div>
            <label class="rp-field"><span>Informacje o właścicielu (owner.info)</span>
              <textarea id="conf_owner_info" rows="3" placeholder="kontakt do opiekuna repeatera"></textarea></label>
            <div class="rp-counter"><span id="owner_info_counter">0 / 119 bajtów</span></div>
            <label class="rp-checkline"><input type="checkbox" id="conf_multi_acks"> Multi ACKs (multi.acks)</label>
            <div class="rp-btnrow"><span class="rp-spacer"></span><button type="button" id="btnApplyAdvanced" class="btn btn-green">Zapisz zaawansowane</button></div>
          </div>

          <!-- Kopia i serwis -->
          <div class="rp-panel" role="tabpanel" id="pan-backup" aria-labelledby="tab-backup" hidden>
            <h2>Kopia ustawień</h2>
            <p class="rp-hint">Zapisz ustawienia do pliku, żeby przenieść je na inną płytkę albo odtworzyć po kasowaniu.</p>
            <div class="rp-btnrow">
              <button type="button" id="btnExport" class="btn btn-line">Eksportuj do pliku</button>
              <button type="button" id="btnImport" class="btn btn-line">Importuj z pliku</button>
              <button type="button" id="btnApplyImport" class="btn rp-btn-warn" hidden>Zastosuj import i restart</button>
              <input type="file" id="fileImportConfig" accept=".json,application/json" hidden>
            </div>
            <div class="rp-sep"></div>
            <h2>Serwis</h2>
            <div class="rp-service">
              <div><b>Odśwież dane</b><span>Odczytaj ponownie wszystkie ustawienia.</span><button type="button" id="btnReload" class="btn btn-line">Odśwież</button></div>
              <div><b>Wyślij advert</b><span>Ogłoś repeater w sieci teraz (flood).</span><button type="button" id="btnAdvert" class="btn btn-line">Wyślij</button></div>
              <div><b>Przekazywanie</b><span>Włącz lub wyłącz przekazywanie wiadomości.</span><button type="button" id="btnToggleRepeat" class="btn btn-line">Przełącz</button></div>
              <div><b>Aktualizacja OTA</b><span>Bezprzewodowo. Prościej: kablem przez <a href="/flasher.php">flasher</a>.</span><button type="button" id="btnOTA" class="btn btn-line">Uruchom OTA</button></div>
              <div class="rp-danger"><b>Ustawienia fabryczne</b><span>Kasuje całą konfigurację i klucz (nowe ID).</span><button type="button" id="btnFactory" class="btn rp-btn-danger">Skasuj</button></div>
            </div>
          </div>
        </section>

        <!-- DZIENNIK -->
        <aside class="rp-log card" aria-label="Dziennik">
          <div class="rp-log-head">
            <b>Co się działo</b>
            <button type="button" id="btnCli" class="rp-mini-btn" aria-expanded="false">Konsola CLI</button>
          </div>
          <ol id="timeline" class="rp-timeline" aria-live="polite"></ol>
          <div id="cliBox" class="rp-cli" hidden>
            <div id="terminalOutput" class="rp-term-out" role="log"></div>
            <div class="rp-term-in"><span>&gt;</span><input type="text" id="terminalInput" placeholder="komenda, np. neighbors" autocomplete="off" aria-label="Komenda CLI"></div>
            <div class="rp-cli-chips">
              <button type="button" data-cmd="neighbors">neighbors</button>
              <button type="button" data-cmd="stats-core">stats-core</button>
              <button type="button" data-cmd="stats-radio">stats-radio</button>
              <button type="button" data-cmd="get acl">get acl</button>
              <button type="button" data-cmd="advert.zerohop">advert.zerohop</button>
            </div>
          </div>
          <div class="rp-log-foot">
            <button type="button" id="btnLogDl" class="rp-mini-btn">Pobierz dziennik (.txt)</button>
            <button type="button" id="btnClear" class="rp-mini-btn">Wyczyść</button>
          </div>
        </aside>
      </div>

      <!-- zegar (pokazywany w checkach) -->
      <span id="info_clock" hidden></span>
    </div>
  </div>
</section>

<!-- ===== KREATOR ===== -->
<div id="wizard" class="rp-modal" hidden>
  <div class="rp-modal-box rp-wz" role="dialog" aria-modal="true" aria-labelledby="wzTitle">
    <div class="rp-wz-head">
      <h2 id="wzTitle">Ustaw repeater krok po kroku</h2>
      <button type="button" id="wzClose" class="rp-x" aria-label="Zamknij">×</button>
    </div>
    <div class="rp-wz-body">
      <ol class="rp-wz-steps" id="wzSteps">
        <li data-step="1"><span>1</span><b>Preset SF6</b></li>
        <li data-step="2"><span>2</span><b>Nazwa i miejsce</b></li>
        <li data-step="3"><span>3</span><b>Hasła</b></li>
        <li data-step="4"><span>4</span><b>Zegar</b></li>
        <li data-step="5"><span>5</span><b>Uruchom</b></li>
      </ol>
      <div class="rp-wz-pane">
        <section data-pane="1">
          <h3>Preset Południe SF6</h3>
          <p>Ustawimy standard naszej sieci i sprawdzimy odczytem, czy się zapisał:</p>
          <ul class="rp-wz-list">
            <li>radio <b><?= PRESET_FREQ ?> MHz · BW <?= PRESET_BW ?> · SF<?= PRESET_SF ?> · CR<?= PRESET_CR ?></b></li>
            <li>moc TX <b>22 dBm</b> (maksymalna)</li>
            <li>prefiks ID <b>2 bajty</b></li>
            <li>advert lokalny co <b>60 min</b>, flood co <b>12 h</b>, flood.max <b>32</b></li>
          </ul>
          <p id="wzPresetState" class="rp-check"></p>
        </section>
        <section data-pane="2" hidden>
          <h3>Nazwa i miejsce</h3>
          <p>Nazwa i pinezka pokażą się innym w aplikacji i na mapie sieci. Wystarczy przybliżona lokalizacja.</p>
          <label class="rp-field"><span>Nazwa repeatera</span><input type="text" id="wz_name" maxlength="31" placeholder="np. RPT Skrzyczne" autocomplete="off"></label>
          <div class="rp-row2">
            <label class="rp-field"><span>Szerokość</span><input type="text" id="wz_lat" inputmode="decimal"></label>
            <label class="rp-field"><span>Długość</span><input type="text" id="wz_lon" inputmode="decimal"></label>
          </div>
          <div class="rp-btnrow">
            <button type="button" class="btn btn-line" data-map="wz_lat,wz_lon">Wybierz z mapy</button>
            <button type="button" class="btn btn-line" data-gps="wz_lat,wz_lon">Użyj mojej lokalizacji</button>
          </div>
        </section>
        <section data-pane="3" hidden>
          <h3>Hasła</h3>
          <p>Nowy repeater ma hasło <code>password</code>. Ustaw własne – będziesz go używać do logowania w aplikacji.</p>
          <label class="rp-field"><span>Hasło administratora</span>
            <span class="rp-pass"><input type="password" id="wz_admin" maxlength="15" autocomplete="new-password"><button type="button" class="rp-eye" data-toggle="wz_admin">Pokaż</button></span></label>
          <label class="rp-field"><span>Hasło gościa (opcjonalnie)</span>
            <span class="rp-pass"><input type="password" id="wz_guest" maxlength="15" autocomplete="new-password"><button type="button" class="rp-eye" data-toggle="wz_guest">Pokaż</button></span></label>
          <p class="rp-hint">Maks. 15 znaków. Puste pole = bez zmian.</p>
        </section>
        <section data-pane="4" hidden>
          <h3>Zegar</h3>
          <p id="wzClockText">Sprawdzamy zegar repeatera…</p>
        </section>
        <section data-pane="5" hidden>
          <h3>Uruchom</h3>
          <p>Repeater uruchomi się ponownie z nowym radiem i wyśle advert, żeby inni go zobaczyli.</p>
          <ul class="rp-wz-list" id="wzSummary"></ul>
          <p class="rp-hint">Na płytkach nRF52 port USB po restarcie na chwilę znika – połącz się ponownie, żeby sprawdzić wynik.</p>
        </section>
      </div>
    </div>
    <div class="rp-wz-foot">
      <button type="button" id="wzBack" class="btn rp-btn-text">← Wstecz</button>
      <span class="rp-spacer"></span>
      <button type="button" id="wzSkip" class="btn rp-btn-text">Pomiń</button>
      <button type="button" id="wzNext" class="btn btn-green">Dalej →</button>
    </div>
  </div>
</div>

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
