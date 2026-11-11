# MeshCore SF6 – firmware MeshCore Południe

Automatyczne buildy **oficjalnego MeshCore** ([meshcore-dev/MeshCore](https://github.com/meshcore-dev/MeshCore))
z domyślnymi ustawieniami sieci **MeshCore Południe SF6**. Kod firmware nie jest zmieniany –
podmieniane są wyłącznie wartości domyślne z pliku [`sf6.conf`](sf6.conf).

Flasher: https://meshcoresouth.pl/flasher.php

## Jak to działa

1. Raz dziennie (rano) workflow sprawdza najnowsze oficjalne tagi `repeater-v*`, `companion-v*`, `room-server-v*`.
2. Jeśli dla danej roli nie ma jeszcze wydania `sf6-<rola>-vX.Y.Z`, pobiera źródła z tego tagu,
   nakłada `sf6.conf` (`scripts/apply-sf6.py`) i buduje **wszystkie** płytki oficjalnym `build.sh`.
3. Publikuje wydanie na GitHubie, zapisuje `index/<rola>.json` i wgrywa pliki + `manifest.json` przez FTP na stronę.

Jeśli w nowej wersji MeshCore zmieni się fragment kodu z ustawieniami, `apply-sf6.py` zatrzyma build
z błędem – nic nie zostanie opublikowane z oficjalnymi wartościami.

## Ustawienia

Wszystko w `sf6.conf`. Po zmianie uruchom ręcznie **Actions → Firmware SF6 → Run workflow** z zaznaczonym
„Zbuduj ponownie”. Ustawienia działają przy **czystej instalacji**; aktualizacja zachowuje to, co już jest zapisane w urządzeniu.

Własne nazwy płytek we flasherze: `names.json`, np. `{ "Heltec_v3": "Heltec WiFi LoRa 32 V3" }`.

## Sekrety (Settings → Secrets and variables → Actions)

`FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`, `FTP_DIR` (katalog główny strony na FTP, np. `/`; pliki trafiają do `<FTP_DIR>/flasher/`).
Bez nich buildy i wydania działają, pomijane jest tylko wgrywanie na stronę.

## Strona meshcoresouth.pl (`strona/`)

Folder `strona/` to pełny kod strony. Każdy push zmieniający coś w `strona/` uruchamia **Wgraj stronę**:
lint PHP i wgranie przez FTP do katalogu głównego strony (`FTP_DIR`). Na serwerze nic nie jest kasowane,
pliki `.md` nie są wgrywane. Opis projektu: `strona/PRZEKAZANIE.md`.
