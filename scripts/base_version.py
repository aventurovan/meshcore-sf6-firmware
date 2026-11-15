"""Na którym oficjalnym wydaniu MeshCore jest oparty nasz firmware.
Czyta MESHCORE_REF z .github/workflows/build.yml repo (w commicie wydania), szuka tego commita
wśród tagów meshcore-dev/MeshCore (companion-vX.Y.Z), a gdy to nie tag – bierze FIRMWARE_VERSION
z pliku nagłówka i dopisuje skrót commita. Zwraca np. "v1.18.0" albo "v1.17.1 (a366955)" lub None."""
import base64, json, re, subprocess

MESHCORE = "https://github.com/meshcore-dev/MeshCore"

def _file(get, repo, path, ref):
    try:
        d = json.loads(get(f"https://api.github.com/repos/{repo}/contents/{path}?ref={ref}"))
        return base64.b64decode(d["content"]).decode("utf-8", "replace")
    except Exception as e:  # brak pliku albo API – wersja bazowa jest tylko informacją
        print(f"  (nie odczytano {path}: {e})")
        return ""

def _tags():
    try:
        out = subprocess.run(["git", "ls-remote", "--tags", MESHCORE], capture_output=True, text=True, timeout=60).stdout
    except Exception:
        return {}
    tags = {}
    for line in out.splitlines():
        sha, ref = line.split("\t")
        name = ref.removeprefix("refs/tags/").removesuffix("^{}")
        tags.setdefault(sha, set()).add(name)
    return tags

def base_version(get, repo, ref, header):
    wf = _file(get, repo, ".github/workflows/build.yml", ref)
    m = re.search(r"MESHCORE_REF:\s*([0-9a-f]{7,40})", wf)
    sha = m.group(1) if m else None
    if sha:
        names = next((v for k, v in _tags().items() if k.startswith(sha)), set())
        for n in sorted(names):
            t = re.fullmatch(r"companion-(v\d+\.\d+\.\d+)", n)
            if t:
                return t.group(1)
        c = re.search(r"companion-(v\d+\.\d+\.\d+)", wf[m.end(): wf.find("\n", m.end())])
        if c:
            return c.group(1)
    h = re.search(r'FIRMWARE_VERSION\s+"(v[\d.]+)"', _file(get, repo, header, ref))
    if h:
        return h.group(1) + (f" ({sha[:7]})" if sha else "")
    return None
