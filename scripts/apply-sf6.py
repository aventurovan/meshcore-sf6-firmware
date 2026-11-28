#!/usr/bin/env python3
"""Nakłada ustawienia SF6 z sf6.conf na checkout MeshCore.
Użycie: apply-sf6.py <ścieżka sf6.conf> <katalog MeshCore>
Każda zmiana jest sprawdzana; jeśli fragment kodu zmienił się w nowej
wersji MeshCore, skrypt kończy się błędem zamiast budować firmware
z oficjalnymi wartościami."""
import glob, os, re, shlex, sys

conf_path, root = sys.argv[1], sys.argv[2]
conf = {}
for line in open(conf_path, encoding="utf-8"):
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    vals = shlex.split(v, comments=True)
    conf[k.strip()] = " ".join(vals)

def die(msg):
    print("::error::" + msg)
    sys.exit(1)

def edit(path, pattern, repl, expect=None, minimum=1):
    p = os.path.join(root, path)
    s = open(p, encoding="utf-8").read()
    new, n = re.subn(pattern, repl, s, flags=re.M)
    if expect is not None and n != expect:
        die(f"{path}: oczekiwano {expect} trafień dla /{pattern}/, jest {n}. Kod MeshCore się zmienił – sprawdź poprawkę.")
    if n < minimum:
        die(f"{path}: nie znaleziono /{pattern}/. Kod MeshCore się zmienił – sprawdź poprawkę.")
    open(p, "w", encoding="utf-8").write(new)
    print(f"  {path}: {n}x")
    return n

def num(key):
    v = conf.get(key, "")
    if v == "":
        return None
    try:
        float(v)
    except ValueError:
        die(f"sf6.conf: {key}={v} nie jest liczbą")
    return v

print("Radio:")
freq, bw, sf, cr, txp = (num(k) for k in ("LORA_FREQ", "LORA_BW", "LORA_SF", "LORA_CR", "LORA_TX_POWER"))
ini = "platformio.ini"
if freq: edit(ini, r"(-D\s*LORA_FREQ=)[0-9.]+", r"\g<1>" + freq, expect=1)
if bw:   edit(ini, r"(-D\s*LORA_BW=)[0-9.]+", r"\g<1>" + bw, expect=1)
if sf:   edit(ini, r"(-D\s*LORA_SF=)[0-9]+", r"\g<1>" + sf, expect=1)
extra = []
s = open(os.path.join(root, ini), encoding="utf-8").read()
if cr:
    if re.search(r"-D\s*LORA_CR=", s): edit(ini, r"(-D\s*LORA_CR=)[0-9]+", r"\g<1>" + cr)
    else: extra.append(f"-D LORA_CR={cr}")
if txp:
    if re.search(r"-D\s*LORA_TX_POWER=", s): edit(ini, r"(-D\s*LORA_TX_POWER=)[0-9]+", r"\g<1>" + txp)
    else: extra.append(f"-D LORA_TX_POWER={txp}")
if extra:
    edit(ini, r"^([ \t]*)(-D\s*LORA_SF=[0-9]+)", r"\1\2" + "".join("\n\\1" + e for e in extra), expect=1)

# warianty, które same nadpisują SF/BW/CR (częstotliwości nie ruszamy – płytki 433 MHz)
for v in sorted(glob.glob(os.path.join(root, "variants", "*", "*.ini"))):
    rel = os.path.relpath(v, root)
    for key, val in (("LORA_SF", sf), ("LORA_BW", bw), ("LORA_CR", cr)):
        t = open(v, encoding="utf-8").read()
        if val and re.search(rf"^[^;\n]*-D\s*{key}=", t, re.M):
            print(f"  wariant {rel} nadpisuje {key}")
            edit(rel, rf"^([^;\n]*-D\s*{key}=)[0-9.]+", r"\g<1>" + val)

print("Adverty (repeater):")
local_min, flood_h = num("LOCAL_ADVERT_MINUTES"), num("FLOOD_ADVERT_HOURS")
for f in ("examples/simple_repeater/MyMesh.cpp",):
    if not os.path.exists(os.path.join(root, f)):
        die(f"brak pliku {f}")
    if local_min is not None:
        m = int(float(local_min))
        if m % 2: die("LOCAL_ADVERT_MINUTES musi być wielokrotnością 2")
        edit(f, r"(_prefs\.advert_interval\s*=\s*)\d+\s*;", rf"\g<1>{m // 2};", expect=1)
    if flood_h is not None:
        edit(f, r"(_prefs\.flood_advert_interval\s*=\s*)\d+\s*;", rf"\g<1>{int(float(flood_h))};", expect=1)

print("Wykrywanie pętli (repeater):")
ld = conf.get("LOOP_DETECT", "").strip().lower()
if ld:
    if ld not in ("off", "minimal", "moderate", "strict"): die("LOOP_DETECT musi być off, minimal, moderate albo strict")
    edit("examples/simple_repeater/MyMesh.cpp", r"(_prefs\.loop_detect\s*=\s*)LOOP_DETECT_[A-Z]+\s*;", rf"\g<1>LOOP_DETECT_{ld.upper()};", expect=1)

print("ID ścieżki:")
pb = num("PATH_HASH_BYTES")
if pb:
    mode = int(pb) - 1
    if mode not in (0, 1, 2): die("PATH_HASH_BYTES musi być 1, 2 albo 3")
    edit("src/helpers/CommonCLI.h", r"(uint8_t\s+path_hash_mode\s*=\s*)\d+\s*;", rf"\g<1>{mode};", expect=1)

print("Companion: aktualizacja przez Bluetooth (OTA, komenda 0xB0):")
# CLI companiona (od 1.18) nie ma „start ota”: dokładamy je (i get bootloader.ver) oraz komendę 0xB0: [0xB0][0] = informacja, [0xB0][1] = start.
# Odpowiedź [0xB0][status][wersja bootloadera]; status 0 = można (OTAFIX), 1 = brak bootloadera nRF52, 2 = bez OTAFIX.
# Start tylko z OTAFIX: zapis kontaktów i po ~0,6 s restart do bootloadera w trybie aktualizacji Bluetooth („AdaDFU”).
cf = "examples/companion_radio/MyMesh.cpp"
if os.path.exists(os.path.join(root, cf)):
    OTA_FN = r"""/* ---- SF6: aktualizacja companiona przez Bluetooth (bootloader OTAFIX) ---- */
#define SF6_CMD_OTA 0xB0
static unsigned long sf6_ota_at = 0;
static uint8_t sf6OtaStatus(char* bl, size_t max_len) {
  bl[0] = 0;
  if (!board.getBootloaderVersion(bl, max_len)) { bl[0] = 0; return 1; }
  return strstr(bl, "OTAFIX") ? 0 : 2;
}

void MyMesh::handleCmdFrame(size_t len) {
  if (cmd_frame[0] == SF6_CMD_OTA && len >= 2) {
    char bl[40];
    uint8_t st = sf6OtaStatus(bl, sizeof(bl));
    uint8_t r[2 + sizeof(bl)];
    size_t n = strlen(bl);
    r[0] = SF6_CMD_OTA; r[1] = st; memcpy(&r[2], bl, n);
    _serial->writeFrame(r, 2 + n);
#ifdef NRF52_PLATFORM
    if (cmd_frame[1] == 0x01 && st == 0) {
      if (dirty_contacts_expiry) saveContacts();
      sf6_ota_at = millis() + 600;
    }
#endif
    return;
  }
"""
    edit(cf, r"^void MyMesh::handleCmdFrame\(size_t len\) \{\n", lambda m: OTA_FN, expect=1)
    CLI_OTA = r"""  // SF6: aktualizacja przez Bluetooth z CLI (aplikacja albo zdalnie od kontaktu z uprawnieniem do CLI)
  if (strcmp(command, "start ota") == 0 || strcmp(command, "get bootloader.ver") == 0) {
    char bl[40];
    uint8_t st = sf6OtaStatus(bl, sizeof(bl));
    if (command[0] == 'g') { sprintf(reply, "> %s", bl[0] ? bl : "unknown"); return true; }
#ifdef NRF52_PLATFORM
    if (st == 0) {
      if (dirty_contacts_expiry) saveContacts();
      sf6_ota_at = millis() + 600;
      strcpy(reply, "OK - restart do aktualizacji przez Bluetooth (AdaDFU)");
      return true;
    }
#endif
    sprintf(reply, "Err - wymaga bootloadera OTAFIX (%s)", st == 1 ? "brak bootloadera nRF52" : bl);
    return true;
  }
"""
    edit(cf, r'^(  if \(strcmp\(command, "reboot"\) == 0\) \{\n)', lambda m: CLI_OTA + m.group(1), expect=1)
    edit(cf, r"^(void MyMesh::loop\(\) \{\n  BaseChatMesh::loop\(\);\n)",
         lambda m: m.group(1) + "#ifdef NRF52_PLATFORM\n  if (sf6_ota_at && (long)(millis() - sf6_ota_at) >= 0) { sf6_ota_at = 0; enterOTADfu(); }\n#endif\n", expect=1)

# Łatki testowe (SF6_TEST_PATCHES, tylko w buildach testowych — bez wydania i FTP, dopóki nie przejdą testu na sprzęcie)
TEST_PATCHES = os.environ.get("SF6_TEST_PATCHES", "").split()
if "prvkey" in TEST_PATCHES:
    # eksport klucza prywatnego przez zdalne CLI (tylko zalogowany admin; odpowiedź szyfrowana sesją admina) —
    # oficjalnie „get prv.key” działa tylko z kabla USB. Potrzebne do kopii tożsamości repeatera w MeshSpeed.
    print("Łatka testowa prvkey: get prv.key także zdalnie (admin)")
    edit("src/helpers/CommonCLI.cpp", r'\} else if \(sender_timestamp == 0 && memcmp\(config, "prv\.key", 7\) == 0\) \{',
         '} else if (memcmp(config, "prv.key", 7) == 0) {', expect=1)

print("Poprawki buildu (nie zmieniają działania firmware):")
# Część wariantów używa EnvironmentSensorManager w target.h, ale niektóre role nie mają
# jego źródła w build_src_filter -> błąd linkera (np. ThinkNode_M8_repeater w v1.18.0).
for th in sorted(glob.glob(os.path.join(root, "variants", "*", "target.h"))):
    if "EnvironmentSensorManager.h" not in open(th, encoding="utf-8").read():
        continue
    d = os.path.dirname(th)
    for ini in glob.glob(os.path.join(d, "*.ini")):
        txt = open(ini, encoding="utf-8", newline="").read()
        parts = re.split(r"(?m)^(?=\[)", txt)
        # jeśli sekcja bazowa płytki już dodaje sensory, wszystkie role je dziedziczą
        if any("helpers/sensors" in sec for sec in parts if not sec.startswith("[env:")):
            continue
        changed = []
        for i, sec in enumerate(parts):
            m = re.match(r"\[env:([^\]]+)\]", sec)
            if not m or "helpers/sensors" in sec or not re.search(r"(?m)^build_src_filter\s*=", sec):
                continue
            nl = "\r\n" if "\r\n" in sec else "\n"
            parts[i] = re.sub(r"(?m)^(build_src_filter\s*=[^\r\n]*)", lambda mm: mm.group(1) + nl + "  +<helpers/sensors>", sec, count=1)
            changed.append(m.group(1))
        if changed:
            open(ini, "w", encoding="utf-8", newline="").write("".join(parts))
            print(f"  {os.path.relpath(ini, root)}: dodano helpers/sensors dla {', '.join(changed)}")

print("OK – ustawienia SF6 nałożone.")
