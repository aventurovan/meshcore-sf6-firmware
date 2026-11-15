#!/usr/bin/env python3
"""Pobiera nasz firmware MeshSpeed dla ThinkNode M9 (repo thinknode-m9-sf6, wydanie latest-build)
i przygotowuje go dla flashera: site/firmware/meshspeed-m9/<wersja>/ + index/meshspeed.json.
Wynik w GITHUB_OUTPUT: changed=true/false, version=<wersja>."""
import datetime, json, os, re, urllib.request
from base_version import base_version

REPO = "aventurovan/thinknode-m9-sf6"
TAG = "latest-build"
DEVICE = "ThinkNode_M9"
token = os.environ.get("GH_TOKEN", "")
force = os.environ.get("FORCE", "false") == "true"

def get(url, accept="application/vnd.github+json"):
    h = {"Accept": accept, "User-Agent": "sf6"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=120) as resp:
        return resp.read()

rel = json.loads(get(f"https://api.github.com/repos/{REPO}/releases/tags/{TAG}"))
pat = re.compile(r"^MC-SF6-ThinkNode-M9-(\d+\.\d+\.\d+)-(pelny|aktualizacja)\.bin$")
found, version = {}, None
for a in rel["assets"]:
    m = pat.match(a["name"])
    if not m:
        continue  # wersja.txt, mapa-testowa.zip – nie trafiają do flashera
    ver, kind = m.groups()
    version = version or ver
    if ver != version:
        raise SystemExit(f"::error::różne wersje plików w {TAG}: {ver} i {version}")
    found[kind] = a
if set(found) != {"pelny", "aktualizacja"}:
    raise SystemExit(f"::error::w wydaniu {TAG} brakuje pliku pelny lub aktualizacja (są: {', '.join(found) or 'brak'})")

idx_path = "index/meshspeed.json"
old = json.load(open(idx_path)) if os.path.exists(idx_path) else {}
base = base_version(get, REPO, TAG, "m9_sf6/companion/MyMesh.h") or old.get("base")  # gdy API zawiedzie, zostaje poprzednia; oficjalne wydanie MeshCore, na którym oparty jest build
print(f"Oparty na MeshCore: {base or 'nieznane'}")
changed = force or old.get("version") != version or old.get("base") != base
print(f"MeshSpeed M9 {version} (na stronie: {old.get('version', 'brak')})" + (" – aktualizuję" if changed else " – bez zmian"))

if changed:
    out = f"site/firmware/meshspeed-m9/{version}"
    os.makedirs(out, exist_ok=True)
    files = {}
    for kind, key in (("pelny", "merged"), ("aktualizacja", "bin")):
        a = found[kind]
        data = get(a["url"], accept="application/octet-stream")
        if len(data) < 100_000 or (kind == "pelny" and data[0] != 0xE9):
            raise SystemExit(f"::error::{a['name']}: podejrzany plik ({len(data)} B)")
        open(os.path.join(out, a["name"]), "wb").write(data)
        files[key] = f"firmware/meshspeed-m9/{version}/{a['name']}"
        print(f"  {a['name']}: {len(data)} B")
    os.makedirs("index", exist_ok=True)
    json.dump({"type": "meshspeed", "version": version, "display_version": f"MeshSpeed {version}",
               "upstream": "repo thinknode-m9-sf6", "base": base,
               "built": max([x.get("updated_at") or "" for x in list(found.values())] + [""]) or datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),  # data plików, nie wydania (wydanie latest-build jest stare)
               # reset_ota: przy aktualizacji bez kasowania flasher czyści otadata (0xe000), żeby po aktualizacji
               # przez WiFi (aplikacja w app1) urządzenie uruchomiło nową wersję z app0
               "targets": {f"{DEVICE}_companion_meshspeed": {"device": DEVICE, "role": "companion_meshspeed",
                                                            "reset_ota": True, "files": files}}},
              open(idx_path, "w"), indent=1, ensure_ascii=False)

if os.environ.get("GITHUB_OUTPUT"):
    with open(os.environ["GITHUB_OUTPUT"], "a") as f:
        f.write(f"changed={'true' if changed else 'false'}\nversion={version}\n")
