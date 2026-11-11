#!/usr/bin/env python3
"""Proste FTP bez dodatkowych pakietów (zamiast lftp).
Dane logowania z env: FTP_HOST (opcjonalnie host:port), FTP_USER, FTP_PASSWORD.

  ftp_sync.py upload <katalog lokalny> <katalog zdalny> [--exclude GLOB]... [--last NAZWA]...
  ftp_sync.py ls <katalog zdalny>
  ftp_sync.py rmtree <katalog zdalny>
  ftp_sync.py rm <plik zdalny>
"""
import fnmatch, ftplib, os, posixpath, ssl, sys, threading
from concurrent.futures import ThreadPoolExecutor

HOST = os.environ["FTP_HOST"].strip()
USER = os.environ["FTP_USER"]
PASS = os.environ["FTP_PASSWORD"]
port = 21
if ":" in HOST:
    HOST, p = HOST.rsplit(":", 1)
    port = int(p)
for pre in ("ftp://", "ftps://"):
    if HOST.startswith(pre):
        HOST = HOST[len(pre):]

_tls_ok = None

def connect():
    global _tls_ok
    if _tls_ok is not False:
        try:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            f = ftplib.FTP_TLS(context=ctx, timeout=60)
            f.connect(HOST, port)
            f.login(USER, PASS)
            f.prot_p()
            if _tls_ok is None:
                f.nlst("/")  # test kanału danych (część serwerów wymaga ponownego użycia sesji TLS)
            _tls_ok = True
            return f
        except (ftplib.error_perm, ftplib.error_temp, ssl.SSLError, OSError, EOFError) as e:
            if _tls_ok is None:
                print(f"FTPS niedostępne ({e}), używam zwykłego FTP", file=sys.stderr)
            _tls_ok = False
    f = ftplib.FTP(timeout=60)
    f.connect(HOST, port)
    f.login(USER, PASS)
    return f

def norm(d):
    d = d.strip() or "/"
    return d if d.startswith("/") else "/" + d

_made, _lock = set(), threading.Lock()

def ensure_dir(ftp, d):
    parts = [p for p in d.split("/") if p]
    cur = ""
    for p in parts:
        cur += "/" + p
        with _lock:
            if cur in _made:
                continue
        try:
            ftp.mkd(cur)
        except ftplib.error_perm:
            pass
        with _lock:
            _made.add(cur)

def upload(local, remote, excludes, last):
    remote = norm(remote)
    files = []
    for root, _, names in os.walk(local):
        for n in names:
            lp = os.path.join(root, n)
            rel = os.path.relpath(lp, local).replace(os.sep, "/")
            if any(fnmatch.fnmatch(rel, g) or fnmatch.fnmatch(n, g) for g in excludes):
                continue
            files.append(rel)
    first = [f for f in files if posixpath.basename(f) not in last]
    final = [f for f in files if posixpath.basename(f) in last]
    print(f"Wgrywam {len(files)} plików do {remote}")
    local_ctx = threading.local()

    def put(rel):
        ftp = getattr(local_ctx, "ftp", None)
        if ftp is None:
            ftp = local_ctx.ftp = connect()
        target = posixpath.join(remote, rel)
        ensure_dir(ftp, posixpath.dirname(target))
        for attempt in range(3):
            try:
                with open(os.path.join(local, rel), "rb") as fh:
                    ftp.storbinary("STOR " + target, fh)
                return rel
            except (ftplib.error_temp, OSError, EOFError) as e:
                if attempt == 2:
                    raise RuntimeError(f"{rel}: {e}")
                try:
                    ftp.close()
                except Exception:
                    pass
                ftp = local_ctx.ftp = connect()

    done = 0
    with ThreadPoolExecutor(max_workers=4) as ex:
        for _ in ex.map(put, sorted(first)):
            done += 1
            if done % 50 == 0:
                print(f"  {done}/{len(files)}")
    ftp = connect()
    for rel in final:
        target = posixpath.join(remote, rel)
        ensure_dir(ftp, posixpath.dirname(target))
        with open(os.path.join(local, rel), "rb") as fh:
            ftp.storbinary("STOR " + target, fh)
        done += 1
    ftp.quit()
    print(f"Gotowe: {done} plików")

def listdir(ftp, d):
    try:
        return [posixpath.basename(n) for n in ftp.nlst(d) if posixpath.basename(n) not in (".", "..")]
    except ftplib.error_perm:
        return []

def rmtree(ftp, d):
    for name in listdir(ftp, d):
        p = posixpath.join(d, name)
        try:
            ftp.delete(p)
        except ftplib.error_perm:
            rmtree(ftp, p)
    try:
        ftp.rmd(d)
    except ftplib.error_perm as e:
        print(f"nie usunięto {d}: {e}")

if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "upload":
        args, ex, last = sys.argv[4:], [], []
        while args:
            k = args.pop(0)
            (ex if k == "--exclude" else last).append(args.pop(0))
        upload(sys.argv[2], sys.argv[3], ex, last)
    else:
        ftp = connect()
        if cmd == "ls":
            print("\n".join(listdir(ftp, norm(sys.argv[2]))))
        elif cmd == "rmtree":
            rmtree(ftp, norm(sys.argv[2]))
        elif cmd == "rm":
            try:
                ftp.delete(norm(sys.argv[2]))
            except ftplib.error_perm:
                pass
        ftp.quit()
