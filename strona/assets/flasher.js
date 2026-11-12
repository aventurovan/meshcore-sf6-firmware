// Flasher SF6 – MeshCore Południe
// Lista firmware: /flasher/manifest.json (generowany automatycznie przez repo meshcore-sf6-firmware)
import { ESPLoader, Transport } from "https://cdn.jsdelivr.net/npm/esptool-js@0.5.7/bundle.js";

const MANIFEST_URL = "/flasher/manifest.json";
const ROLES = {
  repeater:      { name: "Repeater",            desc: "Przekaźnik sieci (RPT)" },
  companion_ble: { name: "Companion Bluetooth", desc: "Do telefonu przez BLE" },
  companion_usb: { name: "Companion USB",       desc: "Do komputera przez kabel" },
  companion_mapper: { name: "Companion + Mapper SF6", desc: "Nasz firmware: companion z mapowaniem bez telefonu" },
  room_server:   { name: "Room Server",         desc: "Pokój z historią wiadomości" }
};
const PLATFORM = { esp32: "ESP32", nrf52: "nRF52", rp2040: "RP2040", stm32: "STM32" };
const ESP_APP_OFFSET = 0x10000;

const $ = id => document.getElementById(id);
const state = { m: null, role: null, device: null, busy: false };
const hasSerial = "serial" in navigator;
if (!hasSerial) $("flNoSerial").hidden = false;

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fileUrl = p => new URL(p, new URL(MANIFEST_URL, location.href)).href;
const baseName = p => p.split("/").pop();
function log(msg) { const l = $("flLog"); l.textContent += msg + "\n"; l.scrollTop = l.scrollHeight; }
function setStatus(msg, kind = "") { const s = $("flStatus"); s.textContent = msg; s.className = "fl-status " + kind; }
function setProgress(p) { $("flBar").style.width = Math.max(0, Math.min(100, p)) + "%"; }
function setVersion(val, sub) { $("flVer").innerHTML = `<div class="lbl">Wersja</div><div class="val mono">${esc(val)}</div><div class="sub">${esc(sub)}</div>`; }

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
}

function showVersion() {
  const m = state.m, r = state.role && m.roles && m.roles[state.role];
  const v = r ? r.version : m.version;
  const built = (r && r.built) || m.built;
  const date = built ? new Date(built).toLocaleDateString("pl-PL") : "";
  setVersion(v || "?", (r ? "z " + r.upstream : "oficjalny MeshCore") + (date ? ", " + date : ""));
}

function renderRoles() {
  const present = Object.keys(ROLES).filter(r => state.m.devices.some(d => d.firmware && d.firmware[r]));
  $("flRoles").innerHTML = present.map(r => {
    const n = state.m.devices.filter(d => d.firmware[r]).length;
    return `<button class="fl-role" data-role="${r}" aria-pressed="false"><b>${ROLES[r].name}</b><small>${ROLES[r].desc}, ${n} urządz.</small></button>`;
  }).join("");
  $("flRoles").querySelectorAll(".fl-role").forEach(b => b.onclick = () => {
    if (state.busy) return;
    state.role = b.dataset.role;
    $("flRoles").querySelectorAll(".fl-role").forEach(x => x.setAttribute("aria-pressed", x === b));
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
$("flSearch").addEventListener("input", () => state.m && state.role && renderDevices());

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
  setProgress(0); setStatus("");
  if (!d || !state.role) { $("flS3").classList.add("off"); area.innerHTML = `<p class="fl-hint">Wybierz rolę i urządzenie.</p>`; return; }
  $("flS3").classList.remove("off");
  const fw = d.firmware[state.role];
  const note = state.role === "companion_mapper"
    ? `<p class="fl-note">Firmware MeshCore Południe: zwykły companion BLE (działa z aplikacją MeshCore) z wbudowanym Mapperem SF6 i polskim interfejsem na ekranie urządzenia. Dane z mapowania zrzucasz do aplikacji <a href="/mapper" target="_blank" rel="noopener">Mapper SF6</a>.</p>`
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
  } else {
    area.innerHTML = `<div class="fl-actions">${dl(fw.bin, "Pobierz .bin")}${dl(fw.hex, "Pobierz .hex")}</div>
      <p class="fl-hint">Tej platformy nie da się wgrać z przeglądarki. Pobierz plik i wgraj go narzędziem producenta (np. STM32CubeProgrammer).</p>`;
  }
}

function lockUi(b) {
  state.busy = b;
  document.querySelectorAll("#flArea button").forEach(x => x.disabled = b || x.dataset.na === "1");
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
  let port;
  try { port = await navigator.serial.requestPort(); }
  catch { setStatus("Nie wybrano portu.", "err"); return; }
  lockUi(true); setProgress(0); $("flNrfCont").hidden = true;
  try {
    setStatus("Pobieranie firmware…");
    await nrfPackage(fw);
    const lib = await nrfLib();
    const vid = port.getInfo().usbVendorId;
    setStatus("Przełączanie w tryb DFU…");
    log("Przełączam " + d.name + " w tryb DFU (1200 bps)");
    await lib.touch1200(port);
    await sleep(2500);
    // jeśli przeglądarka zna już port bootloadera (np. z poprzedniego wgrywania), wgrywamy od razu
    const known = (await navigator.serial.getPorts()).filter(p => p !== port && !p.readable && p.getInfo().usbVendorId === vid);
    if (known.length === 1) { lockUi(false); return nrfFlash(known[0], fw); }
    setStatus("Urządzenie jest w trybie DFU. Kliknij „Kontynuuj” i wybierz nowy port, który właśnie się pojawił.", "ok");
    state.nrfFw = fw;
    $("flNrfCont").hidden = false;
  } catch (e) {
    log("BŁĄD: " + (e.message || e));
    setStatus("Nie udało się: " + (e.message || e), "err");
  } finally { lockUi(false); }
}

async function nrfPickAndFlash(fw) {
  if (state.busy) return;
  fw = fw || state.nrfFw;
  let port;
  try { port = await navigator.serial.requestPort(); }
  catch { setStatus("Nie wybrano portu.", "err"); return; }
  return nrfFlash(port, fw);
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
    const t = setTimeout(() => { done(); resolve(null); }, timeout);
    const done = () => { clearTimeout(t); navigator.serial.removeEventListener("connect", h); };
    navigator.serial.addEventListener("connect", h);
  });
}

async function nrfErase(port, pkg, lib) {
  const e = erasePackage(lib, pkg);
  log("Pobieram program kasujący (" + baseName(e.url) + ")");
  const r = await fetch(e.url);
  if (!r.ok) throw new Error("nie udało się pobrać programu kasującego (HTTP " + r.status + ")");
  const bin = new Uint8Array(await r.arrayBuffer());
  const crc = lib.crc16(bin);
  const dat = new Uint8Array([...e.head, crc & 0xff, crc >> 8]);
  const { usbVendorId: vid, usbProductId: pid } = port.getInfo();
  setStatus("Kasowanie pamięci: wgrywanie programu kasującego…");
  const back = waitForPort(vid, pid, 120000);
  await lib.flashNrfDfu(port, { bin, dat }, { log });
  setStatus("Kasowanie całej pamięci… (około 30 s, nie odłączaj urządzenia)");
  log("Program kasujący działa, czekam na powrót urządzenia w trybie DFU");
  const again = await back;
  if (!again) return null;
  await sleep(1500);
  log("Pamięć skasowana, urządzenie w trybie DFU");
  return again;
}

async function nrfFlash(port, fw) {
  lockUi(true); setProgress(0);
  try {
    const pkg = await nrfPackage(fw);
    const lib = await nrfLib();
    if (state.nrfErase) {
      const again = await nrfErase(port, pkg, lib);
      state.nrfErase = false; // pamięć już czysta – ewentualne ponowienie tylko wgrywa
      if (!again) {
        state.nrfFw = fw;
        $("flNrfCont").hidden = false;
        setStatus("Pamięć skasowana. Kliknij „Kontynuuj” i wybierz port urządzenia w trybie DFU, żeby wgrać firmware.", "ok");
        return;
      }
      port = again;
    }
    setStatus("Wgrywanie… nie odłączaj urządzenia (około minuty)");
    await lib.flashNrfDfu(port, pkg, { onProgress: f => setProgress(f * 100), log });
    setProgress(100);
    $("flNrfCont").hidden = true;
    setStatus("Gotowe. Urządzenie uruchamia się z nowym firmware.", "ok");
    log("Zakończono.");
  } catch (e) {
    console.error(e);
    log("BŁĄD: " + (e.message || e));
    setStatus("Nie udało się: " + (e.message || e) + ". Kliknij dwa razy RESET (tryb DFU) i użyj „Wgraj od razu”.", "err");
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

async function flashEsp(fw, full) {
  let port, transport;
  try { port = await navigator.serial.requestPort(); }
  catch { setStatus("Nie wybrano portu.", "err"); return; }
  lockUi(true); setProgress(0);
  const terminal = { clean() {}, writeLine: l => log(l), write: l => log(l) };
  try {
    setStatus("Pobieranie firmware…");
    const data = await fetchBinary(full ? fw.full : fw.update);
    setStatus("Łączenie z urządzeniem…");
    transport = new Transport(port, true);
    const loader = new ESPLoader({ transport, baudrate: 460800, romBaudrate: 115200, terminal });
    log("Wykryto: " + await loader.main());
    setStatus(full ? "Kasowanie i wgrywanie… nie odłączaj urządzenia" : "Wgrywanie… nie odłączaj urządzenia");
    await loader.writeFlash({
      fileArray: [{ data, address: full ? 0x0 : ESP_APP_OFFSET }],
      flashSize: "keep", flashMode: "keep", flashFreq: "keep",
      eraseAll: full, compress: true,
      reportProgress: (_i, written, total) => setProgress(written / total * 100)
    });
    await loader.after();
    setProgress(100);
    setStatus("Gotowe. Urządzenie uruchamia się z nowym firmware.", "ok");
    log("Zakończono.");
  } catch (e) {
    console.error(e);
    log("BŁĄD: " + (e.message || e));
    setStatus("Nie udało się: " + (e.message || e) + ". Sprawdź kabel albo uruchom urządzenie w trybie BOOT i spróbuj ponownie.", "err");
  } finally {
    try { if (transport) await transport.disconnect(); else if (port) await port.close(); } catch {}
    lockUi(false);
  }
}

async function enterDfu(d) {
  let port;
  try { port = await navigator.serial.requestPort(); }
  catch { setStatus("Nie wybrano portu.", "err"); return; }
  lockUi(true);
  try {
    log("Przełączam " + d.name + " w tryb DFU (1200 bps)");
    await port.open({ baudRate: 1200 });
    try {
      await port.setSignals({ dataTerminalReady: true });
      await sleep(100);
      await port.setSignals({ dataTerminalReady: false });
    } catch {}
    await sleep(100);
    await port.close();
    setStatus("Tryb DFU włączony. Za chwilę pojawi się dysk – przeciągnij na niego plik .uf2.", "ok");
  } catch (e) {
    try { await port.close(); } catch {}
    log("BŁĄD: " + (e.message || e));
    setStatus("Nie udało się włączyć DFU: " + (e.message || e) + ". Kliknij szybko dwa razy RESET na urządzeniu.", "err");
  } finally { lockUi(false); }
}

loadManifest();
