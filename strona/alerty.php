<?php
$page_title = 'Alerty sieci';
$page_description = 'Alerty sieci MeshCore Południe: niesłyszane repeatery, słabe baterie, zakłócenia i inne problemy wykryte przez mapę na żywo.';
require __DIR__ . '/includes/header.php';
?>

<section class="fl-page st-page al-page">
  <div class="wrap">
    <div class="fl-head">
      <div>
        <span class="pill">Stan sieci</span>
        <h1>Alerty <span>sieci</span></h1>
        <p>Problemy z repeaterami wykryte przez mapę na żywo: krytyczne na górze, niżej pozostałe. Kliknij „na mapie”, żeby zobaczyć repeater.</p>
      </div>
      <div class="fl-ver card st-upd"><div class="lbl">Aktualizacja</div><div class="val mono" id="alTime">…</div><div class="sub" id="alState">wczytywanie</div></div>
    </div>

    <div class="fl-notice err" id="alErr" hidden>Nie udało się wczytać alertów. Spróbujemy ponownie za kilka minut.</div>

    <div class="al-sum">
      <button type="button" class="card al-tile al-kryt" data-f="krytyczny"><div class="st-lbl">Krytyczne</div><div class="st-num" id="alNK">–</div><div class="st-sub">wymagają reakcji</div></button>
      <button type="button" class="card al-tile al-uwaga" data-f="uwaga"><div class="st-lbl">Pozostałe problemy</div><div class="st-num" id="alNU">–</div><div class="st-sub">do sprawdzenia</div></button>
      <button type="button" class="card al-tile al-all on" data-f=""><div class="st-lbl">Wszystkie</div><div class="st-num" id="alNA">–</div><div class="st-sub">pokaż wszystkie</div></button>
    </div>

    <div class="al-types" id="alTypes" role="tablist"></div>

    <div class="card st-block" id="alKrytBlock">
      <h2>Krytyczne</h2>
      <ul class="al-list" id="alKryt"><li class="st-empty">Wczytywanie…</li></ul>
    </div>
    <div class="card st-block" id="alUwagaBlock">
      <h2>Pozostałe problemy</h2>
      <ul class="al-list" id="alUwaga"><li class="st-empty">Wczytywanie…</li></ul>
    </div>

    <div class="st-foot">
      <a href="<?= URL_OUR_LIVE_MAP ?>" class="btn btn-green" target="_blank" rel="noopener">Otwórz mapę na żywo ↗</a>
      <a href="/statystyki.php" class="btn btn-line">Statystyki sieci</a>
    </div>
  </div>
</section>

<script>window.AL_DANE = '/dane/alerty.json'; window.AL_URL = <?= json_encode(URL_LIVE_ALERTS) ?>; window.ST_MAP_URL = <?= json_encode(URL_OUR_LIVE_MAP) ?>;</script>
<script src="/assets/alerty.js?v=<?= filemtime(__DIR__ . '/assets/alerty.js') ?>"></script>
<?php require __DIR__ . '/includes/footer.php'; ?>
