#include "SF6KeyBlock.h"
#include <Utils.h>
#include <helpers/AdvertDataHelpers.h>
#include "PersistUtil.h"
#include <string.h>
#include <stdio.h>
#include <stdlib.h>

#define SF6KB_FILE   "/sf6keys"
#define SF6KB_REPLY  150

static char kbLower(char c) { return (c >= 'A' && c <= 'Z') ? c + 32 : c; }

SF6KeyBlock::SF6KeyBlock() : _fs(NULL), n(0), priv(false) { memset(e, 0, sizeof(e)); }

int SF6KeyBlock::match(const uint8_t* key, int len) {
  for (int i = 0; i < n; i++) {
    int k = e[i].key_len < len ? e[i].key_len : len;
    if (k > 0 && memcmp(e[i].key, key, k) == 0) return i;
  }
  return -1;
}

bool SF6KeyBlock::blocks(const mesh::Packet* pkt) {
  if (n == 0) return false;
  const uint8_t* p = pkt->payload;
  int len = pkt->payload_len;
  int i = -1;
  switch (pkt->getPayloadType()) {
    case PAYLOAD_TYPE_ADVERT: {
      const int off = PUB_KEY_SIZE + 4 + SIGNATURE_SIZE;
      if (len < off) return false;
      i = match(p, PUB_KEY_SIZE);
      if (i >= 0) {                       // zapamiętaj nazwę — do blokady jego wiadomości na kanałach
        int app_len = len - off; if (app_len > MAX_ADVERT_DATA_SIZE) app_len = MAX_ADVERT_DATA_SIZE;
        AdvertDataParser parser(&p[off], app_len);
        if (parser.hasName()) { strncpy(e[i].name, parser.getName(), SF6KB_NAME_LEN); e[i].name[SF6KB_NAME_LEN] = 0; }
      }
      break;
    }
    case PAYLOAD_TYPE_ANON_REQ:
      if (len >= PATH_HASH_SIZE + PUB_KEY_SIZE) i = match(&p[PATH_HASH_SIZE], PUB_KEY_SIZE);
      break;
    case PAYLOAD_TYPE_TXT_MSG:
    case PAYLOAD_TYPE_REQ:
    case PAYLOAD_TYPE_RESPONSE:
    case PAYLOAD_TYPE_PATH:
      if (priv && len >= 2 * PATH_HASH_SIZE) i = match(&p[PATH_HASH_SIZE], PATH_HASH_SIZE);
      break;
    default:
      break;
  }
  if (i < 0) return false;
  e[i].hits++;
  return true;
}

bool SF6KeyBlock::blocksGroupText(uint8_t type, const uint8_t* data, size_t len) {
  if (n == 0 || type != PAYLOAD_TYPE_GRP_TXT || len < 6 || (data[4] >> 2) != 0) return false;
  const char* text = (const char*)&data[5];
  size_t tl = len - 5;
  const char* sep = NULL;
  for (size_t k = 0; k + 1 < tl && text[k]; k++) if (text[k] == ':' && text[k + 1] == ' ') { sep = text + k; break; }
  if (!sep) return false;
  int nl = sep - text;
  for (int i = 0; i < n; i++) {
    int l = strlen(e[i].name);
    if (l == 0 || l != nl) continue;
    bool same = true;
    for (int k = 0; k < l && same; k++) same = kbLower(e[i].name[k]) == kbLower(text[k]);
    if (same) { e[i].hits++; return true; }
  }
  return false;
}

/* ---------- zapis / odczyt (prosty tekst: "P0", potem jedna linia hex na klucz) ---------- */

void SF6KeyBlock::begin(FILESYSTEM* fs) { _fs = fs; load(); }

void SF6KeyBlock::load() {
  if (!_fs || !_fs->exists(SF6KB_FILE)) return;
  File f = fsOpenRead(_fs, SF6KB_FILE);
  if (!f) return;
  char buf[SF6KB_MAX_KEYS * (2 * SF6KB_KEY_BYTES + 1) + 8];
  int r = f.read((uint8_t*)buf, sizeof(buf) - 1);
  f.close();
  if (r <= 0) return;
  buf[r] = 0;
  n = 0;
  char* line = buf;
  while (line && *line) {
    char* nl = strchr(line, '\n');
    if (nl) *nl = 0;
    if (line[0] == 'P') priv = line[1] == '1';
    else if (n < SF6KB_MAX_KEYS) {
      int hl = strlen(line);
      if (hl >= 2 && hl % 2 == 0 && hl <= 2 * SF6KB_KEY_BYTES && mesh::Utils::fromHex(e[n].key, hl / 2, line)) {
        e[n].key_len = hl / 2; e[n].name[0] = 0; e[n].hits = 0; n++;
      }
    }
    line = nl ? nl + 1 : NULL;
  }
}

void SF6KeyBlock::save() {
  if (!_fs) return;
  File f = fsOpenWrite(_fs, SF6KB_FILE);
  if (!f) return;
  f.write((const uint8_t*)(priv ? "P1\n" : "P0\n"), 3);
  for (int i = 0; i < n; i++) {
    char hex[2 * SF6KB_KEY_BYTES + 2];
    mesh::Utils::toHex(hex, e[i].key, e[i].key_len);
    strcat(hex, "\n");
    f.write((const uint8_t*)hex, strlen(hex));
  }
  f.close();
}

/* ---------- komendy: filter key … ---------- */

static bool kbWord(const char* s, const char* w) {
  int l = strlen(w);
  return strncmp(s, w, l) == 0 && (s[l] == 0 || s[l] == ' ');
}
static const char* kbNext(const char* s) { while (*s && *s != ' ') s++; while (*s == ' ') s++; return s; }

void SF6KeyBlock::command(const char* a, char* reply) {
  while (*a == ' ') a++;
  if (!*a || kbWord(a, "list")) {
    int start = 0;
    if (kbWord(a, "list")) { const char* v = kbNext(a); if (*v) start = atoi(v); }
    if (start < 0) start = 0;
    int len = snprintf(reply, SF6KB_REPLY, "keys %d/%d; priv %s", n, SF6KB_MAX_KEYS, priv ? "on" : "off");
    for (int i = start; i < n; i++) {
      char hex[2 * SF6KB_KEY_BYTES + 1];
      mesh::Utils::toHex(hex, e[i].key, e[i].key_len);
      for (char* c = hex; *c; c++) *c = kbLower(*c);
      char item[80];
      int il = snprintf(item, sizeof(item), "\n%d: %s%s%s", i, hex, e[i].name[0] ? " " : "", e[i].name);
      if (len + il > SF6KB_REPLY - 6) { strcpy(reply + len, "\n..."); return; }
      strcpy(reply + len, item); len += il;
    }
  } else if (kbWord(a, "add")) {
    const char* v = kbNext(a);
    char hex[2 * PUB_KEY_SIZE + 1];
    int hl = 0;
    while (v[hl] && v[hl] != ' ' && hl < 2 * PUB_KEY_SIZE) { hex[hl] = kbLower(v[hl]); hl++; }
    hex[hl] = 0;
    if (hl > 2 * SF6KB_KEY_BYTES) { hl = 2 * SF6KB_KEY_BYTES; hex[hl] = 0; }   // wystarczy początek klucza
    uint8_t key[SF6KB_KEY_BYTES];
    if (hl < 2 || hl % 2 || !mesh::Utils::fromHex(key, hl / 2, hex)) { strcpy(reply, "Err - usage: key add <hex>, e.g. key add a1b2c3d4"); return; }
    for (int i = 0; i < n; i++) {
      if (e[i].key_len == hl / 2 && memcmp(e[i].key, key, hl / 2) == 0) { snprintf(reply, SF6KB_REPLY, "OK - key %d already listed", i); return; }
    }
    if (n >= SF6KB_MAX_KEYS) { snprintf(reply, SF6KB_REPLY, "Err - max %d keys", SF6KB_MAX_KEYS); return; }
    memset(&e[n], 0, sizeof(e[n]));
    memcpy(e[n].key, key, hl / 2); e[n].key_len = hl / 2;
    n++; save();
    snprintf(reply, SF6KB_REPLY, "OK - key %d added: %s", n - 1, hex);
  } else if (kbWord(a, "del")) {
    const char* v = kbNext(a);
    int i = -1;
    if (*v && strlen(v) <= 2 && v[0] >= '0' && v[0] <= '9') i = atoi(v);
    else {
      uint8_t key[SF6KB_KEY_BYTES]; int hl = strlen(v); if (hl > 2 * SF6KB_KEY_BYTES) hl = 2 * SF6KB_KEY_BYTES;
      char hex[2 * SF6KB_KEY_BYTES + 1]; memcpy(hex, v, hl); hex[hl] = 0;
      if (hl >= 2 && hl % 2 == 0 && mesh::Utils::fromHex(key, hl / 2, hex)) i = match(key, hl / 2);
    }
    if (i < 0 || i >= n) { strcpy(reply, "Err - usage: key del <idx|hex> (see filter key)"); return; }
    for (int j = i; j < n - 1; j++) e[j] = e[j + 1];
    n--; save();
    snprintf(reply, SF6KB_REPLY, "OK - key %d deleted, %d left", i, n);
  } else if (kbWord(a, "clear")) {
    n = 0; save();
    strcpy(reply, "OK - all keys deleted");
  } else if (kbWord(a, "priv")) {
    const char* v = kbNext(a);
    if (strcmp(v, "on") == 0 || strcmp(v, "off") == 0) { priv = v[1] == 'n'; save(); }
    snprintf(reply, SF6KB_REPLY, "OK - priv %s%s", priv ? "on" : "off", priv ? " (1-byte match, may hit others)" : "");
  } else if (kbWord(a, "stats")) {
    int len = snprintf(reply, SF6KB_REPLY, "key hits:");
    for (int i = 0; i < n && len < SF6KB_REPLY - 16; i++) len += snprintf(reply + len, SF6KB_REPLY - len, " %d=%lu", i, (unsigned long)e[i].hits);
  } else {
    strcpy(reply, "filter key [list [idx]|add <hex>|del <idx|hex>|clear|priv on|off|stats]");
  }
}
