#!/usr/bin/env python3
"""Kontrola strony i firmware: strony PHP, skrypty flashera, manifest, każdy plik firmware,
zgodność z indeksem w repo i porównanie z oficjalnym wydaniem MeshCore."""
import json, os, re, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor

SITE = os.environ.get("SITE", "https://meshcoresouth.pl").rstrip("/")
TOKEN = os.environ.get("GH_TOKEN", "")
errors, warnings, summary = [], [], []

def req(url, method="GET", headers=None):
    r = urllib.request.Request(url, method=method, headers={"User-Agent": "sf6-check", **(headers or {})})
    with urllib.request.urlopen(r, timeout=30) as resp:
        return resp.status, resp.headers, (resp.read() if method == "GET" else b"")

def gh(path):
    return json.loads(req("https://api.github.com" + path, headers={"Authorization": f"Bearer {TOKEN}"})[2])

# 1. strony i zasoby
for path in ["/", "/flasher.php", "/instrukcja.php", "/meshspeed.php", "/mapper-sf6.php", "/statystyki.php", "/assets/style.css", "/assets/flasher.js",
             "/assets/nrf-dfu.js", "/assets/rpt-map.js",
             "/assets/nrf52-erase-s140v6.bin", "/assets/nrf52-erase-s140v7.bin"]:
    try:
        st, _, body = req(SITE + path)
        txt = body.decode("utf-8", "replace")
        bad = re.search(r"(Fatal error|Parse error|Warning:|Notice:|Deprecated:)[^<]{0,120}", txt) if path.endswith((".php", "/")) else None
        if bad:
            errors.append(f"{path}: błąd PHP w treści: {bad.group(0)}")
        else:
            summary.append(f"OK {path} ({len(body)} B)")
    except Exception as e:
        errors.append(f"{path}: {e}")

# 2. manifest + wszystkie pliki firmware
man = None
try:
    man = json.loads(req(SITE + "/flasher/manifest.json?nocache=1")[2])
except Exception as e:
    errors.append(f"/flasher/manifest.json: {e}")

if man:
    files, roles = [], {}
    for d in man["devices"]:
        for role, fw in d["firmware"].items():
            roles[role] = roles.get(role, 0) + 1
            for k, p in fw.items():
                files.append((d["id"], role, k, p))
        if d["platform"] == "esp32" and any(not fw.get("update") or not fw.get("full") for fw in d["firmware"].values()):
            warnings.append(f"{d['id']}: ESP32 bez pliku .bin lub merged")
        if d["platform"] == "nrf52" and any(not fw.get("zip") for fw in d["firmware"].values()):
            warnings.append(f"{d['id']}: nRF52 bez .zip (nie da się wgrać przez przeglądarkę)")
    summary.append(f"Manifest: {len(man['devices'])} urządzeń, role: " + ", ".join(f"{r} {n}" for r, n in sorted(roles.items())))

    def head(item):
        did, role, k, p = item
        url = f"{SITE}/flasher/{p}"
        try:
            st, h, _ = req(url, method="HEAD")
            if int(h.get("Content-Length") or 0) > 0:
                return None
            # brak długości w nagłówku – sprawdzamy faktyczną zawartość
            st, h, body = req(url)
            return None if len(body) > 0 else f"{p}: pusty plik (0 B)"
        except Exception as e:
            return f"{p}: {e}"
    with ThreadPoolExecutor(16) as ex:
        bad = [r for r in ex.map(head, files) if r]
    summary.append(f"Pliki firmware: {len(files) - len(bad)}/{len(files)} dostępnych")
    errors += bad[:30]
    if len(bad) > 30:
        errors.append(f"… i {len(bad) - 30} kolejnych brakujących plików")

    # 3. zgodność z indeksem w repo
    ROLES_OF = {"repeater": ["repeater"], "companion": ["companion_ble", "companion_usb"],
                "companion-mapper": ["companion_mapper"]}
    on_site = {r: v["version"] for r, v in man.get("roles", {}).items()}
    for t, rs in ROLES_OF.items():
        try:
            idx = json.load(open(f"index/{t}.json", encoding="utf-8"))
        except FileNotFoundError:
            continue
        want = idx.get("display_version") or idx["version"] + "-sf6"
        for r in rs:
            if r in on_site and on_site[r] != want:
                errors.append(f"{r}: na stronie {on_site[r]}, w repo {want}")
            elif r not in on_site and r != "companion_usb":
                errors.append(f"{r}: brak na stronie (w repo {want})")

    if "room_server" in on_site:
        errors.append("room_server nadal jest w manifeście (Room Server miał zostać usunięty)")

    # 4. porównanie z oficjalnym wydaniem
    if TOKEN:
        def envs(assets):
            out = set()
            for n in assets:
                m = re.match(r"^(.+?)-v\d+\.\d+\.\d+(?:-sf6)?-[0-9a-f]+(?:-merged)?\.(bin|uf2|zip|hex)$", n)
                if m: out.add(m.group(1))
            return out
        for t in ("repeater", "companion"):
            try:
                idx = json.load(open(f"index/{t}.json", encoding="utf-8"))
                off = gh(f"/repos/meshcore-dev/MeshCore/releases/tags/{idx['upstream']}")
                official = envs(a["name"] for a in off.get("assets", []))
                ours = set(idx["targets"])
                missing = sorted(official - ours)
                extra = sorted(ours - official)
                summary.append(f"{t} {idx['version']}: nasze {len(ours)}, oficjalne {len(official)}")
                if missing:
                    errors.append(f"{t}: brakuje płytek, które oficjalnie istnieją: {', '.join(missing)}")
                if extra:
                    summary.append(f"  {t}: mamy dodatkowo (oficjalnie się nie zbudowały): {', '.join(extra)}")
            except Exception as e:
                warnings.append(f"{t}: nie udało się porównać z oficjalnym wydaniem: {e}")

for w in warnings: print(f"::warning::{w}")
for e in errors: print(f"::error::{e}")
enc = lambda lines: "%0A".join(l.replace("%", "%25") for l in lines)
print("::notice title=Podsumowanie::" + enc(summary))
if errors: print(f"::error title=Wszystkie błędy ({len(errors)})::" + enc(errors))
report = "\n".join(["## Kontrola strony i firmware", "", *[f"- {s}" for s in summary],
                    *([""] + ["**Błędy:**"] + [f"- {e}" for e in errors] if errors else ["", "**Bez błędów.**"]),
                    *([""] + ["Ostrzeżenia:"] + [f"- {w}" for w in warnings] if warnings else [])])
print(report)
if os.environ.get("GITHUB_STEP_SUMMARY"):
    open(os.environ["GITHUB_STEP_SUMMARY"], "a").write(report + "\n")
sys.exit(1 if errors else 0)
