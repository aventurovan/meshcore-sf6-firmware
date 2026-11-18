#pragma once
// MeshCore Południe SF6 — filtr repeatera: nie przekazuje dalej pakietów od zablokowanych nadawców (bot, companion).
// Reguły: prefiks klucza publicznego albo nazwa (nick). Działa na:
//   - adverty (pełny klucz i nazwa w pakiecie),
//   - wiadomości na kanałach o znanym kluczu (Public + dodane #kanały) — nick nadawcy z odszyfrowanej treści,
//   - anonimowe zapytania (pełny klucz nadawcy, np. logowanie),
//   - opcjonalnie wiadomości prywatne (tylko 1 bajt klucza nadawcy — możliwe przypadkowe trafienia, domyślnie wyłączone).
// Pakiety nadal są odbierane przez sam repeater (np. logowanie admina) — filtr dotyczy wyłącznie przekazywania dalej.
#include <Arduino.h>
#include <Mesh.h>
#include <helpers/IdentityStore.h>   // FILESYSTEM

#define SF6F_MAX_RULES   16
#define SF6F_MAX_CHANS    8    // dodatkowe #kanały (Public jest zawsze)
#define SF6F_MAX_LEARN   16    // klucze/nazwy poznane z advertów pasujących do reguł (tylko w RAM)
#define SF6F_TEXT_LEN    32

class SF6Filter {
public:
  struct Rule  { uint8_t kind; uint8_t key_len; uint8_t key[PUB_KEY_SIZE]; char text[SF6F_TEXT_LEN + 1]; };   // kind: 'K' / 'N'
  struct Chan  { char name[SF6F_TEXT_LEN + 1]; uint8_t secret[PUB_KEY_SIZE]; uint8_t hash; };
  struct Learn { uint8_t key[PUB_KEY_SIZE]; char name[SF6F_TEXT_LEN + 1]; };

  SF6Filter();
  void begin(FILESYSTEM* fs);
  /** true = nie przekazywać pakietu dalej */
  bool blocks(const mesh::Packet* pkt);
  /** komenda po słowie "filter" (np. " add name DX Bot"); odpowiedź do reply (max ~150 znaków) */
  void handleCommand(const char* args, char* reply);

  // do testów
  int numRules() const { return n_rules; }
  static bool nameMatches(const char* pattern, const char* name);
  static void channelFromName(const char* name, Chan& c);

private:
  FILESYSTEM* _fs;
  bool enabled, dm;
  Rule rules[SF6F_MAX_RULES]; int n_rules;
  Chan chans[SF6F_MAX_CHANS + 1]; int n_chans;     // [0] = Public
  Learn learned[SF6F_MAX_LEARN]; int n_learned, learn_next;
  uint32_t st_adv, st_chan, st_anon, st_dm;

  bool keyBlocked(const uint8_t* key, int len);    // pełny klucz albo jego początek (len bajtów)
  bool nameBlocked(const char* name);
  void learn(const uint8_t* key, const char* name);
  bool chanSenderBlocked(const mesh::Packet* pkt);
  void load();
  void save();
  void addChan(const char* name);
  void listReply(int start, char* reply);
};
