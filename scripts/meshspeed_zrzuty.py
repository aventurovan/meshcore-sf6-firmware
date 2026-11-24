#!/usr/bin/env python3
"""Zrzuty ekranów MeshSpeed do instrukcji na stronie (strona/meshspeed-instrukcja.php).

Uruchamia aplikację z repo aventurovan/meshspeed (katalog www/) z atrapą radia z tego repo (tests/mock-ble.js)
i robi zrzuty kolejnych ekranów w rozmiarze telefonu. Nazwy węzłów w atrapie podmieniane na przykładowe polskie.

  python3 scripts/meshspeed_zrzuty.py --ms ../meshspeed --out strona/assets/msi [--offline]

Bez --offline mapy (OpenStreetMap), teren (Terrarium) i pomiary Mappera SF6 (tylko odczyt) są prawdziwe – tak działa
workflow „Zrzuty do instrukcji” w (prywatnym) repo aventurovan/meshspeed: pobiera ten skrypt i wgrywa wynik do meshspeed/instrukcja/. Wysyłka do bazy Mappera jest zawsze przechwytywana (nic nie trafia do bazy).
"""
import argparse, json, os, re, subprocess, sys, tempfile, time, traceback
from playwright.sync_api import sync_playwright
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('--ms', required=True, help='katalog repo meshspeed')
ap.add_argument('--out', required=True, help='katalog na zrzuty (.webp)')
ap.add_argument('--offline', action='store_true', help='bez map, terenu i bazy Mappera (do prób lokalnych)')
ap.add_argument('--only', default='', help='tylko te zrzuty (nazwy po przecinku)')
a = ap.parse_args()
MS, OUT = os.path.abspath(a.ms), os.path.abspath(a.out)
os.makedirs(OUT, exist_ok=True)
ONLY = set(filter(None, a.only.split(',')))

# --- atrapa radia z przykładowymi nazwami ---
mock = open(os.path.join(MS, 'tests', 'mock-ble.js'), encoding='utf-8').read()
RPT = ['RPT Szyndzielnia', 'RPT Magurka', 'RPT Czupel', 'RPT Rysianka', 'RPT Hala Lipowska', 'RPT Babia Góra', 'RPT Pilsko', 'RPT Barania',
       'RPT Stożek', 'RPT Równica', 'RPT Wisła Centrum', 'RPT Żywiec Grojec', 'RPT Kozy', 'RPT Wadowice', 'RPT Andrychów', 'RPT Kęty',
       'RPT Oświęcim', 'RPT Tychy', 'RPT Katowice', 'RPT Pszczyna', 'RPT Cieszyn', 'RPT Ustroń', 'RPT Brenna', 'RPT Szczyrk']
NICK = ['Marek_BB', 'Sylwia', 'Tomek SQ9', 'Ania_Kozy', 'Kuba_mobile', 'Paweł_auto', 'Gosia', 'Darek_T1000', 'Michał_Żywiec', 'Ola',
        'Krzysiek_SF6', 'Bartek', 'Ewa_Wisła', 'Rafał_Cieszyn', 'Piotr_XIAO', 'Zosia', 'Adam_RAK', 'Łukasz', 'Kamil_TEcho', 'Marta']
mock = mock.replace("name: (i % 5 === 0 ? 'RPT ' : 'Node ') + i",
                    "name: (i % 5 === 0 ? " + json.dumps(RPT) + "[(i / 5) % " + str(len(RPT)) + "] + (i >= 120 ? ' ' + i : '') : "
                    + json.dumps(NICK) + "[i % " + str(len(NICK)) + "] + (i >= 40 ? '_' + i : ''))")
# pozycje węzłów rozrzucone po Południu (w atrapie leżą w równej siatce)
mock = mock.replace("contacts.forEach((c, i) => { c.lat = 49.6 + (i % 13) * 0.03; c.lon = 18.7 + (i % 7) * 0.06; });",
                    "contacts.forEach((c, i) => { const r = (n) => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); }; c.lat = 49.45 + r(1) * 0.75; c.lon = 18.65 + r(2) * 1.35; });")
# konsola radia: kilka odpowiedzi więcej niż w atrapie
mock = mock.replace("else if (c === 'ver') r = 'v1.18.0 (Build: test)';",
                    "else if (c === 'ver') r = 'v1.18.0-sf6 (Build: 20-Nov-2026)'; else if (c === 'get radio') r = '> 869.618,62.5,6,8'; else if (c === 'get name') r = '> Pawlo_Bielsko';")
mock = mock.replace("'Cześć, tu Node 1'", "'Cześć! Jadę na Klimczok, będę na nasłuchu.'")
mock = mock.replace("Wojtek: Test @[Pawlo_Bielsko] słyszysz?", "Wojtek: Test z Czupla @[Pawlo_Bielsko] słyszysz?")
# atrapy wtyczki USB, DFU przez Bluetooth i esptool – z testu aplikacji (tests/test_fwusb.py)
TESTMOCK = ''
try:
    TESTMOCK = re.search(r"MOCK = r'''(.*?)'''", open(os.path.join(MS, 'tests', 'test_fwusb.py'), encoding='utf-8').read(), re.S)[1]
except Exception as e:
    print('brak atrapy USB/DFU w testach:', e)
tmp = tempfile.mkdtemp()
MOCK = os.path.join(tmp, 'mock.js')
open(MOCK, 'w', encoding='utf-8').write(mock)

PORT = 8791
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', os.path.join(MS, 'www')], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
TERR = open(os.path.join(MS, 'tests', 'terrarium.png'), 'rb').read()
now = int(time.time())

# przykładowe pomiary (tylko --offline): kilka kratek wokół Bielska
def fake_points():
    import random
    random.seed(3); P = []; SK, KL = '7c02444b52596067', 'aa11bb22cc33dd44'
    for i in range(160):
        lat, lon = 49.80 + random.uniform(0, .12), 18.95 + random.uniform(0, .16)
        r = random.random()
        rpt = None if r < .2 else (SK if r < .65 else KL)
        snr = None if rpt is None else round(random.uniform(-12, 10), 1)
        P.append([i + 1, now - random.randint(60, 86400 * 20), lat, lon, rpt, snr, None if snr is None else snr - 2, None if snr is None else -100 + snr, 1 + i % 4, 6, None, 22])
    return P

def mapper_api(route):
    req = route.request; url = req.url
    act = (re.search(r'action=([a-z_]+)', url) or [None, ''])[1]
    if act in ('challenge', 'login'):
        body = {'ok': True, 'challenge': 'abc'} if act == 'challenge' else {'ok': True, 'token': 'T', 'exp': now + 86400 * 30, 'role': 'user', 'nick': 'Pawlo_Bielsko', 'uid': 1}
        return route.fulfill(status=200, content_type='application/json', body=json.dumps(body))
    if req.method != 'GET':   # pingi i inne zapisy – nigdy do prawdziwej bazy
        return route.fulfill(status=200, content_type='application/json', body='{"ok":true}')
    if not a.offline:
        return route.continue_()
    if act == 'points':
        P = fake_points(); s = int((re.search(r'since=(\d+)', url) or [0, '0'])[1])
        return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'points': [p for p in P if p[0] > s], 'last': len(P), 'more': False}))
    body = {'config': {'ok': True, 'preset': {'name': 'SF6', 'freq_khz': 869618, 'bw_hz': 62500, 'sf': 6, 'path_bytes': 2}, 'car': []},
            'repeaters': {'ok': True, 'repeaters': [{'id': '7c02444b52596067', 'name': 'Repeater Skrzyczne', 'lat': 49.6845, 'lon': 19.0303},
                                                     {'id': 'aa11bb22cc33dd44', 'name': 'RPT Klimczok', 'lat': 49.7397, 'lon': 19.0103}]}}.get(act, {'ok': True})
    route.fulfill(status=200, content_type='application/json', body=json.dumps(body))

done, failed = [], []
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, locale='pl-PL', timezone_id='Europe/Warsaw',
                            geolocation={'latitude': 49.8222, 'longitude': 19.0446}, permissions=['geolocation'])
        ctx.add_init_script(path=MOCK)
        ctx.add_init_script("try { localStorage.setItem('ms.mapperOn', '1') } catch (e) {}")
        ctx.route('**/mapper/api.php*', mapper_api)
        if TESTMOCK: ctx.add_init_script(TESTMOCK)
        # flasher: lista płytek i pliki – atrapy (zrzuty nie pobierają prawdziwego firmware)
        import hashlib, io, zipfile
        def mkzip(files):
            bb = io.BytesIO()
            with zipfile.ZipFile(bb, 'w', zipfile.ZIP_DEFLATED) as z:
                for n, d in files.items(): z.writestr(n, d)
            return bb.getvalue()
        DAT6 = bytes([0xff] * 8 + [1, 0, 0xB6, 0, 0x12, 0x34])
        FZIP = mkzip({'manifest.json': '{"manifest":{"application":{"bin_file":"fw.bin","dat_file":"fw.dat"}}}', 'fw.bin': bytes(range(256)) * 200, 'fw.dat': DAT6})
        BZIP = mkzip({'manifest.json': '{"manifest":{"softdevice_bootloader":{"bin_file":"sd_bl.bin","dat_file":"sd_bl.dat","sd_size":3000,"bl_size":1096}}}', 'sd_bl.bin': bytes(4096), 'sd_bl.dat': DAT6})
        FSHA, BSHA = hashlib.sha256(FZIP).hexdigest(), hashlib.sha256(BZIP).hexdigest()
        FMAN = {'version': 'v1.18.0-sf6', 'roles': {'repeater': {'version': 'v1.18.0-sf6'}}, 'devices': [
            {'id': 'rak_4631', 'name': 'RAK 4631 (WisBlock)', 'platform': 'nrf52', 'firmware': {'repeater': {'zip': 'firmware/repeater/rak.zip', 'zip_sha256': FSHA}}},
            {'id': 'xiao_nrf52', 'name': 'Seeed Xiao nRF52840', 'platform': 'nrf52', 'firmware': {'repeater': {'zip': 'firmware/repeater/xiao.zip', 'zip_sha256': FSHA}}},
            {'id': 'heltec_t114', 'name': 'Heltec T114', 'platform': 'nrf52', 'firmware': {'repeater': {'zip': 'firmware/repeater/t114.zip', 'zip_sha256': FSHA}}},
            {'id': 'heltec_v3', 'name': 'Heltec V3', 'platform': 'esp32', 'firmware': {'repeater': {'update': 'firmware/repeater/heltec.bin', 'full': 'firmware/repeater/heltec-merged.bin'}}},
            {'id': 'heltec_v4', 'name': 'Heltec V4', 'platform': 'esp32', 'firmware': {'repeater': {'update': 'firmware/repeater/heltec4.bin', 'full': 'firmware/repeater/heltec4-merged.bin'}}},
            {'id': 'pico_w', 'name': 'Raspberry Pi Pico W', 'platform': 'rp2040', 'firmware': {'repeater': {'uf2': 'firmware/repeater/pico.uf2'}}}]}
        FOTX = {'version': '0.9.2-OTAFIX2.3-BP1.4', 'boards': {'wiscore_rak4631_board': {'zip': 'otafix/bl-rak.zip', 'zip_sha256': BSHA, 'sd': '6.1.1'},
                                                             'xiao_board': {'zip': 'otafix/bl-xiao.zip', 'zip_sha256': BSHA, 'sd': '7.3.0'}},
                'devices': {'rak_4631': 'wiscore_rak4631_board', 'xiao_nrf52': 'xiao_board'}}
        HCORS = {'access-control-allow-origin': '*'}
        ctx.route('https://meshcoresouth.pl/flasher/manifest.json', lambda r: r.fulfill(body=json.dumps(FMAN), content_type='application/json', headers=HCORS))
        ctx.route('https://meshcoresouth.pl/flasher/otafix.json', lambda r: r.fulfill(body=json.dumps(FOTX), content_type='application/json', headers=HCORS))
        def ffiles(r):
            u = r.request.url
            r.fulfill(body=BZIP if '/otafix/' in u else FZIP if u.endswith('.zip') else bytes(range(256)) * 40, content_type='application/octet-stream', headers=HCORS)
        ctx.route('https://meshcoresouth.pl/flasher/firmware/**', ffiles); ctx.route('https://meshcoresouth.pl/flasher/otafix/**', ffiles)
        if a.offline:
            ctx.route('**/tile.openstreetmap.org/**', lambda r: r.abort())
            ctx.route('**/elevation-tiles-prod/**', lambda r: r.fulfill(status=200, content_type='image/png', body=TERR, headers={'Access-Control-Allow-Origin': '*'}))
        pg = ctx.new_page(); err = []
        pg.on('pageerror', lambda e: err.append(str(e))); pg.on('dialog', lambda d: d.accept())
        W = pg.wait_for_timeout
        T = lambda s: pg.inner_text(s)

        def shot(name, full=False):
            if ONLY and name not in ONLY: return
            png = os.path.join(tmp, name + '.png'); pg.screenshot(path=png, full_page=full)
            im = Image.open(png).convert('RGB'); im = im.resize((585, round(im.height * 585 / im.width)), Image.LANCZOS)
            im.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=80, method=6)
            done.append(name); print('zrzut', name)

        def back():
            pg.click('.screen:not([hidden]) [data-go=back]'); W(400)

        def tab(t):
            pg.click(f'#tabs [data-go={t}]'); W(700)

        def step(name, fn):
            try: fn()
            except Exception as e:
                failed.append(name); print('BŁĄD', name, e); traceback.print_exc(limit=1)
                try: pg.keyboard.press('Escape'); pg.evaluate("document.getElementById('sheetBg') && document.getElementById('sheetBg').click()")
                except Exception: pass

        pg.goto(f'http://localhost:{PORT}/index.html'); pg.wait_for_selector('.dev'); W(800)
        step('polacz', lambda: shot('polacz'))
        pg.click('#devList .dev >> nth=0'); W(5500)

        # ---------- Pulpit ----------
        step('pulpit', lambda: shot('pulpit'))
        def dostosuj():
            pg.click('#scr-pulpit [data-go=dostosuj]'); W(800); shot('pulpit-dostosuj'); back()
        step('pulpit-dostosuj', dostosuj)
        def oradiu():
            pg.click('#ringBatt'); W(2500); shot('o-radiu'); back()
        step('o-radiu', oradiu)

        # ---------- Czaty ----------
        def czaty():
            tab('czaty'); shot('czaty')
            pg.click('#convList [data-conv="ch:11223344556677889900aabbccddeeff"]'); W(800)
            pg.fill('#msgInput', 'Słyszę Cię dobrze, SNR 6 dB 👍') if pg.is_visible('#msgInput') else None
            pg.press('#msgInput', 'Enter') if pg.is_visible('#msgInput') else None
            W(2500); shot('rozmowa')
            m = '#msgList .msg:not(.mine)[data-mid] >> nth=-1' if pg.locator('#msgList .msg:not(.mine)[data-mid]').count() else '#msgList .msg[data-mid] >> nth=-1'
            pg.click(m, delay=800); W(900); shot('wiadomosc-opcje')
            pg.keyboard.press('Escape'); pg.evaluate("document.getElementById('sheetBg') && document.getElementById('sheetBg').click()"); W(300)
            back()
        step('czaty', czaty)

        # ---------- Węzły ----------
        def wezly():
            tab('wezly'); shot('wezly')
            pg.click('#nodeList [data-cm] >> nth=2'); W(600); shot('wezel-menu')
            pg.evaluate("document.getElementById('sheetBg').click()"); W(300)
            pg.click('[data-v=map]'); W(2500); shot('wezly-mapa')
            pg.click('[data-v=list]') if pg.is_visible('[data-v=list]') else None
        step('wezly', wezly)

        # ---------- Narzędzia ----------
        def narz():
            tab('narzedzia'); shot('narzedzia')
            pg.click('[data-tool=discovery]'); W(400); pg.click('#discBtn'); W(4500); shot('discovery'); back()
            pg.click('[data-tool=trace]'); W(400); pg.fill('#trSearch', 'Szyn'); W(300); pg.click('#trPick [data-add] >> nth=0'); W(200); pg.click('#trBtn'); W(3500); shot('trace'); back()
            pg.click('[data-tool=widmo]'); W(5000); shot('widmo'); back()
            pg.click('[data-tool=obserwator]'); W(5000); shot('obserwator'); back()
        step('narzedzia', narz)

        def repeatery():
            tab('narzedzia'); pg.click('[data-tool=repeatery]'); W(500)
            pg.fill('#rlSearch', 'Skrzy'); W(300); pg.click('#rlAdd [data-rp] >> nth=0'); W(400)
            pg.fill('#rpPass', 'admin'); pg.click('#rpLoginBtn'); W(6000); shot('repeater')
            back(); W(300); pg.fill('#rlSearch', ''); W(300); shot('moje-repeatery'); back()
        step('repeatery', repeatery)

        def urzadzenia():
            tab('narzedzia'); pg.click('[data-tool=konsola]'); W(600)
            for c in ('ver', 'get radio'): pg.fill('#ksCmd', c); pg.click('#ksBtn'); W(1200)
            shot('konsola'); back()
            pg.click('[data-tool=kopia]'); W(800); shot('kopia'); back()
        step('urzadzenia', urzadzenia)

        def teren():
            tab('narzedzia'); pg.click('[data-tool=los]'); W(900)
            pg.fill('#losRpt', 'Skrzy'); W(300); pg.click('[data-losr] >> nth=0'); W(500)
            pg.fill('#losCoord', '49.8222, 19.0446'); pg.click('#losAdd'); W(5000); shot('los'); back()
            pg.click('[data-tool=zasieg]'); W(800)
            pg.fill('#zsCoord', '49.6845, 19.0303'); pg.click('#zsSet'); W(300)
            if pg.locator('#zsR').count(): pg.select_option('#zsR', '10')
            pg.click('#zsGo'); W(12000); shot('zasieg-los'); back()
            pg.click('[data-tool=cotu]'); W(900); pg.fill('#ctCoord', '49.8222, 19.0446'); pg.click('#ctSet'); W(5000); shot('co-tu-slychac'); back()
            pg.click('[data-tool=nowyrpt]'); W(900)
            if pg.locator('#nrR').count(): pg.select_option('#nrR', '30')
            pg.fill('#nrCoord', '49.7600, 19.0100'); pg.click('#nrSet'); W(14000); shot('nowy-repeater'); back()
        step('teren', teren)

        # ---------- Mapper ----------
        def mapper():
            tab('mapper'); W(5000); shot('mapper')
            pg.click('#mpStart'); W(5000); shot('mapper-live')
            if pg.is_visible('#mpStop'): pg.click('#mpStop'); W(800)
            pg.click('#mpSeg [data-mv=stat]'); W(3000); shot('mapper-statystyki')
            pg.click('#mpSeg [data-mv=map]') if pg.locator('#mpSeg [data-mv=map]').count() else None
            pg.click('#scr-mapper [data-go=ustmapper]'); W(600); shot('mapper-ustawienia'); back()
        step('mapper', mapper)

        # ---------- Ustawienia ----------
        def ustawienia():
            tab('pulpit'); pg.click('#scr-pulpit [data-go=ustawienia]'); W(600); shot('ustawienia')
            pg.click('#scr-ustawienia [data-go=radio]'); W(800); shot('radio'); back()
            pg.click('#scr-ustawienia [data-go=ustczaty]'); W(600); shot('ustawienia-czaty'); back()
            pg.click('#scr-ustawienia [data-go=wyglad]'); W(600); shot('wyglad'); back()
            tab('czaty'); pg.click('#scr-czaty [data-go=kanaly]'); W(800); shot('kanaly'); back()
        step('ustawienia', ustawienia)

        def zamknij():
            pg.keyboard.press('Escape'); pg.evaluate("document.getElementById('sheetBg') && document.getElementById('sheetBg').click()"); W(400)

        # ---------- Więcej: przytrzymanie rozmowy, Znajdź trasę, połączenia, tracker ----------
        def wiecej():
            tab('czaty')
            pg.dispatch_event('#convList [data-conv] >> nth=1', 'contextmenu'); W(700); shot('rozmowa-menu'); zamknij()
            tab('wezly'); pg.click('#nodeList [data-cm] >> nth=2'); W(600)
            pg.click('[data-ct=route]'); W(3500); shot('znajdz-trase'); zamknij()
            tab('narzedzia'); pg.click('[data-tool=zrzut]'); W(900); shot('zrzut-trackera'); back()
            tab('pulpit'); pg.click('#scr-pulpit [data-go=ustawienia]'); W(500)
            pg.click('#scr-ustawienia [data-go=polaczenia]'); W(800); shot('polaczenia'); back()
        step('wiecej', wiecej)

        # ---------- Kody QR i linki ----------
        def qr():
            tab('pulpit'); pg.click('#scr-pulpit [data-go=ustawienia]'); W(500)
            pg.click('#scr-ustawienia [data-go=ustinfo]'); W(600); pg.click('#uiShareMe'); W(900); shot('qr-moj-kontakt'); zamknij()
            tab('czaty'); pg.click('#scr-czaty [data-go=kanaly]'); W(800)
            pg.click('#khList [data-khmore] >> nth=-1'); W(600); shot('kanal-opcje')
            pg.click('[data-cha=share]'); W(900); shot('qr-kanal'); zamknij()
            pg.click('#cfgShare'); W(600); shot('udostepnij-konfiguracje')
            pg.click('#shGo'); W(900); shot('qr-konfiguracja'); zamknij(); back()
            pg.evaluate("import('./js/ui-setup.js').then(m => m.handleLink('meshcore://channel/add?name=Ekipa+Beskidy&secret=0123456789abcdef0123456789abcdef'))"); W(1200)
            shot('qr-dodaj-kanal'); zamknij()
        step('qr', qr)

        # ---------- Funkcje testowe ----------
        def testowe():
            tab('pulpit'); pg.click('#scr-pulpit [data-go=ustawienia]'); W(600)
            st = pg.locator('#stTest')
            if st.get_attribute('aria-checked') != 'true': st.click(); W(4500)
            pg.evaluate("document.getElementById('stTest').scrollIntoView({block: 'center'})"); W(1500); shot('funkcje-testowe'); back()
            tab('narzedzia'); pg.evaluate("document.querySelector('[data-tool=otafix]').scrollIntoView({block: 'center'})"); W(500); shot('narzedzia-testowe')
            # Wgraj firmware (USB)
            pg.click('[data-tool=fwusb]'); W(900); shot('fw-usb-plytki')
            pg.click('[data-fu-dev=rak_4631]'); W(400); pg.click('#fuDl'); W(1200); shot('fw-usb-pobrane')
            pg.click('#fuNext'); W(600); pg.click('#fuStart'); pg.wait_for_selector('#fuBody .banner.ok', timeout=60000); W(400)
            pg.evaluate("document.querySelector('#fuBody .banner.ok').scrollIntoView({block: 'center'})"); W(300); shot('fw-usb-gotowe'); back()
            # Bootloader OTAFIX
            tab('narzedzia'); pg.click('[data-tool=otafix]'); W(900)
            pg.select_option('#oxDev', 'rak_4631'); W(300)
            for i in range(3): pg.check(f'[data-ox-ok="{i}"]')
            W(300); shot('otafix')
            pg.click('#oxScan'); W(900); shot('otafix-wybor')
            pg.click('[data-ox-pick="0"]'); pg.wait_for_selector('#oxBody .banner.ok', timeout=20000); W(400); shot('otafix-gotowe'); back()
            # Aktualizacja firmware repeatera przez Bluetooth
            pg.evaluate("window.__mockCli = { board: '> RAK 4631', 'get bootloader.ver': '> 0.9.2-OTAFIX2.3-BP1.4', 'start ota': '> OK - mac: C0:FF:EE:00:11:22', ver: '> v1.17.1 (14 Aug 2026)' }")
            tab('narzedzia'); pg.click('[data-tool=repeatery]'); W(500); pg.fill('#rlSearch', ''); W(300)
            pg.click('#rlList [data-rp] >> nth=0'); W(4000)
            pg.click('[data-ra=fw]'); W(6000); pg.check('#fwOk1'); pg.check('#fwOk2'); W(300); shot('aktualizacja-rpt')
            pg.evaluate("window.__mockCli.ver = '> v1.18.0-sf6 (Build: 20 Nov 2026)'")
            pg.click('#fwStart'); W(16000); shot('aktualizacja-rpt-gotowe')
        step('testowe', testowe)

        print('BŁĘDY JS:', err[:5])
        b.close()
finally:
    srv.kill()
# ostatnie wersje z CHANGELOG.md → zmiany.json (sekcja „Co nowego” na stronie)
import html
def md(t):
    t = html.escape(t.strip(), quote=False)
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    return re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', t)
zm, cur = [], None
for line in open(os.path.join(MS, 'CHANGELOG.md'), encoding='utf-8'):
    m = re.match(r'#{2,3}\s+([\d.]+)\s*[—–-]\s*(.+)', line)
    if m:
        if len(zm) >= 25: break   # strona pokazuje z tego tylko duże wydania (X.Y.0)
        cur = {'wersja': m[1], 'tytul': m[2].strip(), 'punkty': []}; zm.append(cur); continue
    if cur is None: continue
    if line.startswith('- '): cur['punkty'].append(line[2:].rstrip())
    elif line.startswith('  ') and line.strip() and cur['punkty']: cur['punkty'][-1] += ' ' + line.strip()
for z in zm: z['punkty'] = [md(p) for p in z['punkty']]
json.dump(zm, open(os.path.join(OUT, 'zmiany.json'), 'w'), ensure_ascii=False, indent=1)
print(f'Zrzuty: {len(done)} | nieudane kroki: {failed}')
json.dump({'zrzuty': done, 'nieudane': failed, 'wersja': (re.search(r"VERSION = '([\d.]+)'", open(os.path.join(MS, 'www/js/app.js'), encoding='utf-8').read()) or [0, '?'])[1],
           'data': time.strftime('%Y-%m-%d')}, open(os.path.join(OUT, 'zrzuty.json'), 'w'), ensure_ascii=False, indent=1)
sys.exit(1 if failed and not ONLY else 0)
