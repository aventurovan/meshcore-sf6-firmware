#ifdef SF6_FILTER   // budowane tylko w wariancie „Repeater SF6 + filtr”
#include "SF6Filter.h"
#include <Utils.h>
#include <helpers/AdvertDataHelpers.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>

#define SF6F_FILE   "/sf6filter"
#define REPLY_MAX   150

// klucz kanału Public (izOH6cXN6mrJ5e26oRXNcg==)
static const uint8_t PUBLIC_KEY[16] = { 0x8b, 0x33, 0x87, 0xe9, 0xc5, 0xcd, 0xea, 0x6a,
                                        0xc9, 0xe5, 0xed, 0xba, 0xa1, 0x15, 0xcd, 0x72 };

static char lc(char c) { return (c >= 'A' && c <= 'Z') ? c + 32 : c; }

static void copyTrim(char* dest, const char* src, int max) {
  while (*src == ' ') src++;
  int n = 0;
  while (src[n] && src[n] != '\r' && src[n] != '\n' && n < max) { dest[n] = src[n]; n++; }
  while (n > 0 && dest[n - 1] == ' ') n--;
  dest[n] = 0;
}

static bool ieq(const char* a, const char* b, int n) {
  for (int i = 0; i < n; i++) if (lc(a[i]) != lc(b[i])) return false;
  return true;
}

static bool startsWord(const char* s, const char* w) {   // s zaczyna się od słowa w (koniec albo spacja po nim)
  int n = strlen(w);
  return strncmp(s, w, n) == 0 && (s[n] == 0 || s[n] == ' ');
}

static const char* skipWord(const char* s) {
  while (*s && *s != ' ') s++;
  while (*s == ' ') s++;
  return s;
}

SF6Filter::SF6Filter() : _fs(NULL), enabled(true), dm(false), n_rules(0), n_chans(0), n_learned(0), learn_next(0),
                         st_adv(0), st_chan(0), st_anon(0), st_dm(0) {
  memset(rules, 0, sizeof(rules));
  memset(learned, 0, sizeof(learned));
  channelFromName("public", chans[0]);
  strcpy(chans[0].name, "Public");
  n_chans = 1;
}

/* ---------- dopasowania ---------- */

bool SF6Filter::nameMatches(const char* pattern, const char* name) {
  if (!pattern[0] || !name[0]) return false;
  int pl = strlen(pattern), nl = strlen(name);
  bool star_l = pattern[0] == '*', star_r = pl > 1 && pattern[pl - 1] == '*';
  const char* core = pattern + (star_l ? 1 : 0);
  int cl = pl - (star_l ? 1 : 0) - (star_r ? 1 : 0);
  if (cl <= 0) return false;
  if (star_l && star_r) {                       // *tekst*  — zawiera
    for (int i = 0; i + cl <= nl; i++) if (ieq(name + i, core, cl)) return true;
    return false;
  }
  if (star_r) return nl >= cl && ieq(name, core, cl);                 // tekst*  — zaczyna się od
  if (star_l) return nl >= cl && ieq(name + nl - cl, core, cl);       // *tekst  — kończy się na
  return nl == cl && ieq(name, core, cl);                             // dokładnie (bez wielkości liter)
}

bool SF6Filter::keyBlocked(const uint8_t* key, int len) {
  for (int i = 0; i < n_rules; i++) {
    if (rules[i].kind != 'K') continue;
    int n = rules[i].key_len < len ? rules[i].key_len : len;
    if (n > 0 && memcmp(rules[i].key, key, n) == 0) return true;
  }
  for (int i = 0; i < n_learned; i++) {
    if (memcmp(learned[i].key, key, len > PUB_KEY_SIZE ? PUB_KEY_SIZE : len) == 0) return true;
  }
  return false;
}

bool SF6Filter::nameBlocked(const char* name) {
  if (!name || !name[0]) return false;
  for (int i = 0; i < n_rules; i++) {
    if (rules[i].kind == 'N' && nameMatches(rules[i].text, name)) return true;
  }
  for (int i = 0; i < n_learned; i++) {    // nazwy poznane z advertów zablokowanych kluczy
    int nl = strlen(learned[i].name);
    if (nl && (int)strlen(name) == nl && ieq(learned[i].name, name, nl)) return true;
  }
  return false;
}

void SF6Filter::learn(const uint8_t* key, const char* name) {
  for (int i = 0; i < n_learned; i++) {
    if (memcmp(learned[i].key, key, PUB_KEY_SIZE) == 0) { copyTrim(learned[i].name, name, SF6F_TEXT_LEN); return; }
  }
  Learn& l = learned[learn_next];
  memcpy(l.key, key, PUB_KEY_SIZE);
  copyTrim(l.name, name, SF6F_TEXT_LEN);
  learn_next = (learn_next + 1) % SF6F_MAX_LEARN;
  if (n_learned < SF6F_MAX_LEARN) n_learned++;
}

void SF6Filter::channelFromName(const char* name, Chan& c) {
  memset(&c, 0, sizeof(c));
  char low[SF6F_TEXT_LEN + 1];
  int n = 0;
  for (; name[n] && n < SF6F_TEXT_LEN; n++) low[n] = lc(name[n]);
  low[n] = 0;
  if (strcmp(low, "public") == 0) {
    memcpy(c.secret, PUBLIC_KEY, 16);
  } else {
    uint8_t h[32];
    mesh::Utils::sha256(h, 32, (const uint8_t*)low, n);     // klucz kanału z nazwy: SHA-256("#nazwa"), 16 bajtów
    memcpy(c.secret, h, 16);
  }
  uint8_t ch;
  mesh::Utils::sha256(&ch, 1, c.secret, 16);
  c.hash = ch;
  strcpy(c.name, low);
}

bool SF6Filter::chanSenderBlocked(const mesh::Packet* pkt) {
  int len = pkt->payload_len;
  if (len < 1 + CIPHER_MAC_SIZE + CIPHER_BLOCK_SIZE) return false;
  uint8_t data[MAX_PACKET_PAYLOAD + 1];
  for (int c = 0; c < n_chans; c++) {
    if (chans[c].hash != pkt->payload[0]) continue;
    int n = mesh::Utils::MACThenDecrypt(chans[c].secret, data, &pkt->payload[1], len - 1);
    if (n < 6) continue;                       // inny kanał z tym samym 1-bajtowym hashem
    if ((data[4] >> 2) != 0) return false;     // nie zwykły tekst
    data[n] = 0;
    const char* text = (const char*)&data[5];
    const char* sep = strstr(text, ": ");
    if (!sep) return false;
    char name[SF6F_TEXT_LEN + 1];
    int nl = sep - text; if (nl > SF6F_TEXT_LEN) nl = SF6F_TEXT_LEN;
    memcpy(name, text, nl); name[nl] = 0;
    return nameBlocked(name);
  }
  return false;
}

bool SF6Filter::blocks(const mesh::Packet* pkt) {
  if (!enabled || n_rules == 0) return false;
  const uint8_t* p = pkt->payload;
  int len = pkt->payload_len;
  switch (pkt->getPayloadType()) {
    case PAYLOAD_TYPE_ADVERT: {
      int off = PUB_KEY_SIZE + 4 + SIGNATURE_SIZE;
      if (len < off) return false;
      int app_len = len - off; if (app_len > MAX_ADVERT_DATA_SIZE) app_len = MAX_ADVERT_DATA_SIZE;
      AdvertDataParser parser(&p[off], app_len);
      const char* name = parser.hasName() ? parser.getName() : "";
      if (keyBlocked(p, PUB_KEY_SIZE) || nameBlocked(name)) {
        learn(p, name);
        st_adv++;
        return true;
      }
      return false;
    }
    case PAYLOAD_TYPE_ANON_REQ:
      if (len >= PATH_HASH_SIZE + PUB_KEY_SIZE && keyBlocked(&p[PATH_HASH_SIZE], PUB_KEY_SIZE)) { st_anon++; return true; }
      return false;
    case PAYLOAD_TYPE_GRP_TXT:
      if (chanSenderBlocked(pkt)) { st_chan++; return true; }
      return false;
    case PAYLOAD_TYPE_TXT_MSG:
    case PAYLOAD_TYPE_REQ:
    case PAYLOAD_TYPE_RESPONSE:
    case PAYLOAD_TYPE_PATH:
      if (dm && len >= 2 * PATH_HASH_SIZE && keyBlocked(&p[PATH_HASH_SIZE], PATH_HASH_SIZE)) { st_dm++; return true; }
      return false;
    default:
      return false;
  }
}

/* ---------- zapis / odczyt ---------- */

static File openWriteF(FILESYSTEM* fs, const char* filename) {
#if defined(NRF52_PLATFORM) || defined(STM32_PLATFORM)
  fs->remove(filename);
  return fs->open(filename, FILE_O_WRITE);
#elif defined(RP2040_PLATFORM)
  return fs->open(filename, "w");
#else
  return fs->open(filename, "w", true);
#endif
}

void SF6Filter::begin(FILESYSTEM* fs) {
  _fs = fs;
  load();
}

void SF6Filter::addChan(const char* name) {
  if (n_chans >= SF6F_MAX_CHANS + 1) return;
  channelFromName(name, chans[n_chans++]);
}

void SF6Filter::load() {
  if (!_fs || !_fs->exists(SF6F_FILE)) return;
#if defined(RP2040_PLATFORM)
  File f = _fs->open(SF6F_FILE, "r");
#else
  File f = _fs->open(SF6F_FILE);
#endif
  if (!f) return;
  static char buf[1600];
  int n = f.read((uint8_t*)buf, sizeof(buf) - 1);
  f.close();
  if (n <= 0) return;
  buf[n] = 0;
  n_rules = 0; n_chans = 1;
  char* line = buf;
  while (line && *line) {
    char* nl = strchr(line, '\n');
    if (nl) *nl = 0;
    if (line[0] == 'E') enabled = line[1] == '1';
    else if (line[0] == 'M') dm = line[1] == '1';
    else if (line[0] == 'C' && line[1] == ' ') addChan(line + 2);
    else if ((line[0] == 'K' || line[0] == 'N') && line[1] == ' ' && n_rules < SF6F_MAX_RULES) {
      Rule& r = rules[n_rules];
      memset(&r, 0, sizeof(r));
      r.kind = line[0];
      copyTrim(r.text, line + 2, SF6F_TEXT_LEN);
      if (r.kind == 'K') {
        r.key_len = strlen(r.text) / 2;
        if (r.key_len >= 1 && r.key_len <= PUB_KEY_SIZE && mesh::Utils::fromHex(r.key, r.key_len, r.text)) n_rules++;
      } else if (r.text[0]) {
        n_rules++;
      }
    }
    line = nl ? nl + 1 : NULL;
  }
}

void SF6Filter::save() {
  if (!_fs) return;
  File f = openWriteF(_fs, SF6F_FILE);
  if (!f) return;
  char tmp[SF6F_TEXT_LEN + 8];
  f.write((const uint8_t*)(enabled ? "E1\n" : "E0\n"), 3);
  f.write((const uint8_t*)(dm ? "M1\n" : "M0\n"), 3);
  for (int i = 0; i < n_rules; i++) {
    int n = snprintf(tmp, sizeof(tmp), "%c %s\n", rules[i].kind, rules[i].text);
    f.write((const uint8_t*)tmp, n);
  }
  for (int i = 1; i < n_chans; i++) {
    int n = snprintf(tmp, sizeof(tmp), "C %s\n", chans[i].name);
    f.write((const uint8_t*)tmp, n);
  }
  f.close();
}

/* ---------- komendy ---------- */

void SF6Filter::listReply(int start, char* reply) {
  int len = sprintf(reply, "filter %s, priv %s, reguly %d", enabled ? "on" : "off", dm ? "on" : "off", n_rules);
  for (int i = start; i < n_rules; i++) {
    char item[SF6F_TEXT_LEN + 12];
    int il = snprintf(item, sizeof(item), "\n%d %c %s", i + 1, rules[i].kind, rules[i].text);
    if (len + il > REPLY_MAX - 10) { sprintf(reply + len, "\nwiecej %d", i + 1); return; }
    strcpy(reply + len, item); len += il;
  }
}

void SF6Filter::handleCommand(const char* args, char* reply) {
  while (*args == ' ') args++;
  if (!*args || startsWord(args, "list")) {
    int start = 0;
    if (startsWord(args, "list")) { const char* a = skipWord(args); if (*a) start = atoi(a) - 1; }
    if (start < 0) start = 0;
    listReply(start, reply);
  } else if (strcmp(args, "on") == 0 || strcmp(args, "off") == 0) {
    enabled = args[1] == 'n'; save();
    strcpy(reply, enabled ? "OK - filtr wlaczony" : "OK - filtr wylaczony");
  } else if (startsWord(args, "priv")) {
    const char* a = skipWord(args);
    if (strcmp(a, "on") == 0 || strcmp(a, "off") == 0) {
      dm = a[1] == 'n'; save();
      strcpy(reply, dm ? "OK - wiadomosci prywatne tez (1 bajt klucza, mozliwe przypadkowe blokady)" : "OK - wiadomosci prywatne bez filtra");
    } else {
      sprintf(reply, "priv %s", dm ? "on" : "off");
    }
  } else if (startsWord(args, "add")) {
    const char* a = skipWord(args);
    bool isKey = startsWord(a, "key"), isName = startsWord(a, "name");
    const char* v = skipWord(a);
    if ((!isKey && !isName) || !*v) { strcpy(reply, "Err - filter add key <hex> | filter add name <nazwa>"); return; }
    if (n_rules >= SF6F_MAX_RULES) { sprintf(reply, "Err - max %d regul", SF6F_MAX_RULES); return; }
    Rule r; memset(&r, 0, sizeof(r));
    r.kind = isKey ? 'K' : 'N';
    if (isKey) {
      char hex[2 * PUB_KEY_SIZE + 1];
      copyTrim(hex, v, 2 * PUB_KEY_SIZE);
      for (char* c = hex; *c; c++) *c = lc(*c);
      int hl = strlen(hex);
      if (hl > SF6F_TEXT_LEN) hl = SF6F_TEXT_LEN;      // 16 bajtów klucza wystarczy do jednoznacznego dopasowania
      hex[hl] = 0;
      r.key_len = hl / 2;
      if (hl % 2 || r.key_len < 1 || !mesh::Utils::fromHex(r.key, r.key_len, hex)) { strcpy(reply, "Err - klucz: parzysta liczba znakow hex (np. a1b2c3d4)"); return; }
      strcpy(r.text, hex);
    } else {
      copyTrim(r.text, v, SF6F_TEXT_LEN);
    }
    for (int i = 0; i < n_rules; i++) {
      if (rules[i].kind == r.kind && strlen(rules[i].text) == strlen(r.text) && ieq(rules[i].text, r.text, strlen(r.text))) {
        sprintf(reply, "OK - juz jest (%d)", i + 1); return;
      }
    }
    rules[n_rules++] = r;
    save();
    sprintf(reply, "OK - regula %d: %s %s", n_rules, isKey ? "klucz" : "nazwa", r.text);
  } else if (startsWord(args, "del")) {
    int i = atoi(skipWord(args)) - 1;
    if (i < 0 || i >= n_rules) { strcpy(reply, "Err - zly numer (filter list)"); return; }
    for (int j = i; j < n_rules - 1; j++) rules[j] = rules[j + 1];
    n_rules--;
    n_learned = 0; learn_next = 0;     // poznane klucze mogły pochodzić z usuniętej reguły
    save();
    sprintf(reply, "OK - usunieta, zostalo %d", n_rules);
  } else if (strcmp(args, "clear") == 0) {
    n_rules = 0; n_learned = 0; learn_next = 0;
    save();
    strcpy(reply, "OK - wszystkie reguly usuniete");
  } else if (startsWord(args, "chan")) {
    const char* a = skipWord(args);
    if (!*a || startsWord(a, "list")) {
      int len = sprintf(reply, "kanaly:");
      for (int i = 0; i < n_chans && len < REPLY_MAX - SF6F_TEXT_LEN; i++) len += sprintf(reply + len, " %s", chans[i].name);
    } else if (startsWord(a, "add") || startsWord(a, "del")) {
      bool add = a[0] == 'a';
      char name[SF6F_TEXT_LEN + 1];
      copyTrim(name, skipWord(a), SF6F_TEXT_LEN);
      for (char* c = name; *c; c++) *c = lc(*c);
      if (name[0] != '#' || !name[1]) { strcpy(reply, "Err - kanal z #, np. filter chan add #dx"); return; }
      int found = -1;
      for (int i = 1; i < n_chans; i++) if (strcmp(chans[i].name, name) == 0) found = i;
      if (add) {
        if (found > 0) { strcpy(reply, "OK - juz jest"); return; }
        if (n_chans >= SF6F_MAX_CHANS + 1) { sprintf(reply, "Err - max %d kanalow", SF6F_MAX_CHANS); return; }
        addChan(name); save();
        sprintf(reply, "OK - kanal %s", name);
      } else {
        if (found < 0) { strcpy(reply, "Err - nie ma takiego kanalu"); return; }
        for (int j = found; j < n_chans - 1; j++) chans[j] = chans[j + 1];
        n_chans--; save();
        sprintf(reply, "OK - usuniety %s", name);
      }
    } else {
      strcpy(reply, "Err - filter chan [list|add #x|del #x]");
    }
  } else if (strcmp(args, "stats") == 0) {
    sprintf(reply, "zablokowane: advert %lu, kanal %lu, anon %lu, priv %lu", (unsigned long)st_adv, (unsigned long)st_chan,
            (unsigned long)st_anon, (unsigned long)st_dm);
  } else {
    strcpy(reply, "filter [list|on|off|add key <hex>|add name <nazwa>|del <nr>|clear|chan ...|priv on/off|stats]");
  }
}

#endif  // SF6_FILTER
