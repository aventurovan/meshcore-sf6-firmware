#!/usr/bin/env python3
"""Kopia bootloadera OTAFIX (oltaco/Adafruit_nRF52_Bootloader_OTAFIX) dla płytek nRF52 z flashera.

  otafix_sync.py <katalog wyjściowy> [obecny otafix.json]
  otafix_sync.py --stock <katalog wyjściowy> [obecny bootloader-stock.json]
      zwykły bootloader bez OTAFIX (meshtastic/nRF52_Bootloader, te same nazwy płytek) – do „Przywróć oryginalny bootloader”

Pobiera najnowsze (nie wstępne) wydanie, dla każdej płytki z DEVICES bierze:
  update-<płytka>_bootloader-<tag>_nosd.uf2   – do przeciągnięcia na dysk (sam bootloader)
  <płytka>_bootloader-<tag>_s140_<sd>.zip     – do wgrania z przeglądarki (SoftDevice + bootloader, serial DFU)
sprawdza je i zapisuje w <wyjście>/otafix/<tag>/ oraz <wyjście>/otafix.json (ścieżki względem /flasher/).
Kod wyjścia 0 = są nowe pliki do wgrania, 3 = to samo wydanie co na serwerze (nic do roboty)."""
import datetime, hashlib, io, json, os, re, sys, urllib.request, zipfile

STOCK = "--stock" in sys.argv
ARGS = [a for a in sys.argv[1:] if a != "--stock"]
REPO = "meshtastic/nRF52_Bootloader" if STOCK else "oltaco/Adafruit_nRF52_Bootloader_OTAFIX"
NAME = "bootloader-stock" if STOCK else "otafix"

# id urządzenia we flasherze (nazwa env MeshCore bez roli) -> płytka OTAFIX
DEVICES = {
    "RAK_4631": "wiscore_rak4631_board",
    "RAK_3401": "wiscore_rak3401",
    "RAK_WisMesh_Tag": "wismesh_tag",
    "Xiao_nrf52": "xiao_nrf52840_ble",
    "t1000e": "t1000_e",
    "WioTrackerL1": "wio_tracker_l1",
    "SenseCap_Solar": "sensecap_solar_p1",
    "Heltec_t114": "heltec_t114",
    "Heltec_t114_without_display": "heltec_t114",
    "Heltec_t096": "heltec_t096",
    "Heltec_t1": "heltec_t1",
    "LilyGo_T-Echo": "lilygo_techo",
    "ThinkNode_M1": "thinknode_m1",
    "ThinkNode_M3": "thinknode_m3",
    "ThinkNode_M6": "thinknode_m6",
    "ProMicro": "promicro_nrf52840",
}


def get(url, accept=None):
    req = urllib.request.Request(url, headers={"User-Agent": "meshcore-sf6-firmware"})
    if accept:
        req.add_header("Accept", accept)
    tok = os.environ.get("GITHUB_TOKEN")
    if tok and "api.github.com" in url:
        req.add_header("Authorization", "Bearer " + tok)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def check_uf2(data):
    if len(data) < 512 or len(data) % 512:
        raise ValueError("zły rozmiar UF2")
    for i in range(0, len(data), 512):
        b = data[i:i + 512]
        if b[0:4] != b"UF2\n" or b[4:8] != b"\x57\x51\x5d\x9e" or b[508:512] != b"\x30\x6f\xb1\x0a":
            raise ValueError("uszkodzony blok UF2")


def check_zip(data):
    z = zipfile.ZipFile(io.BytesIO(data))
    man = json.loads(z.read("manifest.json"))["manifest"]
    sb = man.get("softdevice_bootloader")
    parts = set(man) - {"dfu_version"}
    if not sb or parts != {"softdevice_bootloader"}:
        raise ValueError("paczka nie jest SoftDevice + bootloader: " + ",".join(sorted(parts)))
    bin_ = z.read(sb["bin_file"]); z.read(sb["dat_file"])
    if sb["sd_size"] + sb["bl_size"] != len(bin_):
        raise ValueError("rozmiary w manifest.json nie zgadzają się z plikiem")
    return sb


def main():
    out = ARGS[0]
    cur = {}
    if len(ARGS) > 1 and os.path.exists(ARGS[1]):
        try:
            cur = json.load(open(ARGS[1]))
        except ValueError:
            cur = {}
    rel = json.loads(get(f"https://api.github.com/repos/{REPO}/releases/latest", "application/vnd.github+json"))
    tag = rel["tag_name"]
    if rel.get("prerelease") or rel.get("draft"):
        sys.exit(f"najnowsze wydanie {tag} jest wstępne – pomijam")
    if cur.get("tag") == tag and not os.environ.get("FORCE"):
        print(f"{NAME} {tag} jest już na stronie")
        sys.exit(3)
    assets = {a["name"]: a["browser_download_url"] for a in rel["assets"]}
    m = re.search(r"OTAFIX(\d+(?:\.\d+)*)", tag)
    data = {"tag": tag, "version": m.group(1) if m and not STOCK else tag, "released": rel.get("published_at"),
            "synced": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "source": rel["html_url"], "boards": {}, "devices": {}}
    folder = f"{NAME}/{tag}"
    os.makedirs(os.path.join(out, folder), exist_ok=True)
    for board in sorted(set(DEVICES.values())):
        uf2 = f"update-{board}_bootloader-{tag}_nosd.uf2"
        zips = [n for n in assets if re.fullmatch(re.escape(f"{board}_bootloader-{tag}_s140_") + r"[\d.]+\.zip", n)]
        if uf2 not in assets or len(zips) != 1:
            print(f"! {board}: brak plików w wydaniu – pomijam")
            continue
        entry = {}
        try:
            for key, name in (("uf2", uf2), ("zip", zips[0])):
                blob = get(assets[name])
                if key == "uf2":
                    check_uf2(blob)
                else:
                    sb = check_zip(blob)
                    entry["sd"] = re.search(r"_s140_([\d.]+)\.zip$", name).group(1)
                    entry["sd_size"], entry["bl_size"] = sb["sd_size"], sb["bl_size"]
                open(os.path.join(out, folder, name), "wb").write(blob)
                entry[key] = f"{folder}/{name}"
                entry[key + "_sha256"] = hashlib.sha256(blob).hexdigest()
        except Exception as e:  # jedna zła płytka nie blokuje reszty
            print(f"! {board}: {e} – pomijam")
            continue
        data["boards"][board] = entry
        print(f"OK {board}: SoftDevice {entry['sd']}")
    # id urządzenia w manifeście flashera jest małymi literami (manifest.py: device.lower())
    data["devices"] = {d.lower(): b for d, b in DEVICES.items() if b in data["boards"]}
    if not data["devices"]:
        sys.exit("żadna płytka nie przeszła sprawdzenia – nic nie wgrywam")
    json.dump(data, open(os.path.join(out, NAME + ".json"), "w"), indent=1, ensure_ascii=False)
    print(f"{NAME}.json: {tag}, {len(data['boards'])} płytek, {len(data['devices'])} urządzeń")


if __name__ == "__main__":
    main()
