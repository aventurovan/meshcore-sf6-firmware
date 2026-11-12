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
    <?php
    $menu = [
      'Sieć' => [
        ['/#co-to-jest', 'Co to jest?', 'MeshCore i sieć Południe w skrócie'],
        ['/#zasieg', 'Zasięg', 'Mapa repeaterów w regionie'],
        ['/statystyki.php', 'Statystyki', 'Dane o sieci'],
        [URL_LIVE_MAP, 'Mapa na żywo ↗', 'Węzły i ruch w sieci', true],
      ],
      'Start' => [
        ['/#jak-zaczac', 'Jak zacząć?', 'Trzy kroki do pierwszej wiadomości'],
        ['/instrukcja.php', 'Instrukcja', 'Companion i repeater krok po kroku'],
        ['/#sprzet', 'Sprzęt', 'Polecane urządzenia'],
        ['/#konfiguracja', 'Konfiguracja', 'Preset SF6 i prefiks 2 bajty'],
      ],
      'Aplikacje' => [
        ['/meshspeed.php', 'MeshSpeed', 'Nasza aplikacja do MeshCore'],
        ['/#pobierz', 'Aplikacja MeshCore', 'Oficjalna aplikacja: telefon i komputer'],
        ['/#mapper', 'Mapper SF6', 'Mapowanie zasięgu sieci'],
      ],
    ];
    $here = basename(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: 'index.php');
    $gi = 0;
    ?>
    <nav class="mainnav" aria-label="Menu główne">
      <ul class="nav-top">
        <?php foreach ($menu as $group => $items): $gi++;
          $active = false;
          foreach ($items as $it) { if (basename(parse_url($it[0], PHP_URL_PATH) ?: '') === $here && $here !== 'index.php' && $here !== '') $active = true; }
        ?>
        <li class="nav-group<?= $active ? ' is-active' : '' ?>">
          <button type="button" class="nav-btn" aria-expanded="false" aria-controls="nav-dd-<?= $gi ?>"><?= $group ?><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          <ul class="nav-dd" id="nav-dd-<?= $gi ?>">
            <?php foreach ($items as $it): $ext = !empty($it[3]); ?>
            <li><a href="<?= htmlspecialchars($it[0]) ?>"<?= $ext ? ' target="_blank" rel="noopener"' : '' ?>><b><?= $it[1] ?></b><span><?= $it[2] ?></span></a></li>
            <?php endforeach; ?>
          </ul>
        </li>
        <?php endforeach; ?>
        <li class="nav-single<?= $here === 'flasher.php' ? ' is-active' : '' ?>"><a href="/flasher.php" class="nav-link">Flasher</a></li>
      </ul>
    </nav>
    <div class="head-actions">
      <a href="<?= URL_LIVE_MAP ?>" class="btn btn-line head-map" target="_blank" rel="noopener">Mapa ↗</a>
      <button type="button" class="nav-burger" aria-expanded="false" aria-controls="mobile-nav" aria-label="Otwórz menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
  <div class="mobile-nav" id="mobile-nav" hidden>
    <div class="wrap">
      <?php foreach ($menu as $group => $items): ?>
      <div class="mn-group">
        <div class="mn-title"><?= $group ?></div>
        <?php foreach ($items as $it): $ext = !empty($it[3]); ?>
        <a href="<?= htmlspecialchars($it[0]) ?>"<?= $ext ? ' target="_blank" rel="noopener"' : '' ?>><b><?= $it[1] ?></b><span><?= $it[2] ?></span></a>
        <?php endforeach; ?>
      </div>
      <?php endforeach; ?>
      <a href="/flasher.php" class="btn btn-green mn-flasher">Flasher SF6</a>
    </div>
  </div>
</header>
<script>
(() => {
  const groups = [...document.querySelectorAll(".nav-group")];
  const closeAll = except => groups.forEach(g => { if (g !== except) { g.classList.remove("open"); g.querySelector(".nav-btn").setAttribute("aria-expanded", "false"); } });
  groups.forEach(g => {
    const b = g.querySelector(".nav-btn");
    b.addEventListener("click", e => {
      e.stopPropagation();
      const open = !g.classList.contains("open");
      closeAll(g);
      g.classList.toggle("open", open);
      b.setAttribute("aria-expanded", open);
    });
  });
  document.addEventListener("click", e => { if (!e.target.closest(".nav-group")) closeAll(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { closeAll(); toggleMobile(false); } });
  const burger = document.querySelector(".nav-burger"), mobile = document.getElementById("mobile-nav");
  function toggleMobile(open) {
    mobile.hidden = !open;
    burger.setAttribute("aria-expanded", open);
    burger.setAttribute("aria-label", open ? "Zamknij menu" : "Otwórz menu");
    document.body.classList.toggle("menu-open", open);
  }
  burger.addEventListener("click", () => toggleMobile(mobile.hidden));
  mobile.addEventListener("click", e => { if (e.target.closest("a")) toggleMobile(false); });
  document.querySelectorAll(".nav-dd a").forEach(a => a.addEventListener("click", () => closeAll()));
})();
</script>
