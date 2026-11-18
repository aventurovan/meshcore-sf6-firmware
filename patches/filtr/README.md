# Repeater SF6 + filtr — nasz fork

Podstawa: wydania forka [jhuebert/MeshCore](https://github.com/jhuebert/MeshCore/releases) (tagi `filter-v*`),
filtr pakietów opisany w ich `FILTER.md` (komendy CLI `filter …`).

Na to nakładamy:
1. ustawienia SF6 z `sf6.conf` (`scripts/apply-sf6.py` — ten sam skrypt co dla oficjalnego firmware),
2. nasze dodatki: pliki `*.patch` z tego katalogu (`git apply`, w kolejności nazw).

Build testowy: workflow **„Repeater z filtrem — build testowy”** (ręcznie, tylko artefakt do pobrania,
bez wydania i bez flashera). Do flashera trafi dopiero po testach i decyzji.
