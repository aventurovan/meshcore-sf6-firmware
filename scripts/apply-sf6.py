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

print("Adverty:")
local_min, flood_h = num("LOCAL_ADVERT_MINUTES"), num("FLOOD_ADVERT_HOURS")
for f in ("examples/simple_repeater/MyMesh.cpp", "examples/simple_room_server/MyMesh.cpp"):
    if not os.path.exists(os.path.join(root, f)):
        die(f"brak pliku {f}")
    if local_min is not None:
        m = int(float(local_min))
        if m % 2: die("LOCAL_ADVERT_MINUTES musi być wielokrotnością 2")
        edit(f, r"(_prefs\.advert_interval\s*=\s*)\d+\s*;", rf"\g<1>{m // 2};", expect=1)
    if flood_h is not None:
        edit(f, r"(_prefs\.flood_advert_interval\s*=\s*)\d+\s*;", rf"\g<1>{int(float(flood_h))};", expect=1)

print("ID ścieżki:")
pb = num("PATH_HASH_BYTES")
if pb:
    mode = int(pb) - 1
    if mode not in (0, 1, 2): die("PATH_HASH_BYTES musi być 1, 2 albo 3")
    edit("src/helpers/CommonCLI.h", r"(uint8_t\s+path_hash_mode\s*=\s*)\d+\s*;", rf"\g<1>{mode};", expect=1)

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
