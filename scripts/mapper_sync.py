#!/usr/bin/env python3
"""Pobiera nasz firmware Companion + Mapper SF6 (repo meshcore-sf6-mapper-firmware, wydanie latest-build)
i przygotowuje go dla flashera: site/firmware/companion-mapper/<wersja>/ + index/companion-mapper.json.
Wynik w GITHUB_OUTPUT: changed=true/false, version=<wersja>."""
import datetime, json, os, re, urllib.request

REPO = "aventurovan/meshcore-sf6-mapper-firmware"
TAG = "latest-build"
# plik w wydaniu -> urządzenie w manifeście (te same id co oficjalne buildy, żeby trafiły do tej samej płytki)
DEVICES = {"WioTrackerL1": "WioTrackerL1", "T-Echo": "LilyGo_T-Echo"}
token = os.environ.get("GH_TOKEN", "")
force = os.environ.get("FORCE", "false") == "true"

def get(url, accept="application/vnd.github+json"):
    r = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}", "Accept": accept, "User-Agent": "sf6"})
    with urllib.request.urlopen(r, timeout=120) as resp:
        return resp.read()

rel = json.loads(get(f"https://api.github.com/repos/{REPO}/releases/tags/{TAG}"))
pat = re.compile(r"^Companion-SF6Mapper-(WioTrackerL1|T-Echo)-(\d+\.\d+\.\d+)(-ota)?\.(uf2|zip)$")
found, version = {}, None
for a in rel["assets"]:
    m = pat.match(a["name"])
    if not m:
        continue  # m.in. wersja „bez-ekranu” i tracker – nie trafiają do flashera
    dev, ver, _, ext = m.groups()
    version = version or ver
    if ver != version:
        raise SystemExit(f"::error::różne wersje plików w {TAG}: {ver} i {version}")
    found.setdefault(dev, {})[ext] = a

idx_path = "index/companion-mapper.json"
old = json.load(open(idx_path)) if os.path.exists(idx_path) else {}
changed = force or old.get("version") != version
missing = [d for d in DEVICES if not {"uf2", "zip"} <= set(found.get(d, {}))]
if missing:
    raise SystemExit(f"::error::w wydaniu {TAG} brakuje plików dla: {', '.join(missing)}")
print(f"Mapper firmware {version} (na stronie: {old.get('version', 'brak')})" + (" – aktualizuję" if changed else " – bez zmian"))

if changed:
    out = f"site/firmware/companion-mapper/{version}"
    os.makedirs(out, exist_ok=True)
    targets = {}
    for dev, files in found.items():
        entry = {"device": DEVICES[dev], "role": "companion_mapper", "files": {}}
        for ext, a in files.items():
            data = get(a["url"], accept="application/octet-stream")
            open(os.path.join(out, a["name"]), "wb").write(data)
            entry["files"][ext] = f"firmware/companion-mapper/{version}/{a['name']}"
            print(f"  {a['name']}: {len(data)} B")
        targets[f"{DEVICES[dev]}_companion_mapper"] = entry
    os.makedirs("index", exist_ok=True)
    json.dump({"type": "companion-mapper", "version": version, "display_version": f"Mapper {version}",
               "upstream": "repo meshcore-sf6-mapper-firmware",
               "built": rel.get("published_at") or datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
               "targets": targets}, open(idx_path, "w"), indent=1, ensure_ascii=False)

if os.environ.get("GITHUB_OUTPUT"):
    with open(os.environ["GITHUB_OUTPUT"], "a") as f:
        f.write(f"changed={'true' if changed else 'false'}\nversion={version}\n")
