#pragma once
// testowy system plików w pamięci
#include <string>
#include <map>
#include <Identity.h>
#define FILE_O_WRITE 1
struct MemFS;
class File {
public:
  std::string* data = nullptr; size_t pos = 0;
  operator bool() const { return data != nullptr; }
  int read(uint8_t* b, size_t n) { size_t k = data->size() - pos; if (k > n) k = n; memcpy(b, data->data() + pos, k); pos += k; return k; }
  size_t write(const uint8_t* b, size_t n) { data->append((const char*)b, n); return n; }
  void close() {}
  void flush() {}
  size_t size() const { return data ? data->size() : 0; }
};
struct MemFS {
  std::map<std::string, std::string> files;
  bool exists(const char* p) { return files.count(p); }
  bool remove(const char* p) { files.erase(p); return true; }
  bool rename(const char* a, const char* b) { if (!files.count(a)) return false; files[b] = files[a]; files.erase(a); return true; }
  File open(const char* p, const char* m = "r", bool c = false) { File f; if (m[0] == 'w') files[p] = ""; if (!files.count(p)) return f; f.data = &files[p]; return f; }
  File open(const char* p, int) { files[p] = ""; File f; f.data = &files[p]; return f; }
};
#define FILESYSTEM MemFS
#define NRF52_PLATFORM 0
#undef NRF52_PLATFORM
