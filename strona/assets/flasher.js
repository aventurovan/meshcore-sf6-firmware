// Flasher SF6 – MeshCore Południe
// Lista firmware: /flasher/manifest.json (generowany automatycznie przez repo meshcore-sf6-firmware)
import { ESPLoader, Transport } from "https://cdn.jsdelivr.net/npm/esptool-js@0.5.7/bundle.js";
import { serial as usbSerial } from "./web-serial-polyfill.js";

const MANIFEST_URL = "/flasher/manifest.json";
const OTAFIX_URL = "/flasher/otafix.json";   // kopia bootloadera OTAFIX (scripts/otafix_sync.py)
// Sekcja OTAFIX jest na razie tylko do testów: widoczna po wejściu z ?otafix (zapamiętane w przeglądarce).
const OTAFIX_TEST = (() => {
  try {
    const q = new URLSearchParams(location.search);
    if (q.has("otafix")) localStorage.setItem("fl.otafix", q.get("otafix") === "0" ? "0" : "1");
    return localStorage.getItem("fl.otafix") === "1";
  } catch { return new URLSearchParams(location.search).has("otafix"); }
})();
const ROLES = {
  repeater:      { name: "Repeater",            desc: "Przekaźnik sieci (RPT)" },
  repeater_filter: { name: "Repeater + filtr",  desc: "RPT z blokowaniem nadawców (boty, companiony)" },
  companion_ble: { name: "Companion Bluetooth", desc: "Do telefonu przez BLE" },
  companion_usb: { name: "Companion USB",       desc: "Do komputera przez kabel" },
  companion_mapper: { name: "Companion + Mapper SF6", desc: "Nasz firmware: companion z mapowaniem bez telefonu" },
  companion_meshspeed: { name: "MeshSpeed (ThinkNode M9)", desc: "Nasz firmware: polski interfejs z klawiaturą" }
};
const ESP_OTADATA = 0xe000, ESP_OTADATA_SIZE = 0x2000;
const PLATFORM = { esp32: "ESP32", nrf52: "nRF52", rp2040: "RP2040", stm32: "STM32" };
const ESP_APP_OFFSET = 0x10000;

const $ = id => document.getElementById(id);
const state = { m: null, role: null, device: null, busy: false };
// Android: Web Serial przez WebUSB (polyfill). Chrome na Androidzie nie widzi zwykle portów szeregowych,
// a przez WebUSB działają płytki z wbudowanym USB (klasa CDC: ESP32-S3/C3/C6, nRF52, RP2040).
const ANDROID = /Android/i.test(navigator.userAgent);
const USB_MODE = ANDROID && "usb" in navigator;
const SERIAL = USB_MODE ? usbSerial : navigator.serial;
const hasSerial = !!SERIAL;
if (!hasSerial) $("flNoSerial").hidden = false;
if (USB_MODE) $("flAndroid").hidden = false;

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fileUrl = p => new URL(p, new URL(MANIFEST_URL, location.href)).href;
const baseName = p => p.split("/").pop();
function log(msg) { const l = $("flLog"); l.textContent += msg + "\n"; l.scrollTop = l.scrollHeight; }
function setStatus(msg, kind = "") { const s = $("flStatus"); s.textContent = msg; s.className = "fl-status " + kind; }
// po wgraniu firmware urządzenie nie ma już starych kluczy parowania Bluetooth — telefon trzeba sparować od nowa
const PAIR_HINT = "Jeśli to urządzenie było już sparowane z telefonem: usuń je z listy Bluetooth w telefonie („Zapomnij urządzenie”) i sparuj od nowa — inaczej aplikacja może łączyć się tylko częściowo (np. bez odbierania wiadomości).";
const isBtRole = () => !/rpt|repeater|usb|room/i.test(state.role || "");
const doneMsg = () => "Gotowe. Urządzenie uruchamia się z nowym firmware." + (isBtRole() ? " " + PAIR_HINT : "");
function setProgress(p) { $("flBar").style.width = Math.max(0, Math.min(100, p)) + "%"; }
function setVersion(val, sub, base) {
  $("flVer").innerHTML = `<div class="lbl">Wersja</div><div class="val mono">${esc(val)}</div>` +
    (base ? `<div class="base">na bazie oficjalnego MeshCore <b>${esc(base)}</b></div>` : "") + `<div class="sub">${esc(sub)}</div>`;
}

// ---------- przebieg wgrywania na stronie (nie tylko w dzienniku) ----------
// Lista kroków z ikoną stanu, opisem „co teraz” i czasem; pasek pokazuje postęp bieżącego kroku.
const UI = {
  steps: [], timerId: null, t0: 0,
  begin(list) {
    this.stop();
    this.steps = list.filter(Boolean).map(([id, label]) => ({ id, label, st: "wait", det: "" }));
    this.render(); setProgress(0); this.bar("");
  },
  has(id) { return this.steps.some(s => s.id === id); },
  get(id) { return this.steps.find(s => s.id === id); },
  set(id, st, det) {
    const s = this.get(id); if (!s) return;
    if (st !== "run" || s.st !== "run") this.stop();
    s.st = st; if (det !== undefined) s.det = det; else if (st === "ok") s.det = "";
    if (st === "run") { s.t = s.t || Date.now(); this.bar(s.label); }
    if (st === "ok" && s.t) s.took = Date.now() - s.t;
    this.render();
  },
  run(id, det) { this.set(id, "run", det); },
  ok(id, det) { this.set(id, "ok", det); },
  skip(id, det) { this.set(id, "skip", det); },
  user(id, det) { this.set(id, "user", det); this.bar(""); },
  fail(det) {
    this.stop();
    const s = this.steps.find(x => x.st === "run" || x.st === "user") || this.steps.find(x => x.st === "wait");
    if (s) { s.st = "err"; s.det = det; }
    this.render();
  },
  // czas znany z góry (np. bootloader kasuje pamięć): odliczanie i pasek
  timer(id, ms, text) {
    this.run(id); this.stop();
    const t0 = Date.now(), tick = () => {
      const left = Math.max(0, ms - (Date.now() - t0));
      setProgress(Math.min(99, (Date.now() - t0) / ms * 100));
      this.get(id).det = `${text} · jeszcze ok. ${Math.ceil(left / 1000)} s`; this.render();
    };
    tick(); this.timerId = setInterval(tick, 250);
  },
  // czas nieznany: ile już trwa i ile zwykle trwa
  elapsed(id, text, typicalS) {
    this.run(id); this.stop();
    const t0 = Date.now(), tick = () => {
      const s = Math.floor((Date.now() - t0) / 1000);
      setProgress(Math.min(95, s / typicalS * 100));
      this.get(id).det = `${text} · trwa ${s} s (zwykle ok. ${typicalS} s)`; this.render();
    };
    tick(); this.timerId = setInterval(tick, 500);
  },
  progress(id, f, det) {
    const s = this.get(id); if (!s) return;
    if (s.st !== "run") this.run(id);
    setProgress(f * 100); s.det = det; this.render();
  },
  stop() { if (this.timerId) clearInterval(this.timerId); this.timerId = null; },
  bar(label) { const l = $("flBarLbl"); if (l) l.textContent = label; },
  render() {
    const el = $("flSteps"); if (!el) return;
    el.hidden = !this.steps.length;
    const took = s => s.st === "ok" && s.took > 1500 ? `${Math.round(s.took / 1000)} s` : "";
    el.innerHTML = this.steps.map(s => {
      const d = [s.det, took(s)].filter(Boolean).join(" · ");
      return `<li class="st-${s.st}"><span class="fl-sti" aria-hidden="true"></span><span class="fl-stt"><b>${esc(s.label)}</b>${d ? `<small>${esc(d)}</small>` : ""}</span></li>`;
    }).join("");
  },
  clear() { this.stop(); this.steps = []; this.render(); this.bar(""); }
};

// fazy flashNrfDfu → kroki na stronie
function dfuPhases({ prep = "prep", send = "send", commit = "commit", what = "firmware", prepText = "bootloader kasuje miejsce na " + what }) {
  let t0 = 0, total = 0;
  return {
    onPhase(ph, info = {}) {
      if (ph === "open") UI.run(prep, "łączenie z bootloaderem");
      else if (ph === "erase") UI.timer(prep, info.ms, prepText);
      else if (ph === "send") { UI.ok(prep, ""); total = info.bytes; t0 = Date.now(); UI.run(send, "0%"); }
      else if (ph === "commit") { const s = (Date.now() - t0) / 1000; UI.ok(send, `${(total / 1024).toFixed(0)} KB · średnio ${(total / 1024 / Math.max(s, 0.1)).toFixed(1)} KB/s`); UI.run(commit, "potwierdzenie końca"); }
      else if (ph === "activate") UI.timer(commit, info.ms, "urządzenie zapisuje " + what + " i uruchamia się – nie odłączaj kabla");
    },
    onProgress(f) {
      const kb = f * total / 1024, s = (Date.now() - t0) / 1000, v = s > 0.5 ? kb / s : 0;
      const left = v > 0 ? Math.ceil((total / 1024 - kb) / v) : 0;
      UI.progress(send, f, `${Math.round(f * 100)}% · ${kb.toFixed(0)} z ${(total / 1024).toFixed(0)} KB` + (v ? ` · ${v.toFixed(1)} KB/s · jeszcze ok. ${left} s` : ""));
    }
  };
}

// zrozumiałe wyjaśnienie typowych błędów portu
function explain(e) {
  const m = (e && e.message) || String(e);
  if (/already open/i.test(m)) return "port był jeszcze zajęty przez poprzednią próbę – strona go zwolniła, spróbuj ponownie";
  if (/Failed to open serial port/i.test(m)) return "nie da się otworzyć portu – zamknij inne karty i programy, które go używają (drugi flasher, Arduino, aplikacja MeshCore), odłącz i podłącz kabel";
  if (/brak odpowiedzi bootloadera/i.test(m)) return "urządzenie nie odpowiada jak bootloader – nie jest w trybie DFU";
  if (/rozłączyło się|device has been lost|disconnected/i.test(m)) return "urządzenie rozłączyło się w trakcie (kabel, zasilanie albo restart)";
  return m;
}
function busyGuard() {
  if (!state.busy) return false;
  setStatus("Trwa już wgrywanie – poczekaj, aż się skończy.", "err");
  return true;
}

// po touch1200: port bootloadera (inny PID) – znany przeglądarce albo zgłoszony po podłączeniu
async function findDfuPort(oldPort, vid, ms = 6000) {
  const pick = async () => (await SERIAL.getPorts()).filter(p => p !== oldPort && !p.readable && p.getInfo().usbVendorId === vid);
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const k = await pick();
    if (k.length === 1) return k[0];
    await sleep(500);
  }
  return null;
}

async function loadManifest() {
  try {
    const r = await fetch(MANIFEST_URL, { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    state.m = await r.json();
    if (!Array.isArray(state.m.devices) || !state.m.devices.length) throw new Error("lista jest pusta");
  } catch (e) {
    $("flLoadErr").hidden = false;
    $("flLoadErr").textContent = "Lista firmware jest jeszcze niedostępna (" + e.message + "). Pierwsze buildy pojawią się automatycznie po zbudowaniu – spróbuj później.";
    setVersion("brak", "lista niedostępna");
    return;
  }
  showVersion();
  renderRoles();
  if (OTAFIX_TEST) loadOtafix();
}

async function loadOtafix() {
  try {
    const r = await fetch(OTAFIX_URL, { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    state.otx = await r.json();
  } catch (e) { state.otx = { error: e.message }; }
  if (state.device && state.device.platform === "nrf52") renderFlash();
}

function showVersion() {
  if (state.role === "custom") return setVersion("własny", "plik z dysku");
  const m = state.m, r = state.role && m.roles && m.roles[state.role];
  const v = r ? r.version : m.version;
  const built = (r && r.built) || m.built;
  const date = built ? new Date(built).toLocaleDateString("pl-PL") : "";
  setVersion(v || "?", (r ? "z " + r.upstream : "oficjalny MeshCore") + (date ? ", " + date : ""), r && r.base);
}

function renderRoles() {
  const present = Object.keys(ROLES).filter(r => state.m.devices.some(d => d.firmware && d.firmware[r]));
  $("flRoles").innerHTML = present.map(r => {
    const n = state.m.devices.filter(d => d.firmware[r]).length;
    return `<button class="fl-role" data-role="${r}" aria-pressed="false"><b>${ROLES[r].name}</b><small>${ROLES[r].desc}, ${n} urządz.</small></button>`;
  }).join("") + `<button class="fl-role fl-role-custom" data-role="custom" aria-pressed="false"><b>Własny firmware</b><small>Dla zaawansowanych: plik .bin lub .zip z dysku, do testów</small></button>`;
  $("flRoles").querySelectorAll(".fl-role").forEach(b => b.onclick = () => {
    if (state.busy) return;
    state.role = b.dataset.role;
    $("flRoles").querySelectorAll(".fl-role").forEach(x => x.setAttribute("aria-pressed", x === b));
    if (state.role === "custom") {
      state.device = null;
      $("flS2").classList.add("off");
      setVersion("własny", "plik z dysku");
      return renderCustom();
    }
    if (state.device && !state.device.firmware[state.role]) state.device = null;
    $("flS2").classList.remove("off");
    showVersion();
    renderDevices();
    renderFlash();
  });
}

function renderDevices() {
  const q = $("flSearch").value.trim().toLowerCase();
  const list = state.m.devices
    .filter(d => d.firmware[state.role])
    .filter(d => !q || d.name.toLowerCase().includes(q) || d.id.includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, "pl"));
  $("flDevices").innerHTML = list.length ? list.map(d =>
    `<button class="fl-dev" data-id="${esc(d.id)}" aria-pressed="${state.device === d}"><span>${esc(d.name)}</span><span class="fl-tag">${esc(PLATFORM[d.platform] || d.platform)}</span></button>`
  ).join("") : `<div class="fl-empty">Brak urządzeń pasujących do „${esc(q)}”.</div>`;
  $("flDevices").querySelectorAll(".fl-dev").forEach(b => b.onclick = () => {
    if (state.busy) return;
    state.device = state.m.devices.find(d => d.id === b.dataset.id);
    renderDevices();
    renderFlash();
  });
}
$("flSearch").addEventListener("input", () => state.m && state.role && state.role !== "custom" && renderDevices());

const eraseBox = disabled => `
  <label class="fl-check"><input type="checkbox" id="flErase" ${disabled ? "disabled" : ""}>
    <span><b>Najpierw wyczyść całą pamięć urządzenia</b><br>
    Zalecane, gdy wcześniej było inne oprogramowanie (np. Meshtastic) albo urządzenie działa dziwnie.
    Usuwa klucze, kontakty i ustawienia – urządzenie dostanie nową tożsamość i od razu ustawienia SF6.</span></label>`;
const confirmErase = () => confirm("Cała pamięć urządzenia zostanie skasowana: klucz prywatny (tożsamość), kontakty i wszystkie ustawienia. Kontynuować?");
const dl = (p, label) => p ? `<a class="btn btn-green-line" href="${esc(fileUrl(p))}" download>${label}</a>` : "";
const na = cond => cond ? 'disabled data-na="1"' : "";

function renderFlash() {
  const d = state.device, area = $("flArea");
  setProgress(0); setStatus(""); UI.clear();
  if (!d || !state.role) { $("flS3").classList.add("off"); area.innerHTML = `<p class="fl-hint">Wybierz rolę i urządzenie.</p>`; return; }
  $("flS3").classList.remove("off");
  const fw = d.firmware[state.role];
  const note = state.role === "companion_mapper"
    ? `<p class="fl-note">Firmware MeshCore Południe: zwykły companion BLE (działa z aplikacją MeshCore) z wbudowanym Mapperem SF6 i polskim interfejsem na ekranie urządzenia. Dane z mapowania zrzucasz do aplikacji <a href="/mapper" target="_blank" rel="noopener">Mapper SF6</a>.</p>`
    : state.role === "companion_meshspeed"
    ? `<p class="fl-note">Firmware MeshSpeed dla ThinkNode M9: companion MeshCore z polskim interfejsem na ekranie, obsługą klawiatury, mapą i presetem SF6. Działa z aplikacją <a href="/meshspeed.php">MeshSpeed</a> i oficjalną aplikacją MeshCore. Później aktualizuje się sam przez WiFi (Narzędzia › Aktualizacja). Przy pierwszym wgraniu na M9 z innym firmware zaznacz kasowanie pamięci.</p>`
    : "";

  if (d.platform === "esp32") {
    area.innerHTML = note + `
      ${eraseBox(!fw.full)}
      <div class="fl-actions">
        <button class="btn btn-green" id="flEsp" ${na(!hasSerial || !fw.update)}>Wgraj przez USB</button>
        ${dl(fw.update, "Pobierz .bin")}
      </div>
      <div class="fl-hint">Podłącz ${esc(d.name)} kablem USB z transmisją danych, kliknij przycisk i wybierz port z listy.
      Jeśli połączenie się nie uda: przytrzymaj BOOT, naciśnij i puść RESET, puść BOOT i spróbuj ponownie.
      Bez kasowania ustawienia zapisane w urządzeniu zostają zachowane.</div>`;
    $("flEsp").onclick = () => {
      const wipe = $("flErase").checked;
      if (wipe && !confirmErase()) return;
      flashEsp(fw, wipe);
    };
  } else if (d.platform === "nrf52" && fw.zip) {
    area.innerHTML = note + `
      ${eraseBox(false)}
      <div class="fl-actions">
        <button class="btn btn-green" id="flNrf" ${na(!hasSerial)}>Wgraj przez USB</button>
        <button class="btn btn-green-line" id="flNrfCont" hidden>Kontynuuj – wybierz port DFU</button>
      </div>
      <div class="fl-hint"><ol>
        <li>Podłącz ${esc(d.name)} kablem USB i kliknij „Wgraj przez USB”. Wybierz port urządzenia.</li>
        <li>Urządzenie zrestartuje się w tryb DFU. Jeśli strona poprosi, kliknij „Kontynuuj” i wybierz <b>nowy</b> port, który się pojawił.</li>
        <li>Poczekaj do końca (około minuty, z kasowaniem około dwóch) – nie odłączaj kabla. Bez kasowania ustawienia zapisane w urządzeniu zostają zachowane.</li>
      </ol>
      Urządzenie jest już w trybie DFU (np. po dwukrotnym kliknięciu RESET)? <a href="#" id="flNrfDirect">Wgraj od razu</a>.</div>
      <details class="fl-log"><summary>Inny sposób: plik na dysk urządzenia</summary>
        <div class="fl-actions" style="margin-top:10px">
          <button class="btn btn-green-line" id="flDfu" ${na(!hasSerial)}>Włącz tryb DFU</button>
          ${dl(fw.uf2, "Pobierz .uf2")}${dl(fw.zip, "Pobierz .zip (OTA)")}
        </div>
        <p class="fl-hint">Po włączeniu trybu DFU pojawi się dysk (np. RAK4631, T114BOOT). Przeciągnij na niego plik .uf2. Plik .zip służy do aktualizacji przez Bluetooth (nRF Connect).</p>
      </details>`;
    $("flNrf").onclick = () => {
      state.nrfErase = $("flErase").checked;
      if (state.nrfErase && !confirmErase()) return;
      nrfStart(d, fw);
    };
    $("flNrfCont").onclick = () => nrfPickAndFlash();
    $("flNrfDirect").onclick = e => {
      e.preventDefault();
      if (state.busy || !hasSerial) return;
      state.nrfErase = $("flErase").checked;
      if (state.nrfErase && !confirmErase()) return;
      nrfPickAndFlash(fw);
    };
    $("flDfu").onclick = () => enterDfu(d);
    otafixMount(d, fw);
  } else if (d.platform === "nrf52" || d.platform === "rp2040") {
    const drive = d.platform === "rp2040" ? "RPI-RP2" : "dysk bootloadera, np. RAK4631, T114BOOT, T1000-E";
    area.innerHTML = `
      <div class="fl-actions">
        <button class="btn btn-green" id="flDfu" ${na(!hasSerial)}>Włącz tryb DFU</button>
        ${dl(fw.uf2, "Pobierz .uf2")}
      </div>
      <div class="fl-hint"><ol>
        <li>Podłącz ${esc(d.name)} kablem USB, kliknij „Włącz tryb DFU” i wybierz port.</li>
        <li>W systemie pojawi się nowy dysk (${esc(drive)}). Jeśli się nie pojawi, kliknij szybko dwa razy przycisk RESET.</li>
        <li>Pobierz plik .uf2 i przeciągnij go na ten dysk. Urządzenie samo się zrestartuje z nowym firmware.</li>
      </ol>Ustawienia zapisane w urządzeniu zostają zachowane.</div>`;
    $("flDfu").onclick = () => enterDfu(d);
    if (d.platform === "nrf52") otafixMount(d, fw);
  } else {
    area.innerHTML = `<div class="fl-actions">${dl(fw.bin, "Pobierz .bin")}${dl(fw.hex, "Pobierz .hex")}</div>
      <p class="fl-hint">Tej platformy nie da się wgrać z przeglądarki. Pobierz plik i wgraj go narzędziem producenta (np. STM32CubeProgrammer).</p>`;
  }
}

function lockUi(b) {
  state.busy = b;
  const otxOk = !!($("flOtxOk") && $("flOtxOk").checked);
  document.querySelectorAll("#flArea button").forEach(x => x.disabled = b || x.dataset.na === "1" || (x.dataset.otx === "1" && !otxOk));
}

// ---------- nRF52: wgrywanie przez bootloader (serial DFU) ----------
let nrfMod = null;
const nrfLib = async () => nrfMod || (nrfMod = await import(window.FL_NRF_DFU || "/assets/nrf-dfu.js"));

async function nrfPackage(fw) {
  if (state.nrfPkg && state.nrfPkg.url === fw.zip) return state.nrfPkg.pkg;
  const lib = await nrfLib();
  log("Pobieram " + baseName(fw.zip));
  const r = await fetch(fileUrl(fw.zip));
  if (!r.ok) throw new Error("nie udało się pobrać " + baseName(fw.zip) + " (HTTP " + r.status + ")");
  const pkg = await lib.readDfuZip(await r.arrayBuffer());
  log("Firmware: " + (pkg.bin.length / 1024).toFixed(0) + " KB");
  state.nrfPkg = { url: fw.zip, pkg };
  return pkg;
}

async function nrfStart(d, fw) {
  if (busyGuard()) return;
  let port;
  try { port = await SERIAL.requestPort(); }
  catch { setStatus("Nie wybrano portu.", "err"); return; }
  lockUi(true); setProgress(0); $("flNrfCont").hidden = true;
  UI.begin([["fetch", "Pobranie firmware"], ["dfu", "Przełączenie w tryb DFU"], ["port", "Port urządzenia w trybie DFU"],
    state.nrfErase && ["wipe", "Kasowanie całej pamięci"], ["prep", "Przygotowanie pamięci"], ["send", "Wysyłanie firmware"], ["commit", "Zatwierdzenie i restart"]]);
  try {
    setStatus("Pobieranie firmware…");
    UI.run("fetch", baseName(fw.zip));
    const pkg = await nrfPackage(fw);
    UI.ok("fetch", (pkg.bin.length / 1024).toFixed(0) + " KB");
    const lib = await nrfLib();
    const vid = port.getInfo().usbVendorId;
    setStatus("Przełączanie w tryb DFU…");
    UI.run("dfu", "restart urządzenia do bootloadera (1200 bps)");
    log("Przełączam " + d.name + " w tryb DFU (1200 bps)");
    await lib.touch1200(port);
    UI.elapsed("dfu", "czekam, aż urządzenie zgłosi się w trybie DFU", 3);
    await sleep(2500);
    UI.ok("dfu");
    // jeśli przeglądarka zna już port bootloadera (np. z poprzedniego wgrywania), wgrywamy od razu
    const known = await findDfuPort(port, vid, 2500);
    if (known) { UI.ok("port", "wybrany automatycznie"); lockUi(false); return await nrfFlash(known, fw, { cont: true }); }
    UI.user("port", "kliknij „Kontynuuj” i wybierz NOWY port, który właśnie się pojawił");
    setStatus("Urządzenie jest w trybie DFU. Kliknij „Kontynuuj” i wybierz nowy port, który właśnie się pojawił.", "ok");
    state.nrfFw = fw;
    $("flNrfCont").hidden = false;
  } catch (e) {
    log("BŁĄD: " + (e.message || e));
    UI.fail(explain(e));
    setStatus("Nie udało się: " + explain(e), "err");
  } finally { lockUi(false); }
}

async function nrfPickAndFlash(fw) {
  if (busyGuard()) return;
  const cont = !fw && UI.steps.length > 0;
  fw = fw || state.nrfFw;
  let port;
  try { port = await SERIAL.requestPort(); }
  catch { setStatus("Nie wybrano portu.", "err"); return; }
  if (cont && UI.get("port") && UI.get("port").st === "user") UI.ok("port", "wybrany");
  return nrfFlash(port, fw, { cont });
}

// obraz kasujący (tools/nrf52-erase): kasuje aplikację i dane, potem wraca do trybu DFU
function erasePackage(lib, pkg) {
  const n = pkg.dat[8] | (pkg.dat[9] << 8);
  const sds = [];
  for (let i = 0; i < n; i++) sds.push(pkg.dat[10 + 2 * i] | (pkg.dat[11 + 2 * i] << 8));
  const v7 = sds.some(x => x >= 0xca && x !== 0xfffe); // S140 v7.x: aplikacja od 0x27000, v6.x: od 0x26000
  return { url: window.FL_NRF_ERASE[v7 ? "v7" : "v6"], head: pkg.dat.slice(0, 10 + 2 * n) };
}

function waitForPort(vid, pid, timeout) {
  return new Promise(resolve => {
    const h = e => {
      const i = e.target.getInfo();
      if (i.usbVendorId === vid && i.usbProductId === pid) { done(); resolve(e.target); }
    };
    // polyfill (Android) nie zgłasza podłączenia: czekamy, aż kasowanie się skończy, potem użytkownik wybiera port
    if (!SERIAL.addEventListener) return void setTimeout(() => resolve(null), 40000);
    const t = setTimeout(() => { done(); resolve(null); }, timeout);
    const done = () => { clearTimeout(t); SERIAL.removeEventListener("connect", h); };
    SERIAL.addEventListener("connect", h);
  });
}

async function nrfErase(port, pkg, lib) {
  const e = erasePackage(lib, pkg);
  UI.run("wipe", "pobieranie programu kasującego");
  log("Pobieram program kasujący (" + baseName(e.url) + ")");
  const r = await fetch(e.url);
  if (!r.ok) throw new Error("nie udało się pobrać programu kasującego (HTTP " + r.status + ")");
  const bin = new Uint8Array(await r.arrayBuffer());
  const crc = lib.crc16(bin);
  const dat = new Uint8Array([...e.head, crc & 0xff, crc >> 8]);
  const { usbVendorId: vid, usbProductId: pid } = port.getInfo();
  setStatus("Kasowanie pamięci: krok 1 z 2 – wgrywanie programu kasującego…");
  const back = waitForPort(vid, pid, 120000);
  await lib.flashNrfDfu(port, { bin, dat }, {
    log,
    onPhase: ph => UI.run("wipe", { open: "łączenie z bootloaderem", erase: "krok 1 z 2: przygotowanie", send: "krok 1 z 2: wysyłanie programu kasującego", commit: "krok 1 z 2: uruchamianie programu kasującego", activate: "krok 1 z 2: uruchamianie programu kasującego" }[ph]),
    onProgress: f => UI.progress("wipe", f, `krok 1 z 2: wysyłanie programu kasującego ${Math.round(f * 100)}%`)
  });
  setStatus("Kasowanie pamięci: krok 2 z 2 – kasowanie wszystkiego (około 30 s). Nie odłączaj urządzenia.");
  UI.elapsed("wipe", "krok 2 z 2: kasowanie całej pamięci, potem urządzenie wróci w trybie DFU", 30);
  log("Program kasujący działa, czekam na powrót urządzenia w trybie DFU");
  const again = await back;
  if (!again) { UI.ok("wipe", "skasowane – urządzenie nie zgłosiło się samo"); return null; }
  await sleep(1500);
  UI.ok("wipe", "pamięć skasowana, urządzenie wróciło w trybie DFU");
  log("Pamięć skasowana, urządzenie w trybie DFU");
  return again;
}

async function nrfFlash(port, fw, { cont = false, touched = false } = {}) {
  if (!cont && !touched)
    UI.begin([["fetch", "Pobranie firmware"], state.nrfErase && ["wipe", "Kasowanie całej pamięci"],
      ["prep", "Przygotowanie pamięci"], ["send", "Wysyłanie firmware"], ["commit", "Zatwierdzenie i restart"]]);
  lockUi(true); setProgress(0);
  try {
    if (UI.get("fetch") && UI.get("fetch").st !== "ok") UI.run("fetch", baseName(fw.zip));
    const pkg = await nrfPackage(fw);
    if (UI.get("fetch") && UI.get("fetch").st !== "ok") UI.ok("fetch", (pkg.bin.length / 1024).toFixed(0) + " KB");
    const lib = await nrfLib();
    if (state.nrfErase) {
      const again = await nrfErase(port, pkg, lib);
      state.nrfErase = false; // pamięć już czysta – ewentualne ponowienie tylko wgrywa
      if (!again) {
        state.nrfFw = fw;
        $("flNrfCont").hidden = false;
        UI.user("prep", "kliknij „Kontynuuj” i wybierz port urządzenia w trybie DFU");
        setStatus("Pamięć skasowana. Kliknij „Kontynuuj” i wybierz port urządzenia w trybie DFU, żeby wgrać firmware.", "ok");
        return;
      }
      port = again;
    }
    setStatus("Wgrywanie… nie odłączaj urządzenia (około minuty)");
    const ph = dfuPhases({});
    try {
      await lib.flashNrfDfu(port, pkg, { onProgress: ph.onProgress, onPhase: ph.onPhase, log });
    } catch (e) {
      // „Wgraj od razu” na urządzeniu, które nie jest w trybie DFU: przełączamy je i próbujemy jeszcze raz
      if (touched || !/brak odpowiedzi bootloadera/i.test(e.message || "")) throw e;
      log("Urządzenie nie jest w trybie DFU – przełączam (1200 bps)");
      UI.run("prep", "urządzenie nie było w trybie DFU – przełączam je");
      setStatus("Urządzenie nie było w trybie DFU – przełączam…");
      const vid = port.getInfo().usbVendorId;
      await lib.touch1200(port);
      await sleep(2500);
      const dfu = await findDfuPort(port, vid, 4000);
      if (!dfu) {
        state.nrfFw = fw;
        $("flNrfCont").hidden = false;
        UI.user("prep", "urządzenie przełączone – kliknij „Kontynuuj” i wybierz NOWY port");
        setStatus("Urządzenie jest teraz w trybie DFU. Kliknij „Kontynuuj” i wybierz nowy port, który się pojawił.", "ok");
        return;
      }
      lockUi(false);
      return await nrfFlash(dfu, fw, { cont: true, touched: true });
    }
    setProgress(100);
    UI.ok("commit", "urządzenie uruchomione");
    $("flNrfCont").hidden = true;
    setStatus(doneMsg(), "ok");
    log("Zakończono.");
  } catch (e) {
    console.error(e);
    log("BŁĄD: " + (e.message || e));
    UI.fail(explain(e));
    setStatus("Nie udało się: " + explain(e) + ". Kliknij dwa razy RESET (tryb DFU) i użyj „Wgraj od razu”.", "err");
  } finally { lockUi(false); }
}

async function fetchBinary(path) {
  log("Pobieram " + baseName(path));
  const r = await fetch(fileUrl(path));
  if (!r.ok) throw new Error("nie udało się pobrać " + baseName(path) + " (HTTP " + r.status + ")");
  const u8 = new Uint8Array(await r.arrayBuffer());
  let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  log("Pobrano " + (u8.length / 1024).toFixed(0) + " KB");
  return s;
}

const otadataBlank = () => String.fromCharCode(0xff).repeat(ESP_OTADATA_SIZE);
const u8ToStr = u8 => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return s; };

async function flashEsp(fw, full) {
  return flashEspFiles(async () => {
    const data = await fetchBinary(full ? fw.full : fw.update);
    const files = [{ data, address: full ? 0x0 : ESP_APP_OFFSET }];
    // po aktualizacji przez WiFi aplikacja może działać z drugiej partycji (app1) – czyścimy otadata,
    // żeby urządzenie uruchomiło właśnie wgraną wersję z app0; dane i ustawienia zostają
    if (!full && fw.reset_ota) files.unshift({ data: otadataBlank(), address: ESP_OTADATA });
    return files;
  }, full);
}

async function flashEspFiles(getFiles, full) {
  if (busyGuard()) return;
  let port, transport;
  try { port = await SERIAL.requestPort(); }
  catch { setStatus("Nie wybrano portu.", "err"); return; }
  lockUi(true); setProgress(0);
  UI.begin([["fetch", "Pobranie firmware"], ["conn", "Połączenie z układem ESP32"],
    full && ["wipe", "Kasowanie całej pamięci"], ["write", "Wgrywanie firmware"], ["restart", "Restart urządzenia"]]);
  const terminal = { clean() {}, writeLine: l => log(l), write: l => log(l) };
  try {
    setStatus("Pobieranie firmware…");
    UI.run("fetch");
    const files = await getFiles();
    UI.ok("fetch", (files.reduce((a, f) => a + f.data.length, 0) / 1024).toFixed(0) + " KB");
    setStatus("Łączenie z urządzeniem…");
    UI.elapsed("conn", "łączenie z bootloaderem ESP32 (jeśli długo nic: przytrzymaj BOOT i naciśnij RESET)", 5);
    try { await (await nrfLib()).releaseAll(); } catch {}
    if (port.readable) { try { await port.close(); } catch {} }
    transport = new Transport(port, true);
    const loader = new ESPLoader({ transport, baudrate: 460800, romBaudrate: 115200, terminal });
    const chip = await loader.main();
    log("Wykryto: " + chip);
    UI.ok("conn", chip);
    setStatus(full ? "Kasowanie i wgrywanie… nie odłączaj urządzenia" : "Wgrywanie… nie odłączaj urządzenia");
    if (full) UI.elapsed("wipe", "kasowanie całej pamięci – bez paska postępu, to normalne", 25);
    else UI.run("write", "start");
    const total = files.reduce((a, f) => a + f.data.length, 0), done = files.map(() => 0), t0 = Date.now();
    await loader.writeFlash({
      fileArray: files,
      flashSize: "keep", flashMode: "keep", flashFreq: "keep",
      eraseAll: full, compress: true,
      reportProgress: (i, written, size) => {
        if (full && UI.get("wipe").st === "run") UI.ok("wipe");
        done[i] = written / size * files[i].data.length;
        const f = done.reduce((a, b) => a + b, 0) / total, s = (Date.now() - t0) / 1000;
        UI.progress("write", f, `${Math.round(f * 100)}% · ${(f * total / 1024).toFixed(0)} z ${(total / 1024).toFixed(0)} KB` + (files.length > 1 ? ` · plik ${i + 1} z ${files.length}` : ""));
      }
    });
    UI.ok("write");
    UI.run("restart");
    await loader.after();
    setProgress(100);
    UI.ok("restart", "urządzenie uruchamia się z nowym firmware");
    setStatus(doneMsg(), "ok");
    log("Zakończono.");
  } catch (e) {
    console.error(e);
    log("BŁĄD: " + (e.message || e));
    UI.fail(explain(e));
    setStatus("Nie udało się: " + explain(e) + ". Sprawdź kabel albo uruchom urządzenie w trybie BOOT i spróbuj ponownie.", "err");
  } finally {
    try { if (transport) await transport.disconnect(); else if (port) await port.close(); } catch {}
    lockUi(false);
  }
}


async function enterDfu(d) {
  if (busyGuard()) return;
  let port;
  try { port = await SERIAL.requestPort(); }
  catch { setStatus("Nie wybrano portu.", "err"); return; }
  lockUi(true);
  UI.begin([["dfu", "Przełączenie w tryb DFU"], ["disk", "Dysk bootloadera"]]);
  try {
    UI.run("dfu", "restart urządzenia do bootloadera (1200 bps)");
    log("Przełączam " + d.name + " w tryb DFU (1200 bps)");
    await (await nrfLib()).touch1200(port);
    UI.ok("dfu");
    UI.timer("disk", 4000, "za chwilę w systemie pojawi się nowy dysk");
    await sleep(4000);
    UI.user("disk", "przeciągnij na nowy dysk plik .uf2 – urządzenie samo się zrestartuje");
    setStatus("Tryb DFU włączony. Za chwilę pojawi się dysk – przeciągnij na niego plik .uf2.", "ok");
  } catch (e) {
    log("BŁĄD: " + (e.message || e));
    UI.fail(explain(e));
    setStatus("Nie udało się włączyć DFU: " + explain(e) + ". Możesz też kliknąć szybko dwa razy RESET na urządzeniu.", "err");
  } finally { lockUi(false); }
}

// ---------- bootloader OTAFIX (nRF52) ----------
// OTAFIX (github.com/oltaco/Adafruit_nRF52_Bootloader_OTAFIX): bootloader z niezawodną aktualizacją przez Bluetooth –
// po nieudanej próbie sam wraca do trybu aktualizacji, więc repeatera na maszcie nie trzeba zdejmować.
// Dwa sposoby: plik update-….uf2 na dysk bootloadera (zalecany, zostawia SoftDevice) albo z przeglądarki
// paczka SoftDevice + bootloader przez serial DFU (jak adafruit-nrfutil). Oba usuwają firmware – potem wgrywa się SF6.
const sdFamily = v => String(v || "").startsWith("7") ? "v7" : "v6";

function otafixMount(d, fw) {
  if (!OTAFIX_TEST) return;
  const area = $("flArea"), otx = state.otx;
  const box = document.createElement("div");
  box.className = "fl-otx";
  area.appendChild(box);
  if (!otx) { box.innerHTML = `<p class="fl-hint">Bootloader OTAFIX: wczytywanie…</p>`; return; }
  if (otx.error) { box.innerHTML = `<p class="fl-hint">Bootloader OTAFIX: lista niedostępna (${esc(otx.error)}).</p>`; return; }
  const bk = otx.devices && otx.devices[String(d.id).toLowerCase()], b = bk && otx.boards[bk];
  if (!b) { box.innerHTML = `<p class="fl-hint">Bootloader OTAFIX nie ma wersji dla ${esc(d.name)}.</p>`; return; }
  const viaBrowser = !!(fw.zip && b.zip);
  box.innerHTML = `
    <details class="fl-otx-box"${/repeater/.test(state.role) ? " open" : ""}>
      <summary><b>Bootloader OTAFIX ${esc(otx.version)}</b><span>aktualizacja przez Bluetooth bez zdejmowania repeatera</span></summary>
      <p class="fl-hint" style="margin-top:10px">OTAFIX to poprawiony bootloader dla nRF52: szybsza aktualizacja przez Bluetooth, a po nieudanej próbie
        urządzenie samo wraca do trybu aktualizacji zamiast się zawiesić. Wgrywa się <b>raz, przez kabel</b>.</p>
      <p class="fl-hint"><b>Sprawdź, co masz:</b> w trybie DFU otwórz plik <span class="mono">INFO_UF2.TXT</span> na dysku urządzenia
        (linia <span class="mono">UF2 Bootloader …</span>) albo wpisz w konsoli repeatera <span class="mono">get bootloader.ver</span>.
        Masz <span class="mono">OTAFIX2.2</span> lub nowszy? Nic nie rób.</p>
      <div class="fl-danger">
        <b>Ostrzeżenie – zmiana bootloadera</b>
        <ul>
          <li>Tylko <b>na stole, przez kabel USB</b>, z naładowaną baterią albo zasilaczem. Nie na maszcie.</li>
          <li>Przerwanie w trakcie (odłączenie kabla, brak zasilania) może <b>trwale zablokować płytkę</b> – ratunek tylko programatorem SWD.</li>
          <li>Firmware zostanie <b>usunięte</b>. Zaraz potem wgraj repeater SF6 (przycisk poniżej).</li>
          <li>Klucz (tożsamość) i ustawienia repeatera zostają – są w osobnej części pamięci, której bootloader nie rusza.
            Na wszelki wypadek zapisz klucz: w konsoli USB <span class="mono">get prv.key</span> (przywrócenie: <span class="mono">set prv.key …</span>).
            Companion z kontaktami w dodatkowej pamięci (ExtraFS) może je stracić.</li>
        </ul>
        <label class="fl-check fl-check-danger"><input type="checkbox" id="flOtxOk">
          <span><b>Rozumiem ryzyko i wgrywam na stole</b></span></label>
      </div>
      <h3 class="fl-otx-h">Sposób 1 – plik na dysk (zalecany)</h3>
      <div class="fl-hint"><ol>
        <li>Kliknij „Włącz tryb DFU” i wybierz port (albo kliknij szybko dwa razy RESET). Pojawi się dysk, np. RAK4631, XIAO-SENSE.</li>
        <li>Pobierz plik i przeciągnij go na ten dysk. Po kilku sekundach dysk zniknie i pojawi się ponownie – to już OTAFIX.</li>
        <li>Wgraj firmware SF6: przycisk „Wgraj teraz firmware SF6” poniżej albo plik .uf2 firmware na ten sam dysk.</li>
      </ol></div>
      <div class="fl-actions">
        <button class="btn btn-green-line" id="flOtxDfu" disabled data-otx="1">Włącz tryb DFU</button>
        <a class="btn btn-green-line fl-otx-dl" id="flOtxUf2" href="${esc(fileUrl(b.uf2))}" download aria-disabled="true">Pobierz bootloader .uf2</a>
      </div>
      ${viaBrowser ? `
      <h3 class="fl-otx-h">Sposób 2 – przez przeglądarkę</h3>
      <p class="fl-hint">Wgrywa SoftDevice ${esc(b.sd)} + bootloader OTAFIX przez port szeregowy, tak jak <span class="mono">adafruit-nrfutil</span>.
        Trwa około minuty. Nie odłączaj kabla, dopóki strona nie napisze „gotowe”.</p>
      <div class="fl-actions">
        <button class="btn btn-warn" id="flOtxWeb" disabled data-otx="1" ${hasSerial ? "" : 'data-na="1"'}>Wgraj bootloader przez USB</button>
        <button class="btn btn-green-line" id="flOtxCont" hidden>Kontynuuj – wybierz port DFU</button>
      </div>` : ""}
      <div class="fl-actions" style="margin-top:14px">
        <button class="btn btn-green" id="flOtxApp" ${na(!hasSerial || !fw.zip)}>Wgraj teraz firmware SF6</button>
      </div>
      <p class="fl-hint">Po bootloaderze urządzenie nie ma firmware i czeka w trybie DFU – wybierz jego port. Jeśli portu nie ma, kliknij szybko dwa razy RESET.
        Źródło: <a href="${esc(otx.source)}" target="_blank" rel="noopener">OTAFIX ${esc(otx.tag)}</a>.</p>
    </details>`;
  const ok = $("flOtxOk");
  ok.onchange = () => {
    box.querySelectorAll("[data-otx]").forEach(x => x.disabled = !ok.checked || state.busy || x.dataset.na === "1");
    $("flOtxUf2").setAttribute("aria-disabled", String(!ok.checked));
  };
  $("flOtxUf2").onclick = e => { if (!ok.checked) { e.preventDefault(); setStatus("Najpierw zaznacz „Rozumiem ryzyko…”.", "err"); } else log("Pobrano " + baseName(b.uf2)); };
  $("flOtxDfu").onclick = () => enterDfu(d);
  if (viaBrowser) {
    $("flOtxWeb").onclick = () => otafixStart(d, fw, b);
    $("flOtxCont").onclick = () => otafixPickAndFlash(fw, b);
  }
  $("flOtxApp").onclick = () => { state.nrfErase = false; nrfPickAndFlash(fw); };
}

async function otafixPackage(b) {
  if (state.blPkg && state.blPkg.url === b.zip) return state.blPkg.pkg;
  const lib = await nrfLib();
  log("Pobieram " + baseName(b.zip));
  const r = await fetch(fileUrl(b.zip));
  if (!r.ok) throw new Error("nie udało się pobrać bootloadera (HTTP " + r.status + ")");
  const buf = await r.arrayBuffer();
  if (b.zip_sha256 && crypto.subtle) {
    const h = [...new Uint8Array(await crypto.subtle.digest("SHA-256", buf))].map(x => x.toString(16).padStart(2, "0")).join("");
    if (h !== b.zip_sha256) throw new Error("plik bootloadera jest uszkodzony (zła suma SHA-256)");
    log("Suma SHA-256 bootloadera OK");
  }
  const pkg = await lib.readDfuZip(buf, { bootloader: true });
  log(`Bootloader: SoftDevice ${b.sd} (${pkg.sdSize} B) + OTAFIX (${pkg.blSize} B)`);
  state.blPkg = { url: b.zip, pkg };
  return pkg;
}

// firmware SF6 tej płytki musi być zbudowany pod ten sam SoftDevice (v6: aplikacja od 0x26000, v7: od 0x27000)
async function otafixCheckSd(fw, b) {
  const app = await nrfPackage(fw);
  const n = app.dat[8] | (app.dat[9] << 8), sds = [];
  for (let i = 0; i < n; i++) sds.push(app.dat[10 + 2 * i] | (app.dat[11 + 2 * i] << 8));
  const fam = sds.some(x => x >= 0xca && x !== 0xfffe) ? "v7" : "v6";
  if (fam !== sdFamily(b.sd))
    throw new Error(`firmware SF6 tej płytki jest pod SoftDevice ${fam}, a OTAFIX ma ${b.sd} – przerwano, nic nie zostało wgrane`);
}

const OTX_STEPS = [["fetch", "Pobranie i sprawdzenie bootloadera"], ["sd", "Zgodność z firmware SF6 (SoftDevice)"],
  ["dfu", "Przełączenie w tryb DFU"], ["port", "Port urządzenia w trybie DFU"], ["prep", "Kasowanie miejsca na bootloader"],
  ["send", "Wysyłanie SoftDevice + OTAFIX"], ["commit", "Bootloader zapisuje się – NIE odłączaj"], ["next", "Następny krok: firmware SF6"]];

async function otafixPrepare(fw, b) {
  UI.run("fetch", baseName(b.zip));
  const pkg = await otafixPackage(b);
  UI.ok("fetch", `SoftDevice ${b.sd} + OTAFIX · suma SHA-256 zgodna`);
  UI.run("sd");
  await otafixCheckSd(fw, b);
  UI.ok("sd", "SoftDevice " + b.sd + " pasuje");
  return pkg;
}

async function otafixStart(d, fw, b) {
  if (!$("flOtxOk").checked || busyGuard()) return;
  if (!confirm("Wgrać bootloader OTAFIX na " + d.name + "?\n\nFirmware zostanie usunięte. Nie odłączaj kabla do końca – przerwanie może trwale zablokować płytkę.")) return;
  let port;
  try { port = await SERIAL.requestPort(); }
  catch { setStatus("Nie wybrano portu.", "err"); return; }
  lockUi(true); setProgress(0); $("flOtxCont").hidden = true;
  UI.begin(OTX_STEPS);
  try {
    setStatus("Pobieranie i sprawdzanie bootloadera…");
    await otafixPrepare(fw, b);
    const lib = await nrfLib();
    const vid = port.getInfo().usbVendorId;
    setStatus("Przełączanie w tryb DFU…");
    UI.run("dfu", "restart urządzenia do bootloadera (1200 bps)");
    log("Przełączam " + d.name + " w tryb DFU (1200 bps)");
    await lib.touch1200(port);
    UI.elapsed("dfu", "czekam, aż urządzenie zgłosi się w trybie DFU", 3);
    await sleep(2500);
    UI.ok("dfu");
    const known = await findDfuPort(port, vid, 2500);
    if (known) { UI.ok("port", "wybrany automatycznie"); lockUi(false); return await otafixFlash(known, fw, b, true); }
    UI.user("port", "kliknij „Kontynuuj” i wybierz NOWY port, który właśnie się pojawił");
    setStatus("Urządzenie jest w trybie DFU. Kliknij „Kontynuuj” i wybierz nowy port, który właśnie się pojawił.", "ok");
    $("flOtxCont").hidden = false;
  } catch (e) {
    log("BŁĄD: " + (e.message || e));
    UI.fail(explain(e));
    setStatus("Nie udało się: " + explain(e) + ". Bootloader nie był jeszcze wgrywany – płytka jest bezpieczna.", "err");
  } finally { lockUi(false); }
}

async function otafixPickAndFlash(fw, b) {
  if (busyGuard()) return;
  let port;
  try { port = await SERIAL.requestPort(); }
  catch { setStatus("Nie wybrano portu.", "err"); return; }
  const cont = UI.has("next");
  if (cont) UI.ok("port", "wybrany");
  return otafixFlash(port, fw, b, cont);
}

async function otafixFlash(port, fw, b, cont = false) {
  if (!cont) UI.begin(OTX_STEPS.filter(([id]) => id !== "dfu" && id !== "port"));
  lockUi(true); setProgress(0);
  let sent = false;
  try {
    const pkg = UI.get("sd").st === "ok" ? await otafixPackage(b) : await otafixPrepare(fw, b);
    const lib = await nrfLib();
    setStatus("Wgrywanie bootloadera… NIE odłączaj urządzenia");
    const ph = dfuPhases({ what: "bootloader", prepText: "bootloader przygotowuje pamięć" });
    await lib.flashNrfDfu(port, pkg, {
      onProgress: f => { sent = true; ph.onProgress(f); },
      onPhase: ph.onPhase, log
    });
    setProgress(100);
    UI.ok("commit", "OTAFIX wgrany");
    UI.user("next", "kliknij „Wgraj teraz firmware SF6” i wybierz port urządzenia (czeka w trybie DFU bez firmware)");
    $("flOtxCont").hidden = true;
    setStatus("Bootloader OTAFIX wgrany. Urządzenie czeka teraz w trybie DFU bez firmware – kliknij „Wgraj teraz firmware SF6” i wybierz jego port.", "ok");
    log("Bootloader zakończony. Następny krok: firmware SF6.");
  } catch (e) {
    console.error(e);
    log("BŁĄD: " + (e.message || e));
    UI.fail(explain(e));
    setStatus("Nie udało się: " + explain(e) + ". " + (sent
      ? "Nie odłączaj zasilania. Kliknij dwa razy RESET – jeśli pojawi się dysk, płytka działa: spróbuj ponownie albo użyj sposobu 1 (plik .uf2)."
      : "Bootloader nie był jeszcze wysyłany – płytka jest bezpieczna. Kliknij dwa razy RESET (tryb DFU) i spróbuj ponownie."), "err");
  } finally { lockUi(false); }
}

// ---------- własny firmware (dla zaawansowanych) ----------
function detectEsp(u8) {
  if (u8[0] !== 0xe9) return { kind: "unknown", addr: ESP_APP_OFFSET };
  // pełny obraz (merged): bootloader od 0x0 i tablica partycji (magic AA 50) pod 0x8000
  if (u8.length > 0x9000 && u8[0x8000] === 0xaa && u8[0x8001] === 0x50) return { kind: "merged", addr: 0x0 };
  return { kind: "app", addr: ESP_APP_OFFSET };
}

function renderCustom() {
  $("flS3").classList.remove("off");
  setProgress(0); setStatus(""); UI.clear();
  $("flArea").innerHTML = `
    <div class="fl-notice">Tylko dla zaawansowanych – do testów własnych buildów. Strona nie sprawdza, czy plik pasuje do urządzenia:
      zły plik może sprawić, że urządzenie przestanie się uruchamiać (zwykle da się je odzyskać, wgrywając właściwy firmware w trybie BOOT/DFU).</div>
    <label class="fl-file"><span>Plik firmware</span>
      <input type="file" id="flCuFile" accept=".bin,.zip,.uf2"></label>
    <p class="fl-hint">ESP32: plik <b>.bin</b> (pełny obraz od 0x0 albo sama aplikacja od 0x10000).
      nRF52: paczka DFU <b>.zip</b> (np. <span class="mono">…-ota.zip</span> z buildu MeshCore).
      Plik <b>.uf2</b> wgrywa się, kopiując go na dysk bootloadera.</p>
    <div id="flCuOpts"></div>`;
  $("flCuFile").onchange = onCustomFile;
}

async function onCustomFile(e) {
  const f = e.target.files[0], box = $("flCuOpts");
  box.innerHTML = ""; setStatus(""); setProgress(0);
  if (!f) return;
  const u8 = new Uint8Array(await f.arrayBuffer());
  const ext = (f.name.split(".").pop() || "").toLowerCase();
  log("Wybrano plik " + f.name + " (" + (u8.length / 1024).toFixed(0) + " KB)");
  if (ext === "uf2") {
    box.innerHTML = `<div class="fl-actions"><button class="btn btn-green-line" id="flDfu" ${na(!hasSerial)}>Włącz tryb DFU</button></div>
      <p class="fl-hint">Plików .uf2 nie wgrywa się przez port szeregowy. Kliknij „Włącz tryb DFU” (albo szybko dwa razy RESET),
      a gdy pojawi się dysk bootloadera, skopiuj na niego plik ${esc(f.name)}.</p>`;
    $("flDfu").onclick = () => enterDfu({ name: "urządzenie" });
    return;
  }
  if (ext === "zip") {
    let pkg;
    try { pkg = await (await nrfLib()).readDfuZip(u8.buffer); }
    catch (err) { setStatus("To nie jest paczka DFU nRF52: " + (err.message || err), "err"); return; }
    const key = "local:" + f.name + ":" + f.size + ":" + f.lastModified;
    state.nrfPkg = { url: key, pkg };
    const fw = { zip: key };
    log("Paczka DFU nRF52: aplikacja " + (pkg.bin.length / 1024).toFixed(0) + " KB");
    box.innerHTML = `<p class="fl-hint"><b>nRF52</b> · paczka DFU, aplikacja ${(pkg.bin.length / 1024).toFixed(0)} KB</p>
      ${eraseBox(false)}
      <div class="fl-actions">
        <button class="btn btn-green" id="flNrf" ${na(!hasSerial)}>Wgraj przez USB</button>
        <button class="btn btn-green-line" id="flNrfCont" hidden>Kontynuuj – wybierz port DFU</button>
      </div>
      <p class="fl-hint">Urządzenie zrestartuje się w tryb DFU; jeśli strona poprosi, kliknij „Kontynuuj” i wybierz nowy port.
      Urządzenie jest już w trybie DFU? <a href="#" id="flNrfDirect">Wgraj od razu</a>.</p>`;
    $("flNrf").onclick = () => {
      state.nrfErase = $("flErase").checked;
      if (state.nrfErase && !confirmErase()) return;
      nrfStart({ name: "urządzenie" }, fw);
    };
    $("flNrfCont").onclick = () => nrfPickAndFlash();
    $("flNrfDirect").onclick = ev => {
      ev.preventDefault();
      if (state.busy || !hasSerial) return;
      state.nrfErase = $("flErase").checked;
      if (state.nrfErase && !confirmErase()) return;
      nrfPickAndFlash(fw);
    };
    return;
  }
  if (ext !== "bin") { setStatus("Nieobsługiwany plik – wybierz .bin, .zip albo .uf2.", "err"); return; }
  const det = detectEsp(u8);
  const kindTxt = det.kind === "merged" ? "pełny obraz (bootloader + partycje + aplikacja)"
    : det.kind === "app" ? "sama aplikacja" : "nierozpoznany plik – sprawdź adres";
  box.innerHTML = `<p class="fl-hint"><b>ESP32</b> · ${kindTxt}, ${(u8.length / 1024).toFixed(0)} KB</p>
    <label class="fl-file"><span>Adres w pamięci</span>
      <input type="text" id="flCuAddr" class="mono" value="0x${det.addr.toString(16)}" spellcheck="false"></label>
    <label class="fl-check"><input type="checkbox" id="flCuOta" ${det.kind === "merged" ? "" : "checked"}>
      <span><b>Wyczyść otadata (0xe000)</b><br>Żeby urządzenie uruchomiło wgraną aplikację z app0, nawet jeśli wcześniej działało z app1 (np. po aktualizacji przez WiFi). Dane i ustawienia zostają.</span></label>
    ${eraseBox(false)}
    <div class="fl-actions"><button class="btn btn-green" id="flCuEsp" ${na(!hasSerial)}>Wgraj przez USB</button></div>`;
  const data = u8ToStr(u8);
  $("flCuEsp").onclick = () => {
    const addr = parseInt($("flCuAddr").value.trim(), 16);
    if (!Number.isFinite(addr) || addr < 0 || addr % 0x1000) { setStatus("Nieprawidłowy adres – podaj wielokrotność 0x1000, np. 0x0 albo 0x10000.", "err"); return; }
    if (det.kind === "merged" && addr !== 0 && !confirm("To wygląda na pełny obraz, który wgrywa się od 0x0. Wgrać pod 0x" + addr.toString(16) + "?")) return;
    if (det.kind === "app" && addr === 0 && !confirm("To wygląda na samą aplikację – pod 0x0 nadpisze bootloader i urządzenie się nie uruchomi. Na pewno?")) return;
    const wipe = $("flErase").checked;
    if (wipe && !confirmErase()) return;
    const ota = $("flCuOta").checked;
    log("Własny plik " + f.name + " → 0x" + addr.toString(16) + (wipe ? ", z kasowaniem" : "") + (ota && !wipe && addr ? ", reset otadata" : ""));
    flashEspFiles(async () => {
      const files = [{ data, address: addr }];
      if (ota && !wipe && addr !== 0) files.unshift({ data: otadataBlank(), address: ESP_OTADATA });
      return files;
    }, wipe);
  };
}

loadManifest();
