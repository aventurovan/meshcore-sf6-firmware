#!/usr/bin/env python3
"""Sprawdza najnowsze oficjalne tagi MeshCore i planuje buildy.
Wynik (GITHUB_OUTPUT): builds = lista wersji do zbudowania,
chunks = macierz zadań (paczki płytek)."""
import json, os, re, shlex, subprocess, sys, urllib.request

UPSTREAM = "https://github.com/meshcore-dev/MeshCore.git"
repo = os.environ.get("GITHUB_REPOSITORY", "")
token = os.environ.get("GH_TOKEN", "")
force = os.environ.get("FORCE", "false") == "true"
only = os.environ.get("ONLY", "").split()
test_targets = os.environ.get("TEST_TARGETS", "").split()

conf = {}
for line in open("sf6/sf6.conf", encoding="utf-8"):
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        conf[k.strip()] = " ".join(shlex.split(v, comments=True))
types = only or conf.get("TYPES", "repeater companion").split()
chunk_size = int(conf.get("CHUNK_SIZE", "12") or 12)

def sh(*a, **kw):
    return subprocess.run(a, check=True, text=True, capture_output=True, **kw).stdout

def release_exists(tag):
    if not repo:
        return False
    req = urllib.request.Request(f"https://api.github.com/repos/{repo}/releases/tags/{tag}",
                                 headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"})
    try:
        urllib.request.urlopen(req)
        return True
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return False
        raise

refs = sh("git", "ls-remote", "--tags", UPSTREAM)
builds, chunks = [], []
for t in types:
    best = None
    for line in refs.splitlines():
        sha, ref = line.split("\t")
        m = re.fullmatch(rf"refs/tags/{re.escape(t)}-v(\d+)\.(\d+)\.(\d+)", ref)
        if m:
            ver = tuple(map(int, m.groups()))
            if best is None or ver > best[0]:
                best = (ver, ref.rsplit("/", 1)[1])
    if not best:
        print(f"::warning::brak oficjalnych tagów dla {t}")
        continue
    tag = best[1]
    version = "v" + ".".join(map(str, best[0]))
    our_tag = f"sf6-{t}-{version}"
    if not test_targets and not force and release_exists(our_tag):
        print(f"{t}: {version} już zbudowany ({our_tag})")
        continue
    print(f"{t}: buduję {version} z {tag}")
    d = f"mc-{t}"
    sh("git", "clone", "-q", "--depth", "1", "--branch", tag, UPSTREAM, d)
    # wczesna kontrola poprawki – błąd tutaj zatrzymuje cały workflow
    subprocess.run([sys.executable, "sf6/scripts/apply-sf6.py", "sf6/sf6.conf", d], check=True)
    envs = sh("bash", "build.sh", f"get-{t}-firmwares-to-build", cwd=d).split()
    if test_targets:
        envs = [e for e in envs if e in test_targets]
        if not envs:
            continue
    builds.append({"type": t, "tag": tag, "version": version, "count": len(envs)})
    for i in range(0, len(envs), chunk_size):
        chunks.append({"type": t, "tag": tag, "version": version,
                       "idx": i // chunk_size, "envs": " ".join(envs[i:i + chunk_size])})

print(f"Do zbudowania: {sum(b['count'] for b in builds)} płytek w {len(chunks)} zadaniach")
out = os.environ.get("GITHUB_OUTPUT")
if out:
    with open(out, "a") as f:
        f.write(f"builds={json.dumps(builds)}\n")
        f.write(f"chunks={json.dumps(chunks)}\n")
        f.write(f"any={'true' if chunks else 'false'}\n")
