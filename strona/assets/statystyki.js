// Statystyki sieci z mapy na żywo (live.meshcoresouth.pl/api/export/statystyki.json + statystyki-historia.json).
// Wszystkie dane odświeżane co godzinę.
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n, d = 0) => (n == null ? '–' : Number(n).toLocaleString('pl-PL', { maximumFractionDigits: d }));
  const set = (k, v) => document.querySelectorAll(`[data-k="${k}"]`).forEach((e) => (e.textContent = v));
  const MAPA = (window.ST_MAP_URL || 'https://live.meshcoresouth.pl/').replace(/\/?$/, '/');
  const naMapie = (cle) => (cle ? ` <a class="st-map" href="${MAPA}?mc=${encodeURIComponent(String(cle).slice(0, 16))}" target="_blank" rel="noopener" title="Zobacz na mapie na żywo">na mapie ↗</a>` : '');
  // odmiana: 1 repeater, 2 repeatery, 5 repeaterów
  const odm = (n, a, b, c) => { n = Math.abs(n); const d = n % 10, s = n % 100; return n === 1 ? a : d >= 2 && d <= 4 && (s < 12 || s > 14) ? b : c; };
  // link do mapy z narysowanym łączem / trasą
  const naMapieLacze = (a, b) => (a && b && a.cle && b.cle ? ` <a class="st-map st-map-btn" href="${MAPA}?lacze=${encodeURIComponent(a.cle.slice(0, 16))},${encodeURIComponent(b.cle.slice(0, 16))}" target="_blank" rel="noopener">pokaż na mapie ↗</a>` : '');
  const naMapieTrasa = (klucze) => (klucze && klucze.length >= 2 ? ` <a class="st-map st-map-btn" href="${MAPA}?trasa=${klucze.map((k) => encodeURIComponent(String(k).slice(0, 16))).join(',')}" target="_blank" rel="noopener">pokaż trasę na mapie ↗</a>` : '');
  const nazwaW = (w) => (w ? esc(w.nazwa) : '?');
  const kiedy = (t) => {
    if (!t) return '';
    const s = (Date.now() - t) / 1000;
    if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min temu`;
    if (s < 86400) return `${Math.round(s / 3600)} h temu`;
    return new Date(t).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  };
  const TYPY = {
    ADVERT: 'Ogłoszenia węzłów (advert)', GRP_TXT: 'Wiadomości na kanałach', TXT_MSG: 'Wiadomości prywatne', ACK: 'Potwierdzenia', PATH: 'Ścieżki zwrotne',
    REQ: 'Żądania', RESPONSE: 'Odpowiedzi', TRACE: 'Śledzenie trasy', ANON_REQ: 'Logowania', GRP_DATA: 'Dane kanałów', CONTROL: 'Sterowanie (discovery)', MULTIPART: 'Pakiety wieloczęściowe', RAW_CUSTOM: 'Inne',
  };
  let ostatnie = null, historia = null, okresRek = 'doba', miara = 'pakiety', zakres = 30;

  // Lista poziomych pasków [{etykieta(html), nb}]
  function paski(box, wiersze, opcje = {}) {
    if (!wiersze.length) { box.innerHTML = '<div class="st-empty">Zbieramy dane…</div>'; return; }
    const total = wiersze.reduce((t, x) => t + x.nb, 0) || 1, max = Math.max(1, ...wiersze.map((x) => x.nb));
    box.innerHTML = wiersze.map((x) => `<div class="st-row" title="${fmt(x.nb)} (${Math.round((x.nb / total) * 100)} %)"><div class="st-row-top"><span class="st-rank-name">${x.etykieta}</span><b>${opcje.liczby ? fmt(x.nb) : Math.round((x.nb / total) * 100) + ' %'}</b></div><div class="st-bar"><i style="width:${(x.nb / max) * 100}%"></i></div></div>`).join('');
  }

  function tiles(d) {
    const l = d.liczniki || {}, doba = d.doba || {};
    set('aktywne', fmt(l.aktywne));
    set('wezly-sub', l.wezly != null ? `z ${fmt(l.wezly)} znanych węzłów` : '');
    set('repeatery', fmt(l.repeatery));
    set('obserwatorzy', fmt(l.obserwatorzyOnline));
    set('obs-sub', l.obserwatorzy != null ? `z ${fmt(l.obserwatorzy)} w ciągu doby` : '');
    set('lacza24h', fmt(l.lacza24h));
    set('pakietyMinuta', fmt(l.pakietyMinuta, 1));
    set('pakietyGodzina', fmt(l.pakietyGodzina));
    set('pakiety24', fmt(doba.pakiety));
    // Zajęcie kanału z progami: do 10 % spokojnie, 10–25 % tłoczno, powyżej 25 % kolizje
    const z = doba.zajecieKanaluPct, tile = $('stKanalTile');
    set('kanal', z == null ? '–' : `${fmt(z, 1)} %`);
    tile.classList.remove('st-ok', 'st-warn', 'st-bad');
    if (z != null) { tile.classList.add(z < 10 ? 'st-ok' : z < 25 ? 'st-warn' : 'st-bad'); set('kanal-sub', z < 10 ? 'kanał spokojny · 24 h' : z < 25 ? 'kanał zatłoczony · 24 h' : 'dużo kolizji · 24 h'); }
    const p = d.pokrycie;
    set('pokrycie', p && p.pct != null ? `${fmt(p.pct, 1)} %` : '–');
    set('pokrycie-sub', p && p.km2 ? `${fmt(p.km2)} km² · ${fmt(p.rpt)} ${odm(p.rpt, 'repeater', 'repeatery', 'repeaterów')}` : 'liczymy z terenu…');
    const n = d.nowe || {};
    set('nowe7', fmt(n.tydzien));
    set('nowe-sub', n.doba != null ? `w tym ${fmt(n.doba)} z ostatniej doby` : '');
    set('kanaly24', fmt((d.kanaly || {}).doba));
    const rz = ((d.rekordy || {}).zawsze || {}).lacze;
    set('rekordKm', rz ? `${fmt(rz.km, 1)} km` : '–');
    set('rekord-sub', rz ? `${rz.a.nazwa} ↔ ${rz.b.nazwa}` : 'najdłuższe łącze od początku');
    const rl = $('stRekordLink');
    if (rl) { if (rz && rz.a.cle && rz.b.cle) { rl.href = `${MAPA}?lacze=${encodeURIComponent(rz.a.cle.slice(0, 16))},${encodeURIComponent(rz.b.cle.slice(0, 16))}`; rl.hidden = false; } else rl.hidden = true; }
  }

  function records(d) {
    const r = ((d.rekordy || {})[okresRek]) || {};
    const box = $('stRecords');
    const karta = (tytul, wartosc, opis, czas) => `<div class="st-rec"><div class="st-lbl">${tytul}</div><div class="st-rec-val">${wartosc}</div><div class="st-rec-desc">${opis}</div>${czas ? `<div class="st-sub">${kiedy(czas)}</div>` : ''}</div>`;
    const brak = '<div class="st-rec-desc st-empty">brak danych w tym okresie</div>';
    box.innerHTML = [
      r.lacze ? karta('Najdłuższe łącze', `${fmt(r.lacze.km, 1)} km`, `${nazwaW(r.lacze.a)} ↔ ${nazwaW(r.lacze.b)}${naMapieLacze(r.lacze.a, r.lacze.b)}`, r.lacze.czas) : `<div class="st-rec"><div class="st-lbl">Najdłuższe łącze</div>${brak}</div>`,
      r.snr ? karta('Najlepszy sygnał (≥ 30 km)', `${fmt(r.snr.snr, 1)} dB`, `${nazwaW(r.snr.a)} ↔ ${nazwaW(r.snr.b)} · ${fmt(r.snr.km, 1)} km${naMapieLacze(r.snr.a, r.snr.b)}`, r.snr.czas) : `<div class="st-rec"><div class="st-lbl">Najlepszy sygnał (≥ 30 km)</div>${brak}</div>`,
      r.skoki ? karta('Najdłuższa trasa', `${fmt(r.skoki.skoki)} ${odm(r.skoki.skoki, 'skok', 'skoki', 'skoków')}`, `${r.skoki.od ? `nadawca: ${nazwaW(r.skoki.od)}` : 'nadawca nieznany'}${naMapieTrasa(r.skoki.trasa)}`, r.skoki.czas) : `<div class="st-rec"><div class="st-lbl">Najdłuższa trasa</div>${brak}</div>`,
    ].join('');
  }

  // 24 słupki godzinowe; brakujące godziny = 0
  function hours(d) {
    const box = $('stHours'), axis = $('stHoursAxis');
    const m = new Map(((d.doba || {}).godziny || []).map((g) => [Math.floor(new Date(g.godzina).getTime() / 3600000), g.nb]));
    const teraz = Math.floor(Date.now() / 3600000), h = [];
    for (let i = 23; i >= 0; i--) h.push({ t: teraz - i, nb: m.get(teraz - i) || 0 });
    const max = Math.max(1, ...h.map((x) => x.nb));
    const godz = (t) => new Date(t * 3600000).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    box.innerHTML = h.map((x) => `<div class="st-col" tabindex="0" data-tip="<b>${fmt(x.nb)}</b> ${odm(x.nb, 'pakiet', 'pakiety', 'pakietów')}<small>${godz(x.t)}–${godz(x.t + 1)}</small>"><i style="height:${x.nb ? Math.max(3, (x.nb / max) * 100) : 0}%"></i></div>`).join('');
    box.setAttribute('aria-label', 'Pakiety w kolejnych godzinach: ' + h.map((x) => `${godz(x.t)} ${x.nb}`).join(', '));
    axis.innerHTML = h.map((x, i) => `<span>${i % 6 === 0 || i === 23 ? godz(x.t) : ''}</span>`).join('');
  }

  function rank(d) {
    const r = ((d.doba || {}).repeatery || []);
    const ol = $('stRank');
    if (!r.length) { ol.innerHTML = '<li class="st-empty">Zbieramy dane…</li>'; return; }
    const max = Math.max(1, ...r.map((x) => x.nb));
    ol.innerHTML = r.map((x) => {
      const nazwy = x.kandydaciNazwy || [];
      let nazwa;
      if (x.nazwa) nazwa = esc(x.nazwa) + naMapie(x.cle);
      else if (nazwy.length > 1) nazwa = `${nazwy.map(esc).join(' / ')} <small>(${nazwy.length} ${odm(nazwy.length, 'możliwy', 'możliwe', 'możliwych')} · prefiks <span class="mono">${esc(x.prefiks)}</span>)</small>`;
      else nazwa = `<span class="mono">${esc(x.prefiks)}</span> <small>(nieznany repeater)</small>`;
      return `<li title="${fmt(x.nb)} pakietów"><div class="st-rank-row"><span class="st-rank-name">${nazwa}</span><b>${fmt(x.nb)}</b></div><div class="st-bar"><i style="width:${(x.nb / max) * 100}%"></i></div></li>`;
    }).join('');
  }

  function types(d) {
    const t = ((d.doba || {}).typy || []).filter((x) => x.nb > 0);
    paski($('stTypes'), t.map((x) => ({ etykieta: esc(TYPY[x.typ] || x.typ || 'Inne'), nb: x.nb })).slice(0, 8));
  }

  function hops(d) {
    const s = ((d.doba || {}).skoki || []).filter((x) => x.skoki != null);
    const g = new Map();
    for (const x of s) { const k = Math.min(x.skoki, 10); g.set(k, (g.get(k) || 0) + x.nb); }
    const rows = [...g.entries()].sort((a, b) => a[0] - b[0]);
    paski($('stHops'), rows.map(([k, nb]) => ({ etykieta: k === 0 ? 'bezpośrednio' : `${k === 10 ? '10+' : k} ${k === 10 ? 'skoków' : odm(k, 'skok', 'skoki', 'skoków')}`, nb })));
  }

  function nowe(d) {
    const n = d.nowe || {}, ul = $('stNewList');
    $('stNewNote').textContent = 'Repeatery, które mapa usłyszała pierwszy raz w ostatnich 7 dniach.';
    const l = n.repeatery || [];
    ul.innerHTML = l.length ? l.map((x) => `<li><span>${esc(x.nazwa)}${naMapie(x.cle)}</span><small>${kiedy(x.od)}</small></li>`).join('') : '<li class="st-empty">Brak nowych repeaterów w tym tygodniu.</li>';
  }

  function kanaly(d) {
    const k = (d.kanaly || {}).lista || [];
    paski($('stChannels'), k.map((x) => ({ etykieta: esc(x.kanal), nb: x.nb })), { liczby: true });
    if (!k.length) $('stChannels').innerHTML = '<div class="st-empty">Brak wiadomości na kanałach w ciągu doby.</div>';
  }

  function rejony(d) {
    const r = d.rejony || [], box = $('stRegions');
    if (!r.length) { box.innerHTML = '<div class="st-empty">Zbieramy dane…</div>'; return; }
    const max = Math.max(1, ...r.map((x) => x.wezly));
    box.innerHTML = r.map((x, i) => `<div class="st-region"><span class="st-region-k">${i + 1}</span><div class="st-region-body"><div class="st-rank-row"><span>${esc(x.rejon)}</span><b>${fmt(x.wezly)}</b></div><div class="st-bar"><i style="width:${(x.wezly / max) * 100}%"></i></div><small>${fmt(x.repeatery)} ${odm(x.repeatery, 'repeater', 'repeatery', 'repeaterów')} · ${fmt(x.wezly - x.repeatery)} ${odm(x.wezly - x.repeatery, 'inny węzeł', 'inne węzły', 'innych węzłów')}</small></div></div>`).join('');
  }

  // ---- Strefa: okno z mapą Polski, województwa strefy i repeatery ----
  let strefa = null;
  function notice(d) { if (d.strefa) strefa = d.strefa; }
  function pokazStrefe() {
    const dlg = $('stStrefa'), svg = document.getElementById('coverage-map');
    const opis = (strefa && strefa.opis) || '';
    const woj = (opis.match(/\(([^)]+)\)/) || [, ''])[1].split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
    // bez polskich znaków: w mapie ze strony głównej jest np. „ślaskie”
    const norm = (t) => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l');
    const wojN = woj.map(norm);
    svg.querySelectorAll('.voi').forEach((p) => {
      const w = wojN.includes(norm(p.dataset.voi || ''));
      p.classList.toggle('voi-active', w);
      if (w) p.parentNode.appendChild(p);
    });
    $('stStrefaOpis').textContent = woj.length
      ? `${(strefa && strefa.nazwa) || 'Strefa'}: ${woj.join(', ')}. Dla tego obszaru liczymy pokrycie i zasięg sieci.`
      : 'Obszar, dla którego liczymy pokrycie i zasięg sieci.';
    // repeatery: ten sam rzut co mapa na stronie głównej (assets/rpt-map.js)
    const g = document.getElementById('rpt-markers'), NS = 'http://www.w3.org/2000/svg';
    g.innerHTML = '';
    const rpt = (strefa && strefa.repeatery) || [];
    for (const [lat, lon] of rpt) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', (Math.abs(lon - 14.07) * 1000 / 10.2).toFixed(1));
      c.setAttribute('cy', (Math.abs(lat - 54.9) * 950 / 5.9).toFixed(1));
      c.setAttribute('r', '5');
      g.appendChild(c);
    }
    $('stStrefaRpt').textContent = rpt.length ? `${fmt(rpt.length)} ${odm(rpt.length, 'repeater', 'repeatery', 'repeaterów')} z pozycją (ostatnie 24 h)` : 'repeatery z pozycją';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }
  $('stStrefaBtn').addEventListener('click', pokazStrefe);
  $('stStrefaX').addEventListener('click', () => $('stStrefa').close());
  $('stStrefa').addEventListener('click', (e) => { if (e.target === $('stStrefa')) $('stStrefa').close(); });

  // ---- Dymek z liczbą nad słupkiem (ruch w ciągu doby, historia) ----
  const tip = document.createElement('div');
  tip.className = 'st-tip'; tip.hidden = true; document.body.appendChild(tip);
  function pokazTip(e) {
    const col = e.target.closest && e.target.closest('.st-col[data-tip]');
    if (!col) { tip.hidden = true; return; }
    tip.innerHTML = col.dataset.tip; tip.hidden = false;
    const r = col.getBoundingClientRect(), t = tip.getBoundingClientRect();
    const x = Math.min(Math.max(8, r.left + r.width / 2 - t.width / 2), window.innerWidth - t.width - 8);
    const bar = col.querySelector('i'), top = bar && bar.offsetHeight ? bar.getBoundingClientRect().top : r.bottom;
    tip.style.left = x + window.scrollX + 'px';
    tip.style.top = top + window.scrollY - t.height - 8 + 'px';
  }
  for (const ev of ['mouseover', 'focusin']) document.addEventListener(ev, pokazTip);
  for (const ev of ['mouseout', 'focusout']) document.addEventListener(ev, (e) => { if (e.target.closest && e.target.closest('.st-col')) tip.hidden = true; });

  // ---- Historia: słupki dzienne dla wybranej miary ----
  function hist() {
    const box = $('stHist'), axis = $('stHistAxis');
    const dni = ((historia || {}).dni || []).slice(-zakres);
    const wart = (x) => (miara === 'pokrycie' ? (x.pokrycie ? x.pokrycie.pct : null) : x[miara]);
    const z = dni.filter((x) => wart(x) != null);
    if (!z.length) { box.innerHTML = `<div class="st-empty">${miara === 'pokrycie' ? 'Pokrycie zapisujemy raz na dobę, gdy model terenu jest gotowy.' : 'Historia zbiera się od pierwszego pełnego dnia działania mapy.'}</div>`; axis.innerHTML = ''; return; }
    const max = Math.max(1e-9, ...z.map(wart));
    const jedn = { pakiety: 'pakietów', aktywne: 'aktywnych węzłów', repeatery: 'aktywnych repeaterów', pokrycie: '% strefy' }[miara];
    const data = (s) => new Date(s + 'T12:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
    // Liczby nad słupkami: przy ≤ 31 dniach nad każdym, przy dłuższym zakresie tylko maksimum i ostatni dzień
    const wszystkie = dni.length <= 31;
    const iMax = dni.reduce((b, x, i) => (wart(x) != null && (b < 0 || wart(x) > wart(dni[b])) ? i : b), -1);
    const gesto = dni.length > 14;
    const krotko = (v) => (miara === 'pokrycie' ? fmt(v, gesto ? 0 : 1) + '%'
      : gesto && v >= 1000 ? fmt(v >= 10000 ? Math.round(v / 1000) : Math.round(v / 100) / 10, 1) + 'k'
      : v >= 10000 ? fmt(Math.round(v / 100) / 10, 1) + ' tys.' : fmt(v, 0));
    box.classList.toggle('st-hist-gesto', gesto);
    box.innerHTML = dni.map((x, i) => {
      const v = wart(x), kluczowa = i === iMax || i === dni.length - 1;
      const etyk = v != null && (wszystkie || kluczowa) ? `<b class="st-val${kluczowa ? ' st-val-k' : ''}${i === 0 ? ' st-val-l' : ''}${i === dni.length - 1 && dni.length > 2 ? ' st-val-p' : ''}">${krotko(v)}</b>` : '';
      return `<div class="st-col" tabindex="0" data-tip="${v == null ? 'brak danych' : '<b>' + fmt(v, 1) + '</b> ' + jedn}<small>${data(x.dzien)}</small>"><i style="height:${v ? Math.max(3, (v / max) * 100) : 0}%">${etyk}</i></div>`;
    }).join('');
    const co = Math.max(1, Math.ceil(dni.length / 6));
    axis.innerHTML = dni.map((x, i) => `<span>${i % co === 0 || i === dni.length - 1 ? data(x.dzien) : ''}</span>`).join('');
    $('stHistNote').textContent = `Jedno podsumowanie na każdy zakończony dzień · ${dni.length} ${dni.length === 1 ? 'dzień' : 'dni'} w historii.`;
  }

  // ---- Mapa cieplna: dzień tygodnia × godzina ----
  function heat() {
    const c = (historia || {}).cieplo, box = $('stHeat');
    if (!c || !c.dni || !c.dni.some((n) => n > 0)) { box.innerHTML = '<div class="st-empty">Zbieramy dane…</div>'; return; }
    const max = Math.max(1e-9, ...c.srednia.flat());
    let h = '<div class="st-heat-grid"><span></span>' + Array.from({ length: 24 }, (_, g) => `<span class="st-heat-h">${g % 3 === 0 ? g : ''}</span>`).join('');
    c.srednia.forEach((w, d) => {
      h += `<span class="st-heat-d">${c.dniTygodnia[d]}</span>`;
      h += w.map((v, g) => `<i tabindex="0" style="--a:${c.dni[d] ? (0.06 + 0.94 * (v / max)).toFixed(3) : 0}" title="${c.dniTygodnia[d]}, ${g}:00–${g + 1}:00 · średnio ${fmt(v, 1)} pakietów${c.dni[d] ? '' : ' (brak danych)'}"></i>`).join('');
    });
    box.innerHTML = h + '</div><div class="st-heat-leg"><span>mniej</span><i style="--a:.1"></i><i style="--a:.4"></i><i style="--a:.7"></i><i style="--a:1"></i><span>więcej</span></div>';
    const ile = c.dni.reduce((t, n) => t + n, 0);
    $('stHeatNote').textContent = `Średnia liczba pakietów w danym dniu tygodnia i godzinie · z ${ile} ${ile === 1 ? 'dnia' : 'dni'} (do 4 tygodni wstecz).`;
  }

  function segment(id, attr, fn) {
    $(id).addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      $(id).querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      fn(b.dataset[attr]);
    });
  }
  segment('stRecTabs', 'o', (v) => { okresRek = v; if (ostatnie) records(ostatnie); });
  segment('stHistMetric', 'm', (v) => { miara = v; hist(); });
  segment('stHistRange', 'r', (v) => { zakres = Number(v); hist(); });

  async function load() {
    try {
      const r = await fetch(window.ST_URL + '?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      ostatnie = d;
      $('stErr').hidden = true;
      for (const f of [tiles, records, hours, rank, types, hops, nowe, kanaly, rejony, notice]) { try { f(d); } catch (e) { console.error(f.name, e); } }
      const t = d.heure ? new Date(d.heure) : new Date();
      $('stTime').textContent = t.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
      $('stState').textContent = 'na żywo · co godzinę';
    } catch (e) {
      $('stErr').hidden = false;
      $('stState').textContent = 'brak połączenia';
    }
  }
  async function loadHist() {
    if (!window.ST_HIST_URL) return;
    try {
      const r = await fetch(window.ST_HIST_URL + '?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      historia = await r.json();
      hist(); heat();
    } catch { /* historia opcjonalna */ }
  }
  // ---- Zasięg sieci: ludność w zasięgu repeaterów (eksport mapy, liczony co 30 min) ----
  const TYPY_MIEJSC = { city: 'Miasta', town: 'Miasteczka', village: 'Wsie', hamlet: 'Przysiółki' };
  function ludnosc(p) {
    const box = $('stPopBody');
    if (!p || p.vide || !p.ludnoscStrefy) { box.innerHTML = '<div class="st-empty">Brak repeaterów z pozycją albo model terenu jeszcze się wczytuje.</div>'; return; }
    const L = p.ludnoscStrefy, pc = (v) => (L ? (v / L) * 100 : 0);
    const czesci = [
      { k: 'dobry', nazwa: 'dobry zasięg', v: p.dobryZasieg, opis: 'zapas sygnału co najmniej 10 dB' },
      { k: 'graniczny', nazwa: 'zasięg na granicy', v: p.granicznyZasieg, opis: 'zapas 0–10 dB, zależy od anteny i miejsca' },
      { k: 'poza', nazwa: 'poza zasięgiem', v: p.pozaZasiegiem, opis: 'za słaby sygnał' },
    ];
    const typy = Object.entries(p.typy || {}).filter(([t]) => TYPY_MIEJSC[t]).sort((a, b) => Object.keys(TYPY_MIEJSC).indexOf(a[0]) - Object.keys(TYPY_MIEJSC).indexOf(b[0]));
    const lista = (l) => (l && l.length ? `<ol class="st-pop-list">${l.slice(0, 8).map(([n, v]) => `<li><span>${esc(n)}</span><b>${fmt(v)}</b></li>`).join('')}</ol>` : '<div class="st-empty">Brak</div>');
    box.innerHTML = `
      <div class="st-pop-top">
        <div class="st-pop-big"><div class="st-num">${fmt(p.pct, 1)} %</div><div class="st-sub">mieszkańców strefy w zasięgu: <b>${fmt(p.wZasiegu)}</b> z ${fmt(L)} osób w ${fmt(p.miejscowosci)} ${odm(p.miejscowosci, 'miejscowości', 'miejscowościach', 'miejscowościach')}</div>
          <div class="st-sub">${fmt(p.repeatery)} ${odm(p.repeatery, 'repeater', 'repeatery', 'repeaterów')} · pokrycie powierzchni ${fmt(p.pctPowierzchni, 1)} %</div></div>
        <div class="st-pop-split">
          <div class="st-pop-bar" role="img" aria-label="${czesci.map((c) => `${c.nazwa} ${fmt(pc(c.v), 1)} %`).join(', ')}">${czesci.map((c) => (c.v ? `<i class="st-pop-${c.k}" style="width:${pc(c.v)}%" title="${c.nazwa}: ${fmt(c.v)} osób (${fmt(pc(c.v), 1)} %)"></i>` : '')).join('')}</div>
          <ul class="st-pop-leg">${czesci.map((c) => `<li><i class="st-pop-${c.k}"></i><span><b>${c.nazwa}</b> · ${fmt(c.v)} os. (${fmt(pc(c.v), 1)} %)<small>${c.opis}</small></span></li>`).join('')}</ul>
        </div>
      </div>
      <div class="st-pop-types">${typy.map(([t, x]) => { const v = x.ludnosc ? (x.wZasiegu / x.ludnosc) * 100 : 0; return `<div class="st-row" title="${fmt(x.wZasiegu)} z ${fmt(x.ludnosc)} mieszkańców"><div class="st-row-top"><span class="st-rank-name">${TYPY_MIEJSC[t]} <small>(${fmt(x.miejsc)})</small></span><b>${fmt(v, 0)} %</b></div><div class="st-bar"><i style="width:${v}%"></i></div></div>`; }).join('')}</div>
      <div class="st-two st-pop-lists">
        <div><h3>Największe miejscowości w zasięgu</h3>${lista(p.najwiekszeWZasiegu)}</div>
        <div><h3>Największe poza zasięgiem</h3>${lista(p.najwiekszePoza)}</div>
      </div>`;
  }
  async function loadPop() {
    if (!window.ST_POP_URL) return;
    try {
      const r = await fetch(window.ST_POP_URL + '?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      ludnosc(await r.json());
    } catch { $('stPopBody').innerHTML = '<div class="st-empty">Zasięg jest właśnie przeliczany na serwerze mapy. Spróbujemy ponownie za kilka minut.</div>'; }
  }

  load(); loadHist(); loadPop();
  setInterval(() => { load(); loadHist(); loadPop(); }, 3600000);
})();
