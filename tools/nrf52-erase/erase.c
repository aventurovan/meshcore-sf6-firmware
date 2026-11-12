/*
 * nRF52 – kasowanie całej pamięci aplikacji i danych (MeshCore, Meshtastic itp.).
 * Wgrywane przez bootloader Adafruit (serial DFU) z flashera meshcoresouth.pl.
 *
 * Kasuje strony od początku obszaru aplikacji (za SoftDevice) do początku bootloadera:
 * kod aplikacji, ExtraFS i InternalFS. SoftDevice, MBR i bootloader zostają nietknięte.
 * Potem ustawia GPREGRET=0x57 i restartuje – urządzenie wraca do trybu DFU,
 * a flasher od razu wgrywa nowy firmware.
 * Kasowanie wykonuje się z RAM, bo kod programu też jest kasowany.
 */
#include <stdint.h>

#define REG(a) (*(volatile uint32_t *)(a))
#define NVMC_READY        REG(0x4001E400)
#define NVMC_CONFIG       REG(0x4001E504)
#define NVMC_ERASEPAGE    REG(0x4001E508)
#define POWER_GPREGRET    REG(0x4000051C)
#define FICR_CODEPAGESIZE REG(0x10000010)
#define FICR_CODESIZE     REG(0x10000014)
#define UICR_BOOTLOADER   REG(0x10001014)
#define WDT_RUNSTATUS     REG(0x40010400)
#define WDT_RR(n)         REG(0x40010600 + 4 * (n))
#define SCB_AIRCR         REG(0xE000ED0C)

#define DFU_MAGIC_UF2_RESET 0x57

extern uint32_t __app_start, __stack_top, __data_load, __data_start, __data_end;

__attribute__((section(".ramfunc"), noinline, noreturn))
static void erase_and_reset(uint32_t start, uint32_t end, uint32_t page)
{
    NVMC_CONFIG = 2;                         /* erase enable */
    while (!NVMC_READY) {}
    for (uint32_t a = start; a < end; a += page) {
        NVMC_ERASEPAGE = a;
        while (!NVMC_READY) {
            if (WDT_RUNSTATUS)
                for (int i = 0; i < 8; i++) WDT_RR(i) = 0x6E524635;
        }
    }
    NVMC_CONFIG = 0;
    while (!NVMC_READY) {}
    POWER_GPREGRET = DFU_MAGIC_UF2_RESET;    /* po restarcie: tryb DFU */
    __asm volatile ("dsb");
    SCB_AIRCR = 0x05FA0004;                  /* SYSRESETREQ */
    for (;;) {}
}

__attribute__((noreturn)) void reset_handler(void)
{
    __asm volatile ("cpsid i");
    uint32_t *src = &__data_load, *dst = &__data_start;
    while (dst < &__data_end) *dst++ = *src++;

    uint32_t page  = FICR_CODEPAGESIZE;
    uint32_t flash = page * FICR_CODESIZE;
    uint32_t start = (uint32_t)&__app_start;
    uint32_t end   = UICR_BOOTLOADER;
    if (page != 4096 || end == 0xFFFFFFFF || end > flash || end <= start + page)
        end = flash - 0xC000;               /* zapas: typowe położenie bootloadera Adafruit */
    erase_and_reset(start, end & ~(page - 1), page);
}

__attribute__((section(".vectors"), used))
const void *vectors[2] = { &__stack_top, (void *)reset_handler };
