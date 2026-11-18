# Repeater SF6 + filtr

Oficjalny repeater MeshCore z ustawieniami SF6 i dodanym filtrem nadawców. Filtr **nie przekazuje dalej** pakietów
od zablokowanych botów i companionów. Sam repeater nadal je odbiera (logowanie admina działa jak zwykle).

Budowany automatycznie razem ze zwykłym repeaterem (typ `repeater-filtr` w `sf6.conf`, flaga `-D SF6_FILTER=1`),
we flasherze jako **Repeater + filtr**. Zwykły repeater nie zawiera filtra.

## Co filtr widzi

| Pakiet | Po czym blokuje |
|---|---|
| Advert | pełny klucz publiczny i nazwa nadawcy |
| Wiadomość na kanale Public i dodanych #kanałach | nick nadawcy (z odszyfrowanej treści „Nick: tekst”) |
| Zapytanie anonimowe (np. logowanie) | pełny klucz nadawcy |
| Wiadomość prywatna, zapytanie, odpowiedź, ścieżka | 1 bajt klucza nadawcy — tylko po `filter priv on` |

Prywatnych kanałów (z własnym kluczem) filtr nie odczyta, więc nie zablokuje w nich nicka.
Gdy zablokowany kluczem nadawca wyśle advert, repeater zapamiętuje (do restartu) jego nazwę i blokuje ją też na kanałach.

## Komendy (CLI repeatera: zdalne logowanie admina albo USB)

| Komenda | Działanie |
|---|---|
| `filter` / `filter list [nr]` | stan i lista reguł (po kilka; `wiecej N` = następna strona od N) |
| `filter add name DX Bot` | blokuje nazwę (bez wielkości liter); `*bot*` zawiera, `bot*` zaczyna się, `*bot` kończy się |
| `filter add key a1b2c3d4` | blokuje klucz (początek klucza hex, 1–16 bajtów) |
| `filter del 2` | usuwa regułę nr 2 |
| `filter clear` | usuwa wszystkie reguły |
| `filter on` / `filter off` | włącza / wyłącza filtr (reguły zostają) |
| `filter chan` | kanały, które filtr odczytuje (Public zawsze) |
| `filter chan add #dx` / `filter chan del #dx` | dodaje / usuwa kanał hashtag (do 8) |
| `filter priv on` / `off` | filtr także dla wiadomości prywatnych (tylko 1 bajt klucza — możliwe przypadkowe blokady innych osób) |
| `filter stats` | ile pakietów zablokowano od startu |

Do 16 reguł. Ustawienia są zapisane w pliku `/sf6filter` w pamięci repeatera i przetrwają restart i aktualizację.

Test logiki na komputerze (bez płytki): `test/run.sh`.
