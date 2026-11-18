#!/bin/bash
# Test logiki filtra na komputerze (bez płytki): ./run.sh [katalog MeshCore]
set -e
cd "$(dirname "$0")"
MC=${1:-mc}
[ -d "$MC" ] || git clone -q --depth 1 --branch companion-v1.18.0 https://github.com/meshcore-dev/MeshCore "$MC"
[ -d crypto ] || git clone -q --depth 1 https://github.com/rweather/arduinolibs crypto
C=crypto/libraries/Crypto; M=$MC/src
g++ -std=c++17 -O1 -g -fsanitize=address,undefined -w -DSF6_FILTER -Istub -I.. -I$M -I$C test.cpp ../SF6Filter.cpp \
  $M/Utils.cpp $M/Packet.cpp $M/helpers/AdvertDataHelpers.cpp \
  $C/SHA256.cpp $C/AES128.cpp $C/AESCommon.cpp $C/BlockCipher.cpp $C/Crypto.cpp $C/Hash.cpp -o filtertest
./filtertest
