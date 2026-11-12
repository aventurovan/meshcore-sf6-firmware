# nRF52 – program kasujący pamięć

Używany przez flasher (opcja „Najpierw wyczyść całą pamięć urządzenia”). Wgrywany przez bootloader
(serial DFU), kasuje z RAM cały obszar od początku aplikacji do bootloadera: kod, ExtraFS i InternalFS
(klucze, kontakty, ustawienia – także po Meshtasticu). SoftDevice, MBR i bootloader zostają.
Na koniec ustawia GPREGRET=0x57 i restartuje do trybu DFU, a flasher wgrywa MeshCore SF6.

- `nrf52-erase-s140v6.bin` – płytki z SoftDevice S140 6.x (aplikacja od 0x26000, np. RAK4631, T114, T-Echo)
- `nrf52-erase-s140v7.bin` – płytki z S140 7.x (aplikacja od 0x27000, np. T1000-E, Wio Tracker L1, Xiao nRF52)

Flasher wybiera wersję na podstawie `softdevice_req` z paczki .zip danej płytki.
Przebudowa: `sh build.sh` (arm-none-eabi-gcc), potem skopiuj oba pliki .bin do `strona/assets/`.
