<?php
/**
 * Renderuje <svg> z 16 województwami jako osobnymi, adresowalnymi ścieżkami.
 * Kolory i podświetlanie aktywnych województw (tam, gdzie są węzły RPT)
 * dzieje się po stronie klienta w assets/rpt-map.js — tu tylko rysujemy kształty.
 */
function render_coverage_map(): void {
    static $voivodeships = null;
    if ($voivodeships === null) {
        $json = file_get_contents(__DIR__ . '/voivodeships.json');
        $voivodeships = json_decode($json, true) ?: [];
    }
    ?>
    <svg id="coverage-map" viewBox="0 0 1000 950" xmlns="http://www.w3.org/2000/svg">
      <g id="voi-paths">
        <?php foreach ($voivodeships as $name => $d): ?>
          <path class="voi" data-voi="<?= htmlspecialchars($name) ?>" d="<?= $d ?>" />
        <?php endforeach; ?>
      </g>
      <g id="rpt-markers"></g>
    </svg>
    <?php
}
