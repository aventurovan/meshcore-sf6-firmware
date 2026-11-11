<?php
require_once __DIR__ . '/config.php';

// Każda strona może ustawić własny tytuł/opis przed dołączeniem tego pliku:
// $page_title = "Preset SF6"; $page_description = "...";
$page_title = $page_title ?? SITE_NAME;
$page_description = $page_description ?? 'Niezależna sieć LoRa off-grid dla Śląska, Podbeskidzia i Małopolski, działająca na presecie SF6.';
?>
<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= htmlspecialchars($page_title) ?> · <?= SITE_NAME ?></title>
<meta name="description" content="<?= htmlspecialchars($page_description) ?>">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800;900&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/style.css?v=<?= filemtime(__DIR__ . '/../assets/style.css') ?>">
</head>
<body>

<header>
  <div class="wrap headbar">
    <a href="/" class="brand">
      <svg width="28" height="28" viewBox="0 0 30 30" fill="none">
        <path d="M2 5 L12 15 L2 25" stroke="#10B981" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M10 5 L20 15 L10 25" stroke="#10B981" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>
        <path d="M18 5 L28 15 L18 25" stroke="#10B981" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" opacity=".4"/>
      </svg>
      <span class="brand-text"><span class="top">MESHCORE</span><span class="bottom">POŁUDNIE</span></span>
    </a>
    <nav><ul>
      <li><a href="/#co-to-jest">Co to jest?</a></li>
      <li><a href="/#jak-zaczac">Jak zacząć?</a></li>
      <li><a href="/#pobierz">Pobierz</a></li>
      <li><a href="/#sprzet">Sprzęt</a></li>
      <li><a href="/#konfiguracja">Konfiguracja</a></li>
      <li><a href="/#zasieg">Zasięg</a></li>
      <li><a href="/#mapper">Mapper</a></li>
      <li><a href="/flasher.php">Flasher</a></li>
      <li><a href="/statystyki.php">Statystyki</a></li>
    </ul></nav>
    <a href="<?= URL_LIVE_MAP ?>" class="btn btn-line" target="_blank" rel="noopener">Mapa ↗</a>
  </div>
</header>
