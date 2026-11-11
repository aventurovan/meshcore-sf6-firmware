#!/usr/bin/env python3
"""index <type> <version> <tag> <katalog z plikami>  -> index/<type>.json
   build <katalog wyjściowy>                        -> manifest.json z index/*.json"""
import datetime, glob, json, os, re, sys

ROLE_SUFFIX = [  # (sufiks env, klucz roli w manifeście, typ wydania)
    ("_companion_radio_ble", "companion_ble", "companion"),
    ("_companion_radio_usb", "companion_usb", "companion"),
    ("_room_server", "room_server", "room-server"),
    ("_repeater", "repeater", "repeater"),
]
FILE_RE = re.compile(r"^(?P<env>.+?)-(?P<ver>v\d+\.\d+\.\d+-sf6)-(?P<sha>[0-9a-f]{6,})(?P<merged>-merged)?\.(?P<ext>bin|uf2|zip|hex)$")
WORDS = {"heltec": "Heltec", "lilygo": "LilyGo", "xiao": "Xiao", "rak": "RAK", "wio": "Wio",
         "thinknode": "ThinkNode", "seeed": "Seeed", "tbeam": "T-Beam", "tdeck": "T-Deck",
         "techo": "T-Echo", "station": "Station", "without": "bez", "display": "ekranu", "sx1262": "SX1262",
         "sx1276": "SX1276", "lr1110": "LR1110", "v2": "V2", "v3": "V3", "v4": "V4", "esp32": "ESP32"}

def pretty(dev_id, names):
    if dev_id in names:
        return names[dev_id]
    return " ".join(WORDS.get(w.lower(), w) for w in dev_id.split("_") if w)

def split_env(env):
    low = env.lower()
    for suf, role, _ in ROLE_SUFFIX:
        if low.endswith(suf):
            return env[: -len(suf)], role
    return None, None

def cmd_index(t, version, tag, src):
    files = {}
    for p in sorted(os.listdir(src)):
        m = FILE_RE.match(p)
        if not m:
            continue
        dev, role = split_env(m["env"])
        if not dev:
            continue
        e = files.setdefault(m["env"], {"device": dev, "role": role, "files": {}})
        key = "merged" if m["merged"] else m["ext"]
        e["files"][key] = f"firmware/{t}/{version}/{p}"
    os.makedirs("index", exist_ok=True)
    data = {"type": t, "version": version, "upstream": tag,
            "built": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "targets": files}
    json.dump(data, open(f"index/{t}.json", "w"), indent=1, ensure_ascii=False)
    print(f"index/{t}.json: {len(files)} płytek")

def platform_of(f):
    if "merged" in f: return "esp32"
    if "zip" in f: return "nrf52"
    if "uf2" in f: return "rp2040"
    if "hex" in f: return "stm32"
    return "esp32"

def entry(platform, f):
    if platform == "esp32": return {"update": f.get("bin"), "full": f.get("merged")}
    if platform == "nrf52": return {"uf2": f.get("uf2"), "zip": f.get("zip")}
    if platform == "rp2040": return {"uf2": f.get("uf2"), "bin": f.get("bin")}
    return {"bin": f.get("bin"), "hex": f.get("hex")}

def cmd_build(outdir):
    names = json.load(open("names.json", encoding="utf-8")) if os.path.exists("names.json") else {}
    roles, devices = {}, {}
    for p in sorted(glob.glob("index/*.json")):
        idx = json.load(open(p, encoding="utf-8"))
        for _, role, typ in ROLE_SUFFIX:
            if typ == idx["type"]:
                roles[role] = {"version": idx["version"] + "-sf6", "upstream": idx["upstream"], "built": idx["built"]}
        for env, t in idx["targets"].items():
            did = t["device"].lower()
            plat = platform_of(t["files"])
            d = devices.setdefault(did, {"id": did, "name": pretty(t["device"], names), "platform": plat, "firmware": {}})
            d["firmware"][t["role"]] = {k: v for k, v in entry(plat, t["files"]).items() if v}
    vers = sorted({r["version"] for r in roles.values()})
    manifest = {"version": vers[-1] if vers else "", "upstream": "meshcore-dev/MeshCore",
                "built": max((r["built"] for r in roles.values()), default=""),
                "roles": roles, "devices": sorted(devices.values(), key=lambda d: d["name"].lower())}
    os.makedirs(outdir, exist_ok=True)
    json.dump(manifest, open(os.path.join(outdir, "manifest.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"manifest.json: {len(devices)} urządzeń, role: {', '.join(roles)}")

if __name__ == "__main__":
    if sys.argv[1] == "index":
        cmd_index(*sys.argv[2:6])
    else:
        cmd_build(sys.argv[2])
