/* Konfigurator RPT – MeshCore Południe SF6
 * Pulpit zgodności + kreator krok po kroku, Web Serial (CLI 115200).
 * CLI repeatera: urządzenie odsyła echo komendy, potem (jeśli jest odpowiedź) linię "  -> <odpowiedź>".
 * Nie ma znaku zachęty – czekamy na "  -> " albo na timeout.
 */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const P = Object.assign({ freq: "869.618", bw: "62.5", sf: "6", cr: "8" }, window.RP_PRESET || {});
  const STD = { tx: 22, hash: 1, adv: 60, flood: 12, floodMax: 32 };
  const HOP_CAPS = { 0: 64, 1: 32, 2: 21 };
  const NAME_BAD = /[\[\]\\:,?*]/;
  const REPLY_TIMEOUT = 1500;
  const MULTI = new Set(["neighbors"]);
  const enc = new TextEncoder();

  let port = null, reader = null, writer = null, connected = false, keepReading = false;
  let rxBuf = "", pending = null, chain = Promise.resolve();
  let boardFamily = "", clockOffsetMin = null, reading = false, liveTimer = null;
  const unsupported = new Set();
  const logLines = [];

  /* ---------- dziennik: oś czasu + surowe CLI ---------- */
  const term = $("terminalOutput"), tl = $("timeline");
  const now = () => new Date().toLocaleTimeString("pl-PL");
  function termLine(text, cls) {
    logLines.push(`${now()}  ${text}`);
    if (logLines.length > 3000) logLines.shift();
    const atBottom = term.scrollHeight - term.scrollTop - term.clientHeight < 40;
    const div = document.createElement("div");
    if (cls) div.className = cls;
    const t = document.createElement("span");
    t.className = "t-time";
    t.textContent = now() + "  ";
    div.append(t, document.createTextNode(text));
    term.appendChild(div);
    while (term.childNodes.length > 1500) term.removeChild(term.firstChild);
    if (atBottom) term.scrollTop = term.scrollHeight;
  }
  function event(kind, title, detail) {
    logLines.push(`${now()}  [${kind.toUpperCase()}] ${title}${detail ? " – " + detail.replace(/\n/g, "; ") : ""}`);
    const li = document.createElement("li");
    li.className = kind;
    const b = document.createElement("b");
    b.textContent = title;
    const s = document.createElement("small");
    s.textContent = now() + (detail ? " · " + detail : "");
    li.append(b, s);
    tl.prepend(li);
    while (tl.childNodes.length > 80) tl.removeChild(tl.lastChild);
  }
  const evInfo = (t, d) => event("info", t, d);
  const evOk = (t, d) => event("ok", t, d);
  const evWarn = (t, d) => event("warn", t, d);
  const evErr = (t, d) => event("err", t, d);

  const SECRET_CMD = /^(password|set guest\.password|set prv\.key)(\s+)(.+)$/i;
  const maskCmd = (cmd) => cmd.replace(SECRET_CMD, (m, a, s) => a + s + "••••••");
  function maskReply(cmd, reply) {
    const c = (cmd || "").trim().toLowerCase();
    if (c === "get prv.key" || c === "get guest.password") return "> ••••••";
    if (/^password now:/i.test(reply)) return "password now: ••••••";
    return reply;
  }

  /* ---------- okna ---------- */
  function showModal(title, text, buttons) {
    buttons = buttons || [{ label: "OK", value: true, cls: "btn-green" }];
    return new Promise((resolve) => {
      $("modalTitle").textContent = title;
      $("modalText").textContent = text;
      const box = $("modalButtons");
      box.textContent = "";
      const close = (v) => { $("customModal").hidden = true; document.removeEventListener("keydown", onKey, true); resolve(v); };
      const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); close(null); } };
      buttons.forEach((b, i) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "btn " + (b.cls || "btn-line");
        el.textContent = b.label;
        el.addEventListener("click", () => close(b.value));
        box.appendChild(el);
        if (i === buttons.length - 1) setTimeout(() => el.focus(), 30);
      });
      document.addEventListener("keydown", onKey, true);
      $("customModal").hidden = false;
    });
  }
  const confirmModal = (title, text, okLabel, danger) => showModal(title, text, [
    { label: "Anuluj", value: false, cls: "btn-line" },
    { label: okLabel || "Tak", value: true, cls: danger ? "rp-btn-danger" : "btn-green" },
  ]);

  /* ---------- połączenie ---------- */
  function setStatus(state, text) {
    $("statusDot").className = "rp-dot" + (state === "on" ? " on" : state === "busy" ? " busy" : "");
    $("statusText").textContent = text;
  }
  function showDash(on) {
    connected = on;
    $("rpStart").hidden = on;
    $("rpDash").hidden = !on;
    $("terminalInput").disabled = !on;
    if (!on) { $("btnApplyImport").hidden = true; clearInterval(liveTimer); liveTimer = null; }
  }

  function familyFromVid(vid) {
    if ([0x239a, 0x2886, 0x1915].includes(vid)) return "nrf52";
    if ([0x303a, 0x10c4, 0x1a86, 0x0403].includes(vid)) return "esp32";
    if (vid === 0x2e8a) return "rp2040";
    return "";
  }
  function familyFromName(name) {
    const n = (name || "").toLowerCase();
    if (/nrf|rak\s?463|t114|mesh solar|t-echo|techo|xiao nrf|wio|tracker l1|ikoka|thinknode m[16]|promicro|sensecap/.test(n)) return "nrf52";
    if (/esp32|heltec v[234]|wireless (stick|paper|tracker)|t-beam|tbeam|t-lora|lilygo t3|station g2|xiao (s3|c3|c6)|thinknode m[25]/.test(n)) return "esp32";
    if (/rp2040|pico/.test(n)) return "rp2040";
    return "";
  }

  async function connectSerial() {
    if (!("serial" in navigator)) return;
    try { port = await navigator.serial.requestPort(); } catch (e) { return; }
    try {
      await port.open({ baudRate: 115200 });
    } catch (e) {
      showModal("Nie udało się otworzyć portu", "Port jest zajęty albo niedostępny. Zamknij inne programy, które mogą go używać (inną kartę z konfiguratorem, Arduino, flasher) i spróbuj ponownie.\n\n" + e.message);
      port = null;
      return;
    }
    const info = port.getInfo ? port.getInfo() : {};
    boardFamily = familyFromVid(info.usbVendorId);
    writer = port.writable.getWriter();
    keepReading = true;
    resetView();
    showDash(true);
    setStatus("on", "Połączono przez USB");
    evInfo("Połączono przez USB", info.usbVendorId ? `VID 0x${info.usbVendorId.toString(16).padStart(4, "0")}` : "");
    readLoop();
    navigator.serial.addEventListener("disconnect", onUsbGone);
    await sleep(400);
    await readAllInfo();
    liveTimer = setInterval(() => { if (connected && !reading && document.visibilityState === "visible") refreshLive(); }, 30000);
  }

  function onUsbGone(e) {
    if (port && e.target === port) disconnectSerial(true);
  }

  async function disconnectSerial(lost) {
    keepReading = false;
    if (pending) { clearTimeout(pending.timer); pending.resolve(null); pending = null; }
    try { if (reader) await reader.cancel(); } catch (e) {}
    try { if (writer) writer.releaseLock(); } catch (e) {}
    try { if (port && !lost) await port.close(); } catch (e) {}
    reader = writer = null; port = null;
    if (navigator.serial) navigator.serial.removeEventListener("disconnect", onUsbGone);
    showDash(false);
    setStatus("", "Rozłączono");
    closeWizard();
    if (lost) showModal("Repeater odłączony", "Port USB zniknął – po restarcie albo odłączeniu kabla. Kliknij „Połącz przez USB”, żeby połączyć się ponownie.");
  }

  async function readLoop() {
    const dec = new TextDecoder();
    while (port && port.readable && keepReading) {
      reader = port.readable.getReader();
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          rxBuf += dec.decode(value, { stream: true });
          let i;
          while ((i = rxBuf.indexOf("\n")) >= 0) {
            const line = rxBuf.slice(0, i).replace(/\r/g, "");
            rxBuf = rxBuf.slice(i + 1);
            handleLine(line);
          }
          if (rxBuf.length > 4096) rxBuf = rxBuf.slice(-1024);
        }
      } catch (e) {
        if (keepReading) termLine("Błąd odczytu portu: " + e.message);
      } finally {
        try { reader.releaseLock(); } catch (e) {}
        reader = null;
      }
      if (!keepReading) break;
      await sleep(200);
    }
    if (connected && keepReading) disconnectSerial(true);
  }

  function finishPending() {
    const p = pending; pending = null;
    clearTimeout(p.timer);
    p.resolve(p.reply);
  }
  function handleLine(line) {
    if (line.trim() === "") return;
    const m = line.match(/^\s*->\s?(.*)$/);
    if (m && !(pending && pending.collecting)) {
      const reply = m[1].trim();
      const cmd = pending ? pending.cmd : null;
      termLine("  -> " + maskReply(cmd, reply));
      if (pending) {
        pending.reply = reply;
        if (MULTI.has(pending.cmd)) {
          pending.collecting = true;
          clearTimeout(pending.timer);
          pending.timer = setTimeout(finishPending, 200);
        } else finishPending();
      }
      return;
    }
    if (pending && !pending.echo && line.trim() === pending.cmd) {
      pending.echo = true;
      termLine(maskCmd(line.trim()), "t-in");
      return;
    }
    termLine(line);
    if (pending && pending.collecting) {
      pending.reply += "\n" + line.trim();
      clearTimeout(pending.timer);
      pending.timer = setTimeout(finishPending, 200);
    }
  }

  /* kolejka komend – jedna na raz */
  function send(cmd, timeout) {
    const run = () => exec(cmd, timeout || REPLY_TIMEOUT);
    const p = chain.then(run, run);
    chain = p.catch(() => {});
    return p;
  }
  function exec(cmd, timeout) {
    if (!connected || !writer) return Promise.resolve(null);
    return new Promise((resolve) => {
      pending = { cmd, resolve, echo: false, reply: null, timer: setTimeout(() => {
        if (pending && pending.cmd === cmd) { if (!pending.echo) termLine(maskCmd(cmd), "t-in"); pending = null; }
        resolve(null);
      }, timeout) };
      writer.write(enc.encode(cmd + "\r\n")).catch((e) => {
        if (pending) { clearTimeout(pending.timer); pending = null; }
        termLine("Nie udało się wysłać komendy: " + e.message);
        resolve(null);
      });
    });
  }
  const val = (r) => (r == null ? null : r.replace(/^>\s?/, "").trim());
  const isErr = (r) => r != null && /^(\(?err|error|unknown|invalid)/i.test(r);
  const plural = (n) => (n === 1 ? "ustawienie" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "ustawienia" : "ustawień");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function sendAll(cmds) {
    const errors = [];
    for (const c of cmds) {
      const r = await send(c);
      if (r == null) errors.push(`${maskCmd(c)}: brak odpowiedzi`);
      else if (isErr(r)) errors.push(`${maskCmd(c)}: ${r}`);
    }
    return errors;
  }

  /* ---------- odczyt ustawień ---------- */
  const READERS = {
    "board": (v) => { $("info_board").textContent = v; checkBoard(v); },
    "ver": (v) => { $("info_fw").textContent = v.replace(/\s*\(Build:.*$/, ""); $("info_fw").title = v; },
    "clock": (v) => checkClock(v),
    "get name": (v) => { $("conf_name").value = v; $("devName").textContent = v || "Repeater"; },
    "get repeat": (v) => setRepeatInfo(/^(on|1)$/i.test(v)),
    "get radio": (v) => {
      const p = v.split(",");
      if (p.length < 4) throw new Error("radio");
      $("conf_freq").value = (+p[0]).toFixed(3);
      setSelect("conf_bw", String(+p[1]));
      setSelect("conf_sf", String(parseInt(p[2], 10)));
      setSelect("conf_cr", String(parseInt(p[3], 10)));
      checkRadio();
    },
    "get tx": (v) => { $("conf_tx").value = parseInt(v, 10); checkTx(); },
    "get path.hash.mode": (v) => { const m = v.match(/[0-2]/); if (m) $("conf_path_hash_mode").value = m[0]; checkRadio(); checkFloodMax(); },
    "get advert.interval": (v) => { $("conf_adv_int").value = parseInt(v, 10); checkAdverts(); },
    "get flood.advert.interval": (v) => { $("conf_flood_adv_int").value = parseInt(v, 10); checkAdverts(); },
    "get flood.max": (v) => { $("conf_flood_max").value = parseInt(v, 10); checkFloodMax(); },
    "get lat": (v) => { if (!isNaN(parseFloat(v))) $("conf_lat").value = v; },
    "get lon": (v) => { if (!isNaN(parseFloat(v))) $("conf_lon").value = v; },
    "get public.key": (v) => { const h = v.replace(/[^0-9a-f]/gi, ""); if (h.length !== 64) throw new Error("key"); $("conf_pub_key").value = h.toUpperCase(); updateCurrentId(); },
    "get prv.key": (v) => { const h = v.replace(/[^0-9a-f]/gi, ""); if (h.length === 128) $("conf_priv_key").value = h.toUpperCase(); },
    "get dutycycle": (v) => { const n = parseFloat(v); if (!isNaN(n)) $("conf_dutycycle").value = n; },
    "get owner.info": (v) => { $("conf_owner_info").value = v.replace(/\|/g, "\n"); updateOwnerCounter(); },
    "get loop.detect": (v) => setSelect("conf_loop_detect", v.toLowerCase()),
    "get int.thresh": (v) => { $("conf_int_thresh").value = parseInt(v, 10); },
    "get agc.reset.interval": (v) => { $("conf_agc_reset").value = parseInt(v, 10); },
    "get rxdelay": (v) => { $("conf_rxdelay").value = parseFloat(v); },
    "get txdelay": (v) => { $("conf_txdelay").value = parseFloat(v); },
    "get direct.txdelay": (v) => { $("conf_direct_txdelay").value = parseFloat(v); },
    "get multi.acks": (v) => { $("conf_multi_acks").checked = v === "1" || /^on$/i.test(v); },
  };
  const READ_ORDER = Object.keys(READERS);

  function setSelect(id, v) {
    const el = $(id);
    if (![...el.options].some((o) => o.value === v)) {
      const o = document.createElement("option");
      o.value = v; o.textContent = v + " (z urządzenia)";
      el.appendChild(o);
    }
    el.value = v;
  }
  async function readOne(cmd) {
    const r = await send(cmd);
    if (r == null || isErr(r)) return false;
    try { READERS[cmd](val(r)); } catch (e) { return false; }
    return true;
  }

  function resetView() {
    ["info_board", "info_fw"].forEach((id) => ($(id).textContent = "-"));
    $("devName").textContent = "Repeater"; $("devId").textContent = "ID ----";
    ["conf_pub_key", "conf_priv_key", "conf_name", "conf_freq", "conf_tx", "conf_adv_int", "conf_flood_max",
     "conf_flood_adv_int", "conf_lat", "conf_lon", "conf_dutycycle", "conf_owner_info", "conf_int_thresh",
     "conf_agc_reset", "conf_rxdelay", "conf_txdelay", "conf_direct_txdelay"].forEach((id) => ($(id).value = ""));
    ["live_batt", "live_noise", "live_up", "live_pkts", "info_repeat"].forEach((id) => ($(id).textContent = "–"));
    $("live_nb").textContent = "–"; $("live_nb").disabled = true; $("nbList").hidden = true;
    clockOffsetMin = null;
    unsupported.clear();
    renderChecks();
  }

  async function readAllInfo() {
    if (!connected || reading) return;
    reading = true;
    setStatus("busy", "Odczyt ustawień…");
    const t0 = performance.now();
    let missing = [];
    for (const c of READ_ORDER) { if (!connected) break; if (!(await readOne(c))) missing.push(c); }
    for (let round = 1; round <= 2 && missing.length && connected; round++) {
      const again = [];
      for (const c of missing) if (!(await readOne(c))) again.push(c);
      missing = again;
    }
    reading = false;
    if (!connected) return;
    setStatus("on", "Połączono przez USB");
    updateCurrentId(); updateOwnerCounter();
    const n = READ_ORDER.length - missing.length;
    if (missing.length === READ_ORDER.length) {
      evErr("Repeater nie odpowiada", "Sprawdź, czy to repeater MeshCore i czy port jest właściwy.");
    } else if (missing.length) {
      evWarn(`Odczytano ${n} z ${READ_ORDER.length} ustawień`, "Brak: " + missing.join(", "));
    } else {
      evOk(`Odczytano ${n} ${plural(n)}`, `w ${((performance.now() - t0) / 1000).toFixed(1)} s`);
    }
    if (/companion|room/i.test($("info_fw").title || "")) evErr("To nie wygląda na firmware repeatera", $("info_fw").title);
    renderChecks(true);
    refreshLive();
  }

  /* ---------- stan na żywo ---------- */
  function parseJson(r) { try { return JSON.parse(r); } catch (e) { return null; } }
  function fmtUptime(s) {
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    return d ? `${d} d ${h} h` : h ? `${h} h ${m} min` : `${m} min`;
  }
  function fmtAgo(s) {
    return s < 90 ? `${s} s temu` : s < 5400 ? `${Math.round(s / 60)} min temu` : s < 172800 ? `${Math.round(s / 3600)} godz. temu` : `${Math.round(s / 86400)} dni temu`;
  }
  async function liveCmd(cmd) {
    if (unsupported.has(cmd)) return null;
    const r = await send(cmd);
    if (r == null) return null;
    if (isErr(r)) { unsupported.add(cmd); return null; }
    return r;
  }
  let liveBusy = false;
  async function refreshLive() {
    if (!connected || liveBusy) return;
    liveBusy = true;
    const core = parseJson(await liveCmd("stats-core") || "");
    const power = await liveCmd("power");
    if (core && core.battery_mv) {
      let t = (core.battery_mv / 1000).toFixed(2).replace(".", ",") + " V";
      if (power) {
        if (/usb:yes/.test(power)) t += " · USB";
        if (/solar_chg:yes/.test(power)) t += " · słońce";
      }
      $("live_batt").textContent = t;
    }
    if (core && core.uptime_secs != null) $("live_up").textContent = fmtUptime(core.uptime_secs);
    const radio = parseJson(await liveCmd("stats-radio") || "");
    if (radio && radio.noise_floor != null) $("live_noise").textContent = radio.noise_floor + " dBm";
    const pk = parseJson(await liveCmd("stats-packets") || "");
    if (pk && pk.recv != null) $("live_pkts").textContent = `${pk.recv.toLocaleString("pl-PL")} / ${pk.sent.toLocaleString("pl-PL")}`;
    const nb = await liveCmd("neighbors");
    if (nb != null) renderNeighbors(nb);
    await readOne("get repeat");
    $("live_time").textContent = "odświeżono " + new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) + " · co 30 s";
    liveBusy = false;
  }
  function renderNeighbors(txt) {
    const rows = txt.split("\n").map((l) => l.trim()).filter((l) => /^[0-9a-f]{4,}:\d+:-?\d+$/i.test(l));
    const btn = $("live_nb"), ul = $("nbList");
    btn.textContent = rows.length ? `${rows.length} RPT` : "brak";
    btn.disabled = !rows.length;
    ul.textContent = "";
    rows.forEach((l) => {
      const [id, ago, snr] = l.split(":");
      const li = document.createElement("li");
      const a = document.createElement("span"); a.textContent = id.toUpperCase().slice(0, 4);
      const b = document.createElement("span"); b.textContent = `SNR ${(+snr / 4).toFixed(1)} dB`;
      const c = document.createElement("span"); c.textContent = fmtAgo(+ago);
      li.append(a, b, c);
      ul.appendChild(li);
    });
  }

  /* ---------- sprawdzanie wartości ---------- */
  function setCheck(id, cls, text) { const el = $(id); el.className = "rp-check" + (cls ? " " + cls : ""); el.textContent = text || ""; }
  function radioOk() {
    return Math.abs(parseFloat($("conf_freq").value) - parseFloat(P.freq)) < 0.0005 &&
      parseFloat($("conf_bw").value) === parseFloat(P.bw) && $("conf_sf").value === String(P.sf);
  }
  function checkRadio() {
    const ok = radioOk() && $("conf_path_hash_mode").value === "1";
    $("radio_warning").hidden = ok || $("conf_freq").value === "";
    return ok;
  }
  function checkTx() {
    const el = $("conf_tx"), n = parseInt(el.value, 10);
    el.classList.toggle("bad", !isNaN(n) && (n < -9 || n > 30));
  }
  function checkAdverts() {
    const a = $("conf_adv_int").value.trim(), f = $("conf_flood_adv_int").value.trim();
    let ok = true;
    if (a === "") setCheck("zero_hop_status");
    else {
      const n = Number(a), valid = n === 0 || (n >= 60 && n <= 240);
      if (!valid) { setCheck("zero_hop_status", "err", "Advert lokalny: dozwolone 0 albo 60–240 minut."); ok = false; }
      else if (n === 0) setCheck("zero_hop_status", "warn", "Advert lokalny wyłączony (0). Standard sieci: 60 min.");
      else if (n !== STD.adv) setCheck("zero_hop_status", "warn", `Advert lokalny co ${n} min (standard: 60).`);
      else setCheck("zero_hop_status");
      $("conf_adv_int").classList.toggle("bad", !valid);
    }
    if (f === "") setCheck("flood_adv_status");
    else {
      const n = Number(f), valid = n === 0 || (n >= 3 && n <= 168);
      if (!valid) { setCheck("flood_adv_status", "err", "Advert flood: dozwolone 0 albo 3–168 godzin."); ok = false; }
      else if (n === 0) setCheck("flood_adv_status", "warn", "Advert flood wyłączony (0). Standard sieci: 12 h.");
      else if (n !== STD.flood) setCheck("flood_adv_status", "warn", `Advert flood co ${n} h (standard: 12).`);
      else setCheck("flood_adv_status");
      $("conf_flood_adv_int").classList.toggle("bad", !valid);
    }
    return ok;
  }
  function checkFloodMax() {
    const v = $("conf_flood_max").value.trim(), cap = HOP_CAPS[$("conf_path_hash_mode").value];
    if (v === "") { setCheck("flood_max_status"); return true; }
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n > 64) { setCheck("flood_max_status", "err", "flood.max: 0–64."); return false; }
    if (cap !== undefined && n > cap) setCheck("flood_max_status", "warn", `${n} skoków to więcej niż mieści prefiks w tym trybie (maks. ${cap}).`);
    else setCheck("flood_max_status");
    return true;
  }
  function nameProblem(n) {
    if (!n) return "";
    if (NAME_BAD.test(n)) return "Nazwa zawiera niedozwolony znak: [ ] \\ : , ? *";
    if (enc.encode(n).length > 31) return "Nazwa jest za długa (maks. 31 bajtów; polskie litery zajmują po 2).";
    return "";
  }
  function coordProblem(lat, lon) {
    if (lat !== "" && (isNaN(+lat) || +lat < -90 || +lat > 90)) return "Szerokość musi być liczbą od -90 do 90.";
    if (lon !== "" && (isNaN(+lon) || +lon < -180 || +lon > 180)) return "Długość musi być liczbą od -180 do 180.";
    return "";
  }
  let espNoted = false;
  function checkBoard(name) {
    const fam = boardFamily || familyFromName(name);
    if (fam === "esp32" && !espNoted) {
      espNoted = true;
      evWarn("Płytka ESP32", "Pobiera wyraźnie więcej prądu niż nRF52. Przy zasilaniu z panelu lepsze są RAK 4631, Heltec T114, XIAO nRF52840.");
    }
  }
  function setRepeatInfo(on) {
    const el = $("info_repeat");
    el.textContent = on ? "Włączone" : "Wyłączone";
    el.style.color = on ? "#1E7A50" : "#B42318";
    el.dataset.on = on ? "1" : "0";
  }
  function checkClock(s) {
    $("info_clock").textContent = s;
    const m = s.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!m) throw new Error("clock");
    const dev = Date.UTC(+m[5], +m[4] - 1, +m[3], +m[1], +m[2]);
    clockOffsetMin = Math.round((dev - Date.now()) / 60000);
  }
  function fmtOffset(min) {
    const a = Math.abs(min);
    const t = a >= 2880 ? Math.round(a / 1440) + " dni" : a >= 120 ? Math.round(a / 60) + " godz." : a + " min";
    return t + (min > 0 ? " do przodu" : " do tyłu");
  }

  /* ---------- pulpit zgodności ---------- */
  function presetState() {
    const g = (id) => $(id).value.trim();
    if (g("conf_freq") === "") return null;
    return {
      radio: radioOk(), hash: g("conf_path_hash_mode") === "1", tx: +g("conf_tx") === STD.tx,
      adv: +g("conf_adv_int") === STD.adv && +g("conf_flood_adv_int") === STD.flood && +g("conf_flood_max") === STD.floodMax,
    };
  }
  function renderChecks(announce) {
    const g = (id) => $(id).value.trim();
    const ps = presetState();
    const lat = parseFloat(g("conf_lat")), lon = parseFloat(g("conf_lon"));
    const hasLoc = !isNaN(lat) && !isNaN(lon) && (lat !== 0 || lon !== 0);
    const items = [
      { key: "radio", title: "Radio SF6", st: ps ? (ps.radio ? "ok" : "bad") : "unk",
        sub: ps ? `${g("conf_freq")} · ${g("conf_bw")} · SF${g("conf_sf")}` : "nie odczytano", fix: "preset" },
      { key: "hash", title: "Prefiks 2 bajty", st: ps ? (ps.hash ? "ok" : "bad") : "unk",
        sub: ps ? ({ 0: "teraz 1 bajt", 1: "path.hash.mode 1", 2: "teraz 3 bajty" }[g("conf_path_hash_mode")] || "") : "nie odczytano", fix: "preset" },
      { key: "tx", title: `Moc ${STD.tx} dBm`, st: ps && g("conf_tx") !== "" ? (ps.tx ? "ok" : "warn") : "unk",
        sub: g("conf_tx") !== "" ? (ps && ps.tx ? "maksymalna" : `teraz ${g("conf_tx")} dBm`) : "nie odczytano", fix: "preset" },
      { key: "adv", title: "Adverty", st: ps && g("conf_adv_int") !== "" ? (ps.adv ? "ok" : "warn") : "unk",
        sub: g("conf_adv_int") !== "" ? (ps && ps.adv ? "60 min · 12 h · 32 skoki" : `${g("conf_adv_int")} min · ${g("conf_flood_adv_int")} h · ${g("conf_flood_max")} skoków`) : "nie odczytano", fix: "preset" },
      { key: "loc", title: "Lokalizacja", st: g("conf_lat") === "" && !connected ? "unk" : hasLoc ? "ok" : "warn",
        sub: hasLoc ? `${lat.toFixed(3)}, ${lon.toFixed(3)}` : "brak – nie pojawi się na mapie", fix: "loc", fixLabel: "Ustaw" },
      { key: "clock", title: "Zegar", st: clockOffsetMin == null ? "unk" : Math.abs(clockOffsetMin) <= 5 ? "ok" : "bad",
        sub: clockOffsetMin == null ? "nie odczytano" : Math.abs(clockOffsetMin) <= 5 ? "zgodny z komputerem" : fmtOffset(clockOffsetMin), fix: "clock", fixLabel: "Synchronizuj" },
    ];
    const box = $("checks");
    box.textContent = "";
    items.forEach((it) => {
      const d = document.createElement("div");
      d.className = "rp-ck " + it.st;
      const b = document.createElement("b");
      b.textContent = (it.st === "ok" ? "✓ " : it.st === "bad" ? "✕ " : it.st === "warn" ? "! " : "") + it.title;
      const s = document.createElement("span"); s.textContent = it.sub;
      d.append(b, s);
      if (it.st === "bad" || it.st === "warn") {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = it.fixLabel || "Popraw";
        btn.addEventListener("click", () => fixOne(it.fix));
        d.appendChild(btn);
      }
      box.appendChild(d);
    });
    const known = items.filter((i) => i.st !== "unk");
    const ok = items.filter((i) => i.st === "ok").length;
    const ring = $("scoreRing");
    $("scoreText").textContent = known.length ? `${ok}/6` : "–";
    ring.style.setProperty("--p", known.length ? Math.round((ok / 6) * 100) : 0);
    ring.style.setProperty("--c", ok === 6 ? "#9EE6C4" : ok >= 4 ? "#F5C451" : "#F7A196");
    ring.setAttribute("aria-label", `Zgodność z siecią: ${ok} z 6`);
    const fixable = items.filter((i) => (i.st === "bad" || i.st === "warn") && (i.fix === "preset" || i.fix === "clock"));
    const fb = $("btnFixAll");
    fb.disabled = !fixable.length;
    fb.textContent = fixable.length ? `Napraw wszystko (${fixable.length})` : "Wszystko zgodne";
    const needsWizard = ps && (!ps.radio || !ps.hash);
    $("wizardHint").hidden = !needsWizard;
    if (announce && known.length) {
      const bad = items.filter((i) => i.st === "bad" || i.st === "warn").map((i) => i.title);
      if (bad.length) evWarn(`Zgodność z siecią: ${ok} z 6`, "Do poprawy: " + bad.join(", "));
      else evOk("Repeater zgodny ze standardem Południe SF6");
    }
  }

  async function fixOne(what) {
    if (what === "preset") return applyPreset(true);
    if (what === "clock") return syncClock();
    if (what === "loc") { selectTab("tab-basic"); $("conf_lat").focus(); }
  }

  /* ---------- akcje: preset, zegar, restart ---------- */
  async function applyPreset(ask) {
    const before = presetState();
    if (ask) {
      const ok = await confirmModal("Preset Południe SF6",
        `Repeater dostanie ustawienia:\n• radio ${P.freq} MHz, BW ${P.bw}, SF${P.sf}, CR${P.cr}\n• moc TX ${STD.tx} dBm (maksimum)\n• prefiks 2 bajty\n• advert lokalny co ${STD.adv} min, flood co ${STD.flood} h, flood.max ${STD.floodMax}\n\nNazwa, lokalizacja, hasła i klucz zostają bez zmian.`, "Ustaw preset");
      if (!ok) return false;
    }
    setStatus("busy", "Zapisywanie…");
    const errors = await sendAll([
      `set radio ${P.freq},${P.bw},${P.sf},${P.cr}`, `set tx ${STD.tx}`, `set path.hash.mode ${STD.hash}`,
      `set advert.interval ${STD.adv}`, `set flood.advert.interval ${STD.flood}`, `set flood.max ${STD.floodMax}`,
    ]);
    for (const c of ["get radio", "get tx", "get path.hash.mode", "get advert.interval", "get flood.advert.interval", "get flood.max"]) await readOne(c);
    setStatus("on", "Połączono przez USB");
    const after = presetState() || {};
    const bad = [];
    if (!after.radio) bad.push(`radio: ${$("conf_freq").value} / ${$("conf_bw").value} / SF${$("conf_sf").value}`);
    if (!after.hash) bad.push("prefiks: tryb " + $("conf_path_hash_mode").value);
    if (!after.tx) bad.push("moc TX: " + $("conf_tx").value);
    if (!after.adv) bad.push("adverty: " + [$("conf_adv_int").value, $("conf_flood_adv_int").value, $("conf_flood_max").value].join(" / "));
    renderChecks();
    if (errors.length || bad.length) {
      const d = [...errors, ...bad.map((b) => "odczytano " + b)].join("\n");
      evErr("Preset SF6 zapisał się częściowo", d);
      if (ask) showModal("Nie wszystko się zapisało", d + "\n\nSzczegóły w konsoli CLI.");
      return false;
    }
    evOk("Preset Południe SF6 zapisany", "6 ustawień potwierdzonych odczytem");
    const radioChanged = before && !before.radio;
    if (radioChanged) { needReboot = true; evWarn("Radio zacznie działać po restarcie"); }
    if (ask && radioChanged) askReboot("Nowe radio zacznie działać po restarcie repeatera.");
    return true;
  }
  let needReboot = false;

  async function syncClock(silent) {
    if (clockOffsetMin != null && clockOffsetMin > 5) {
      if (silent) return "ahead";
      const ok = await confirmModal("Zegar repeatera jest do przodu",
        `Zegar jest ${fmtOffset(clockOffsetMin)}. Repeater nie pozwala cofnąć zegara komendą – można go wyzerować komendą clkreboot (ustawi datę na 2024 i uruchomi się ponownie).\n\nPo restarcie połącz się jeszcze raz i kliknij „Synchronizuj”.`, "Wyzeruj zegar i restartuj");
      if (!ok) return false;
      await send("clkreboot", 600);
      evInfo("Wyzerowano zegar (clkreboot)", "Po restarcie połącz się ponownie i zsynchronizuj zegar.");
      afterReboot();
      return true;
    }
    const r = await send("time " + Math.floor(Date.now() / 1000));
    await readOne("clock");
    renderChecks();
    if (r && /^OK/i.test(r)) { evOk("Zegar zsynchronizowany"); return true; }
    evErr("Synchronizacja zegara nie powiodła się", r || "brak odpowiedzi");
    return false;
  }

  async function fixAll() {
    const ps = presetState();
    const needPreset = ps && (!ps.radio || !ps.hash || !ps.tx || !ps.adv);
    const clockBehind = clockOffsetMin != null && clockOffsetMin < -5;
    const clockAhead = clockOffsetMin != null && clockOffsetMin > 5;
    const list = [];
    if (needPreset) list.push("• preset Południe SF6 (radio, moc, prefiks, adverty)");
    if (clockBehind) list.push("• synchronizacja zegara");
    if (clockAhead) list.push("• zegar jest do przodu – zostanie wyzerowany przy restarcie (clkreboot)");
    if (!list.length) return;
    const ok = await confirmModal("Napraw wszystko", "Zostanie zrobione:\n" + list.join("\n") + "\n\nNazwa, lokalizacja, hasła i klucz zostają bez zmian.", "Napraw");
    if (!ok) return;
    if (needPreset && !(await applyPreset(false))) return showModal("Nie wszystko się zapisało", "Szczegóły w dzienniku i konsoli CLI.");
    if (clockBehind) await syncClock();
    if (needReboot || clockAhead) {
      const go = await confirmModal("Restart repeatera", (clockAhead ? "Restart wyzeruje też zegar – po restarcie połącz się i kliknij „Synchronizuj”.\n\n" : "") + "Nowe ustawienia radia zaczną działać po restarcie. Zrestartować teraz?", "Restartuj");
      if (go) doReboot(clockAhead);
    }
  }

  async function askReboot(text) {
    if (await confirmModal("Restart repeatera", text + "\n\nZrestartować teraz?", "Restartuj")) doReboot();
  }
  async function doReboot(withClockReset) {
    await send(withClockReset ? "clkreboot" : "reboot", 500);
    needReboot = false;
    evInfo(withClockReset ? "Restart z wyzerowaniem zegara" : "Restart repeatera");
    afterReboot();
  }
  function afterReboot() {
    if (boardFamily === "nrf52") return; // port zniknie – obsłuży onUsbGone
    setStatus("busy", "Restart…");
    setTimeout(() => { if (connected) readAllInfo(); }, 7000);
  }

  /* ---------- klucz i ID ---------- */
  function updateCurrentId() {
    const pub = $("conf_pub_key").value.trim();
    const id = pub.length >= 4 ? pub.slice(0, 4).toUpperCase() : "--";
    $("current_id_prefix").textContent = id;
    $("devId").textContent = "ID " + (pub.length >= 4 ? id : "----");
  }
  function checkDesiredId() {
    const v = $("conf_desired_id").value.trim();
    if (v === "") return setCheck("id_length_status", "", "Puste pole = losowe ID."), true;
    if (!/^[0-9a-f]*$/i.test(v)) return setCheck("id_length_status", "err", "Tylko znaki 0–9 i A–F."), false;
    if (/^(00|ff)/i.test(v)) return setCheck("id_length_status", "err", "ID nie może zaczynać się od 00 ani FF (repeater odrzuci taki klucz)."), false;
    if (v.length === 4) return setCheck("id_length_status", "ok", "✓ Pełne 2 bajty – zgodne z prefiksem 2 bajty."), true;
    if (v.length === 2) return setCheck("id_length_status", "warn", "Tylko 1 bajt – łatwiej o kolizję. Zalecamy 4 znaki."), true;
    return setCheck("id_length_status", "warn", "Podaj 2 albo 4 znaki."), false;
  }
  function updateOwnerCounter() {
    const n = enc.encode($("conf_owner_info").value.replace(/\n/g, "|")).length;
    const c = $("owner_info_counter");
    c.textContent = `${n} / 119 bajtów`;
    c.className = n > 119 ? "over" : "";
  }

  let genWorker = null;
  function generateVanityKey(prefix) {
    return new Promise((resolve) => {
      const code = `
        importScripts('https://cdnjs.cloudflare.com/ajax/libs/tweetnacl/1.0.3/nacl.min.js');
        self.onmessage = (e) => {
          const want = e.data.prefix.toLowerCase();
          const hex = (a) => Array.from(a).map((b) => b.toString(16).padStart(2, '0')).join('');
          for (let n = 1; n <= 20000000; n++) {
            const seed = nacl.randomBytes(32);
            const kp = nacl.sign.keyPair.fromSeed(seed);
            const b0 = kp.publicKey[0];
            if (b0 === 0x00 || b0 === 0xff) continue;
            if (hex(kp.publicKey.subarray(0, 2)).startsWith(want)) {
              const ex = nacl.hash(seed);            // rozszerzony klucz Ed25519 (64 B), format orlp/ed25519
              ex[0] &= 248; ex[31] &= 127; ex[31] |= 64;
              self.postMessage({ type: 'ok', priv: hex(ex), pub: hex(kp.publicKey), attempts: n });
              return;
            }
            if (n % 5000 === 0) self.postMessage({ type: 'progress', attempts: n });
          }
          self.postMessage({ type: 'fail' });
        };`;
      const url = URL.createObjectURL(new Blob([code], { type: "application/javascript" }));
      genWorker = new Worker(url);
      genWorker.onmessage = (e) => {
        if (e.data.type === "progress") { $("genSpinnerStatus").textContent = `próba ${e.data.attempts.toLocaleString("pl-PL")}`; return; }
        genWorker.terminate(); genWorker = null; URL.revokeObjectURL(url);
        resolve(e.data.type === "ok" ? e.data : null);
      };
      genWorker.onerror = () => { genWorker.terminate(); genWorker = null; resolve(null); };
      genWorker.postMessage({ prefix });
    });
  }
  async function onGenerate() {
    if (genWorker) return;
    const id = $("conf_desired_id").value.trim();
    if (!checkDesiredId()) return showModal("Nieprawidłowe ID", $("id_length_status").textContent);
    if (id.length === 2 && !(await confirmModal("Tylko 1 bajt ID", "ID z 1 bajtu ma tylko 256 wartości, więc łatwiej o kolizję z innym węzłem. Zalecamy 4 znaki (2 bajty). Kontynuować?", "Kontynuuj"))) return;
    $("genSpinner").hidden = false;
    $("btnGenerateKey").disabled = true;
    $("genSpinnerStatus").textContent = "start…";
    const t0 = performance.now();
    const r = await generateVanityKey(id);
    $("genSpinner").hidden = true;
    $("btnGenerateKey").disabled = false;
    $("genSpinnerStatus").textContent = "";
    if (!r) return evErr("Nie udało się wygenerować klucza");
    $("conf_priv_key").value = r.priv.toUpperCase();
    $("conf_pub_key").value = r.pub.toUpperCase();
    updateCurrentId();
    evOk(`Wygenerowano klucz z ID ${r.pub.slice(0, 4).toUpperCase()}`, `${r.attempts.toLocaleString("pl-PL")} prób, ${((performance.now() - t0) / 1000).toFixed(1)} s – jeszcze niezapisany w repeaterze`);
  }
  async function onApplyKey() {
    const k = $("conf_priv_key").value.trim().toLowerCase();
    if (!/^[0-9a-f]{128}$/.test(k)) return showModal("Nieprawidłowy klucz", `Klucz prywatny MeshCore to dokładnie 128 znaków hex (teraz: ${k.length}).`);
    if (!(await confirmModal("Zmienić klucz repeatera?",
      "Nowy klucz zmienia ID i tożsamość repeatera. Dotychczasowe wpisy o nim w aplikacjach (kontakty, logowanie) przestaną pasować. Stary klucz zachowaj w eksporcie, jeśli chcesz mieć możliwość powrotu.\n\nPo zapisie trzeba zrestartować repeater.", "Zapisz klucz"))) return;
    const r = await send("set prv.key " + k);
    if (r && /^OK/i.test(r)) {
      evOk("Klucz zapisany", "nowe ID po restarcie");
      askReboot("Repeater zacznie używać nowego ID po restarcie.");
    } else { evErr("Repeater odrzucił klucz", r || "brak odpowiedzi"); showModal("Repeater odrzucił klucz", r || "Brak odpowiedzi z urządzenia."); }
  }

  /* ---------- zapisywanie sekcji ---------- */
  function report(title, errors, okText, okDetail) {
    if (errors.length) { evErr(title + ": błąd zapisu", errors.join("\n")); showModal(title + " – błędy", errors.join("\n")); return false; }
    evOk(okText, okDetail);
    return true;
  }
  async function saveNameLoc(name, lat, lon) {
    const cmds = [];
    if (name) cmds.push("set name " + name);
    if (lat !== "") cmds.push("set lat " + (+lat).toFixed(6));
    if (lon !== "") cmds.push("set lon " + (+lon).toFixed(6));
    if (!cmds.length) return true;
    const errors = await sendAll(cmds);
    for (const c of ["get name", "get lat", "get lon"]) await readOne(c);
    renderChecks();
    return report("Nazwa i miejsce", errors, "Zapisano nazwę i miejsce", name || "");
  }
  async function onApplyLoc() {
    const name = $("conf_name").value.trim();
    const lat = $("conf_lat").value.trim().replace(",", "."), lon = $("conf_lon").value.trim().replace(",", ".");
    const p = nameProblem(name) || coordProblem(lat, lon);
    if (p) return showModal("Popraw dane", p);
    saveNameLoc(name, lat, lon);
  }
  async function onApplyAdvert() {
    if (!checkAdverts() || !checkFloodMax()) return showModal("Popraw wartości", "Advert lokalny: 0 albo 60–240 min.\nAdvert flood: 0 albo 3–168 h.\nflood.max: 0–64.");
    const a = $("conf_adv_int").value.trim(), f = $("conf_flood_adv_int").value.trim(), m = $("conf_flood_max").value.trim();
    const cmds = [];
    if (a !== "") cmds.push("set advert.interval " + Number(a));
    if (f !== "") cmds.push("set flood.advert.interval " + Number(f));
    if (m !== "") cmds.push("set flood.max " + Number(m));
    const errors = await sendAll(cmds);
    for (const c of ["get advert.interval", "get flood.advert.interval", "get flood.max"]) await readOne(c);
    renderChecks();
    report("Adverty", errors, "Zapisano adverty", `${a} min · ${f} h · ${m} skoków`);
  }
  async function onApplyRadio() {
    const freq = parseFloat($("conf_freq").value), bw = $("conf_bw").value, sf = $("conf_sf").value, cr = $("conf_cr").value;
    const tx = $("conf_tx").value.trim(), mode = $("conf_path_hash_mode").value;
    if (isNaN(freq) || freq < 150 || freq > 2500) return showModal("Popraw częstotliwość", "Podaj częstotliwość w MHz, np. " + P.freq + ".");
    const txN = parseInt(tx, 10);
    if (tx !== "" && (isNaN(txN) || txN < -9 || txN > 30)) return showModal("Popraw moc", "Moc TX: od -9 do 30 dBm (dla większości płytek maks. 22).");
    if (!checkRadio() && !(await confirmModal("Ustawienia spoza standardu", `Wybrane radio lub prefiks różnią się od standardu Południe SF6 (${P.freq} / ${P.bw} / SF${P.sf}, prefiks 2 bajty). Repeater nie będzie słyszał naszej sieci.\n\nZapisać mimo to?`, "Zapisz mimo to", true))) return;
    if (txN > 22 && !(await confirmModal("Moc powyżej 22 dBm", "Większość płytek z SX1262 ma maksimum 22 dBm. Wyższą wartość ustawiaj tylko wtedy, gdy wiesz, że Twoja płytka ją obsługuje.", "Zapisz"))) return;
    const cmds = [`set radio ${freq.toFixed(3)},${bw},${sf},${cr}`];
    if (tx !== "") cmds.push("set tx " + txN);
    cmds.push("set path.hash.mode " + mode);
    const errors = await sendAll(cmds);
    for (const c of ["get radio", "get tx", "get path.hash.mode"]) await readOne(c);
    renderChecks();
    if (report("Radio", errors, "Zapisano radio", "działa po restarcie")) askReboot("Parametry radia zaczną działać po restarcie repeatera.");
  }
  function passProblem(a, g) {
    for (const [p, label] of [[a, "administratora"], [g, "gościa"]]) {
      if (!p) continue;
      if (enc.encode(p).length > 15) return `Hasło ${label} może mieć maks. 15 znaków (bez polskich liter).`;
      if (/^\s|\s$/.test(p)) return `Hasło ${label} nie może zaczynać się ani kończyć spacją.`;
    }
    return "";
  }
  async function savePasswords(a, g) {
    const cmds = [];
    if (a) cmds.push("password " + a);
    if (g) cmds.push("set guest.password " + g);
    if (!cmds.length) return true;
    return report("Hasła", await sendAll(cmds), "Zapisano hasła", [a && "administratora", g && "gościa"].filter(Boolean).join(" i "));
  }
  async function onSetPasswords() {
    const a = $("conf_admin_pass").value, g = $("conf_guest_pass").value;
    if (!a && !g) return showModal("Brak haseł", "Wpisz nowe hasło administratora lub gościa.");
    const p = passProblem(a, g);
    if (p) return showModal("Popraw hasło", p);
    if (await savePasswords(a, g)) { $("conf_admin_pass").value = ""; $("conf_guest_pass").value = ""; }
  }
  async function onSetAcl() {
    const key = $("conf_acl_key").value.trim().replace(/\s+/g, ""), perm = $("conf_acl_perm").value;
    if (perm === "0") {
      if (!/^[0-9a-f]{2,64}$/i.test(key) || key.length % 2) return showModal("Nieprawidłowy klucz", "Podaj klucz publiczny (lub jego początek, parzysta liczba znaków hex).");
    } else if (!/^[0-9a-f]{64}$/i.test(key)) {
      return showModal("Nieprawidłowy klucz", "Do nadania uprawnień potrzebny jest pełny klucz publiczny – 64 znaki hex.");
    }
    const r = await send(`setperm ${key.toLowerCase()} ${perm}`);
    if (r && /^OK/i.test(r)) evOk(perm === "0" ? "Usunięto klucz z listy uprawnień" : "Zapisano uprawnienia", key.slice(0, 8).toUpperCase() + "…");
    else { evErr("Błąd uprawnień", r || "brak odpowiedzi"); showModal("Błąd uprawnień", r || "Brak odpowiedzi z urządzenia."); }
  }
  async function onApplyAdvanced() {
    const owner = $("conf_owner_info").value.replace(/\r?\n/g, "|");
    if (enc.encode(owner).length > 119) return showModal("Za długi opis", "owner.info może mieć maks. 119 bajtów.");
    const v = (id) => $(id).value.trim();
    const dc = v("conf_dutycycle");
    if (dc !== "" && (+dc < 1 || +dc > 100)) return showModal("Popraw duty cycle", "Duty cycle: 1–100%.");
    const cmds = [];
    if (dc !== "") cmds.push("set dutycycle " + dc);
    cmds.push("set owner.info " + owner);
    cmds.push("set loop.detect " + v("conf_loop_detect"));
    if (v("conf_int_thresh") !== "") cmds.push("set int.thresh " + parseInt(v("conf_int_thresh"), 10));
    if (v("conf_agc_reset") !== "") cmds.push("set agc.reset.interval " + parseInt(v("conf_agc_reset"), 10));
    if (v("conf_rxdelay") !== "") cmds.push("set rxdelay " + v("conf_rxdelay"));
    if (v("conf_txdelay") !== "") cmds.push("set txdelay " + v("conf_txdelay"));
    if (v("conf_direct_txdelay") !== "") cmds.push("set direct.txdelay " + v("conf_direct_txdelay"));
    cmds.push("set multi.acks " + ($("conf_multi_acks").checked ? 1 : 0));
    const errors = await sendAll(cmds);
    for (const c of ["get dutycycle", "get owner.info", "get loop.detect", "get int.thresh", "get agc.reset.interval", "get rxdelay", "get txdelay", "get direct.txdelay", "get multi.acks"]) await readOne(c);
    report("Ustawienia zaawansowane", errors, "Zapisano ustawienia zaawansowane");
  }

  /* ---------- eksport / import ---------- */
  function collectConfig(withKey) {
    const g = (id) => $(id).value;
    return {
      format: "meshcoresouth-rpt", version: 2, exported: new Date().toISOString(),
      name: g("conf_name"), lat: g("conf_lat"), lon: g("conf_lon"),
      radio: { freq: g("conf_freq"), bw: g("conf_bw"), sf: g("conf_sf"), cr: g("conf_cr"), tx: g("conf_tx"), path_hash_mode: g("conf_path_hash_mode") },
      advert: { adv_int: g("conf_adv_int"), flood_adv_int: g("conf_flood_adv_int"), flood_max: g("conf_flood_max") },
      advanced: { dutycycle: g("conf_dutycycle"), owner_info: g("conf_owner_info"), loop_detect: g("conf_loop_detect"), int_thresh: g("conf_int_thresh"),
        agc_reset: g("conf_agc_reset"), rxdelay: g("conf_rxdelay"), txdelay: g("conf_txdelay"), direct_txdelay: g("conf_direct_txdelay"), multi_acks: $("conf_multi_acks").checked },
      keys: withKey ? { priv: g("conf_priv_key"), pub: g("conf_pub_key") } : { pub: g("conf_pub_key") },
    };
  }
  function download(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  async function onExport() {
    let withKey = false;
    if ($("conf_priv_key").value.trim()) {
      withKey = await showModal("Eksport ustawień", "Czy dołączyć klucz prywatny?\n\nZ kluczem plik pozwala odtworzyć tożsamość repeatera (np. po wymianie płytki), ale każdy, kto go zdobędzie, może się pod ten repeater podszyć. Przechowuj go jak hasło.", [
        { label: "Anuluj", value: null, cls: "btn-line" },
        { label: "Bez klucza", value: false, cls: "btn-line" },
        { label: "Z kluczem prywatnym", value: true, cls: "rp-btn-warn" },
      ]);
      if (withKey === null) return;
    }
    const cfg = collectConfig(withKey);
    download((cfg.name || "repeater").replace(/[^a-z0-9]+/gi, "_").toLowerCase() + "_config.json", JSON.stringify(cfg, null, 2), "application/json");
    evOk("Wyeksportowano ustawienia", withKey ? "z kluczem prywatnym" : "bez klucza prywatnego");
  }
  function onImportFile(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      let c;
      try { c = JSON.parse(fr.result); } catch (err) { return showModal("Błąd importu", "Plik nie jest poprawnym JSON-em."); }
      const set = (id, v) => { if (v !== undefined && v !== null && v !== "") $(id).value = v; };
      set("conf_name", c.name); set("conf_lat", c.lat); set("conf_lon", c.lon);
      const r = c.radio || {};
      set("conf_freq", r.freq);
      if (r.bw) setSelect("conf_bw", String(+r.bw));
      if (r.sf) setSelect("conf_sf", String(+r.sf));
      if (r.cr) setSelect("conf_cr", String(+r.cr));
      set("conf_tx", r.tx);
      if (["0", "1", "2"].includes(String(r.path_hash_mode))) $("conf_path_hash_mode").value = String(r.path_hash_mode);
      const a = c.advert || {};
      set("conf_adv_int", a.adv_int); set("conf_flood_adv_int", a.flood_adv_int); set("conf_flood_max", a.flood_max);
      const x = c.advanced || {};
      set("conf_dutycycle", x.dutycycle != null ? parseFloat(x.dutycycle) : null); set("conf_owner_info", x.owner_info);
      if (x.loop_detect) setSelect("conf_loop_detect", x.loop_detect);
      set("conf_int_thresh", x.int_thresh); set("conf_agc_reset", x.agc_reset); set("conf_rxdelay", x.rxdelay);
      set("conf_txdelay", x.txdelay); set("conf_direct_txdelay", x.direct_txdelay);
      if (x.multi_acks !== undefined) $("conf_multi_acks").checked = !!x.multi_acks;
      const k = c.keys || {};
      set("conf_priv_key", k.priv); set("conf_pub_key", k.pub);
      updateCurrentId(); updateOwnerCounter(); checkRadio(); checkAdverts(); checkFloodMax();
      evInfo("Wczytano plik " + file.name, "Sprawdź wartości i kliknij „Zastosuj import i restart”.");
      $("btnApplyImport").hidden = !connected;
    };
    fr.readAsText(file);
  }
  async function onApplyImport() {
    const name = $("conf_name").value.trim();
    const lat = $("conf_lat").value.trim().replace(",", "."), lon = $("conf_lon").value.trim().replace(",", ".");
    const p = nameProblem(name) || coordProblem(lat, lon);
    if (p) return showModal("Popraw dane", p);
    if (!checkAdverts() || !checkFloodMax()) return showModal("Popraw wartości", "Sprawdź pola advertów i flood.max.");
    const priv = $("conf_priv_key").value.trim().toLowerCase();
    if (!(await confirmModal("Zastosować import?", "Wszystkie wartości z formularzy zostaną zapisane w repeaterze" + (/^[0-9a-f]{128}$/.test(priv) ? " – razem z kluczem prywatnym (zmieni ID)" : "") + ", a potem repeater się zrestartuje.", "Zastosuj i restartuj"))) return;
    const g = (id) => $(id).value.trim();
    const cmds = [];
    if (name) cmds.push("set name " + name);
    if (lat !== "") cmds.push("set lat " + lat);
    if (lon !== "") cmds.push("set lon " + lon);
    if (g("conf_freq")) cmds.push(`set radio ${(+g("conf_freq")).toFixed(3)},${g("conf_bw")},${g("conf_sf")},${g("conf_cr")}`);
    if (g("conf_tx")) cmds.push("set tx " + parseInt(g("conf_tx"), 10));
    cmds.push("set path.hash.mode " + g("conf_path_hash_mode"));
    if (g("conf_adv_int")) cmds.push("set advert.interval " + g("conf_adv_int"));
    if (g("conf_flood_adv_int")) cmds.push("set flood.advert.interval " + g("conf_flood_adv_int"));
    if (g("conf_flood_max")) cmds.push("set flood.max " + g("conf_flood_max"));
    if (g("conf_dutycycle")) cmds.push("set dutycycle " + g("conf_dutycycle"));
    const owner = $("conf_owner_info").value.replace(/\r?\n/g, "|");
    if (owner) cmds.push("set owner.info " + owner);
    cmds.push("set loop.detect " + g("conf_loop_detect"));
    if (g("conf_int_thresh")) cmds.push("set int.thresh " + g("conf_int_thresh"));
    if (g("conf_agc_reset")) cmds.push("set agc.reset.interval " + g("conf_agc_reset"));
    if (g("conf_rxdelay")) cmds.push("set rxdelay " + g("conf_rxdelay"));
    if (g("conf_txdelay")) cmds.push("set txdelay " + g("conf_txdelay"));
    if (g("conf_direct_txdelay")) cmds.push("set direct.txdelay " + g("conf_direct_txdelay"));
    cmds.push("set multi.acks " + ($("conf_multi_acks").checked ? 1 : 0));
    if (/^[0-9a-f]{128}$/.test(priv)) cmds.push("set prv.key " + priv);
    const errors = await sendAll(cmds);
    $("btnApplyImport").hidden = true;
    if (errors.length) {
      evErr("Import: część ustawień odrzucona", errors.join("\n"));
      if (!(await confirmModal("Część ustawień nie została przyjęta", errors.join("\n") + "\n\nZrestartować mimo to?", "Restartuj"))) return;
    } else evOk("Import zapisany", `${cmds.length} ustawień`);
    doReboot();
  }

  /* ---------- mapa i GPS ---------- */
  let map = null, marker = null, picked = null, mapTarget = ["conf_lat", "conf_lon"];
  function openMap(target) {
    mapTarget = target;
    if (!window.L) return showModal("Mapa niedostępna", "Nie udało się wczytać biblioteki mapy. Wpisz współrzędne ręcznie albo użyj lokalizacji z GPS.");
    $("mapModal").hidden = false;
    const lat = parseFloat($(target[0]).value.replace(",", ".")), lon = parseFloat($(target[1]).value.replace(",", "."));
    const has = !isNaN(lat) && !isNaN(lon) && (lat !== 0 || lon !== 0);
    const start = has ? [lat, lon] : [49.85, 19.5];
    if (!map) {
      map = L.map("mapContainer").setView(start, has ? 13 : 8);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map);
      map.on("click", (e) => placeMarker(e.latlng));
    } else map.setView(start, has ? 13 : map.getZoom());
    setTimeout(() => map.invalidateSize(), 60);
    if (has) placeMarker(L.latLng(lat, lon));
    else { picked = null; if (marker) { marker.remove(); marker = null; } $("mapSelectedCoords").textContent = "kliknij na mapie"; }
  }
  function placeMarker(ll) {
    picked = ll;
    if (!marker) { marker = L.marker(ll, { draggable: true }).addTo(map); marker.on("dragend", () => placeMarker(marker.getLatLng())); }
    else marker.setLatLng(ll);
    $("mapSelectedCoords").textContent = `${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}`;
  }
  const closeMap = () => { $("mapModal").hidden = true; };
  function confirmMap() {
    if (picked) { $(mapTarget[0]).value = picked.lat.toFixed(5); $(mapTarget[1]).value = picked.lng.toFixed(5); }
    closeMap();
  }
  function useGps(target, btn) {
    if (!navigator.geolocation) return showModal("Brak GPS", "Ta przeglądarka nie udostępnia lokalizacji. Wybierz miejsce na mapie.");
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = "Ustalanie…";
    navigator.geolocation.getCurrentPosition((pos) => {
      btn.disabled = false; btn.textContent = label;
      $(target[0]).value = pos.coords.latitude.toFixed(5);
      $(target[1]).value = pos.coords.longitude.toFixed(5);
      evInfo("Pobrano lokalizację z przeglądarki", `dokładność ok. ${Math.round(pos.coords.accuracy)} m – jeszcze niezapisana`);
    }, (err) => {
      btn.disabled = false; btn.textContent = label;
      showModal("Nie udało się pobrać lokalizacji", err.code === 1 ? "Przeglądarka nie dostała zgody na lokalizację. Zezwól w ustawieniach strony albo wybierz miejsce na mapie." : "Lokalizacja jest niedostępna. Wybierz miejsce na mapie.");
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  }

  /* ---------- kreator ---------- */
  let wzStep = 1;
  const WZ_LAST = 5;
  function openWizard() {
    $("wz_name").value = $("conf_name").value;
    $("wz_lat").value = $("conf_lat").value;
    $("wz_lon").value = $("conf_lon").value;
    $("wz_admin").value = ""; $("wz_guest").value = "";
    $("wizard").hidden = false;
    showWzStep(1);
  }
  function closeWizard() { $("wizard").hidden = true; }
  function showWzStep(n) {
    wzStep = n;
    document.querySelectorAll("#wzSteps li").forEach((li) => {
      const s = +li.dataset.step;
      li.className = s < n ? "done" : s === n ? "cur" : "";
      if (s === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
    document.querySelectorAll(".rp-wz-pane section").forEach((sec) => (sec.hidden = +sec.dataset.pane !== n));
    $("wzBack").disabled = n === 1;
    $("wzSkip").hidden = n === WZ_LAST;
    $("wzNext").disabled = false;
    if (n === 1) {
      const ps = presetState();
      const ok = ps && ps.radio && ps.hash && ps.tx && ps.adv;
      setCheck("wzPresetState", ok ? "ok" : "warn", ok ? "✓ Repeater już ma te ustawienia – możesz przejść dalej." : "Repeater ma inne ustawienia – kliknij „Ustaw preset”.");
      $("wzNext").textContent = ok ? "Dalej →" : "Ustaw preset →";
    } else if (n === 4) {
      const c = clockOffsetMin;
      $("wzClockText").textContent = c == null ? "Nie udało się odczytać zegara – pomiń ten krok."
        : Math.abs(c) <= 5 ? "✓ Zegar repeatera jest zgodny z komputerem."
        : c < 0 ? `Zegar jest ${fmtOffset(c)}. Ustawimy go na czas z tego komputera.`
        : `Zegar jest ${fmtOffset(c)}. Nie da się go cofnąć komendą – wyzerujemy go przy restarcie w ostatnim kroku. Po restarcie połącz się i kliknij „Synchronizuj”.`;
      $("wzNext").textContent = c != null && c < -5 ? "Synchronizuj →" : "Dalej →";
    } else if (n === WZ_LAST) {
      const ul = $("wzSummary");
      ul.textContent = "";
      const items = [];
      const ps = presetState() || {};
      items.push((ps.radio && ps.hash ? "✓ " : "! ") + "radio i prefiks Południe SF6");
      items.push(($("conf_name").value ? "✓ nazwa: " + $("conf_name").value : "! bez nazwy"));
      const lat = parseFloat($("conf_lat").value), lon = parseFloat($("conf_lon").value);
      items.push((lat || lon) ? `✓ miejsce: ${lat.toFixed(3)}, ${lon.toFixed(3)}` : "! bez lokalizacji");
      items.push(wzPassSet ? "✓ hasło zmienione" : "! hasło bez zmian");
      items.forEach((t) => { const li = document.createElement("li"); li.textContent = t; ul.appendChild(li); });
      $("wzNext").textContent = "Restartuj repeater";
    } else $("wzNext").textContent = "Zapisz i dalej →";
  }
  let wzPassSet = false;
  async function wzNext() {
    const btn = $("wzNext");
    btn.disabled = true;
    let ok = true;
    try {
      if (wzStep === 1) {
        const ps = presetState();
        if (!(ps && ps.radio && ps.hash && ps.tx && ps.adv)) ok = await applyPreset(false);
        if (!ok) showModal("Preset nie zapisał się w całości", "Szczegóły w dzienniku. Możesz spróbować ponownie albo pominąć krok.");
      } else if (wzStep === 2) {
        const name = $("wz_name").value.trim();
        const lat = $("wz_lat").value.trim().replace(",", "."), lon = $("wz_lon").value.trim().replace(",", ".");
        const p = nameProblem(name) || coordProblem(lat, lon);
        if (p) { showModal("Popraw dane", p); ok = false; }
        else ok = await saveNameLoc(name, lat, lon);
      } else if (wzStep === 3) {
        const a = $("wz_admin").value, g = $("wz_guest").value;
        const p = passProblem(a, g);
        if (p) { showModal("Popraw hasło", p); ok = false; }
        else { ok = await savePasswords(a, g); if (ok && a) wzPassSet = true; }
      } else if (wzStep === 4) {
        if (clockOffsetMin != null && clockOffsetMin < -5) await syncClock();
      } else if (wzStep === WZ_LAST) {
        closeWizard();
        doReboot(clockOffsetMin != null && clockOffsetMin > 5);
        return;
      }
    } finally { btn.disabled = false; }
    if (ok) showWzStep(wzStep + 1);
  }

  /* ---------- zakładki ---------- */
  const tabs = [...document.querySelectorAll(".rp-tablist [role=tab]")];
  function selectTab(id) {
    tabs.forEach((t) => {
      const on = t.id === id;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute("aria-controls")).hidden = !on;
    });
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => selectTab(t.id));
    t.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      const n = tabs[(i + d + tabs.length) % tabs.length];
      selectTab(n.id); n.focus(); e.preventDefault();
    });
  });

  /* ---------- przyciski ---------- */
  const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };
  on("btnConnect", "click", connectSerial);
  on("btnDisconnect", "click", () => disconnectSerial(false));
  on("btnReload", "click", readAllInfo);
  on("btnLive", "click", refreshLive);
  on("btnFixAll", "click", fixAll);
  on("btnWizard", "click", openWizard);
  on("btnWizard2", "click", openWizard);
  on("wzClose", "click", closeWizard);
  on("wzBack", "click", () => wzStep > 1 && showWzStep(wzStep - 1));
  on("wzSkip", "click", () => showWzStep(wzStep + 1));
  on("wzNext", "click", wzNext);
  on("live_nb", "click", () => { const ul = $("nbList"); ul.hidden = !ul.hidden; $("live_nb").setAttribute("aria-expanded", String(!ul.hidden)); });
  on("btnAdvert", "click", async () => { const r = await send("advert"); if (r && /OK/i.test(r)) evOk("Wysłano advert (flood)"); });
  on("btnToggleRepeat", "click", async () => {
    const cur = $("info_repeat").dataset.on;
    if (cur === undefined) return readOne("get repeat");
    if (cur === "1" && !(await confirmModal("Wyłączyć przekazywanie?", "Repeater przestanie przekazywać wiadomości innych węzłów – do czasu ponownego włączenia.", "Wyłącz", true))) return;
    await send("set repeat " + (cur === "1" ? "off" : "on"));
    await readOne("get repeat");
    evInfo("Przekazywanie " + ($("info_repeat").dataset.on === "1" ? "włączone" : "wyłączone"));
  });
  on("btnOTA", "click", async () => {
    if (!(await confirmModal("Aktualizacja OTA",
      "Repeater przejdzie w tryb aktualizacji bezprzewodowej i przestanie działać jako przekaźnik do czasu restartu.\n\nESP32: uruchomi sieć Wi-Fi z adresem do wgrania pliku.\nnRF52: uruchomi Bluetooth DFU – plik wgrasz aplikacją nRF Device Firmware Update.\n\nNajprościej zaktualizować repeater kablem przez nasz flasher.", "Uruchom OTA"))) return;
    const r = await send("start ota", 4000);
    if (r) { evInfo("Tryb OTA", r); showModal("Tryb OTA", r); }
  });
  on("btnReboot", "click", async () => { if (await confirmModal("Restart", "Zrestartować repeater?", "Restartuj")) doReboot(); });
  on("btnFactory", "click", async () => {
    if (!(await confirmModal("Ustawienia fabryczne",
      "Zostanie skasowana cała konfiguracja repeatera: nazwa, radio, hasła, uprawnienia i klucz prywatny (repeater dostanie nowe ID). Potem nastąpi restart.\n\nJeśli chcesz zachować klucz – najpierw wyeksportuj ustawienia z kluczem.", "Skasuj wszystko", true))) return;
    const r = await send("erase", 8000);
    if (r && /OK/i.test(r)) { evWarn("Skasowano ustawienia repeatera"); doReboot(); }
    else { evErr("Kasowanie nie powiodło się", r || "brak odpowiedzi"); showModal("Kasowanie nie powiodło się", r || "Brak odpowiedzi z urządzenia."); }
  });
  on("btnApplyLoc", "click", onApplyLoc);
  on("btnApplyAdvert", "click", onApplyAdvert);
  on("btnApplyRadio", "click", onApplyRadio);
  on("btnSetPasswords", "click", onSetPasswords);
  on("btnSetACL", "click", onSetAcl);
  on("btnGenerateKey", "click", onGenerate);
  on("btnApplyKey", "click", onApplyKey);
  on("btnApplyAdvanced", "click", onApplyAdvanced);
  on("btnExport", "click", onExport);
  on("btnImport", "click", () => $("fileImportConfig").click());
  on("fileImportConfig", "change", onImportFile);
  on("btnApplyImport", "click", onApplyImport);
  on("btnCloseMap", "click", closeMap);
  on("btnConfirmMap", "click", confirmMap);
  on("mapModal", "click", (e) => { if (e.target.id === "mapModal") closeMap(); });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !$("customModal").hidden) return;
    if (!$("mapModal").hidden) closeMap(); else if (!$("wizard").hidden) closeWizard();
  });
  document.querySelectorAll("[data-map]").forEach((b) => b.addEventListener("click", () => openMap(b.dataset.map.split(","))));
  document.querySelectorAll("[data-gps]").forEach((b) => b.addEventListener("click", () => useGps(b.dataset.gps.split(","), b)));
  on("btnCli", "click", () => {
    const box = $("cliBox"), open = box.hidden;
    box.hidden = !open;
    $("btnCli").setAttribute("aria-expanded", String(open));
    if (open) { term.scrollTop = term.scrollHeight; $("terminalInput").focus(); }
  });
  on("btnClear", "click", () => { term.textContent = ""; tl.textContent = ""; logLines.length = 0; });
  on("btnLogDl", "click", () => {
    const head = [`Konfigurator RPT – dziennik (${new Date().toLocaleString("pl-PL")})`,
      `Repeater: ${$("conf_name").value || "-"} · ${$("devId").textContent} · ${$("info_board").textContent} · ${$("info_fw").title || $("info_fw").textContent}`,
      `Przeglądarka: ${navigator.userAgent}`, ""];
    download("dziennik-rpt-" + new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-") + ".txt", head.concat(logLines).join("\n"), "text/plain");
  });

  ["conf_freq", "conf_bw", "conf_sf", "conf_path_hash_mode"].forEach((id) => on(id, "change", () => { checkRadio(); checkFloodMax(); }));
  on("conf_tx", "input", checkTx);
  ["conf_adv_int", "conf_flood_adv_int"].forEach((id) => on(id, "input", checkAdverts));
  on("conf_flood_max", "input", checkFloodMax);
  on("conf_desired_id", "input", checkDesiredId);
  on("conf_owner_info", "input", updateOwnerCounter);
  ["conf_name", "wz_name"].forEach((id) => on(id, "input", () => { const el = $(id), p = nameProblem(el.value.trim()); el.classList.toggle("bad", !!p); el.title = p; }));
  document.querySelectorAll(".rp-eye").forEach((b) => b.addEventListener("click", () => {
    const inp = $(b.dataset.toggle), show = inp.type === "password";
    inp.type = show ? "text" : "password";
    b.textContent = show ? "Ukryj" : "Pokaż";
  }));

  /* konsola CLI */
  async function runTyped(cmd) {
    const r = await send(cmd, cmd === "erase" ? 8000 : REPLY_TIMEOUT);
    const key = cmd.toLowerCase();
    if (r != null && !isErr(r) && READERS[key]) { try { READERS[key](val(r)); renderChecks(); } catch (err) {} }
    if (key === "neighbors" && r != null) renderNeighbors(r);
  }
  const hist = []; let hi = 0;
  on("terminalInput", "keydown", (e) => {
    const inp = e.target;
    if (e.key === "ArrowUp" && hist.length) { hi = Math.max(0, hi - 1); inp.value = hist[hi] || ""; e.preventDefault(); return; }
    if (e.key === "ArrowDown" && hist.length) { hi = Math.min(hist.length, hi + 1); inp.value = hist[hi] || ""; e.preventDefault(); return; }
    if (e.key !== "Enter") return;
    const cmd = inp.value.trim();
    inp.value = "";
    if (!cmd || !connected) return;
    if (!SECRET_CMD.test(cmd)) hist.push(cmd);
    if (hist.length > 50) hist.shift();
    hi = hist.length;
    runTyped(cmd);
  });
  document.querySelectorAll("[data-cmd]").forEach((b) => b.addEventListener("click", () => connected && runTyped(b.dataset.cmd)));

  /* start */
  checkDesiredId(); updateOwnerCounter(); renderChecks();
  if (!("serial" in navigator)) {
    $("rpNoSerial").hidden = false;
    $("btnConnect").disabled = true;
  }
  window.addEventListener("beforeunload", (e) => { if (connected && reading) { e.preventDefault(); e.returnValue = ""; } });
})();
