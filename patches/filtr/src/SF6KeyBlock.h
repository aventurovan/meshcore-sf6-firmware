// SF6KeyBlock.h — MeshCore Południe SF6: blokada nadawców po kluczu publicznym (dodatek do forka z filtrem).
//
// Filtr forka (PacketFilter) dopasowuje m.in. kanał, nick i treść, ale nie klucz nadawcy. Ten moduł dokłada listę
// kluczy (początków kluczy publicznych), których pakiety repeater NIE przekazuje dalej:
//   - adverty (pełny klucz w pakiecie),
//   - zapytania anonimowe, np. logowanie (pełny klucz w pakiecie),
//   - wiadomości na odczytywanych kanałach (Public i kanały z `filter chan`), gdy nick nadawcy jest taki jak w
//     advercie zablokowanego klucza (nazwa zapamiętana z advertu, do restartu),
//   - opcjonalnie wiadomości prywatne / zapytania / ścieżki — tylko po 1 bajcie klucza (`filter key priv on`).
// Działa tylko przy włączonym filtrze (`filter on`). Komendy: `filter key …` (keyBlockCLI).
// Osobny plik /sf6keys — format konfiguracji forka zostaje nietknięty.
#pragma once

#include <Arduino.h>
#include <Mesh.h>
#include <helpers/IdentityStore.h>   // FILESYSTEM

#define SF6KB_MAX_KEYS     16
#define SF6KB_KEY_BYTES     8      // zapamiętujemy do 8 bajtów (16 znaków hex) — w praktyce jednoznaczne
#define SF6KB_NAME_LEN     32

class SF6KeyBlock {
public:
  struct Entry {
    uint8_t key[SF6KB_KEY_BYTES];
    uint8_t key_len;                   // 1..8
    char    name[SF6KB_NAME_LEN + 1];  // nazwa z ostatniego advertu (RAM, do restartu)
    uint32_t hits;                     // zablokowane pakiety (RAM)
  };

  SF6KeyBlock();
  void begin(FILESYSTEM* fs);
  /** true = nie przekazywać (adverty, zapytania anonimowe, opcjonalnie prywatne) */
  bool blocks(const mesh::Packet* pkt);
  /** odszyfrowana wiadomość kanału: true = nick to nazwa zablokowanego klucza */
  bool blocksGroupText(uint8_t type, const uint8_t* data, size_t len);
  void command(const char* args, char* reply);   // nie „cli”: na ESP32 cli() to makro (wyłączenie przerwań)

  int count() const { return n; }

private:
  FILESYSTEM* _fs;
  Entry e[SF6KB_MAX_KEYS];
  int n;
  bool priv;
  int match(const uint8_t* key, int len);   // indeks wpisu albo -1
  void load();
  void save();
};
