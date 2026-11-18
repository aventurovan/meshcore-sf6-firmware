#include "SF6KeyBlock.h"
#include <helpers/AdvertDataHelpers.h>
using namespace mesh;
static int fails = 0;
#define CHECK(c) do { if (!(c)) { printf("FAIL %d %s\n", __LINE__, #c); fails++; } } while (0)
static Packet mk(uint8_t type) { Packet p; memset(&p, 0, sizeof(p)); p.header = type << PH_TYPE_SHIFT; return p; }
static Packet advert(uint8_t k0, const char* name) { Packet p = mk(PAYLOAD_TYPE_ADVERT); int i = 0;
  for (int j = 0; j < 32; j++) p.payload[i++] = k0 + j; i += 4 + 64; AdvertDataBuilder b(ADV_TYPE_CHAT, name);
  uint8_t app[MAX_ADVERT_DATA_SIZE]; int n = b.encodeTo(app); memcpy(&p.payload[i], app, n); p.payload_len = i + n; return p; }
static Packet anon(uint8_t k0) { Packet p = mk(PAYLOAD_TYPE_ANON_REQ); p.payload[0] = 0x55; for (int j = 0; j < 32; j++) p.payload[1 + j] = k0 + j; p.payload_len = 60; return p; }
static Packet dm(uint8_t src) { Packet p = mk(PAYLOAD_TYPE_TXT_MSG); p.payload[0] = 1; p.payload[1] = src; p.payload_len = 20; return p; }
static size_t grp(uint8_t* d, const char* t) { memset(d, 0, 5); strcpy((char*)d + 5, t); return 5 + strlen(t); }
int main() {
  MemFS fs; char r[200]; uint8_t d[200];
  SF6KeyBlock k; k.begin(&fs);
  Packet a = advert(0x20, "DX Bot"); CHECK(!k.blocks(&a));
  k.command(" add 2021", r); puts(r);
  k.command(" add 2021222324252627282930313233343536", r); puts(r);
  k.command(" add xyz", r); puts(r);
  k.command(" add 2021", r); puts(r);
  CHECK(k.blocks(&a));
  Packet b = advert(0x40, "Jan"); CHECK(!k.blocks(&b));
  Packet an = anon(0x20); CHECK(k.blocks(&an)); Packet an2 = anon(0x41); CHECK(!k.blocks(&an2));
  CHECK(k.blocksGroupText(PAYLOAD_TYPE_GRP_TXT, d, grp(d, "dx bot: 061C,86E7")));
  CHECK(!k.blocksGroupText(PAYLOAD_TYPE_GRP_TXT, d, grp(d, "Jan: DX Bot: x")));
  CHECK(!k.blocksGroupText(PAYLOAD_TYPE_GRP_DATA, d, grp(d, "DX Bot: x")));
  Packet m = dm(0x20); CHECK(!k.blocks(&m)); k.command(" priv on", r); puts(r); CHECK(k.blocks(&m)); Packet m2 = dm(0x21); CHECK(!k.blocks(&m2));
  k.command("", r); puts(r); k.command(" stats", r); puts(r);
  SF6KeyBlock g; g.begin(&fs); CHECK(g.count() == 2); CHECK(g.blocks(&m)); CHECK(g.blocks(&an));
  printf("plik:\n%s", fs.files["/sf6keys"].c_str());
  g.command(" del 0", r); puts(r); CHECK(g.count() == 1); CHECK(g.blocks(&an));   // drugi klucz też pasuje (2021…)
  g.command(" del 20212223242526", r); puts(r); g.command(" del 2021222324252627", r); puts(r); CHECK(g.count() == 0); CHECK(!g.blocks(&an));
  for (int i = 0; i < 18; i++) { char c[40]; sprintf(c, " add %02xa1b2c3d4e5f6a7", i); g.command(c, r); } puts(r);
  g.command(" list", r); printf("[%zu]\n%s\n", strlen(r), r); g.command(" list 7", r); printf("[%zu]\n%s\n", strlen(r), r);
  g.command(" bla", r); puts(r); g.command(" clear", r); puts(r); CHECK(g.count() == 0);
  printf(fails ? "BLEDY %d\n" : "WSZYSTKO OK\n", fails); return fails;
}
