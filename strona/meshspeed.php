<?php
$page_title = 'MeshSpeed – aplikacja do MeshCore';
$page_description = 'MeshSpeed: polska aplikacja do MeshCore – czat, węzły, narzędzia radiowe, zarządzanie repeaterami i Mapper SF6. Android, iPhone i przeglądarka.';
require __DIR__ . '/includes/header.php';

// najnowsza wersja APK na serwerze (/meshspeed/apk/meshspeed-X.Y.Z.apk)
$ms_ver = null;
foreach (glob(__DIR__ . '/meshspeed/apk/meshspeed-*.apk') ?: [] as $f) {
  if (preg_match('/meshspeed-(\d+\.\d+\.\d+)\.apk$/', $f, $m) && (!$ms_ver || version_compare($m[1], $ms_ver, '>'))) $ms_ver = $m[1];
}
$URL_MS_APK = '/meshspeed/apk/';
$URL_MS_WEB = '/meshspeed/';
$URL_MS_IOS = defined('URL_MESHSPEED_IOS') ? URL_MESHSPEED_IOS : '';
?>

<div class="ms">
  <!-- ============ HERO ============ -->
  <section class="ms-hero">
    <div class="wrap ms-hero-grid">
      <div class="ms-hero-text">
        <div class="ms-logo">Mesh<span>Speed</span></div>
        <h1>Cała sieć MeshCore w&nbsp;Twoim telefonie.</h1>
        <p class="ms-lead">Czat, węzły, narzędzia radiowe, zarządzanie repeaterami i Mapper SF6 – w jednej, w pełni polskiej aplikacji. Na Androida, iPhone'a i w przeglądarce.</p>
        <div class="ms-cta">
          <a href="<?= $URL_MS_APK ?>" class="ms-btn ms-btn-accent">
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.6 9.48l1.84-3.18a.38.38 0 0 0-.66-.38l-1.86 3.22a11.4 11.4 0 0 0-9.84 0L5.22 5.92a.38.38 0 0 0-.66.38L6.4 9.48A10.8 10.8 0 0 0 1 18h22a10.8 10.8 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z"/></svg>
            Pobierz na Androida
          </a>
          <a href="<?= $URL_MS_WEB ?>" class="ms-btn ms-btn-line">Otwórz w przeglądarce</a>
        </div>
        <p class="ms-meta"><?php if ($ms_ver): ?><span class="ms-chip">Wersja <?= htmlspecialchars($ms_ver) ?></span><?php endif; ?><span class="ms-chip">Bluetooth</span><span class="ms-chip">Każda sieć MeshCore</span></p>
      </div>

      <!-- makieta telefonu: pulpit aplikacji -->
      <div class="ms-phone" aria-label="Podgląd ekranu aplikacji MeshSpeed" role="img">
        <div class="ms-screen">
          <div class="ms-top">
            <span class="ms-top-logo">MESHSPEED</span>
            <span class="ms-node">Pawlo_C1 <i>GPS</i></span>
          </div>
          <div class="ms-gauges">
            <div class="ms-gauge"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27"/><circle class="v" cx="32" cy="32" r="27" style="--p:.87"/></svg><b>87%</b><span>Bateria</span></div>
            <div class="ms-gauge"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27"/><circle class="v g" cx="32" cy="32" r="27" style="--p:.62"/></svg><b>42</b><span>Kontakty</span></div>
            <div class="ms-gauge"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27"/><circle class="v b" cx="32" cy="32" r="27" style="--p:.35"/></svg><b>7</b><span>W zasięgu</span></div>
          </div>
          <div class="ms-card">
            <div class="ms-card-h">ROZMOWY</div>
            <div class="ms-chat"><span class="ms-av">#</span><div><b>Public</b><small>Ktoś słyszy mnie z Szyndzielni?</small></div><em>2</em></div>
            <div class="ms-chat"><span class="ms-av o">K</span><div><b>Kasia</b><small>Dotarłam, dzięki!</small></div></div>
            <div class="ms-chat"><span class="ms-av">#</span><div><b>Mapper SF6</b><small>Nowa trasa na mapie</small></div></div>
          </div>
          <div class="ms-card">
            <div class="ms-card-h">OSTATNI ADVERT</div>
            <div class="ms-adv"><span class="ms-dot"></span><div><b>RPT Skrzyczne</b><small>2 skoki · SNR 7.5 dB · 3 min temu</small></div></div>
          </div>
          <div class="ms-tabbar"><span class="on">Pulpit</span><span>Czaty</span><span>Węzły</span><span>Narzędzia</span></div>
        </div>
      </div>
    </div>
  </section>

  <!-- ============ FUNKCJE ============ -->
  <section class="ms-sec">
    <div class="wrap">
      <div class="ms-sec-head">
        <span class="ms-kicker">Funkcje</span>
        <h2>Wszystko, czego potrzebujesz w sieci mesh</h2>
      </div>
      <div class="ms-features">
        <article class="ms-feat">
          <div class="ms-ico"><svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4V5z"/></svg></div>
          <h3>Czat</h3>
          <p>Kanały i wiadomości prywatne. Pod wiadomościami możesz pokazać liczbę skoków, trasę i liczbę odbiorów. Historia zostaje tylko na Twoim telefonie.</p>
        </article>
        <article class="ms-feat">
          <div class="ms-ico"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/></svg></div>
          <h3>Pulpit z widżetami</h3>
          <p>Bateria, kontakty, węzły w zasięgu, ostatnie rozmowy i adverty. Układ ustawiasz pod siebie – także statusy swoich repeaterów, z datą i godziną odczytu.</p>
        </article>
        <article class="ms-feat">
          <div class="ms-ico"><svg viewBox="0 0 24 24"><circle cx="6" cy="7" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="17" r="2.5"/><path d="M8 8.5l3 6.5M16 8l-3 7M8.5 7h7"/></svg></div>
          <h3>Węzły i mapa</h3>
          <p>Zapisane kontakty radia z ulubionymi oraz węzły usłyszane z advertów. Wszystko na ciemnej mapie, razem z repeaterami sieci.</p>
        </article>
        <article class="ms-feat">
          <div class="ms-ico"><svg viewBox="0 0 24 24"><path d="M3 12h3l3-7 4 14 3-7h5"/></svg></div>
          <h3>Narzędzia radiowe</h3>
          <p>Trace, discovery, widmo, linia widoczności (LOS) do repeatera i zasięg repeatera albo dowolnego punktu.</p>
        </article>
        <article class="ms-feat">
          <div class="ms-ico"><svg viewBox="0 0 24 24"><path d="M12 3v4M12 17v4M5 12H3M21 12h-2"/><circle cx="12" cy="12" r="5"/><path d="M12 10v2l1.5 1.5"/></svg></div>
          <h3>Zarządzanie repeaterami</h3>
          <p>Zapisane repeatery z hasłami, szybkie logowanie, ustawienia i konsola. Idealne dla opiekunów RPT – zobacz <a href="/instrukcja.php#repeater">instrukcję repeatera</a>.</p>
        </article>
        <article class="ms-feat">
          <div class="ms-ico"><svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg></div>
          <h3>Mapper SF6 w środku</h3>
          <p>Mapowanie zasięgu prosto z aplikacji – punkty trafiają do tej samej bazy co <a href="/mapper-sf6.php">Mapper SF6</a>. GPS z telefonu albo z radia, interwał dopasowany do prędkości.</p>
        </article>
        <article class="ms-feat">
          <div class="ms-ico"><svg viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg></div>
          <h3>Szybkie wiadomości</h3>
          <p>Gotowe teksty wysyłane jednym dotknięciem – w terenie, w rękawiczkach, w biegu.</p>
        </article>
        <article class="ms-feat ms-soon">
          <div class="ms-ico"><svg viewBox="0 0 24 24"><path d="M5 16l1.5-6A2 2 0 0 1 8.4 8.5h7.2a2 2 0 0 1 1.9 1.5L19 16"/><rect x="3" y="16" width="18" height="4" rx="1.5"/><circle cx="7" cy="18" r=".8"/><circle cx="17" cy="18" r=".8"/></svg></div>
          <h3>Android Auto <span class="ms-tag">wkrótce</span></h3>
          <p>Mapper, statusy repeaterów, discovery i powiadomienia o wiadomościach na ekranie samochodu.</p>
        </article>
      </div>
    </div>
  </section>

  <!-- ============ JAK DZIAŁA ============ -->
  <section class="ms-sec ms-how">
    <div class="wrap ms-how-grid">
      <div>
        <span class="ms-kicker">Jak to działa</span>
        <h2>Telefon + Twój companion MeshCore</h2>
        <p>MeshSpeed łączy się przez Bluetooth z Twoim urządzeniem LoRa z firmware companion. Nie potrzebujesz internetu do rozmów – wiadomości idą przez radio i repeatery sieci.</p>
      </div>
      <ol class="ms-steps">
        <li><b>Wgraj firmware Companion Bluetooth</b><span>Najprościej przez nasz <a href="<?= URL_FLASHER ?>">Flasher SF6</a> – radio od razu ustawione dla sieci Południe.</span></li>
        <li><b>Zainstaluj MeshSpeed</b><span>APK na Androida, TestFlight na iPhone'a albo wersja w przeglądarce.</span></li>
        <li><b>Połącz i pisz</b><span>Wybierz swoje radio z listy urządzeń Bluetooth. Działa z każdą siecią MeshCore; Mapper działa tylko z presetem SF6.</span></li>
      </ol>
    </div>
  </section>

  <!-- ============ POBIERZ ============ -->
  <section class="ms-sec" id="pobierz-meshspeed">
    <div class="wrap">
      <div class="ms-sec-head">
        <span class="ms-kicker">Pobierz</span>
        <h2>Wybierz swoją platformę</h2>
      </div>
      <div class="ms-dl">
        <a class="ms-dl-card" href="<?= $URL_MS_APK ?>">
          <span class="ms-dl-os">Android</span>
          <b>Plik APK</b>
          <p>Instalacja spoza Sklepu Play. Przy pierwszej instalacji zezwól przeglądarce na instalowanie aplikacji.</p>
          <span class="ms-go">Pobierz<?= $ms_ver ? ' ' . htmlspecialchars($ms_ver) : '' ?> ›</span>
        </a>
        <?php if ($URL_MS_IOS): ?>
        <a class="ms-dl-card" href="<?= htmlspecialchars($URL_MS_IOS) ?>" target="_blank" rel="noopener">
          <span class="ms-dl-os">iPhone</span>
          <b>TestFlight</b>
          <p>Zainstaluj TestFlight z App Store, potem otwórz zaproszenie do MeshSpeed.</p>
          <span class="ms-go">Dołącz w TestFlight ›</span>
        </a>
        <?php else: ?>
        <div class="ms-dl-card ms-dl-off">
          <span class="ms-dl-os">iPhone</span>
          <b>TestFlight</b>
          <p>Wersja na iPhone'a będzie dostępna przez TestFlight. Link pojawi się tutaj.</p>
          <span class="ms-go">Wkrótce</span>
        </div>
        <?php endif; ?>
        <a class="ms-dl-card" href="<?= $URL_MS_WEB ?>">
          <span class="ms-dl-os">Przeglądarka</span>
          <b>Wersja WWW</b>
          <p>Bez instalacji – w Chrome lub Edge na komputerze albo Androidzie (wymaga Bluetooth w przeglądarce).</p>
          <span class="ms-go">Otwórz MeshSpeed ›</span>
        </a>
      </div>
    </div>
  </section>

  <!-- ============ FAQ ============ -->
  <section class="ms-sec ms-faq">
    <div class="wrap">
      <div class="ms-sec-head"><span class="ms-kicker">Pytania</span><h2>Najczęstsze pytania</h2></div>
      <details><summary>Czy potrzebuję osobnego urządzenia?</summary><p>Tak. MeshSpeed to aplikacja do urządzenia LoRa z firmware MeshCore Companion (Bluetooth). Sam telefon nie nadaje przez radio LoRa.</p></details>
      <details><summary>Czy działa poza siecią Południe?</summary><p>Tak, z każdą siecią MeshCore. Tylko narzędzie Mapper działa wyłącznie z presetem SF6, bo zapisuje dane do mapy sieci Południe.</p></details>
      <details><summary>Czy moje wiadomości trafiają na serwer?</summary><p>Nie. Historia wiadomości jest zapisywana tylko w telefonie. Na serwer trafiają wyłącznie punkty z mapowania, jeśli używasz Mappera.</p></details>
      <details><summary>Czym różni się od oficjalnej aplikacji MeshCore?</summary><p>MeshSpeed jest w pełni po polsku i ma dodatkowe narzędzia: pulpit z widżetami, narzędzia radiowe, zarządzanie repeaterami i wbudowany Mapper SF6. Obie aplikacje działają z tym samym firmware companion.</p></details>
    </div>
  </section>
</div>

<?php require __DIR__ . '/includes/footer.php'; ?>
