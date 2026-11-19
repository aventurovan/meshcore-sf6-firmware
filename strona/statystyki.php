<?php
$page_title = 'Statystyki';
$page_description = 'Statystyki sieci MeshCore Południe na żywo: węzły, repeatery, rekordy zasięgu, ruch w ciągu doby i historia sieci.';
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

    <div class="fl-notice" id="stNew">Dane dopiero się zbierają: mapa działa od <span id="stOd">15.11.2026</span> i na razie liczy ruch słyszany przez część obserwatorów. Z każdym dniem obraz sieci będzie pełniejszy.</div>
    <div class="fl-notice err" id="stErr" hidden>Mapa na żywo jest chwilowo niedostępna. Spróbujemy ponownie za minutę.</div>

    <div class="st-tiles" id="stTiles">
      <div class="card st-tile"><div class="st-lbl">Aktywne węzły</div><div class="st-num" data-k="aktywne">–</div><div class="st-sub" data-k="wezly-sub">&nbsp;</div></div>
      <div class="card st-tile"><div class="st-lbl">Repeatery</div><div class="st-num" data-k="repeatery">–</div><div class="st-sub">znane mapie</div></div>
      <div class="card st-tile"><div class="st-lbl">Obserwatorzy online</div><div class="st-num" data-k="obserwatorzy">–</div><div class="st-sub" data-k="obs-sub">&nbsp;</div></div>
      <div class="card st-tile"><div class="st-lbl">Łącza (24 h)</div><div class="st-num" data-k="lacza24h">–</div><div class="st-sub">widziane połączenia radiowe</div></div>
      <div class="card st-tile"><div class="st-lbl">Pakiety na minutę</div><div class="st-num" data-k="pakietyMinuta">–</div><div class="st-sub">średnia z 5 min</div></div>
      <div class="card st-tile"><div class="st-lbl">Pakiety (1 h)</div><div class="st-num" data-k="pakietyGodzina">–</div><div class="st-sub">ostatnia godzina</div></div>
      <div class="card st-tile"><div class="st-lbl">Pakiety (24 h)</div><div class="st-num" data-k="pakiety24">–</div><div class="st-sub">ostatnia doba</div></div>
      <div class="card st-tile" id="stKanalTile"><div class="st-lbl">Zajęcie kanału</div><div class="st-num" data-k="kanal">–</div><div class="st-sub" data-k="kanal-sub">szacowany czas nadawania, 24 h</div></div>
      <div class="card st-tile"><div class="st-lbl">Pokrycie strefy</div><div class="st-num" data-k="pokrycie">–</div><div class="st-sub" data-k="pokrycie-sub">obliczone z terenu</div></div>
      <div class="card st-tile"><div class="st-lbl">Nowe węzły (7 dni)</div><div class="st-num" data-k="nowe7">–</div><div class="st-sub" data-k="nowe-sub">&nbsp;</div></div>
      <div class="card st-tile"><div class="st-lbl">Wiadomości na kanałach</div><div class="st-num" data-k="kanaly24">–</div><div class="st-sub">ostatnia doba, bez treści</div></div>
      <div class="card st-tile"><div class="st-lbl">Rekord zasięgu</div><div class="st-num" data-k="rekordKm">–</div><div class="st-sub" data-k="rekord-sub">najdłuższe łącze od początku</div><a class="st-map" id="stRekordLink" href="#" target="_blank" rel="noopener" hidden>pokaż na mapie ↗</a></div>
    </div>

    <div class="card st-block" id="stPop">
      <h2>Zasięg sieci</h2>
      <p class="st-note">Ilu mieszkańców strefy mieszka w zasięgu repeaterów: zasięg liczony z modelu terenu, liczba ludności miejscowości z OpenStreetMap. Przeliczane co 30 minut.</p>
      <div class="st-pop" id="stPopBody"><div class="st-empty">Liczymy zasięg…</div></div>
    </div>

    <div class="card st-block">
      <div class="st-head">
        <div><h2>Rekordy sieci</h2><p class="st-note">Najdłuższe bezpośrednie łącze, najlepszy sygnał na łączu dłuższym niż 30 km i najdłuższa trasa pakietu.</p></div>
        <div class="st-seg" id="stRecTabs" role="tablist">
          <button type="button" data-o="doba" class="on" role="tab">Doba</button><button type="button" data-o="tydzien" role="tab">7 dni</button><button type="button" data-o="miesiac" role="tab">30 dni</button><button type="button" data-o="zawsze" role="tab">Od początku</button>
        </div>
      </div>
      <div class="st-records" id="stRecords"><div class="st-empty">Zbieramy dane…</div></div>
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
        <p class="st-note">Ile pakietów przeszło przez repeater w ciągu doby (po prefiksie w ścieżce pakietu). Gdy prefiks pasuje do kilku repeaterów, pokazujemy wszystkich możliwych.</p>
        <ol class="st-rank" id="stRank"><li class="st-empty">Zbieramy dane…</li></ol>
      </div>
      <div class="card st-block">
        <h2>Rodzaje pakietów</h2>
        <p class="st-note">Co płynie przez sieć w ciągu doby.</p>
        <div class="st-bars" id="stTypes"><div class="st-empty">Zbieramy dane…</div></div>
        <h2 class="st-h2-gap">Liczba skoków</h2>
        <p class="st-note">Przez ile repeaterów przeszły pakiety (0 = odebrane bezpośrednio), 24 h.</p>
        <div class="st-bars" id="stHops"><div class="st-empty">Zbieramy dane…</div></div>
      </div>
    </div>

    <div class="card st-block st-gap">
      <div class="st-head">
        <div><h2>Historia sieci</h2><p class="st-note" id="stHistNote">Jedno podsumowanie na każdy zakończony dzień.</p></div>
        <div class="st-tools">
          <div class="st-seg" id="stHistMetric" role="tablist">
            <button type="button" data-m="pakiety" class="on">Pakiety</button><button type="button" data-m="aktywne">Aktywne węzły</button><button type="button" data-m="repeatery">Repeatery</button><button type="button" data-m="pokrycie">Pokrycie %</button>
          </div>
          <div class="st-seg" id="stHistRange">
            <button type="button" data-r="30" class="on">30 dni</button><button type="button" data-r="365">Rok</button>
          </div>
        </div>
      </div>
      <div class="st-hist" id="stHist" role="img" aria-label="Wykres historii sieci"><div class="st-empty">Historia zbiera się od pierwszego pełnego dnia działania mapy.</div></div>
      <div class="st-hours-axis" id="stHistAxis"></div>
    </div>

    <div class="card st-block">
      <h2>Kiedy sieć jest najbardziej aktywna</h2>
      <p class="st-note" id="stHeatNote">Średnia liczba pakietów w danym dniu tygodnia i godzinie (ostatnie 4 tygodnie).</p>
      <div class="st-heat" id="stHeat"><div class="st-empty">Zbieramy dane…</div></div>
    </div>

    <div class="st-two">
      <div class="card st-block">
        <h2>Nowe w sieci</h2>
        <p class="st-note" id="stNewNote">Repeatery, które mapa usłyszała pierwszy raz w ostatnich 7 dniach.</p>
        <ul class="st-list" id="stNewList"><li class="st-empty">Zbieramy dane…</li></ul>
      </div>
      <div class="card st-block">
        <h2>Kanały</h2>
        <p class="st-note">Liczba wiadomości na kanałach w ciągu doby. Treści nie zapisujemy i nie pokazujemy.</p>
        <div class="st-bars" id="stChannels"><div class="st-empty">Zbieramy dane…</div></div>
      </div>
    </div>

    <div class="card st-block st-gap">
      <h2>Najaktywniejsze rejony</h2>
      <p class="st-note">Węzły aktywne w ciągu doby, przypisane do najbliższej miejscowości (do 30 km).</p>
      <div class="st-regions" id="stRegions"><div class="st-empty">Zbieramy dane…</div></div>
    </div>

    <div class="st-foot">
      <a href="<?= URL_OUR_LIVE_MAP ?>" class="btn btn-green" target="_blank" rel="noopener">Otwórz mapę na żywo ↗</a>
      <a href="/#zasieg" class="btn btn-line">Mapa zasięgu</a>
    </div>
  </div>
</section>

<script>window.ST_URL = <?= json_encode(URL_LIVE_STATS) ?>; window.ST_HIST_URL = <?= json_encode(URL_LIVE_HISTORY) ?>; window.ST_MAP_URL = <?= json_encode(URL_OUR_LIVE_MAP) ?>; window.ST_POP_URL = <?= json_encode(URL_LIVE_POPULATION) ?>;</script>
<script src="/assets/statystyki.js?v=<?= filemtime(__DIR__ . '/assets/statystyki.js') ?>"></script>
<?php require __DIR__ . '/includes/footer.php'; ?>
