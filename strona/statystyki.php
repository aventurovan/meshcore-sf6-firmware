<?php
$page_title = 'Statystyki';
$page_description = 'Statystyki sieci MeshCore Południe na żywo: węzły, repeatery, obserwatorzy, ruch w ciągu doby.';
require __DIR__ . '/includes/header.php';
?>

<section class="fl-page st-page">
  <div class="wrap">
    <div class="fl-head">
      <div>
        <span class="pill">Dane na żywo</span>
        <h1>Statystyki <span>sieci</span></h1>
        <p>Liczby z naszej mapy na żywo, z pakietów odebranych przez obserwatorów sieci na Południu Polski. Odświeżają się same co minutę.</p>
      </div>
      <div class="fl-ver card st-upd" id="stUpd"><div class="lbl">Aktualizacja</div><div class="val mono" id="stTime">…</div><div class="sub" id="stState">wczytywanie</div></div>
    </div>

    <div class="fl-notice">Dane dopiero się zbierają: mapa działa od 15.11.2026 i na razie liczy ruch słyszany przez część obserwatorów. Z każdym dniem obraz sieci będzie pełniejszy.</div>
    <div class="fl-notice err" id="stErr" hidden>Mapa na żywo jest chwilowo niedostępna. Spróbujemy ponownie za minutę.</div>

    <div class="st-tiles" id="stTiles">
      <div class="card st-tile"><div class="st-lbl">Aktywne węzły</div><div class="st-num" data-k="aktywne">–</div><div class="st-sub" data-k="wezly-sub">&nbsp;</div></div>
      <div class="card st-tile"><div class="st-lbl">Repeatery</div><div class="st-num" data-k="repeatery">–</div><div class="st-sub">znane mapie</div></div>
      <div class="card st-tile"><div class="st-lbl">Obserwatorzy online</div><div class="st-num" data-k="obserwatorzy">–</div><div class="st-sub" data-k="obs-sub">&nbsp;</div></div>
      <div class="card st-tile"><div class="st-lbl">Łącza (24 h)</div><div class="st-num" data-k="lacza24h">–</div><div class="st-sub">widziane połączenia radiowe</div></div>
      <div class="card st-tile"><div class="st-lbl">Pakiety na minutę</div><div class="st-num" data-k="pakietyMinuta">–</div><div class="st-sub">średnia z 5 min</div></div>
      <div class="card st-tile"><div class="st-lbl">Pakiety (1 h)</div><div class="st-num" data-k="pakietyGodzina">–</div><div class="st-sub">ostatnia godzina</div></div>
      <div class="card st-tile"><div class="st-lbl">Pakiety (24 h)</div><div class="st-num" data-k="pakiety24">–</div><div class="st-sub">ostatnia doba</div></div>
      <div class="card st-tile"><div class="st-lbl">Zajęcie kanału</div><div class="st-num" data-k="kanal">–</div><div class="st-sub">szacowany czas nadawania, 24 h</div></div>
    </div>

    <div class="card st-block">
      <h2>Ruch w ciągu doby</h2>
      <p class="st-note">Pakiety odebrane w każdej godzinie, ostatnie 24 h.</p>
      <div class="st-hours" id="stHours" role="img" aria-label="Wykres liczby pakietów w kolejnych godzinach"></div>
      <div class="st-hours-axis" id="stHoursAxis"></div>
    </div>

    <div class="st-two">
      <div class="card st-block">
        <h2>Najczęściej używane repeatery</h2>
        <p class="st-note">Ile pakietów przeszło przez repeater w ciągu doby (po prefiksie w ścieżce pakietu).</p>
        <ol class="st-rank" id="stRank"><li class="st-empty">Zbieramy dane…</li></ol>
      </div>
      <div class="card st-block">
        <h2>Liczba skoków</h2>
        <p class="st-note">Przez ile repeaterów przeszły pakiety (0 = odebrane bezpośrednio), 24 h.</p>
        <div class="st-bars" id="stHops"><div class="st-empty">Zbieramy dane…</div></div>
      </div>
    </div>

    <div class="st-foot">
      <a href="<?= URL_OUR_LIVE_MAP ?>" class="btn btn-green" target="_blank" rel="noopener">Otwórz mapę na żywo ↗</a>
      <a href="/#zasieg" class="btn btn-line">Mapa zasięgu</a>
    </div>
  </div>
</section>

<script>window.ST_URL = <?= json_encode(URL_LIVE_STATS) ?>;</script>
<script src="/assets/statystyki.js?v=<?= filemtime(__DIR__ . '/assets/statystyki.js') ?>"></script>
<?php require __DIR__ . '/includes/footer.php'; ?>
