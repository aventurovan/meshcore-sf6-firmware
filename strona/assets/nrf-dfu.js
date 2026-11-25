// Wgrywanie firmware nRF52 przez bootloader Adafruit (serial DFU, protokół legacy HCI/SLIP),
// tak samo jak robi to `adafruit-nrfutil dfu serial`. Używa paczki .zip z buildu MeshCore.

const DFU_INIT_PACKET = 1, DFU_START_PACKET = 3, DFU_DATA_PACKET = 4, DFU_STOP_DATA_PACKET = 5;
const MODE_SOFTDEVICE = 1, MODE_BOOTLOADER = 2, MODE_APPLICATION = 4; // SoftDevice + bootloader = 3
const PACKET_MAX = 512;
const PAGE_SIZE = 4096, PAGE_ERASE_TIME = 89.7, PAGE_WRITE_TIME = (PAGE_SIZE / 4) * 0.1; // ms
const ACK_TIMEOUT = 2000, WRITE_TIMEOUT = 8000;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- ZIP (bez bibliotek: katalog centralny + DecompressionStream) ----------
export async function unzip(buf) {
  const dv = new DataView(buf), u8 = new Uint8Array(buf);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("uszkodzony plik .zip");
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const files = {};
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error("uszkodzony katalog .zip");
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nlen));
    const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
    const raw = u8.subarray(start, start + csize);
    if (method === 0) files[name] = raw.slice();
    else if (method === 8) {
      const ds = new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      files[name] = new Uint8Array(await new Response(ds).arrayBuffer());
    } else throw new Error("nieobsługiwana kompresja w .zip");
    p += 46 + nlen + xlen + clen;
  }
  return files;
}

// ---------- pakiety HCI/SLIP ----------
export function crc16(data, crc = 0xffff) {
  for (const b of data) {
    crc = ((crc >> 8) & 0xff) | ((crc << 8) & 0xff00);
    crc ^= b;
    crc ^= (crc & 0xff) >> 4;
    crc ^= (crc << 12) & 0xffff;
    crc ^= ((crc & 0xff) << 5) & 0xffff;
  }
  return crc & 0xffff;
}

const int32 = v => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];

export function hciPacket(seq, data) {
  const len = data.length;
  const h0 = seq | (((seq + 1) % 8) << 3) | (1 << 6) | (1 << 7);
  const h1 = 14 | ((len & 0x0f) << 4);
  const h2 = (len & 0x0ff0) >> 4;
  const h3 = (~(h0 + h1 + h2) + 1) & 0xff;
  const body = [h0, h1, h2, h3, ...data];
  const crc = crc16(body);
  body.push(crc & 0xff, (crc >> 8) & 0xff);
  const out = [0xc0];
  for (const b of body) {
    if (b === 0xc0) out.push(0xdb, 0xdc);
    else if (b === 0xdb) out.push(0xdb, 0xdd);
    else out.push(b);
  }
  out.push(0xc0);
  return new Uint8Array(out);
}

// ---------- port ----------
// Otwarte połączenia tej strony: przed każdym otwarciem portu zamykamy to, co zostało po poprzedniej próbie
// (zerwane wgrywanie zostawiało port otwarty → „The port is already open” / „Failed to open serial port”).
const active = new Set();
export async function releaseAll() {
  for (const l of [...active]) await l.close();
}
export async function openPort(port, opts) {
  if (port.readable || port.writable) {
    await releaseAll();
    try { await port.close(); } catch {}
    await sleep(200);
  }
  try { await port.open(opts); }
  catch (e) {
    if (!/already open/i.test(e.message || "")) throw e;
    await releaseAll();
    try { await port.close(); } catch {}
    await sleep(300);
    await port.open(opts);
  }
}

// ---------- połączenie ----------
class Link {
  constructor(port) { this.port = port; this.buf = []; this.waiters = []; this.closed = false; }
  async open() {
    await openPort(this.port, { baudRate: 115200 });
    active.add(this);
    await sleep(100);
    try { // jak nrfutil: krótki impuls DTR, bootloader zaczyna nasłuchiwać
      await this.port.setSignals({ dataTerminalReady: false });
      await sleep(50);
      await this.port.setSignals({ dataTerminalReady: true });
    } catch {}
    await sleep(100);
    this.writer = this.port.writable.getWriter();
    this.reader = this.port.readable.getReader();
    this.loop = (async () => {
      try {
        for (;;) {
          const { value, done } = await this.reader.read();
          if (done) break;
          for (const b of value) this.buf.push(b);
          this.waiters.splice(0).forEach(w => w());
        }
      } catch {}
      this.closed = true;
      this.waiters.splice(0).forEach(w => w());
    })();
  }
  async waitAck(timeout) {
    const deadline = Date.now() + timeout;
    for (;;) {
      // ramka ACK: C0 <nagłówek> C0
      const s = this.buf.indexOf(0xc0);
      if (s >= 0) {
        const e = this.buf.indexOf(0xc0, s + 1);
        if (e > s + 1) {
          const frame = this.buf.slice(s + 1, e);
          this.buf.splice(0, e + 1);
          const first = frame[0] === 0xdb ? (frame[1] === 0xdc ? 0xc0 : 0xdb) : frame[0];
          return (first >> 3) & 7;
        }
        if (e === s + 1) { this.buf.splice(0, s + 1); continue; }
      }
      if (this.closed) throw new Error("urządzenie rozłączyło się");
      const left = deadline - Date.now();
      if (left <= 0) throw new Error("brak odpowiedzi bootloadera (czy urządzenie jest w trybie DFU?)");
      await new Promise(r => { this.waiters.push(r); setTimeout(r, Math.min(left, 100)); });
    }
  }
  async send(seq, data, timeout = ACK_TIMEOUT) {
    // zapis, którego urządzenie nie odbiera (zawieszony USB), nie może wisieć bez końca
    let t;
    const stuck = new Promise((_, rej) => { t = setTimeout(() => rej(new Error("urządzenie przestało odbierać dane (USB stoi)")), WRITE_TIMEOUT); });
    try { await Promise.race([this.writer.write(hciPacket(seq, data)), stuck]); }
    finally { clearTimeout(t); }
    return this.waitAck(timeout);
  }
  async close() {
    if (this.done) return;
    this.done = true;
    active.delete(this);
    try { await this.reader.cancel(); } catch {}
    try { await Promise.race([this.loop, sleep(500)]); } catch {}
    try { this.reader.releaseLock(); } catch {}
    try { await this.writer.abort(); } catch {}   // zawieszony zapis blokowałby zamknięcie portu
    try { this.writer.releaseLock(); } catch {}
    for (let i = 0; i < 3; i++) {
      try { await this.port.close(); break; } catch { await sleep(200); }
    }
  }
}

// ---------- przebieg DFU ----------
// Paczka .zip z adafruit-nrfutil: aplikacja (firmware) albo – z opcją { bootloader: true } – SoftDevice + bootloader
// (np. bootloader OTAFIX). Zwraca { bin, dat, mode, sdSize, blSize, appSize }.
export async function readDfuZip(buf, { bootloader = false } = {}) {
  const files = await unzip(buf);
  if (!files["manifest.json"]) throw new Error("w paczce .zip brak manifest.json");
  const man = JSON.parse(new TextDecoder().decode(files["manifest.json"])).manifest || {};
  const parts = Object.keys(man).filter(k => k !== "dfu_version");
  const want = bootloader ? "softdevice_bootloader" : "application";
  if (parts.length !== 1 || parts[0] !== want)
    throw new Error(bootloader ? "to nie jest paczka bootloadera (SoftDevice + bootloader)" : "paczka nie zawiera aplikacji (tylko application jest obsługiwane)");
  const p = man[want];
  const bin = files[p.bin_file], dat = files[p.dat_file];
  if (!bin || !dat) throw new Error("w paczce .zip brak plików " + (bootloader ? "bootloadera" : "firmware"));
  if (!bootloader) return { bin, dat, mode: MODE_APPLICATION, sdSize: 0, blSize: 0, appSize: bin.length };
  const sdSize = p.sd_size | 0, blSize = p.bl_size | 0;
  if (!sdSize || !blSize || sdSize + blSize !== bin.length) throw new Error("rozmiary w paczce bootloadera się nie zgadzają");
  return { bin, dat, mode: MODE_SOFTDEVICE | MODE_BOOTLOADER, sdSize, blSize, appSize: 0 };
}

// onPhase(nazwa, dane): open, erase {ms}, send, commit, activate {ms} – do pokazania przebiegu na stronie
export async function flashNrfDfu(port, { bin, dat, mode = MODE_APPLICATION, sdSize = 0, blSize = 0, appSize }, { onProgress = () => {}, log = () => {}, onPhase = () => {} } = {}) {
  if (mode === MODE_APPLICATION) appSize = bin.length;
  const link = new Link(port);
  let seq = 0;
  const next = () => (seq = (seq + 1) % 8);
  onPhase("open");
  await link.open();
  try {
    log(mode === MODE_APPLICATION ? `Start DFU: aplikacja ${bin.length} B`
                                  : `Start DFU: SoftDevice ${sdSize} B + bootloader ${blSize} B`);
    await link.send(next(), [...int32(DFU_START_PACKET), ...int32(mode), ...int32(sdSize), ...int32(blSize), ...int32(appSize)]);
    const erase = Math.max(500, (Math.floor(bin.length / PAGE_SIZE) + 1) * PAGE_ERASE_TIME);
    log(`Kasowanie pamięci (${(erase / 1000).toFixed(1)} s)`);
    onPhase("erase", { ms: erase });
    await sleep(erase);

    await link.send(next(), [...int32(DFU_INIT_PACKET), ...dat, 0, 0]);

    const total = Math.ceil(bin.length / PACKET_MAX);
    onPhase("send", { bytes: bin.length });
    for (let i = 0, n = 0; i < bin.length; i += PACKET_MAX, n++) {
      await link.send(next(), [...int32(DFU_DATA_PACKET), ...bin.subarray(i, i + PACKET_MAX)]);
      if (n % 8 === 0) await sleep(PAGE_WRITE_TIME);
      onProgress((n + 1) / total);
    }
    await sleep(PAGE_WRITE_TIME);
    onPhase("commit");
    log(mode === MODE_APPLICATION ? "Zatwierdzanie firmware" : "Zatwierdzanie – bootloader przepisuje SoftDevice i siebie");
    await link.send(next(), int32(DFU_STOP_DATA_PACKET), 5000).catch(e => log("Brak potwierdzenia końca (" + e.message + ") – zwykle oznacza restart urządzenia."));
  } finally {
    await link.close();
  }
  // bootloader przepisuje obraz i restartuje urządzenie
  const activate = Math.max(500, (Math.floor(bin.length / PAGE_SIZE) + 1) * PAGE_ERASE_TIME) +
                   (Math.floor(bin.length / PAGE_SIZE) + 1) * PAGE_WRITE_TIME;
  onPhase("activate", { ms: activate });
  await sleep(activate);
}

// 1200 bps "touch": aplikacja MeshCore restartuje się do bootloadera
export async function touch1200(port) {
  await openPort(port, { baudRate: 1200 });
  try {
    await port.setSignals({ dataTerminalReady: true });
    await sleep(100);
    await port.setSignals({ dataTerminalReady: false });
  } catch {}
  await sleep(100);
  await port.close();
}

// Odczyt kilku poleceń CLI z działającego firmware (repeater MeshCore przez USB): { "ver": "v1.17.1 …", … }.
// Bez odpowiedzi (companion, tryb DFU, stary firmware) → null. Port jest potem zamykany.
export async function readCli(port, cmds, { timeout = 1500, needFirst = false } = {}) {
  await openPort(port, { baudRate: 115200 });
  const out = {}, dec = new TextDecoder(), enc = new TextEncoder();
  let buf = "", waiter = null;
  const reader = port.readable.getReader(), writer = port.writable.getWriter();
  const loop = (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const m = buf.slice(0, i).replace(/\r/g, "").match(/^\s*->\s?(.*)$/);
          buf = buf.slice(i + 1);
          if (m && waiter) { const w = waiter; waiter = null; w(m[1].trim()); }
        }
      }
    } catch {}
  })();
  try {
    await sleep(300);
    for (const c of cmds) {
      const p = new Promise(r => { waiter = r; setTimeout(() => { if (waiter === r) { waiter = null; r(null); } }, timeout); });
      await writer.write(enc.encode(c + "\r\n"));
      const r = await p;
      out[c] = r == null || /^(\(?err|error|unknown|invalid)/i.test(r) ? null : r.replace(/^>\s?/, "").trim();
      if (needFirst && c === cmds[0] && out[c] == null) break;   // pierwsze bez odpowiedzi – to nie CLI repeatera
    }
  } finally {
    try { await reader.cancel(); } catch {}
    try { await Promise.race([loop, sleep(300)]); } catch {}
    try { reader.releaseLock(); } catch {}
    try { writer.releaseLock(); } catch {}
    try { await port.close(); } catch {}
  }
  return out;
}

// „0.9.2-OTAFIX2.3-BP1.4” → { otafix: true, ok: true, text }; OTAFIX od 2.2 uznajemy za aktualny
export function describeBootloader(v) {
  if (!v) return null;
  const m = v.match(/OTAFIX\s*(\d+)\.(\d+)/i);
  const otafix = !!m, ok = otafix && (+m[1] > 2 || (+m[1] === 2 && +m[2] >= 2));
  return { otafix, ok, text: v.replace(/^bootloader[:\s]*/i, "").trim() };
}
