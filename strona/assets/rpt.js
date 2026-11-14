/* Konfigurator RPT – MeshCore Południe SF6
 * Konfiguracja repeatera MeshCore przez Web Serial (CLI 115200).
 * CLI repeatera: urządzenie odsyła echo wpisanej komendy, a potem (jeśli jest odpowiedź)
 * linię "  -> <odpowiedź>". Nie ma znaku zachęty, dlatego czekamy na "  -> " albo na timeout.
 */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const P = Object.assign({ freq: "869.618", bw: "62.5", sf: "6", cr: "8" }, window.RP_PRESET || {});
  const STD = { tx: 22, hash: 1, adv: 60, flood: 12, floodMax: 32 };
  const HOP_CAPS = { 0: 64, 1: 32, 2: 21 };
  const NAME_BAD = /[\[\]\\:,?*]/;
  const REPLY_TIMEOUT = 1500;

  let port = null, reader = null, writer = null, connected = false, keepReading = false;
  let rxBuf = "", pending = null, chain = Promise.resolve();
  let boardFamily = "", espNoteShown = false;
  let clockOffsetMin = 0;

  /* ---------- terminal ---------- */
  const term = $("terminalOutput");
  function termLine(text, cls) {
    const atBottom = term.scrollHeight - term.scrollTop - term.clientHeight < 40;
    const div = document.createElement("div");
    if (cls) div.className = cls;
    const t = document.createElement("span");
    t.className = "t-time";
    t.textContent = new Date().toLocaleTimeString("pl-PL") + "  ";
    div.append(t, document.createTextNode(text));
    term.appendChild(div);
    while (term.childNodes.length > 1500) term.removeChild(term.firstChild);
    if (atBottom) term.scrollTop = term.scrollHeight;
  }
  const logMsg = (t) => termLine("» " + t, "t-sys");
  const logErr = (t) => termLine("» " + t, "t-err");
  const logOk = (t) => termLine("» " + t, "t-ok");

  /* ukrywanie sekretów w terminalu */
  const SECRET_CMD = /^(password|set guest\.password|set prv\.key)(\s+)(.+)$/i;
  function maskCmd(cmd) { return cmd.replace(SECRET_CMD, (m, a, s) => a + s + "••••••"); }
  function maskReply(cmd, reply) {
    const c = (cmd || "").trim().toLowerCase();
    if (c === "get prv.key" || c === "get guest.password") return "> ••••••";
    if (/^password now:/i.test(reply)) return "password now: ••••••";
    return reply;
  }

  /* ---------- okno komunikatów ---------- */
  function showModal(title, text, buttons) {
    buttons = buttons || [{ label: "OK", value: true, cls: "btn-green" }];
    return new Promise((resolve) => {
      $("modalTitle").textContent = title;
      $("modalText").textContent = text;
      const box = $("modalButtons");
      box.textContent = "";
      const close = (v) => { $("customModal").hidden = true; document.removeEventListener("keydown", onKey); resolve(v); };
      const onKey = (e) => { if (e.key === "Escape") close(null); };
      buttons.forEach((b, i) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "btn " + (b.cls || "btn-line");
        el.textContent = b.label;
        el.addEventListener("click", () => close(b.value));
        box.appendChild(el);
        if (i === buttons.length - 1) setTimeout(() => el.focus(), 30);
      });
      document.addEventListener("keydown", onKey);
      $("customModal").hidden = false;
    });
  }
  const confirmModal = (title, text, okLabel, danger) => showModal(title, text, [
    { label: "Anuluj", value: false, cls: "btn-line" },
    { label: okLabel || "Tak", value: true, cls: danger ? "rp-btn-danger" : "btn-green" },
  ]);

  /* ---------- Web Serial ---------- */
  function setStatus(state, text) {
    const dot = $("statusDot");
    dot.className = "rp-dot" + (state === "on" ? " on" : state === "busy" ? " busy" : "");
    $("statusText").textContent = text;
  }
  function setConnectedUI(on) {
    connected = on;
    $("btnConnect").hidden = on;
    $("btnDisconnect").hidden = !on;
    $("configForms").classList.toggle("is-off", !on);
    $("terminalInput").disabled = !on;
    if (!on) { $("status_info_id").hidden = true; $("btnApplyImport").hidden = true; }
  }

  function familyFromVid(vid) {
    if ([0x239a, 0x2886, 0x1915].includes(vid)) return "nrf52";
    if ([0x303a, 0x10c4, 0x1a86, 0x0403].includes(vid)) return "esp32";
    if (vid === 0x2e8a) return "rp2040";
    return "";
  }
  function familyFromName(name) {
    const n = (name || "").toLowerCase();
    if (/nrf|rak\s?4631|rak4630|t114|mesh solar|t-echo|techo|xiao nrf|wio|tracker l1|ikoka|thinknode m[16]|promicro|sensecap/.test(n)) return "nrf52";
    if (/esp32|heltec v[234]|wireless (stick|paper|tracker)|t-beam|tbeam|t-lora|lilygo t3|station g2|xiao (s3|c3|c6)|thinknode m[25]/.test(n)) return "esp32";
    if (/rp2040|pico/.test(n)) return "rp2040";
    return "";
  }

  async function connectSerial() {
    if (!("serial" in navigator)) return;
    try {
      port = await navigator.serial.requestPort();
    } catch (e) { return; } // użytkownik zamknął okno wyboru
    setStatus("busy", "Łączenie…");
    try {
      await port.open({ baudRate: 115200 });
    } catch (e) {
      setStatus("", "Rozłączono");
      showModal("Nie udało się otworzyć portu", "Port jest zajęty albo niedostępny. Zamknij inne programy, które mogą go używać (np. inną kartę z konfiguratorem, Arduino, flasher) i spróbuj ponownie.\n\n" + e.message);
      port = null;
      return;
    }
    const info = port.getInfo ? port.getInfo() : {};
    boardFamily = familyFromVid(info.usbVendorId);
    writer = port.writable.getWriter();
    keepReading = true;
    setConnectedUI(true);
    setStatus("on", "Połączono");
    logOk("Połączono z portem USB" + (info.usbVendorId ? ` (VID 0x${info.usbVendorId.toString(16).padStart(4, "0")})` : "") + ".");
    readLoop();
    navigator.serial.addEventListener("disconnect", onUsbGone);
    await sleep(400);
    readAllInfo();
  }

  function onUsbGone(e) {
    if (port && e.target === port) { logErr("Urządzenie zostało odłączone."); disconnectSerial(true); }
  }

  async function disconnectSerial(lost) {
    keepReading = false;
    if (pending) { clearTimeout(pending.timer); pending.resolve(null); pending = null; }
    try { if (reader) await reader.cancel(); } catch (e) {}
    try { if (writer) { writer.releaseLock(); } } catch (e) {}
    try { if (port && !lost) await port.close(); } catch (e) {}
    reader = writer = null; port = null;
    navigator.serial && navigator.serial.removeEventListener("disconnect", onUsbGone);
    setConnectedUI(false);
    setStatus("", "Rozłączono");
    if (!lost) logMsg("Rozłączono.");
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
        if (keepReading) logErr("Błąd odczytu portu: " + e.message);
      } finally {
        try { reader.releaseLock(); } catch (e) {}
        reader = null;
      }
      if (!keepReading) break;
      await sleep(200);
    }
    if (connected && keepReading) disconnectSerial(true);
  }

  function handleLine(line) {
    if (line.trim() === "") return;
    const m = line.match(/^\s*->\s?(.*)$/);
    if (m) {
      const reply = m[1].trim();
      const cmd = pending ? pending.cmd : null;
      termLine("  -> " + maskReply(cmd, reply));
      if (pending) {
        const p = pending; pending = null;
        clearTimeout(p.timer);
        p.resolve(reply);
      }
      return;
    }
    if (pending && !pending.echo && line.trim() === pending.cmd) {
      pending.echo = true;
      termLine(maskCmd(line.trim()), "t-in");
      return;
    }
    if (/^Repeater ID:/i.test(line)) {
      const id = line.replace(/[^0-9a-f]/gi, "").slice(0, 4).toUpperCase();
      if (id) logMsg("Repeater uruchomiony, ID " + id + ".");
    }
    termLine(line);
  }

  /* kolejka komend – jedna na raz */
  function send(cmd, timeout) {
    const run = () => exec(cmd, timeout || REPLY_TIMEOUT);
    const p = chain.then(run, run);
    chain = p.catch(() => {});
    return p;
  }
  async function exec(cmd, timeout) {
    if (!connected || !writer) return null;
    return new Promise(async (resolve) => {
      pending = { cmd, resolve, echo: false, timer: setTimeout(() => {
        if (pending && pending.cmd === cmd) { if (!pending.echo) termLine(maskCmd(cmd), "t-in"); pending = null; }
        resolve(null);
      }, timeout) };
      try {
        await writer.write(new TextEncoder().encode(cmd + "\r\n"));
      } catch (e) {
        clearTimeout(pending && pending.timer); pending = null;
        logErr("Nie udało się wysłać komendy: " + e.message);
        resolve(null);
      }
    });
  }
  const val = (r) => (r == null ? null : r.replace(/^>\s?/, "").trim());
  const isErr = (r) => r != null && /^(\(?err|error|unknown|invalid)/i.test(r);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* wysyła listę komend "set", zbiera błędy */
  async function sendAll(cmds) {
    const errors = [];
    for (const c of cmds) {
      const r = await send(c);
      if (r == null) errors.push(`${maskCmd(c)}: brak odpowiedzi`);
      else if (isErr(r)) errors.push(`${maskCmd(c)}: ${r}`);
    }
    return errors;
  }

  /* ---------- odczyt ---------- */
  const READERS = {
    "board": (v) => { $("info_board").textContent = v; checkBoard(v); },
    "ver": (v) => { $("info_fw").textContent = v.replace(/\s*\(Build:.*$/, ""); $("info_fw").title = v; },
    "clock": (v) => checkClock(v),
    "get name": (v) => { $("conf_name").value = v; $("status_info_id").textContent = v; $("status_info_id").hidden = !v; },
    "get repeat": (v) => setRepeatInfo(/^(on|1)$/i.test(v)),
    "get radio": (v) => {
      const p = v.split(",");
      if (p.length < 4) return;
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
    "get public.key": (v) => { const h = v.replace(/[^0-9a-f]/gi, ""); if (h.length === 64) { $("conf_pub_key").value = h.toUpperCase(); updateCurrentId(); } },
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

  let reading = false;
  async function readAllInfo() {
    if (!connected || reading) return;
    reading = true;
    setStatus("busy", "Odczyt…");
    logMsg("Odczytuję ustawienia repeatera…");
    ["info_board", "info_fw", "info_clock"].forEach((id) => ($(id).textContent = "-"));
    ["conf_pub_key", "conf_priv_key", "conf_name", "conf_freq", "conf_tx", "conf_adv_int", "conf_flood_max",
     "conf_flood_adv_int", "conf_lat", "conf_lon", "conf_dutycycle", "conf_owner_info", "conf_int_thresh",
     "conf_agc_reset", "conf_rxdelay", "conf_txdelay", "conf_direct_txdelay"].forEach((id) => ($(id).value = ""));
    let missing = [];
    for (const c of READ_ORDER) { if (!connected) break; if (!(await readOne(c))) missing.push(c); }
    for (let round = 1; round <= 2 && missing.length && connected; round++) {
      logMsg(`Ponawiam odczyt ${missing.length} parametrów (próba ${round}/2)…`);
      const again = [];
      for (const c of missing) if (!(await readOne(c))) again.push(c);
      missing = again;
    }
    reading = false;
    if (!connected) return;
    setStatus("on", "Połączono");
    updateCurrentId(); updateOwnerCounter();
    if (missing.length) logErr("Nie udało się odczytać: " + missing.join(", ") + ". To urządzenie może nie być repeaterem albo ma starszy firmware.");
    else logOk("Odczyt zakończony.");
    const v = $("info_fw").textContent;
    if (/companion|room/i.test(v)) logErr("Wygląda na to, że to nie jest firmware repeatera.");
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
      const n = Number(a);
      if (n === 0) setCheck("zero_hop_status", "warn", "Advert lokalny wyłączony (0). Standard sieci: 60 min.");
      else if (n >= 60 && n <= 240) setCheck("zero_hop_status", n === STD.adv ? "ok" : "", n === STD.adv ? "✓ Advert lokalny zgodny ze standardem (60 min)." : `Advert lokalny co ${n} min (standard: 60).`);
      else { setCheck("zero_hop_status", "err", "Advert lokalny: dozwolone 0 albo 60–240 minut."); ok = false; }
      $("conf_adv_int").classList.toggle("bad", !(n === 0 || (n >= 60 && n <= 240)));
    }
    if (f === "") setCheck("flood_adv_status");
    else {
      const n = Number(f);
      if (n === 0) setCheck("flood_adv_status", "warn", "Advert flood wyłączony (0). Standard sieci: 12 h.");
      else if (n >= 3 && n <= 168) setCheck("flood_adv_status", n === STD.flood ? "ok" : "", n === STD.flood ? "✓ Advert flood zgodny ze standardem (12 h)." : `Advert flood co ${n} h (standard: 12).`);
      else { setCheck("flood_adv_status", "err", "Advert flood: dozwolone 0 albo 3–168 godzin."); ok = false; }
      $("conf_flood_adv_int").classList.toggle("bad", !(n === 0 || (n >= 3 && n <= 168)));
    }
    return ok;
  }
  function checkFloodMax() {
    const v = $("conf_flood_max").value.trim(), cap = HOP_CAPS[$("conf_path_hash_mode").value];
    if (v === "") { setCheck("flood_max_status"); return true; }
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n > 64) { setCheck("flood_max_status", "err", "flood.max: 0–64."); return false; }
    if (cap !== undefined && n > cap) setCheck("flood_max_status", "warn", `${n} skoków to więcej niż mieści prefiks w tym trybie (maks. ${cap}).`);
    else setCheck("flood_max_status", "ok", `✓ W limicie dla wybranego prefiksu (maks. ${cap}).`);
    return true;
  }
  function nameProblem(n) {
    if (!n) return "";
    if (NAME_BAD.test(n)) return "Nazwa zawiera niedozwolony znak: [ ] \\ : , ? *";
    if (new TextEncoder().encode(n).length > 31) return "Nazwa jest za długa (maks. 31 bajtów; polskie litery zajmują po 2).";
    return "";
  }
  function coordProblem(lat, lon) {
    if (lat !== "" && (isNaN(+lat) || +lat < -90 || +lat > 90)) return "Szerokość musi być liczbą od -90 do 90.";
    if (lon !== "" && (isNaN(+lon) || +lon < -180 || +lon > 180)) return "Długość musi być liczbą od -180 do 180.";
    return "";
  }

  function checkBoard(name) {
    const fam = boardFamily || familyFromName(name);
    if (fam === "esp32" && !espNoteShown) {
      espNoteShown = true;
      $("board_note").hidden = false;
      $("board_note").textContent = "Płytka ESP32 pobiera wyraźnie więcej prądu niż nRF52. Przy zasilaniu z panelu i akumulatora lepiej sprawdzają się płytki nRF52 (RAK 4631, Heltec T114, XIAO nRF52840).";
      logMsg("Wykryto ESP32 – przy zasilaniu solarnym zalecamy płytki nRF52.");
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
    if (!m) return;
    const dev = Date.UTC(+m[5], +m[4] - 1, +m[3], +m[1], +m[2]);
    clockOffsetMin = Math.round((dev - Date.now()) / 60000);
    const bad = Math.abs(clockOffsetMin) > 5;
    $("clock_warning").hidden = !bad;
    $("btnSyncClock").hidden = !bad;
    $("info_clock").style.color = bad ? "#B42318" : "";
    if (bad) logErr(`Zegar repeatera różni się o ${fmtOffset(clockOffsetMin)}.`);
  }
  function fmtOffset(min) {
    const a = Math.abs(min);
    const t = a >= 2880 ? Math.round(a / 1440) + " dni" : a >= 120 ? Math.round(a / 60) + " godz." : a + " min";
    return t + (min > 0 ? " (spieszy się)" : " (spóźnia się)");
  }

  async function syncClock() {
    if (clockOffsetMin > 5) {
      const ok = await confirmModal("Zegar repeatera się spieszy",
        "Repeater nie pozwala cofnąć zegara komendą. Można go wyzerować komendą clkreboot – repeater ustawi datę na 2024 i uruchomi się ponownie.\n\nPo restarcie połącz się jeszcze raz i kliknij „Synchronizuj” – wtedy zegar zostanie ustawiony na aktualny czas.",
        "Wyzeruj zegar i restartuj");
      if (!ok) return;
      await send("clkreboot", 600);
      logMsg("Wysłano clkreboot. Po restarcie połącz się ponownie i zsynchronizuj zegar.");
      setTimeout(() => connected && readOne("clock"), 6000);
      return;
    }
    const r = await send("time " + Math.floor(Date.now() / 1000));
    if (r && /^OK/i.test(r)) logOk("Zegar zsynchronizowany.");
    else logErr("Synchronizacja zegara nie powiodła się: " + (r || "brak odpowiedzi"));
    await readOne("clock");
  }

  /* ---------- klucz i ID ---------- */
  function updateCurrentId() {
    const pub = $("conf_pub_key").value.trim();
    $("current_id_prefix").textContent = pub.length >= 4 ? pub.slice(0, 4).toUpperCase() : "--";
  }
  function checkDesiredId() {
    const v = $("conf_desired_id").value.trim();
    if (v === "") return setCheck("id_length_status", "", "Puste pole = losowe ID."), true;
    if (!/^[0-9a-f]*$/i.test(v)) return setCheck("id_length_status", "err", "Tylko znaki 0–9 i A–F."), false;
    if (/^(00|ff)/i.test(v)) return setCheck("id_length_status", "err", "ID nie może zaczynać się od 00 ani FF (zarezerwowane – repeater odrzuci taki klucz)."), false;
    if (v.length === 4) return setCheck("id_length_status", "ok", "✓ Pełne 2 bajty – zgodne z prefiksem 2 bajty."), true;
    if (v.length === 2) return setCheck("id_length_status", "warn", "Tylko 1 bajt – łatwiej o kolizję. Zalecamy 4 znaki."), true;
    return setCheck("id_length_status", "warn", "Podaj 2 albo 4 znaki."), false;
  }
  function updateOwnerCounter() {
    const n = new TextEncoder().encode($("conf_owner_info").value.replace(/\n/g, "|")).length;
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
            const pubHex = hex(kp.publicKey.subarray(0, 2));
            if (pubHex.startsWith(want)) {
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
    if (id.length === 2) {
      const ok = await confirmModal("Tylko 1 bajt ID", "ID z 1 bajtu ma tylko 256 wartości, więc łatwiej o kolizję z innym węzłem. Zalecamy 4 znaki (2 bajty). Kontynuować z 1 bajtem?", "Kontynuuj");
      if (!ok) return;
    }
    $("genSpinner").hidden = false;
    $("btnGenerateKey").disabled = true;
    $("genSpinnerStatus").textContent = "start…";
    logMsg(`Szukam klucza z ID ${id ? id.toUpperCase() : "(losowe)"}…`);
    const t0 = performance.now();
    const r = await generateVanityKey(id);
    $("genSpinner").hidden = true;
    $("btnGenerateKey").disabled = false;
    $("genSpinnerStatus").textContent = "";
    if (!r) return logErr("Nie udało się wygenerować klucza.");
    $("conf_priv_key").value = r.priv.toUpperCase();
    $("conf_pub_key").value = r.pub.toUpperCase();
    updateCurrentId();
    logOk(`Wygenerowano klucz z ID ${r.pub.slice(0, 4).toUpperCase()} (${r.attempts.toLocaleString("pl-PL")} prób, ${((performance.now() - t0) / 1000).toFixed(1)} s). Zapisz go w repeaterze przyciskiem obok.`);
  }

  async function onApplyKey() {
    const k = $("conf_priv_key").value.trim().toLowerCase();
    if (!/^[0-9a-f]{128}$/.test(k)) return showModal("Nieprawidłowy klucz", `Klucz prywatny MeshCore to dokładnie 128 znaków hex (teraz: ${k.length}).`);
    const ok = await confirmModal("Zmienić klucz repeatera?",
      "Nowy klucz zmienia ID i tożsamość repeatera. Dotychczasowe wpisy o nim w aplikacjach (kontakty, logowanie) przestaną pasować. Stary klucz zachowaj w eksporcie, jeśli chcesz mieć możliwość powrotu.\n\nPo zapisie trzeba zrestartować repeater.", "Zapisz klucz");
    if (!ok) return;
    const r = await send("set prv.key " + k);
    if (r && /^OK/i.test(r)) {
      logOk("Klucz zapisany.");
      const re = await confirmModal("Klucz zapisany", "Zrestartować repeater teraz, żeby zaczął używać nowego ID?", "Restartuj");
      if (re) doReboot();
    } else showModal("Repeater odrzucił klucz", r || "Brak odpowiedzi z urządzenia.");
  }

  /* ---------- zapisywanie ---------- */
  function report(title, errors, okText) {
    if (errors.length) { errors.forEach(logErr); showModal(title + " – błędy", errors.join("\n")); }
    else logOk(okText);
  }

  async function onApplyLoc() {
    const name = $("conf_name").value.trim();
    const lat = $("conf_lat").value.trim().replace(",", "."), lon = $("conf_lon").value.trim().replace(",", ".");
    const p = nameProblem(name) || coordProblem(lat, lon);
    if (p) return showModal("Popraw dane", p);
    const cmds = [];
    if (name) cmds.push("set name " + name);
    if (lat !== "") cmds.push("set lat " + (+lat).toFixed(6));
    if (lon !== "") cmds.push("set lon " + (+lon).toFixed(6));
    if (!cmds.length) return;
    report("Nazwa i lokalizacja", await sendAll(cmds), "Zapisano nazwę i lokalizację.");
    await readOne("get name");
  }

  async function onApplyAdvert() {
    if (!checkAdverts() || !checkFloodMax()) return showModal("Popraw wartości", "Advert lokalny: 0 albo 60–240 min.\nAdvert flood: 0 albo 3–168 h.\nflood.max: 0–64.");
    const a = $("conf_adv_int").value.trim(), f = $("conf_flood_adv_int").value.trim(), m = $("conf_flood_max").value.trim();
    const cmds = [];
    if (a !== "") cmds.push("set advert.interval " + Number(a));
    if (f !== "") cmds.push("set flood.advert.interval " + Number(f));
    if (m !== "") cmds.push("set flood.max " + Number(m));
    report("Adverty", await sendAll(cmds), "Zapisano ustawienia advertów.");
    for (const c of ["get advert.interval", "get flood.advert.interval", "get flood.max"]) await readOne(c);
  }

  async function onApplyRadio() {
    const freq = parseFloat($("conf_freq").value), bw = $("conf_bw").value, sf = $("conf_sf").value, cr = $("conf_cr").value;
    const tx = $("conf_tx").value.trim(), mode = $("conf_path_hash_mode").value;
    if (isNaN(freq) || freq < 150 || freq > 2500) return showModal("Popraw częstotliwość", "Podaj częstotliwość w MHz, np. " + P.freq + ".");
    const txN = parseInt(tx, 10);
    if (tx !== "" && (isNaN(txN) || txN < -9 || txN > 30)) return showModal("Popraw moc", "Moc TX: od -9 do 30 dBm (dla większości płytek maks. 22).");
    if (!checkRadio()) {
      const ok = await confirmModal("Ustawienia spoza standardu", `Wybrane radio lub prefiks różnią się od standardu Południe SF6 (${P.freq} / ${P.bw} / SF${P.sf}, prefiks 2 bajty). Repeater nie będzie słyszał naszej sieci.\n\nZapisać mimo to?`, "Zapisz mimo to", true);
      if (!ok) return;
    }
    if (txN > 22) {
      const ok = await confirmModal("Moc powyżej 22 dBm", "Większość płytek z SX1262 ma maksimum 22 dBm. Wyższą wartość ustawiaj tylko wtedy, gdy wiesz, że Twoja płytka ją obsługuje.", "Zapisz");
      if (!ok) return;
    }
    const cmds = [`set radio ${freq.toFixed(3)},${bw},${sf},${cr}`];
    if (tx !== "") cmds.push("set tx " + txN);
    cmds.push("set path.hash.mode " + mode);
    const errors = await sendAll(cmds);
    for (const c of ["get radio", "get tx", "get path.hash.mode"]) await readOne(c);
    report("Radio", errors, "Zapisano radio. Nowe parametry radia zaczną działać po restarcie.");
    if (!errors.length) askReboot("Parametry radia zaczną działać po restarcie repeatera.");
  }

  async function onQuickSf6() {
    const ok = await confirmModal("Preset Południe SF6",
      `Repeater dostanie ustawienia:\n• radio ${P.freq} MHz, BW ${P.bw}, SF${P.sf}, CR${P.cr}\n• moc TX ${STD.tx} dBm (maksimum)\n• prefiks 2 bajty (path.hash.mode 1)\n• advert lokalny co ${STD.adv} min, flood co ${STD.flood} h\n• flood.max ${STD.floodMax}\n\nNazwa, lokalizacja, hasła i klucz zostają bez zmian.`, "Ustaw preset");
    if (!ok) return;
    setStatus("busy", "Zapisywanie…");
    const errors = await sendAll([
      `set radio ${P.freq},${P.bw},${P.sf},${P.cr}`, `set tx ${STD.tx}`, `set path.hash.mode ${STD.hash}`,
      `set advert.interval ${STD.adv}`, `set flood.advert.interval ${STD.flood}`, `set flood.max ${STD.floodMax}`,
    ]);
    for (const c of ["get radio", "get tx", "get path.hash.mode", "get advert.interval", "get flood.advert.interval", "get flood.max"]) await readOne(c);
    setStatus("on", "Połączono");
    const bad = [];
    if (!radioOk()) bad.push(`radio: ${$("conf_freq").value} / ${$("conf_bw").value} / SF${$("conf_sf").value}`);
    if ($("conf_path_hash_mode").value !== "1") bad.push("prefiks: tryb " + $("conf_path_hash_mode").value);
    if (+$("conf_tx").value !== STD.tx) bad.push("moc TX: " + $("conf_tx").value);
    if (+$("conf_adv_int").value !== STD.adv) bad.push("advert lokalny: " + $("conf_adv_int").value);
    if (+$("conf_flood_adv_int").value !== STD.flood) bad.push("advert flood: " + $("conf_flood_adv_int").value);
    if (+$("conf_flood_max").value !== STD.floodMax) bad.push("flood.max: " + $("conf_flood_max").value);
    if (errors.length || bad.length) {
      showModal("Nie wszystko się zapisało", [...errors, ...bad.map((b) => "Odczytano " + b)].join("\n") + "\n\nSprawdź terminal i spróbuj ponownie.");
      return;
    }
    logOk("Preset Południe SF6 zapisany i sprawdzony odczytem.");
    askReboot("Preset zapisany i sprawdzony. Nowe radio zacznie działać po restarcie repeatera.");
  }

  async function askReboot(text) {
    const ok = await confirmModal("Restart repeatera", text + "\n\nZrestartować teraz?", "Restartuj");
    if (ok) doReboot();
  }
  async function doReboot() {
    await send("reboot", 500);
    logMsg("Repeater uruchamia się ponownie…");
    if (boardFamily === "nrf52") logMsg("Na płytkach nRF52 port USB na chwilę znika – po restarcie połącz się ponownie.");
    else setTimeout(() => connected && readAllInfo(), 7000);
  }

  async function onSetPasswords() {
    const a = $("conf_admin_pass").value, g = $("conf_guest_pass").value;
    if (!a && !g) return showModal("Brak haseł", "Wpisz nowe hasło administratora lub gościa.");
    for (const [p, label] of [[a, "administratora"], [g, "gościa"]]) {
      if (!p) continue;
      if (new TextEncoder().encode(p).length > 15) return showModal("Za długie hasło", `Hasło ${label} może mieć maks. 15 znaków (bez polskich liter).`);
      if (/^\s|\s$/.test(p)) return showModal("Spacja w haśle", `Hasło ${label} nie może zaczynać się ani kończyć spacją.`);
    }
    const cmds = [];
    if (a) cmds.push("password " + a);
    if (g) cmds.push("set guest.password " + g);
    const errors = await sendAll(cmds);
    report("Hasła", errors, "Zapisano hasła.");
    if (!errors.length) { $("conf_admin_pass").value = ""; $("conf_guest_pass").value = ""; }
  }

  async function onSetAcl() {
    const key = $("conf_acl_key").value.trim().replace(/\s+/g, ""), perm = $("conf_acl_perm").value;
    if (perm === "0") {
      if (!/^[0-9a-f]{2,64}$/i.test(key) || key.length % 2) return showModal("Nieprawidłowy klucz", "Podaj klucz publiczny (lub jego początek, parzysta liczba znaków hex).");
    } else if (!/^[0-9a-f]{64}$/i.test(key)) {
      return showModal("Nieprawidłowy klucz", "Do nadania uprawnień potrzebny jest pełny klucz publiczny – 64 znaki hex.");
    }
    const r = await send(`setperm ${key.toLowerCase()} ${perm}`);
    if (r && /^OK/i.test(r)) logOk(perm === "0" ? "Usunięto klucz z listy uprawnień." : "Zapisano uprawnienia.");
    else showModal("Błąd uprawnień", r || "Brak odpowiedzi z urządzenia.");
  }

  async function onApplyAdvanced() {
    const owner = $("conf_owner_info").value.replace(/\r?\n/g, "|");
    if (new TextEncoder().encode(owner).length > 119) return showModal("Za długi opis", "owner.info może mieć maks. 119 bajtów.");
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
    report("Ustawienia zaawansowane", await sendAll(cmds), "Zapisano ustawienia zaawansowane.");
    for (const c of ["get dutycycle", "get owner.info", "get loop.detect", "get int.thresh", "get agc.reset.interval", "get rxdelay", "get txdelay", "get direct.txdelay", "get multi.acks"]) await readOne(c);
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
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (cfg.name || "repeater").replace(/[^a-z0-9]+/gi, "_").toLowerCase() + "_config.json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    logOk("Wyeksportowano ustawienia" + (withKey ? " (z kluczem prywatnym)." : " (bez klucza prywatnego)."));
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
      logOk("Wczytano plik " + file.name + " do formularzy.");
      if (connected) { $("btnApplyImport").hidden = false; logMsg("Sprawdź wartości i kliknij „Zastosuj import i restart”."); }
      else logMsg("Podłącz repeater, żeby zastosować zaimportowane ustawienia.");
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
    const ok = await confirmModal("Zastosować import?", "Wszystkie wartości z formularzy zostaną zapisane w repeaterze" + (/^[0-9a-f]{128}$/.test(priv) ? " – razem z kluczem prywatnym (zmieni ID)" : "") + ", a potem repeater się zrestartuje.", "Zastosuj i restartuj");
    if (!ok) return;
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
      errors.forEach(logErr);
      const go = await confirmModal("Część ustawień nie została przyjęta", errors.join("\n") + "\n\nZrestartować mimo to?", "Restartuj");
      if (!go) return;
    } else logOk("Import zapisany.");
    doReboot();
  }

  /* ---------- mapa ---------- */
  let map = null, marker = null, picked = null;
  function openMap() {
    if (!window.L) return showModal("Mapa niedostępna", "Nie udało się wczytać biblioteki mapy. Wpisz współrzędne ręcznie.");
    $("mapModal").hidden = false;
    const lat = parseFloat($("conf_lat").value.replace(",", ".")), lon = parseFloat($("conf_lon").value.replace(",", "."));
    const has = !isNaN(lat) && !isNaN(lon) && (lat !== 0 || lon !== 0);
    const start = has ? [lat, lon] : [49.85, 19.5];
    if (!map) {
      map = L.map("mapContainer").setView(start, has ? 13 : 8);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map);
      map.on("click", (e) => placeMarker(e.latlng));
    } else map.setView(start, has ? 13 : map.getZoom());
    setTimeout(() => map.invalidateSize(), 60);
    if (has) placeMarker(L.latLng(lat, lon)); else { picked = null; $("mapSelectedCoords").textContent = "kliknij na mapie"; }
  }
  function placeMarker(ll) {
    picked = ll;
    if (!marker) { marker = L.marker(ll, { draggable: true }).addTo(map); marker.on("dragend", () => placeMarker(marker.getLatLng())); }
    else marker.setLatLng(ll);
    $("mapSelectedCoords").textContent = `${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}`;
  }
  function closeMap() { $("mapModal").hidden = true; }
  function confirmMap() {
    if (picked) { $("conf_lat").value = picked.lat.toFixed(5); $("conf_lon").value = picked.lng.toFixed(5); logMsg("Wybrano lokalizację z mapy – kliknij „Zapisz nazwę i lokalizację”."); }
    closeMap();
  }

  /* ---------- przyciski ---------- */
  const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };
  on("btnConnect", "click", connectSerial);
  on("btnDisconnect", "click", () => disconnectSerial(false));
  on("btnReload", "click", readAllInfo);
  on("btnSyncClock", "click", syncClock);
  on("btnAdvert", "click", async () => { const r = await send("advert"); if (r) logOk("Wysłano advert (flood)."); });
  on("btnToggleRepeat", "click", async () => {
    const cur = $("info_repeat").dataset.on;
    if (cur === undefined) return readOne("get repeat");
    if (cur === "1") {
      const ok = await confirmModal("Wyłączyć przekazywanie?", "Repeater przestanie przekazywać wiadomości innych węzłów – do czasu ponownego włączenia.", "Wyłącz", true);
      if (!ok) return;
    }
    await send("set repeat " + (cur === "1" ? "off" : "on"));
    await readOne("get repeat");
  });
  on("btnOTA", "click", async () => {
    const ok = await confirmModal("Aktualizacja OTA",
      "Repeater przejdzie w tryb aktualizacji bezprzewodowej i przestanie działać jako przekaźnik do czasu restartu.\n\nESP32: uruchomi sieć Wi-Fi z adresem do wgrania pliku (szczegóły pojawią się w terminalu).\nnRF52: uruchomi Bluetooth DFU – plik wgrasz aplikacją nRF Device Firmware Update.\n\nNajprościej zaktualizować repeater kablem przez nasz flasher.", "Uruchom OTA");
    if (!ok) return;
    const r = await send("start ota", 4000);
    if (r) showModal("Tryb OTA", r);
  });
  on("btnReboot", "click", async () => { if (await confirmModal("Restart", "Zrestartować repeater?", "Restartuj")) doReboot(); });
  on("btnFactory", "click", async () => {
    const ok = await confirmModal("Ustawienia fabryczne",
      "Zostanie skasowana cała konfiguracja repeatera: nazwa, radio, hasła, uprawnienia i klucz prywatny (repeater dostanie nowe ID). Potem nastąpi restart.\n\nJeśli chcesz zachować klucz – najpierw wyeksportuj ustawienia z kluczem.", "Skasuj wszystko", true);
    if (!ok) return;
    const r = await send("erase", 8000);
    if (r && /OK/i.test(r)) { logOk("Pamięć ustawień skasowana."); doReboot(); }
    else showModal("Kasowanie nie powiodło się", r || "Brak odpowiedzi z urządzenia.");
  });
  on("btnQuickSf6", "click", onQuickSf6);
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
  on("btnOpenMap", "click", openMap);
  on("btnCloseMap", "click", closeMap);
  on("btnConfirmMap", "click", confirmMap);
  on("mapModal", "click", (e) => { if (e.target.id === "mapModal") closeMap(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("mapModal").hidden) closeMap(); });
  on("btnClear", "click", () => (term.textContent = ""));

  ["conf_freq", "conf_bw", "conf_sf", "conf_path_hash_mode"].forEach((id) => on(id, "change", () => { checkRadio(); checkFloodMax(); }));
  on("conf_tx", "input", checkTx);
  ["conf_adv_int", "conf_flood_adv_int"].forEach((id) => on(id, "input", checkAdverts));
  on("conf_flood_max", "input", checkFloodMax);
  on("conf_desired_id", "input", checkDesiredId);
  on("conf_owner_info", "input", updateOwnerCounter);
  on("conf_name", "input", () => { const p = nameProblem($("conf_name").value.trim()); $("conf_name").classList.toggle("bad", !!p); $("conf_name").title = p; });
  document.querySelectorAll(".rp-eye").forEach((b) => b.addEventListener("click", () => {
    const inp = $(b.dataset.toggle), show = inp.type === "password";
    inp.type = show ? "text" : "password";
    b.textContent = show ? "Ukryj" : "Pokaż";
  }));

  /* historia komend w terminalu */
  const hist = []; let hi = 0;
  on("terminalInput", "keydown", async (e) => {
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
    const r = await send(cmd, cmd === "erase" ? 8000 : REPLY_TIMEOUT);
    const key = cmd.toLowerCase();
    if (r != null && !isErr(r) && READERS[key]) { try { READERS[key](val(r)); } catch (err) {} }
  });

  /* start */
  checkDesiredId(); updateOwnerCounter();
  if (!("serial" in navigator)) {
    $("rpNoSerial").hidden = false;
    $("btnConnect").disabled = true;
    setStatus("", "Brak obsługi USB w tej przeglądarce");
  } else {
    logMsg("Podłącz repeater kablem USB i kliknij „Połącz przez USB”.");
  }
  window.addEventListener("beforeunload", (e) => { if (connected && reading) { e.preventDefault(); e.returnValue = ""; } });
})();
