// Wgrywanie firmware nRF52 przez bootloader Adafruit (serial DFU, protokół legacy HCI/SLIP),
// tak samo jak robi to `adafruit-nrfutil dfu serial`. Używa paczki .zip z buildu MeshCore.

const DFU_INIT_PACKET = 1, DFU_START_PACKET = 3, DFU_DATA_PACKET = 4, DFU_STOP_DATA_PACKET = 5;
const MODE_APPLICATION = 4;
const PACKET_MAX = 512;
const PAGE_SIZE = 4096, PAGE_ERASE_TIME = 89.7, PAGE_WRITE_TIME = (PAGE_SIZE / 4) * 0.1; // ms
const ACK_TIMEOUT = 2000;

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

// ---------- połączenie ----------
class Link {
  constructor(port) { this.port = port; this.buf = []; this.waiters = []; this.closed = false; }
  async open() {
    await this.port.open({ baudRate: 115200 });
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
    await this.writer.write(hciPacket(seq, data));
    return this.waitAck(timeout);
  }
  async close() {
    try { await this.reader.cancel(); } catch {}
    try { this.reader.releaseLock(); } catch {}
    try { this.writer.releaseLock(); } catch {}
    try { await this.port.close(); } catch {}
  }
}

// ---------- przebieg DFU ----------
export async function readDfuZip(buf) {
  const files = await unzip(buf);
  if (!files["manifest.json"]) throw new Error("w paczce .zip brak manifest.json");
  const man = JSON.parse(new TextDecoder().decode(files["manifest.json"])).manifest || {};
  const app = man.application;
  if (!app) throw new Error("paczka nie zawiera aplikacji (tylko application jest obsługiwane)");
  const bin = files[app.bin_file], dat = files[app.dat_file];
  if (!bin || !dat) throw new Error("w paczce .zip brak plików firmware");
  return { bin, dat };
}

export async function flashNrfDfu(port, { bin, dat }, { onProgress = () => {}, log = () => {} } = {}) {
  const link = new Link(port);
  let seq = 0;
  const next = () => (seq = (seq + 1) % 8);
  await link.open();
  try {
    log(`Start DFU: aplikacja ${bin.length} B`);
    await link.send(next(), [...int32(DFU_START_PACKET), ...int32(MODE_APPLICATION), ...int32(0), ...int32(0), ...int32(bin.length)]);
    const erase = Math.max(500, (Math.floor(bin.length / PAGE_SIZE) + 1) * PAGE_ERASE_TIME);
    log(`Kasowanie pamięci (${(erase / 1000).toFixed(1)} s)`);
    await sleep(erase);

    await link.send(next(), [...int32(DFU_INIT_PACKET), ...dat, 0, 0]);

    const total = Math.ceil(bin.length / PACKET_MAX);
    for (let i = 0, n = 0; i < bin.length; i += PACKET_MAX, n++) {
      await link.send(next(), [...int32(DFU_DATA_PACKET), ...bin.subarray(i, i + PACKET_MAX)]);
      if (n % 8 === 0) await sleep(PAGE_WRITE_TIME);
      onProgress((n + 1) / total);
    }
    await sleep(PAGE_WRITE_TIME);
    log("Zatwierdzanie firmware");
    await link.send(next(), int32(DFU_STOP_DATA_PACKET), 5000).catch(e => log("Brak potwierdzenia końca (" + e.message + ") – zwykle oznacza restart urządzenia."));
  } finally {
    await link.close();
  }
  // bootloader przepisuje obraz i restartuje urządzenie
  const activate = Math.max(500, (Math.floor(bin.length / PAGE_SIZE) + 1) * PAGE_ERASE_TIME) +
                   (Math.floor(bin.length / PAGE_SIZE) + 1) * PAGE_WRITE_TIME;
  await sleep(activate);
}

// 1200 bps "touch": aplikacja MeshCore restartuje się do bootloadera
export async function touch1200(port) {
  await port.open({ baudRate: 1200 });
  try {
    await port.setSignals({ dataTerminalReady: true });
    await sleep(100);
    await port.setSignals({ dataTerminalReady: false });
  } catch {}
  await sleep(100);
  await port.close();
}
