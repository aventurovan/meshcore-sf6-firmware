<?php
/**
 * /api/rpt.php — proxy + projekcja współrzędnych po stronie serwera.
 *
 * Dlaczego to robimy w PHP, a nie samym JS w przeglądarce:
 * 1. Unikamy CORS — stats.meshcoresouth.pl i meshcoresouth.pl to różne subdomeny;
 *    jeśli stats.* nie wysyła nagłówka Access-Control-Allow-Origin, przeglądarka
 *    zablokuje fetch() z poziomu klienta. Serwer->serwer nie ma tego problemu.
 * 2. Gotowe współrzędne x/y — przeglądarka dostaje już przeliczone piksele,
 *    nie musi znać wzoru projekcji ani nic liczyć.
 * 3. Można w jednym miejscu dodać cache, żeby nie odpytywać źródła
 *    przy każdym odświeżeniu strony przez każdego odwiedzającego.
 */

require_once __DIR__ . '/../includes/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

/**
 * Migawka prawdziwych danych z nodes.json (pobrana 2026-09-16), używana TYLKO
 * gdy nie da się połączyć z URL_NODES_JSON — np. allow_url_fopen wyłączone
 * na hostingu, firewall, chwilowa awaria źródła. Dzięki temu mapa nigdy nie
 * jest pusta. Gdy tylko żywe połączenie zadziała, ten fallback jest pomijany.
 */
function fallback_nodes(): array {
    return [
        ['city' => 'Gliwice', 'id_byte' => '73', 'lat' => 50.30658, 'lon' => 18.69559, 'name' => 'SG- Piast', 'role' => 'REPEATER'],
        ['city' => 'Ornontowice', 'id_byte' => 'ee', 'lat' => 50.173991, 'lon' => 18.74984, 'name' => 'Meshcorianie Dnia 6', 'role' => 'REPEATER'],
        ['city' => 'Pszczyna', 'id_byte' => '9b', 'lat' => 50.00188, 'lon' => 18.95046, 'name' => 'SPS-PSZCZYNA-BAZA', 'role' => 'REPEATER'],
        ['city' => 'Wodzisław Śląski', 'id_byte' => 'dd', 'lat' => 50.00181, 'lon' => 18.47891, 'name' => 'SWD Amadeus RPT', 'role' => 'REPEATER'],
        ['city' => 'Żory', 'id_byte' => '57', 'lat' => 50.03671, 'lon' => 18.67823, 'name' => 'ZoryJastrzeMursuit', 'role' => 'REPEATER'],
        ['city' => 'Pietrzykowice', 'id_byte' => '31', 'lat' => 49.690708, 'lon' => 19.137022, 'name' => 'RPT RBK Żywiec 1', 'role' => 'REPEATER'],
        ['city' => 'Tarnowskie Góry', 'id_byte' => '6d', 'lat' => 50.4506, 'lon' => 18.854308, 'name' => 'STA Kościuszki JaQ RPT', 'role' => 'REPEATER'],
        ['city' => 'Bielsko-Biała', 'id_byte' => 'd9', 'lat' => 49.82038, 'lon' => 18.9956, 'name' => 'Bielsko-Biala OSP', 'role' => 'REPEATER'],
        ['city' => 'Stary Sącz', 'id_byte' => 'ca', 'lat' => 49.56782, 'lon' => 20.62865, 'name' => 'Stary Sącz Loggia', 'role' => 'REPEATER'],
        ['city' => 'Pszów', 'id_byte' => 'ab', 'lat' => 50.039568, 'lon' => 18.389818, 'name' => 'SWD SLAW rpt', 'role' => 'REPEATER'],
        ['city' => 'Lubsza', 'id_byte' => '83', 'lat' => 50.605976, 'lon' => 18.988373, 'name' => 'SLU-MIMAS', 'role' => 'REPEATER'],
        ['city' => 'Sopotnia Wielka', 'id_byte' => '51', 'lat' => 49.536882, 'lon' => 19.233435, 'name' => 'Rysianka 1320m RPT', 'role' => 'REPEATER'],
        ['city' => 'Mogilany', 'id_byte' => 'd2', 'lat' => 49.942285, 'lon' => 19.891154, 'name' => 'PL-KRA MOGILANY RPT SF6', 'role' => 'REPEATER'],
        ['city' => 'Żywiec', 'id_byte' => '08', 'lat' => 49.683269, 'lon' => 19.214001, 'name' => 'RPT RBK Żywiec 4', 'role' => 'REPEATER'],
        ['city' => 'Bielsko-Biała', 'id_byte' => '11', 'lat' => 49.811539, 'lon' => 19.074129, 'name' => 'Bielsko j-pole', 'role' => 'REPEATER'],
        ['city' => 'Gliwice', 'id_byte' => 'e2', 'lat' => 50.295096, 'lon' => 18.663836, 'name' => 'WidmoEteru', 'role' => 'REPEATER'],
        ['city' => 'Przyszowice', 'id_byte' => 'fa', 'lat' => 50.243343, 'lon' => 18.742942, 'name' => 'Przyszowice RPT02', 'role' => 'REPEATER'],
        ['city' => 'Tarnowskie Góry', 'id_byte' => '50', 'lat' => 50.44589, 'lon' => 18.85852, 'name' => 'STA Centrum', 'role' => 'REPEATER'],
        ['city' => 'Chocim', 'id_byte' => '95', 'lat' => 50.31473, 'lon' => 17.53223, 'name' => 'OPR Łąka Prudnicka', 'role' => 'REPEATER'],
        ['city' => 'Brzezówka', 'id_byte' => '03', 'lat' => 49.810268, 'lon' => 18.623638, 'name' => 'Brzezowka Yagi', 'role' => 'REPEATER'],
        ['city' => 'Żywiec', 'id_byte' => '33', 'lat' => 49.684607, 'lon' => 19.210275, 'name' => 'Os.700lecia/Żywiec', 'role' => 'REPEATER'],
        ['city' => 'Targanice', 'id_byte' => '0e', 'lat' => 49.80001, 'lon' => 19.340085, 'name' => 'MrX', 'role' => 'REPEATER'],
        ['city' => 'Łaziska Górne', 'id_byte' => 'c8', 'lat' => 50.165756, 'lon' => 18.848464, 'name' => 'LaziskaSMI17', 'role' => 'REPEATER'],
        ['city' => 'Pszczyna', 'id_byte' => '79', 'lat' => 49.96313, 'lon' => 18.932422, 'name' => 'SPS-PSZCZYNA-1', 'role' => 'REPEATER'],
        ['city' => 'Paniówki', 'id_byte' => 'd2', 'lat' => 50.224522, 'lon' => 18.794479, 'name' => 'SGL_44177_RPT1', 'role' => 'REPEATER'],
        ['city' => 'Tarnowskie Góry', 'id_byte' => 'f9', 'lat' => 50.484772, 'lon' => 18.799559, 'name' => 'STA Strzybnica RPT', 'role' => 'REPEATER'],
        ['city' => 'Knurów', 'id_byte' => '0b', 'lat' => 50.22516, 'lon' => 18.68253, 'name' => 'SilesiaSuperior 2', 'role' => 'REPEATER'],
        ['city' => 'Głuchołazy', 'id_byte' => '8f', 'lat' => 50.320369, 'lon' => 17.364549, 'name' => 'ONY Glucholazy2', 'role' => 'REPEATER'],
        ['city' => 'Kędzierzyn-Koźle', 'id_byte' => '59', 'lat' => 50.347807, 'lon' => 18.22972, 'name' => 'Ok Piasty', 'role' => 'REPEATER'],
        ['city' => 'Bystra', 'id_byte' => '15', 'lat' => 49.755119, 'lon' => 19.002045, 'name' => 'Szyndzielnia RPT', 'role' => 'REPEATER'],
        ['city' => 'Bielsko-Biała', 'id_byte' => '0c', 'lat' => 49.841117, 'lon' => 19.107046, 'name' => 'NCP RPT NW335', 'role' => 'REPEATER'],
        ['city' => 'Szałsza', 'id_byte' => '1c', 'lat' => 50.337132, 'lon' => 18.702796, 'name' => 'VipKam Szałsza', 'role' => 'REPEATER'],
        ['city' => 'Tarnowskie Góry', 'id_byte' => '0b', 'lat' => 50.440723, 'lon' => 18.879533, 'name' => 'STA Lasowice', 'role' => 'REPEATER'],
        ['city' => 'Zabrze', 'id_byte' => '62', 'lat' => 50.308116, 'lon' => 18.805288, 'name' => 'SZ_ZDK_RPT', 'role' => 'REPEATER'],
        ['city' => 'Sosnowiec', 'id_byte' => '85', 'lat' => 50.293769, 'lon' => 19.158281, 'name' => 'S-ec_SkyNet_RPT', 'role' => 'REPEATER'],
        ['city' => 'Tworków', 'id_byte' => '0e', 'lat' => 50.001106, 'lon' => 18.233127, 'name' => 'BenCore47451', 'role' => 'REPEATER'],
        ['city' => 'Jarnołtówek', 'id_byte' => '52', 'lat' => 50.257013, 'lon' => 17.428896, 'name' => 'ONY Biskupia Kopa', 'role' => 'REPEATER'],
        ['city' => 'Droszów', 'id_byte' => 'ca', 'lat' => 51.30461, 'lon' => 17.015009, 'name' => 'DTR_55-100_CIEMGORA-KOP', 'role' => 'REPEATER'],
        ['city' => 'Tarnowskie Góry', 'id_byte' => '53', 'lat' => 50.44579, 'lon' => 18.82965, 'name' => 'STA Szwedzka', 'role' => 'REPEATER'],
        ['city' => 'Mikołów', 'id_byte' => 'f7', 'lat' => 50.19297, 'lon' => 18.88395, 'name' => 'SMI Reta', 'role' => 'REPEATER'],
        ['city' => 'Walce', 'id_byte' => '06', 'lat' => 50.377891, 'lon' => 17.999279, 'name' => 'OPO WALCE RPT', 'role' => 'REPEATER'],
        ['city' => 'Opole', 'id_byte' => 'f3', 'lat' => 50.681944, 'lon' => 17.959055, 'name' => 'OPO Gosławice 6SF 2 By', 'role' => 'REPEATER'],
        ['city' => 'Gliwice', 'id_byte' => 'c3', 'lat' => 50.29284, 'lon' => 18.73465, 'name' => 'SG 44-103', 'role' => 'REPEATER'],
        ['city' => 'Gilowice', 'id_byte' => '22', 'lat' => 49.69524, 'lon' => 19.334196, 'name' => 'RPT RBK Żywiec 6', 'role' => 'REPEATER'],
        ['city' => 'Ruda Śląska', 'id_byte' => 'cf', 'lat' => 50.275866, 'lon' => 18.867633, 'name' => 'SL 41-710 DIL 0', 'role' => 'REPEATER'],
        ['city' => 'Kędzierzyn-Koźle', 'id_byte' => '5b', 'lat' => 50.374851, 'lon' => 18.33061, 'name' => 'Ok Slawiecice', 'role' => 'REPEATER'],
        ['city' => 'Jastrzębie-Zdrój', 'id_byte' => 'e6', 'lat' => 49.941903, 'lon' => 18.578381, 'name' => 'SJZ1 MC RPT1', 'role' => 'REPEATER'],
        ['city' => 'Malczów', 'id_byte' => 'aa', 'lat' => 51.305891, 'lon' => 17.014431, 'name' => 'DTR_55-100_BKOPA_18', 'role' => 'REPEATER'],
        ['city' => 'Gliwice', 'id_byte' => 'e9', 'lat' => 50.28731, 'lon' => 18.7322, 'name' => 'SG-HAN', 'role' => 'REPEATER'],
        ['city' => 'Miasteczko Śląskie', 'id_byte' => '28', 'lat' => 50.494862, 'lon' => 18.925185, 'name' => 'STA Miasteczko Śl. RPT', 'role' => 'REPEATER'],
        ['city' => 'Chorzów', 'id_byte' => '6c', 'lat' => 50.288736, 'lon' => 18.951428, 'name' => 'SH-JCH01-RPT', 'role' => 'REPEATER'],
        ['city' => 'Tarnowskie Góry', 'id_byte' => '5e', 'lat' => 50.42097, 'lon' => 18.85459, 'name' => 'STA - Barytowa RPT_1', 'role' => 'REPEATER'],
        ['city' => 'Ostrożnica', 'id_byte' => '10', 'lat' => 50.242128, 'lon' => 18.084739, 'name' => 'OK Ostroznica', 'role' => 'REPEATER'],
        ['city' => 'Przyszowice', 'id_byte' => 'ae', 'lat' => 50.23603, 'lon' => 18.73758, 'name' => 'Przyszowice RPT01', 'role' => 'REPEATER'],
        ['city' => 'Przyszowice', 'id_byte' => 'ee', 'lat' => 50.250111, 'lon' => 18.731604, 'name' => 'Przyszowice RPT05 NE77', 'role' => 'REPEATER'],
        ['city' => 'Opole', 'id_byte' => '2f', 'lat' => 50.682674, 'lon' => 17.948587, 'name' => 'stary ZWM', 'role' => 'REPEATER'],
        ['city' => 'Rybnik', 'id_byte' => 'aa', 'lat' => 50.068008, 'lon' => 18.514715, 'name' => 'SR_BirdEther_NW_RPT', 'role' => 'REPEATER'],
        ['city' => 'Rybnik', 'id_byte' => '1e', 'lat' => 50.068019, 'lon' => 18.514839, 'name' => 'SR_BirdEther_OBS_RPT', 'role' => 'REPEATER'],
        ['city' => 'Rybnik', 'id_byte' => 'bf', 'lat' => 50.068027, 'lon' => 18.514698, 'name' => 'SR_BirdEther_SE_RPT', 'role' => 'REPEATER'],
        ['city' => 'Katowice', 'id_byte' => '21', 'lat' => 50.285171, 'lon' => 18.966861, 'name' => 'Maro Heltec v4 Repeater', 'role' => 'REPEATER'],
        ['city' => 'Wilkowice', 'id_byte' => 'b2', 'lat' => 49.77705, 'lon' => 19.129672, 'name' => 'Magurka Gebalowka RPT', 'role' => 'REPEATER'],
        ['city' => 'Skoczów', 'id_byte' => '37', 'lat' => 49.803249, 'lon' => 18.77985, 'name' => 'Skoczow Kaplicowka', 'role' => 'REPEATER'],
        ['city' => 'Zabrze', 'id_byte' => '77', 'lat' => 50.3032, 'lon' => 18.735422, 'name' => 'Anteniarski', 'role' => 'REPEATER'],
        ['city' => 'Rybnik', 'id_byte' => 'eb', 'lat' => 50.06808, 'lon' => 18.51488, 'name' => 'SR_BirdEther_NE_RPT', 'role' => 'REPEATER'],
        ['city' => 'Pszów', 'id_byte' => '3f', 'lat' => 50.04047, 'lon' => 18.395149, 'name' => 'SP9PKM', 'role' => 'REPEATER'],
        ['city' => 'Sosnowiec', 'id_byte' => '5c', 'lat' => 50.273521, 'lon' => 19.12322, 'name' => 'ThinkNode Solar', 'role' => 'REPEATER'],
        ['city' => 'Większyce', 'id_byte' => '8a', 'lat' => 50.335675, 'lon' => 18.102278, 'name' => 'OK Wiekszyce', 'role' => 'REPEATER'],
        ['city' => 'Przyszowice', 'id_byte' => 'aa', 'lat' => 50.249935, 'lon' => 18.730852, 'name' => 'Przyszowice RPT03', 'role' => 'REPEATER'],
        ['city' => 'Lubsza', 'id_byte' => 'a3', 'lat' => 50.605795, 'lon' => 19.00062, 'name' => 'SLU-IO', 'role' => 'REPEATER'],
        ['city' => 'Pszów', 'id_byte' => '2f', 'lat' => 50.039287, 'lon' => 18.400671, 'name' => 'SWD Pszow DVQ 1', 'role' => 'REPEATER'],
        ['city' => 'Tarnowskie Góry', 'id_byte' => '92', 'lat' => 50.448736, 'lon' => 18.83992, 'name' => 'STA Opatowicka', 'role' => 'REPEATER'],
        ['city' => 'Sopotnia Wielka', 'id_byte' => '5c', 'lat' => 49.560751, 'lon' => 19.241922, 'name' => 'SeTi Romanka 1366m', 'role' => 'REPEATER'],
        ['city' => 'Kraków', 'id_byte' => '47', 'lat' => 50.052873, 'lon' => 19.918863, 'name' => 'MA.KRK Salwator_6 R8/O', 'role' => 'REPEATER'],
        ['city' => 'Tychy', 'id_byte' => '50', 'lat' => 50.10937, 'lon' => 18.99945, 'name' => 'TYCHY-D', 'role' => 'REPEATER'],
        ['city' => 'Ligota Dolna', 'id_byte' => 'ba', 'lat' => 50.48959, 'lon' => 18.12078, 'name' => 'OST Ligota', 'role' => 'REPEATER'],
        ['city' => 'Tarnowskie Góry', 'id_byte' => '55', 'lat' => 50.44405, 'lon' => 18.85069, 'name' => 'STA Rymera', 'role' => 'REPEATER'],
        ['city' => 'Katowice', 'id_byte' => 'f2', 'lat' => 50.260322, 'lon' => 19.02185, 'name' => 'RPT-Kato', 'role' => 'REPEATER'],
        ['city' => 'Jaworzno', 'id_byte' => '42', 'lat' => 50.16376, 'lon' => 19.24946, 'name' => 'SJ PBO_solar_REP', 'role' => 'REPEATER'],
        ['city' => 'Zabrze', 'id_byte' => 'c5', 'lat' => 50.31673, 'lon' => 18.77553, 'name' => 'SZ-Prezi-base', 'role' => 'REPEATER'],
        ['city' => 'Kończyce Małe', 'id_byte' => '65', 'lat' => 49.867118, 'lon' => 18.622959, 'name' => 'KonczyceMale-RPT1', 'role' => 'REPEATER'],
        ['city' => 'Gilowice', 'id_byte' => '25', 'lat' => 49.710857, 'lon' => 19.333815, 'name' => 'RPT PIN', 'role' => 'REPEATER'],
        ['city' => 'Góra Świętej Anny', 'id_byte' => '97', 'lat' => 50.455217, 'lon' => 18.156862, 'name' => 'Św_Anna_RPT', 'role' => 'REPEATER'],
        ['city' => 'Jełowa', 'id_byte' => '66', 'lat' => 50.795589, 'lon' => 18.059276, 'name' => 'OPO Jełowa RPT', 'role' => 'REPEATER'],
        ['city' => 'Kraków', 'id_byte' => 'ac', 'lat' => 50.065094, 'lon' => 19.932812, 'name' => 'PL-KR Dinemic Piasek SW', 'role' => 'REPEATER'],
        ['city' => 'Paniówki', 'id_byte' => 'be', 'lat' => 50.224258, 'lon' => 18.79423, 'name' => 'SGL_44177_YAGA_SW', 'role' => 'REPEATER'],
        ['city' => 'Pszów', 'id_byte' => 'd1', 'lat' => 50.039894, 'lon' => 18.395, 'name' => 'SWD Piotr rpt', 'role' => 'REPEATER'],
        ['city' => 'Jawornik', 'id_byte' => '28', 'lat' => 49.858896, 'lon' => 19.884701, 'name' => 'JAWORNIK.666.RPT', 'role' => 'REPEATER'],
        ['city' => 'Jaworzno', 'id_byte' => 'de', 'lat' => 50.202247, 'lon' => 19.289527, 'name' => 'SJ_Zalipie', 'role' => 'REPEATER'],
        ['city' => 'Knurów', 'id_byte' => '16', 'lat' => 50.21752, 'lon' => 18.66553, 'name' => 'JTGA 2', 'role' => 'REPEATER'],
        ['city' => 'Kościelisko', 'id_byte' => '26', 'lat' => 49.231006, 'lon' => 19.903407, 'name' => 'SP6MPL Ciemniak', 'role' => 'REPEATER'],
        ['city' => 'Pewel Ślemieńska', 'id_byte' => '47', 'lat' => 49.691836, 'lon' => 19.341121, 'name' => 'RPT RBK Żywiec 5', 'role' => 'REPEATER'],
        ['city' => 'Żywiec', 'id_byte' => '82', 'lat' => 49.67327, 'lon' => 19.18447, 'name' => 'Zywiec Zablocie RPT', 'role' => 'REPEATER'],
        ['city' => 'Trzebniów', 'id_byte' => '6b', 'lat' => 50.66083, 'lon' => 19.42065, 'name' => 'Bukowie Repeater', 'role' => 'REPEATER'],
        ['city' => 'Bycina', 'id_byte' => 'b1', 'lat' => 50.391311, 'lon' => 18.52827, 'name' => 'BYCINA S3ML3.2', 'role' => 'REPEATER'],
        ['city' => 'Brzezówka', 'id_byte' => 'bb', 'lat' => 49.810047, 'lon' => 18.627883, 'name' => 'Brzezowka 360', 'role' => 'REPEATER'],
        ['city' => 'Charbielin', 'id_byte' => '5a', 'lat' => 50.321159, 'lon' => 17.396133, 'name' => 'ONY Glucholazy1', 'role' => 'REPEATER'],
        ['city' => 'Bielsko-Biała', 'id_byte' => 'be', 'lat' => 49.82228, 'lon' => 19.06702, 'name' => '43-300 Bielsko', 'role' => 'REPEATER'],
        ['city' => 'Tychy', 'id_byte' => 'dd', 'lat' => 50.11022, 'lon' => 18.987856, 'name' => 'TYCHY-N', 'role' => 'REPEATER'],
        ['city' => 'Targanice', 'id_byte' => '7e', 'lat' => 49.78987, 'lon' => 19.334381, 'name' => 'MrK', 'role' => 'REPEATER'],
        ['city' => 'Zabrze', 'id_byte' => '35', 'lat' => 50.30129, 'lon' => 18.77449, 'name' => 'SZ Balkonowiec 3p', 'role' => 'REPEATER'],
        ['city' => 'Chorzów', 'id_byte' => '92', 'lat' => 50.304106, 'lon' => 18.943618, 'name' => 'SP6TPX - Chorzów Solar', 'role' => 'REPEATER'],
        ['city' => 'Łany', 'id_byte' => '7c', 'lat' => 50.388211, 'lon' => 18.428577, 'name' => 'XML3.2', 'role' => 'REPEATER'],
        ['city' => 'Rydułtowy', 'id_byte' => 'd8', 'lat' => 50.053165, 'lon' => 18.420576, 'name' => 'BabaYaga', 'role' => 'REPEATER'],
        ['city' => 'Miękinia', 'id_byte' => 'fc', 'lat' => 50.17498, 'lon' => 19.5876, 'name' => 'Miekinia 442m', 'role' => 'REPEATER'],
        ['city' => 'Zabrze', 'id_byte' => '3b', 'lat' => 50.277191, 'lon' => 18.821939, 'name' => 'SZ - Pawlow Wlfg RPT', 'role' => 'REPEATER'],
        ['city' => 'Kamienica', 'id_byte' => '4e', 'lat' => 50.623573, 'lon' => 19.003635, 'name' => 'SLU-DESDEMONA', 'role' => 'REPEATER'],
        ['city' => 'Chorzów', 'id_byte' => '57', 'lat' => 50.308457, 'lon' => 18.950209, 'name' => 'Chorzow Nowa Repeater', 'role' => 'REPEATER'],
        ['city' => 'Poniszowice', 'id_byte' => 'f1', 'lat' => 50.417171, 'lon' => 18.473119, 'name' => 'Sznurowa gXra', 'role' => 'REPEATER'],
        ['city' => 'Zabrze', 'id_byte' => '81', 'lat' => 50.27211, 'lon' => 18.74504, 'name' => 'SQ9SZ Travel', 'role' => 'REPEATER'],
        ['city' => 'Łany', 'id_byte' => '19', 'lat' => 50.20536, 'lon' => 18.20005, 'name' => 'OK Kris Silesia', 'role' => 'REPEATER'],
        ['city' => 'Łany', 'id_byte' => '1a', 'lat' => 50.21196, 'lon' => 18.21041, 'name' => 'OK Kris K-K', 'role' => 'REPEATER'],
        ['city' => 'Żerdziny', 'id_byte' => 'dc', 'lat' => 50.09901, 'lon' => 18.161996, 'name' => 'Widok', 'role' => 'REPEATER'],
        ['city' => 'Sosnowiec', 'id_byte' => '86', 'lat' => 50.29309, 'lon' => 19.19843, 'name' => 'RJ_Robert_SOS_RPT', 'role' => 'REPEATER'],
        ['city' => 'Katowice', 'id_byte' => '89', 'lat' => 50.28082, 'lon' => 18.96804, 'name' => 'TZN RPT', 'role' => 'REPEATER'],
        ['city' => 'Tarnowskie Góry', 'id_byte' => 'f0', 'lat' => 50.45916, 'lon' => 18.85365, 'name' => 'STA Sowice', 'role' => 'REPEATER'],
        ['city' => 'Katowice', 'id_byte' => '06', 'lat' => 50.250744, 'lon' => 19.040029, 'name' => 'K-ce Paderewa', 'role' => 'REPEATER'],
        ['city' => 'Tarnowskie Góry', 'id_byte' => 'c4', 'lat' => 50.447269, 'lon' => 18.830771, 'name' => 'STA Saperów', 'role' => 'REPEATER'],
        ['city' => 'Tarnowskie Góry', 'id_byte' => 'a2', 'lat' => 50.421194, 'lon' => 18.882134, 'name' => 'STA Czereśnia', 'role' => 'REPEATER'],
        ['city' => 'Tarnowskie Góry', 'id_byte' => 'a1', 'lat' => 50.430271, 'lon' => 18.83777, 'name' => 'STA Os. PKP', 'role' => 'REPEATER'],
        ['city' => 'Kędzierzyn-Koźle', 'id_byte' => 'af', 'lat' => 50.381269, 'lon' => 18.244052, 'name' => 'OK Cisowa', 'role' => 'REPEATER'],
        ['city' => 'Katowice', 'id_byte' => 'b2', 'lat' => 50.249028, 'lon' => 19.036069, 'name' => 'K-ce Graniczna', 'role' => 'REPEATER'],
        ['city' => 'Gliwice', 'id_byte' => '78', 'lat' => 50.29656, 'lon' => 18.63576, 'name' => 'SG-Chopin Room', 'role' => 'ROOMSERVER'],
        ['city' => 'Bieńkowice', 'id_byte' => '01', 'lat' => 50.041011, 'lon' => 18.176477, 'name' => 'Kapliczka', 'role' => 'REPEATER'],
        ['city' => 'Zimna Wódka', 'id_byte' => '5b', 'lat' => 50.43885, 'lon' => 18.326536, 'name' => 'OST - Ujazd2', 'role' => 'REPEATER'],
        ['city' => 'Gilowice', 'id_byte' => 'f8', 'lat' => 49.708126, 'lon' => 19.295172, 'name' => 'RPT RBK Żywiec 2', 'role' => 'REPEATER'],
        ['city' => 'Bielsko-Biała', 'id_byte' => '88', 'lat' => 49.859909, 'lon' => 19.013902, 'name' => 'BB_KOMOROWICE_RPT', 'role' => 'REPEATER'],
        ['city' => 'Katowice', 'id_byte' => 'fe', 'lat' => 50.254076, 'lon' => 19.031842, 'name' => 'SQ9MW Katowice', 'role' => 'REPEATER'],
        ['city' => 'Rydułtowy', 'id_byte' => '3a', 'lat' => 50.07316, 'lon' => 18.42308, 'name' => 'Larva RPT-02 Rydułtowy', 'role' => 'REPEATER'],
        ['city' => 'Zebrzydowice', 'id_byte' => 'e7', 'lat' => 49.883652, 'lon' => 18.652994, 'name' => 'Dgra86 SCI Zeb-ce', 'role' => 'REPEATER'],
        ['city' => 'Mikołów', 'id_byte' => '38', 'lat' => 50.173407, 'lon' => 18.870295, 'name' => 'VestRPT', 'role' => 'REPEATER'],
        ['city' => 'Bór', 'id_byte' => 'fd', 'lat' => 49.435979, 'lon' => 20.058921, 'name' => 'Bor_RPT_test', 'role' => 'REPEATER'],
        ['city' => 'Orzesze', 'id_byte' => 'b8', 'lat' => 50.155411, 'lon' => 18.783021, 'name' => 'BolM 43-180 Orzesze', 'role' => 'REPEATER'],
        ['city' => 'Nieborowice', 'id_byte' => 'b0', 'lat' => 50.23283, 'lon' => 18.614099, 'name' => 'SGL 44-144 RPT2', 'role' => 'REPEATER'],
        ['city' => 'Bielsko-Biała', 'id_byte' => 'ab', 'lat' => 49.79982, 'lon' => 19.05002, 'name' => 'BB_OAK_RPT', 'role' => 'REPEATER'],
        ['city' => 'Poniszowice', 'id_byte' => 'dc', 'lat' => 50.417, 'lon' => 18.472, 'name' => 'SznXrowa OBS', 'role' => 'REPEATER'],
        ['city' => 'Tychy', 'id_byte' => '4f', 'lat' => 50.118081, 'lon' => 18.987279, 'name' => 'TYCHY-C2', 'role' => 'REPEATER'],
        ['city' => 'Kędzierzyn-Koźle', 'id_byte' => '20', 'lat' => 50.324215, 'lon' => 18.242355, 'name' => 'OK Azoty RP1', 'role' => 'REPEATER'],
        ['city' => 'Kraków', 'id_byte' => '1e', 'lat' => 50.06395, 'lon' => 19.949509, 'name' => 'Krakoski Repeater', 'role' => 'REPEATER'],
        ['city' => 'Jaworzno', 'id_byte' => '46', 'lat' => 50.228228, 'lon' => 19.227805, 'name' => 'PL-SJ-Jaworzno-01', 'role' => 'REPEATER'],
        ['city' => 'Kędzierzyn-Koźle', 'id_byte' => '2c', 'lat' => 50.35125, 'lon' => 18.273439, 'name' => 'OK ZChB ATK', 'role' => 'REPEATER'],
        ['city' => 'Stary Sącz', 'id_byte' => '1f', 'lat' => 49.568424, 'lon' => 20.628103, 'name' => 'PL-KNS Observer', 'role' => 'REPEATER'],
        ['city' => 'Sosnowiec', 'id_byte' => 'ce', 'lat' => 50.292623, 'lon' => 19.154665, 'name' => 'SO Srodula rpt', 'role' => 'REPEATER'],
        ['city' => 'Góra Świętej Anny', 'id_byte' => 'cb', 'lat' => 50.456333, 'lon' => 18.168993, 'name' => 'OST GSAnny', 'role' => 'REPEATER'],
        ['city' => 'Solarnia', 'id_byte' => '52', 'lat' => 50.647381, 'lon' => 18.614877, 'name' => 'SLU-SOLARNIA', 'role' => 'REPEATER'],
        ['city' => 'Jastrzębie-Zdrój', 'id_byte' => '70', 'lat' => 49.9916, 'lon' => 18.625259, 'name' => 'SJZ-szeroka-msi', 'role' => 'REPEATER'],
        ['city' => 'Bielsko-Biała', 'id_byte' => 'b7', 'lat' => 49.814741, 'lon' => 19.026287, 'name' => 'Os.Słoneczne/Bielsko', 'role' => 'REPEATER'],
        ['city' => 'Ujazd', 'id_byte' => '74', 'lat' => 50.390476, 'lon' => 18.349712, 'name' => 'OST Ujazd', 'role' => 'REPEATER'],
        ['city' => 'Knurów', 'id_byte' => '54', 'lat' => 50.20237, 'lon' => 18.68002, 'name' => 'SilesiaSuperior', 'role' => 'REPEATER'],
        ['city' => 'Dolní Marklovice', 'id_byte' => 'bb', 'lat' => 49.897803, 'lon' => 18.5678, 'name' => 'SCI-Markl.G.michal', 'role' => 'REPEATER'],
        ['city' => 'Siemianowice Śląskie', 'id_byte' => '1e', 'lat' => 50.299412, 'lon' => 19.02339, 'name' => 'RPT PIN 1', 'role' => 'REPEATER'],
        ['city' => 'Gilowice', 'id_byte' => 'd0', 'lat' => 49.710586, 'lon' => 19.33493, 'name' => 'RPT RBK Żywiec 3', 'role' => 'REPEATER'],
        ['city' => 'Kędzierzyn-Koźle', 'id_byte' => '3c', 'lat' => 50.34782, 'lon' => 18.22985, 'name' => 'OK Piasty RP 1', 'role' => 'REPEATER'],
        ['city' => 'Łany', 'id_byte' => '3a', 'lat' => 50.21827, 'lon' => 18.18747, 'name' => 'OK Kris', 'role' => 'REPEATER'],
        ['city' => 'Stanowice', 'id_byte' => 'eb', 'lat' => 50.13208, 'lon' => 18.677897, 'name' => 'SRB-1', 'role' => 'REPEATER'],
        ['city' => 'Czerwienne', 'id_byte' => 'b1', 'lat' => 49.37777, 'lon' => 19.93212, 'name' => 'XiaoS3 Repeater KRIS', 'role' => 'REPEATER'],
        ['city' => 'Podlesie', 'id_byte' => 'd3', 'lat' => 50.301737, 'lon' => 17.366101, 'name' => 'ONY Przednia Kopa', 'role' => 'REPEATER'],
        ['city' => 'Targanice', 'id_byte' => '1f', 'lat' => 49.789904, 'lon' => 19.334337, 'name' => 'MruX', 'role' => 'REPEATER'],
        ['city' => 'Ujazd', 'id_byte' => 'fd', 'lat' => 50.384684, 'lon' => 18.343392, 'name' => 'OST UjazdObserwator', 'role' => 'REPEATER'],
        ['city' => 'Woźniki', 'id_byte' => '67', 'lat' => 50.582252, 'lon' => 19.067229, 'name' => 'SLU-HYPERION', 'role' => 'REPEATER'],
        ['city' => 'Świętochłowice', 'id_byte' => '99', 'lat' => 50.267636, 'lon' => 18.924974, 'name' => 'SH Kriss Batory RPT1', 'role' => 'REPEATER'],
        ['city' => 'Przyszowice', 'id_byte' => 'e3', 'lat' => 50.250084, 'lon' => 18.730599, 'name' => 'Przyszowice RPT04 NE23', 'role' => 'REPEATER'],
        ['city' => 'Kędzierzyn-Koźle', 'id_byte' => '14', 'lat' => 50.346468, 'lon' => 18.221437, 'name' => 'OK NDM RP1', 'role' => 'REPEATER'],
        ['city' => 'Rydułtowy', 'id_byte' => '3a', 'lat' => 50.076602, 'lon' => 18.433515, 'name' => 'Larva RPT-01 Rydułtowy', 'role' => 'REPEATER'],
        ['city' => 'Racibórz', 'id_byte' => 'b0', 'lat' => 50.10078, 'lon' => 18.22578, 'name' => 'SRC Ostrog', 'role' => 'REPEATER'],
        ['city' => 'Pszczyna', 'id_byte' => 'b1', 'lat' => 49.99897, 'lon' => 18.919701, 'name' => 'SPS_Pszczyna_SW_RPT', 'role' => 'REPEATER'],
        ['city' => 'Opole', 'id_byte' => 'aa', 'lat' => 50.680505, 'lon' => 17.955019, 'name' => 'RAK4631 RPT TEST ZWM', 'role' => 'REPEATER'],
        ['city' => 'Zabrze', 'id_byte' => 'fb', 'lat' => 50.326038, 'lon' => 18.772547, 'name' => 'TS Temida Zabrze', 'role' => 'REPEATER'],
        ['city' => 'Wola', 'id_byte' => 'a2', 'lat' => 50.02623, 'lon' => 19.118502, 'name' => 'Wola-Baza-SPS', 'role' => 'REPEATER'],
        ['city' => 'Mikołów', 'id_byte' => 'ca', 'lat' => 50.22071, 'lon' => 18.82811, 'name' => 'SQ9MW Mikołów', 'role' => 'REPEATER'],
        ['city' => 'Tychy', 'id_byte' => 'cd', 'lat' => 50.081889, 'lon' => 18.978733, 'name' => 'MrROOM', 'role' => 'ROOMSERVER'],
        ['city' => 'Jawornik', 'id_byte' => '9f', 'lat' => 49.837207, 'lon' => 19.883593, 'name' => 'JAWORNIK.777.RPT', 'role' => 'REPEATER'],
        ['city' => 'Ujazd', 'id_byte' => '6c', 'lat' => 50.384959, 'lon' => 18.344059, 'name' => 'OST Ujazd Piaski', 'role' => 'REPEATER'],
        ['city' => 'Javorník', 'id_byte' => '60', 'lat' => 50.390534, 'lon' => 16.902536, 'name' => 'Borówkowa RPT', 'role' => 'REPEATER'],
        ['city' => 'Łącza', 'id_byte' => '56', 'lat' => 50.32223, 'lon' => 18.436587, 'name' => 'SGL REP Lacza', 'role' => 'REPEATER'],
        ['city' => 'Orzesze', 'id_byte' => 'f8', 'lat' => 50.15541, 'lon' => 18.783021, 'name' => 'BolM. Xiao_nrf52 RPT', 'role' => 'REPEATER'],
        ['city' => 'Racibórz', 'id_byte' => 'ac', 'lat' => 50.09196, 'lon' => 18.22, 'name' => 'SRC Rynek', 'role' => 'REPEATER'],
        ['city' => 'Racibórz', 'id_byte' => '7e', 'lat' => 50.08369, 'lon' => 18.20409, 'name' => 'MITKO Namioty SRC', 'role' => 'REPEATER'],
        ['city' => 'Nowa Góra', 'id_byte' => 'fb', 'lat' => 50.169, 'lon' => 19.602, 'name' => 'Biale Kapelusze', 'role' => 'REPEATER'],
        ['city' => 'Nowy Sącz', 'id_byte' => '90', 'lat' => 49.623245, 'lon' => 20.722328, 'name' => 'PL-KN Gołąbkowice', 'role' => 'REPEATER'],
        ['city' => 'Jankowice', 'id_byte' => '8d', 'lat' => 49.99834, 'lon' => 18.97689, 'name' => 'SPS-JANKOWICE-2', 'role' => 'REPEATER'],
        ['city' => 'Pszów', 'id_byte' => 'ab', 'lat' => 50.025177, 'lon' => 18.383291, 'name' => 'SWD Pszow DVQ 2', 'role' => 'REPEATER'],
        ['city' => 'Zakopane', 'id_byte' => 'c7', 'lat' => 49.23249, 'lon' => 19.98189, 'name' => 'POLSKIMESH.PL_RPT1', 'role' => 'REPEATER'],
        ['city' => 'Tarnowskie Góry', 'id_byte' => '66', 'lat' => 50.439449, 'lon' => 18.81258, 'name' => 'STA Przy Parku', 'role' => 'REPEATER'],
        ['city' => 'Pawłowice', 'id_byte' => 'e1', 'lat' => 49.944868, 'lon' => 18.708623, 'name' => 'Pawłowice_staw_RPT', 'role' => 'REPEATER'],
        ['city' => 'Częstochowa', 'id_byte' => '58', 'lat' => 50.83179, 'lon' => 19.117533, 'name' => 'Cz-wa Tysiąclecie RPT', 'role' => 'REPEATER'],
        ['city' => 'Stary Sącz', 'id_byte' => '8f', 'lat' => 49.563419, 'lon' => 20.643721, 'name' => 'Stary Sącz RoDoS', 'role' => 'REPEATER'],
        ['city' => 'Modlnica', 'id_byte' => 'ef', 'lat' => 50.123586, 'lon' => 19.879199, 'name' => 'WJT5 KRK Modlnica', 'role' => 'REPEATER'],
        ['city' => 'Tarnowskie Góry', 'id_byte' => '66', 'lat' => 50.44696, 'lon' => 18.83109, 'name' => 'STA Saperów 2', 'role' => 'REPEATER'],
        ['city' => 'Bytom', 'id_byte' => 'cf', 'lat' => 50.404907, 'lon' => 18.867816, 'name' => 'Max SG rpt', 'role' => 'REPEATER'],
        ['city' => 'Grodziec', 'id_byte' => 'f6', 'lat' => 50.70896, 'lon' => 18.2776, 'name' => 'OPO szesnasty kierunek', 'role' => 'REPEATER'],
        ['city' => 'Kościelisko', 'id_byte' => 'ad', 'lat' => 49.277488, 'lon' => 19.877858, 'name' => 'PL-KTT-Kościelisko-01', 'role' => 'REPEATER'],
        ['city' => 'Żory', 'id_byte' => '3b', 'lat' => 50.037689, 'lon' => 18.678228, 'name' => 'ZoryGliwicki', 'role' => 'REPEATER'],
        ['city' => 'Opole', 'id_byte' => '17', 'lat' => 50.679405, 'lon' => 17.968365, 'name' => 'OPO_SP6MPL_YAGI', 'role' => 'REPEATER'],
        ['city' => 'Leśna', 'id_byte' => 'f9', 'lat' => 49.66666, 'lon' => 19.12608, 'name' => 'Brzeziny Repeater', 'role' => 'REPEATER'],
        ['city' => 'Miłówka', 'id_byte' => 'f0', 'lat' => 49.565283, 'lon' => 19.111253, 'name' => 'Repeater f000', 'role' => 'REPEATER'],
        ['city' => 'Katowice', 'id_byte' => 'f4', 'lat' => 50.255726, 'lon' => 19.037409, 'name' => 'K-ce Paderewa TBS_OBSx2', 'role' => 'REPEATER'],
        ['city' => 'Częstochowa', 'id_byte' => '7b', 'lat' => 50.8511, 'lon' => 19.1392, 'name' => 'Kawie Repeater', 'role' => 'REPEATER'],
        ['city' => 'Gliwice', 'id_byte' => 'f5', 'lat' => 50.249248, 'lon' => 18.672117, 'name' => 'Drama Repeater', 'role' => 'REPEATER'],
        ['city' => 'Łany', 'id_byte' => '18', 'lat' => 50.211818, 'lon' => 18.213404, 'name' => 'OK KrisObserwator', 'role' => 'REPEATER'],
        ['city' => 'Racibórz', 'id_byte' => '0f', 'lat' => 50.076624, 'lon' => 18.17393, 'name' => 'SRC Ocice', 'role' => 'REPEATER'],
        ['city' => 'Żywiec', 'id_byte' => '7b', 'lat' => 49.67283, 'lon' => 19.1848, 'name' => 'Zywiec Xiao_nrf52 Room', 'role' => 'ROOMSERVER'],
        ['city' => 'Gliwice', 'id_byte' => 'a0', 'lat' => 50.30257, 'lon' => 18.63489, 'name' => 'SG-RD_A01C', 'role' => 'REPEATER'],
        ['city' => 'Pszów', 'id_byte' => '78', 'lat' => 50.059756, 'lon' => 18.398435, 'name' => 'Zabka', 'role' => 'REPEATER'],
        ['city' => 'Gliwice', 'id_byte' => '70', 'lat' => 50.29613, 'lon' => 18.63626, 'name' => 'SG-Instytut', 'role' => 'REPEATER'],
        ['city' => 'Gliwice', 'id_byte' => 'c1', 'lat' => 50.30332, 'lon' => 18.63542, 'name' => 'SG-C160', 'role' => 'REPEATER'],
        ['city' => 'Bytom', 'id_byte' => '9e', 'lat' => 50.40494, 'lon' => 18.86777, 'name' => 'MAX SG rpt uplink', 'role' => 'REPEATER'],
        ['city' => 'Czernica', 'id_byte' => '22', 'lat' => 50.083836, 'lon' => 18.406228, 'name' => 'Kukurydza', 'role' => 'REPEATER'],
        ['city' => 'Czerwionka-Leszczyny', 'id_byte' => 'ea', 'lat' => 50.157428, 'lon' => 18.66455, 'name' => 'SRB-2', 'role' => 'REPEATER'],
        ['city' => 'Wodzisław Śląski', 'id_byte' => 'dc', 'lat' => 49.994862, 'lon' => 18.482512, 'name' => 'Alfarek SWD RPT', 'role' => 'REPEATER'],
        ['city' => 'Bielsko-Biała', 'id_byte' => '3d', 'lat' => 49.833326, 'lon' => 19.015618, 'name' => 'BB_Lipki_RPT', 'role' => 'REPEATER'],
        ['city' => 'Krapkowice', 'id_byte' => '48', 'lat' => 50.46907, 'lon' => 17.96381, 'name' => 'MG-Krapkowice', 'role' => 'REPEATER'],
        ['city' => 'Wodzisław Śląski', 'id_byte' => '02', 'lat' => 49.97563, 'lon' => 18.49678, 'name' => 'MITKO NAMIOTY Repeater', 'role' => 'REPEATER'],
        ['city' => 'Bytom', 'id_byte' => '73', 'lat' => 50.356498, 'lon' => 18.899999, 'name' => 'SY Stadion SQ9OE', 'role' => 'REPEATER'],
        ['city' => 'Tychy', 'id_byte' => '99', 'lat' => 50.089062, 'lon' => 18.99682, 'name' => 'Tychy oZ', 'role' => 'REPEATER'],
        ['city' => 'Mikołów', 'id_byte' => '74', 'lat' => 50.16403, 'lon' => 18.92765, 'name' => 'Madlen Mikołów', 'role' => 'REPEATER'],
        ['city' => 'Kraków', 'id_byte' => '1e', 'lat' => 50.041707, 'lon' => 19.929067, 'name' => 'KRK os. Podwawelskie', 'role' => 'REPEATER'],
        ['city' => 'Strzelce Opolskie', 'id_byte' => '7a', 'lat' => 50.512842, 'lon' => 18.311622, 'name' => 'OST Sienkiewicza', 'role' => 'REPEATER'],
        ['city' => 'Przyszowice', 'id_byte' => '8e', 'lat' => 50.24376, 'lon' => 18.745697, 'name' => 'Przyszowice RPT06', 'role' => 'REPEATER'],
        ['city' => 'Dębowiec', 'id_byte' => 'f7', 'lat' => 50.29014, 'lon' => 17.54065, 'name' => 'OPR Dębowiec-Kobylica', 'role' => 'REPEATER'],
        ['city' => 'Żory', 'id_byte' => '37', 'lat' => 50.032448, 'lon' => 18.703629, 'name' => 'Krzychu-RPT2', 'role' => 'REPEATER'],
        ['city' => 'Kędzierzyn-Koźle', 'id_byte' => 'af', 'lat' => 50.339923, 'lon' => 18.203985, 'name' => 'OK Pogo', 'role' => 'REPEATER'],
        ['city' => 'Katowice', 'id_byte' => 'ec', 'lat' => 50.28246, 'lon' => 18.97256, 'name' => 'KTW RPT TEST', 'role' => 'REPEATER'],
        ['city' => 'Zabrze', 'id_byte' => 'b4', 'lat' => 50.336407, 'lon' => 18.791842, 'name' => 'SZ Mikulczyce PŁN', 'role' => 'REPEATER'],
        ['city' => 'Racibórz', 'id_byte' => '7d', 'lat' => 50.08055, 'lon' => 18.20614, 'name' => 'SRC Room', 'role' => 'ROOMSERVER'],
        ['city' => 'Zabrze', 'id_byte' => '8a', 'lat' => 50.326593, 'lon' => 18.77433, 'name' => 'SZ Kopernik Centrum', 'role' => 'REPEATER'],
    ];
}

/**
 * Pobiera URL najpierw przez cURL (rzadziej blokowane przez hosting niż
 * allow_url_fopen), a jeśli cURL nie jest dostępny albo zawiedzie —
 * próbuje file_get_contents jako zapasowej metody. Zwraca false, jeśli
 * obie metody zawiodą. $diag (przekazane przez referencję) wypełnia się
 * szczegółami diagnostycznymi — do wyświetlenia w odpowiedzi JSON.
 */
function fetch_url(string $url, array &$diag, int $timeout = 8) {
    $diag['curl_available'] = function_exists('curl_init');
    $diag['allow_url_fopen'] = (bool) ini_get('allow_url_fopen');

    if ($diag['curl_available']) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => $timeout,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_USERAGENT => 'MeshCoreSouth/1.0',
            CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4, // wymuś IPv4 — hosting zwraca "Network unreachable" po IPv6
        ]);
        $body = curl_exec($ch);
        $diag['curl_errno'] = curl_errno($ch);
        $diag['curl_error'] = curl_error($ch);
        $diag['curl_http_code'] = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $diag['curl_total_time'] = curl_getinfo($ch, CURLINFO_TOTAL_TIME);
        $ok = ($body !== false) && ($diag['curl_http_code'] === 200);
        curl_close($ch);
        if ($ok) return $body;
    }

    if ($diag['allow_url_fopen']) {
        $ctx = stream_context_create(['http' => ['timeout' => $timeout, 'ignore_errors' => true]]);
        $body = @file_get_contents($url, false, $ctx);
        $diag['fopen_response_headers'] = $http_response_header ?? null;
        if ($body !== false) return $body;
        $err = error_get_last();
        $diag['fopen_error'] = $err['message'] ?? null;
    }

    return false;
}

$diag = [];

$cache_file = sys_get_temp_dir() . '/meshcoresouth_nodes_cache.json';
$cache_ttl = 20; // sekund — krótszy niż odświeżanie po stronie klienta (30s), żeby dane były względnie świeże

$raw = null;
if (is_file($cache_file) && (time() - filemtime($cache_file)) < $cache_ttl) {
    $raw = file_get_contents($cache_file);
}

$used_fallback = false;

if ($raw === false || $raw === null) {
    $raw = fetch_url(URL_NODES_JSON, $diag);
    if ($raw !== false) {
        @file_put_contents($cache_file, $raw);
    }
}

$nodes = null;
if ($raw !== false && $raw !== null) {
    $decoded = json_decode($raw, true);
    if (is_array($decoded)) {
        $nodes = $decoded;
    }
}

if ($nodes === null) {
    // Nie udało się pobrać/zdekodować żywych danych — pokaż migawkę zamiast pustej mapy.
    $nodes = fallback_nodes();
    $used_fallback = true;
}

$result = [];
foreach ($nodes as $n) {
    if (!isset($n['lat'], $n['lon'], $n['role'])) continue;
    if (stripos($n['role'], 'repeat') === false) continue; // tylko REPEATER, nie ROOMSERVER itp.

    $xy = project_lat_lon((float) $n['lat'], (float) $n['lon']);
    $result[] = [
        'x' => $xy['x'],
        'y' => $xy['y'],
        'name' => $n['name'] ?? 'RPT',
        'city' => $n['city'] ?? '',
        'id_byte' => strtoupper($n['id_byte'] ?? '??'),
    ];
}

echo json_encode([
    'nodes' => $result,
    'count' => count($result),
    'updated' => date('H:i:s'),
    'fallback' => $used_fallback,
    'debug' => $diag,
]);
