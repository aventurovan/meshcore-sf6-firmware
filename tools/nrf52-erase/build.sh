#!/bin/sh
# Buduje obrazy kasujące dla S140 v6 (aplikacja od 0x26000) i v7 (od 0x27000).
# Wymaga: arm-none-eabi-gcc (apt install gcc-arm-none-eabi)
set -e
cd "$(dirname "$0")"
for v in 26000:s140v6 27000:s140v7; do
  addr=0x${v%%:*}; name=${v##*:}
  sed "s/@APP_START@/$addr/" erase.ld.in > erase-$name.ld
  arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -Os -nostdlib -ffreestanding -fno-common \
    -Wall -Wextra -T erase-$name.ld erase.c -o erase-$name.elf
  arm-none-eabi-objcopy -O binary erase-$name.elf nrf52-erase-$name.bin
  rm erase-$name.ld
  echo "nrf52-erase-$name.bin: $(wc -c < nrf52-erase-$name.bin) B"
done
