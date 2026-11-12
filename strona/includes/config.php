<?php
// Wspólna konfiguracja — linki i stałe używane w całym serwisie.
// Zmieniasz raz tutaj, a nie w każdym pliku osobno.

define('SITE_NAME', 'MeshCore Południe');

define('URL_LIVE_MAP', 'https://meshcorekk.xyz/');
define('URL_MAPPER', 'https://meshcoresouth.pl/mapper');
define('URL_MAPPER_APK', 'https://meshcoresouth.pl/mapper/apk/');
define('URL_MAPPER_IOS', 'https://testflight.apple.com/join/er4ZSaRm');
define('URL_STATS', 'https://stats.meshcoresouth.pl/');
define('URL_DISCORD', 'https://discord.com/channels/1474167474546278585/1474167475812696116');
define('URL_COMMUNITY', 'https://www.facebook.com/groups/1516414749442399');
define('URL_NODES_JSON', 'https://stats.meshcoresouth.pl/nodes.json');

define('URL_GOOGLE_PLAY', 'https://play.google.com/store/apps/details?id=com.liamcottle.meshcore.android');
define('URL_APP_STORE', 'https://apps.apple.com/nz/app/meshcore/id6742354151');
define('URL_WEB_APP', 'https://app.meshcore.nz/');
define('URL_WINDOWS', 'https://files.liamcottle.net/MeshCore/v1.42.0/MeshCore-v1.42.0-windows-x64.zip');
define('URL_MACOS', 'https://files.liamcottle.net/MeshCore/v1.42.0/MeshCore-v1.42.0+67-5a3c5f1-macos.zip');
define('URL_LINUX', 'https://files.liamcottle.net/MeshCore/');

define('URL_FLASHER', '/flasher.php');
define('URL_FLASHER_OFFICIAL', 'https://flasher.meshcore.io/');
define('URL_SF6_FIRMWARE_REPO', 'https://github.com/aventurovan/meshcore-sf6-firmware');
define('URL_RPT_CONFIG', 'https://meshcoresouth.pl/rpt/');

define('URL_GITHUB', 'https://github.com/meshcore-dev/MeshCore');
define('URL_DOCS', 'https://meshcore.co.uk/wiki.html');
define('URL_CONTACT_MAIL', 'kontakt@meshcoresouth.pl');

// Preset regionalny — Faza aktualizacji: podmień, jeśli społeczność zmieni parametry
define('PRESET_FREQ', '869.618');
define('PRESET_SF', '6');
define('PRESET_BW', '62.5');
define('PRESET_CR', '8');
define('PRESET_ID_BYTES', '2');

/**
 * Projekcja geograficzna N/E -> piksele w układzie mapy SVG (viewBox 1000x950).
 * Ten sam wzór używany w includes/map-svg.php (PHP) i assets/rpt-map.js (JS),
 * żeby węzły RPT i granice województw pokrywały się dokładnie.
 * Źródło stałych: dane simplemaps.com/Map-of-Poland.
 */
function project_lat_lon(float $lat, float $lon): array {
    $mapEZero = 14.07;
    $mapNZero = 54.90;
    $mapEFull = 24.27;
    $mapNFull = 49.00;
    $degN = 950 / abs($mapNZero - $mapNFull);
    $degE = 1000 / abs($mapEZero - $mapEFull);

    return [
        'x' => round(abs($lon - $mapEZero) * $degE, 1),
        'y' => round(abs($lat - $mapNZero) * $degN, 1),
    ];
}
