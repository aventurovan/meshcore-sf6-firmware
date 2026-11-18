#!/bin/bash
# Test blokady po kluczu na komputerze (bez płytki). Użycie: ./run.sh
set -e
cd "$(dirname "$0")"
[ -d mc ] || git clone -q --depth 1 --branch filter-v1.18.0-r4 https://github.com/jhuebert/MeshCore mc
[ -d crypto ] || git clone -q --depth 1 https://github.com/rweather/arduinolibs crypto
C=crypto/libraries/Crypto; M=mc/src; S=mc/examples/simple_repeater
g++ -std=c++17 -O1 -g -fsanitize=address,undefined -w -Istub -I../src -I$S -I$M -I$C test.cpp ../src/SF6KeyBlock.cpp \
  $M/Utils.cpp $M/Packet.cpp $M/helpers/AdvertDataHelpers.cpp \
  $C/SHA256.cpp $C/AES128.cpp $C/AESCommon.cpp $C/BlockCipher.cpp $C/Crypto.cpp $C/Hash.cpp -o keytest
./keytest
