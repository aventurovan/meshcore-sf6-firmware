#pragma once
#include <stdint.h>
#include <stddef.h>
class Print { public: virtual size_t write(uint8_t c) { return 1; } size_t write(const uint8_t* b, size_t n) { return n; }
  size_t print(const char*) { return 0; } size_t print(char) { return 0; } size_t print(int, int = 10) { return 0; } size_t println(const char* = "") { return 0; } };
class Stream : public Print { public: virtual int available() { return 0; } virtual int read() { return -1; }
  size_t readBytes(uint8_t*, size_t) { return 0; } };
