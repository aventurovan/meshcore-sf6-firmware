#include "SF6Filter.h"
#include <helpers/AdvertDataHelpers.h>
#include <cassert>
#include <iostream>
using namespace mesh;
static int fails = 0;
#define CHECK(c) do { if (!(c)) { printf("FAIL %s:%d %s\n", __FILE__, __LINE__, #c); fails++; } } while (0)

static Packet advert(uint8_t k0, const char* name) {
  Packet p; memset(&p, 0, sizeof(p)); p.header = PAYLOAD_TYPE_ADVERT << PH_TYPE_SHIFT;
  int i = 0; for (int j = 0; j < 32; j++) p.payload[i++] = k0 + j; i += 4 + 64;
  AdvertDataBuilder b(ADV_TYPE_CHAT, name); uint8_t app[MAX_ADVERT_DATA_SIZE]; int n = b.encodeTo(app);
  memcpy(&p.payload[i], app, n); p.payload_len = i + n; return p;
}
static Packet chanMsg(const char* chan, const char* text) {
  SF6Filter::Chan c; SF6Filter::channelFromName(chan, c);
  uint8_t plain[180]; memset(plain, 0, 4); plain[4] = 0; int n = 5 + strlen(text); memcpy(plain + 5, text, strlen(text));
  Packet p; memset(&p, 0, sizeof(p)); p.header = PAYLOAD_TYPE_GRP_TXT << PH_TYPE_SHIFT;
  p.payload[0] = c.hash; int el = Utils::encryptThenMAC(c.secret, &p.payload[1], plain, n); p.payload_len = 1 + el; return p;
}
static Packet anon(uint8_t k0) { Packet p; memset(&p, 0, sizeof(p)); p.header = PAYLOAD_TYPE_ANON_REQ << PH_TYPE_SHIFT;
  p.payload[0] = 0x55; for (int j = 0; j < 32; j++) p.payload[1 + j] = k0 + j; p.payload_len = 1 + 32 + 20; return p; }
static Packet dmsg(uint8_t src) { Packet p; memset(&p, 0, sizeof(p)); p.header = PAYLOAD_TYPE_TXT_MSG << PH_TYPE_SHIFT;
  p.payload[0] = 0x33; p.payload[1] = src; p.payload_len = 2 + 18; return p; }

int main() {
  MemFS fs; char r[200];
  SF6Filter f; f.begin(&fs);
  // pusty filtr nic nie blokuje
  Packet a1 = advert(0x10, "DX Bot"); CHECK(!f.blocks(&a1));
  Packet pub = chanMsg("public", "DX Bot: hello"); CHECK(!f.blocks(&pub));
  // nazwa
  f.handleCommand(" add name dx bot", r); puts(r);
  CHECK(f.blocks(&a1));
  CHECK(f.blocks(&pub));
  Packet pub2 = chanMsg("public", "Jan: DX Bot: cytat"); CHECK(!f.blocks(&pub2));
  Packet dxc = chanMsg("#dx", "DX Bot: 061C"); CHECK(!f.blocks(&dxc));       // kanał nieznany
  f.handleCommand(" chan add #DX", r); puts(r);
  CHECK(f.blocks(&dxc));
  // klucz + poznana nazwa
  f.handleCommand(" add key 20212223", r); puts(r);
  Packet a2 = advert(0x20, "Spamer");
  Packet sp = chanMsg("#dx", "Spamer: kup"); CHECK(!f.blocks(&sp));          // jeszcze nie poznany
  CHECK(f.blocks(&a2));                                                        // advert po kluczu
  CHECK(f.blocks(&sp));                                                        // teraz nazwa poznana
  Packet an = anon(0x20); CHECK(f.blocks(&an)); Packet an2 = anon(0x40); CHECK(!f.blocks(&an2));
  Packet d = dmsg(0x20); CHECK(!f.blocks(&d));                                 // priv wyłączone
  f.handleCommand(" priv on", r); CHECK(f.blocks(&d)); Packet d2 = dmsg(0x21); CHECK(!f.blocks(&d2));
  // wzorce
  CHECK(SF6Filter::nameMatches("*bot*", "My BOT 1")); CHECK(SF6Filter::nameMatches("bot*", "Bot_x"));
  CHECK(!SF6Filter::nameMatches("bot*", "xbot")); CHECK(SF6Filter::nameMatches("*bot", "xBot")); CHECK(!SF6Filter::nameMatches("bot", "bots"));
  f.handleCommand(" add name *bot*", r); f.handleCommand(" add name *bot*", r); puts(r);
  f.handleCommand("", r); puts(r);
  f.handleCommand(" stats", r); puts(r);
  f.handleCommand(" chan", r); puts(r);
  // zapis i odczyt
  SF6Filter g; g.begin(&fs); CHECK(g.numRules() == 3); CHECK(g.blocks(&dxc)); CHECK(g.blocks(&d));
  printf("plik:\n%s", fs.files["/sf6filter"].c_str());
  // usuwanie, wyłączenie
  g.handleCommand(" del 1", r); puts(r); CHECK(g.blocks(&pub)); /* nadal *bot* */ Packet jan = chanMsg("public", "Jan: hej"); CHECK(!g.blocks(&jan)); CHECK(g.numRules() == 2);
  g.handleCommand(" off", r); Packet a3 = advert(0x20, "x"); CHECK(!g.blocks(&a3));
  g.handleCommand(" on", r); CHECK(g.blocks(&a3));
  // za długi klucz, zły hex, dużo reguł -> stronicowanie listy
  g.handleCommand(" add key 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", r); puts(r);
  g.handleCommand(" add key xyz", r); puts(r); g.handleCommand(" add key abc", r); puts(r);
  for (int i = 0; i < 20; i++) { char c[64]; sprintf(c, " add name uzytkownik-o-dlugiej-nazwie-%02d", i); g.handleCommand(c, r); }
  puts(r); g.handleCommand(" list", r); printf("[%zu] %s\n", strlen(r), r); g.handleCommand(" list 7", r); printf("[%zu] %s\n", strlen(r), r);
  g.handleCommand(" help", r); printf("[%zu] %s\n", strlen(r), r);
  g.handleCommand(" clear", r); puts(r); CHECK(g.numRules() == 0); CHECK(!g.blocks(&a3));
  printf(fails ? "BLEDY: %d\n" : "WSZYSTKO OK\n", fails); return fails != 0;
}
