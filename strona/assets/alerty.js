// Alerty sieci: plik /dane/alerty.json zapisywany co godzinę przez GitHub (workflow „Statystyki – zapis danych”),
// awaryjnie prosto z mapy na żywo.
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MAPA = (window.ST_MAP_URL || 'https://live.meshcoresouth.pl/').replace(/\/?$/, '/');
  const naMapie = (cle) => (cle ? `<a class="st-map" href="${MAPA}?mc=${encodeURIComponent(cle)}" target="_blank" rel="noopener">na mapie ↗</a>` : '');
  const odm = (n, a, b, c) => { n = Math.abs(n); const d = n % 10, s = n % 100; return n === 1 ? a : d >= 2 && d <= 4 && (s < 12 || s > 14) ? b : c; };
  const odKiedy = (iso) => {
    if (!iso) return '';
    const min = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
    if (min < 60) return `od ${min} min`;
    const h = Math.round(min / 60);
    if (h < 48) return `od ${h} h`;
    const d = Math.round(h / 24);
    return `od ${d} ${odm(d, 'dnia', 'dni', 'dni')}`;
  };
  let dane = null, filtrPoziom = '', filtrTyp = '', szukaj = '', sortuj = '';
  const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l');
  const nazwaA = (a) => a.nazwa || a.wiadomosc || '';

  function wiersz(a) {
    return `<li class="al-item al-${a.poziom === 'krytyczny' ? 'k' : 'u'}">
      <span class="al-ico" aria-hidden="true">${a.poziom === 'krytyczny' ? '!' : '⚠'}</span>
      <div class="al-body">
        <div class="al-msg">${esc(a.wiadomosc)}</div>
        <div class="al-meta">${a.typNazwa ? `<span class="al-tag">${esc(a.typNazwa)}</span>` : ''}<span>${odKiedy(a.od)}</span>${naMapie(a.cle)}</div>
      </div>
    </li>`;
  }

  function rysuj() {
    const l = (dane && dane.alerty) || [];
    $('alNK').textContent = l.filter((a) => a.poziom === 'krytyczny').length;
    $('alNU').textContent = l.filter((a) => a.poziom !== 'krytyczny').length;
    $('alNA').textContent = l.length;
    // filtry rodzaju
    const typy = new Map();
    for (const a of l) { const k = a.typNazwa || 'Inne'; typy.set(k, (typy.get(k) || 0) + 1); }
    $('alTypes').innerHTML = typy.size > 1 ? [['', 'Wszystkie rodzaje', l.length], ...[...typy.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, k, n])]
      .map(([k, t, n]) => `<button type="button" class="al-chip${filtrTyp === k ? ' on' : ''}" data-t="${esc(k)}">${esc(t)} <b>${n}</b></button>`).join('') : '';
    const q = norm(szukaj.trim());
    const widac = l.filter((a) => (!filtrTyp || (a.typNazwa || 'Inne') === filtrTyp) && (!q || norm(a.nazwa).includes(q) || norm(a.wiadomosc).includes(q)));
    const porownaj = {
      az: (a, b) => nazwaA(a).localeCompare(nazwaA(b), 'pl', { sensitivity: 'base' }),
      za: (a, b) => nazwaA(b).localeCompare(nazwaA(a), 'pl', { sensitivity: 'base' }),
      nowe: (a, b) => String(b.od).localeCompare(String(a.od)),
      '': (a, b) => String(a.od).localeCompare(String(b.od)),
    }[sortuj];
    widac.sort(porownaj);
    const k = widac.filter((a) => a.poziom === 'krytyczny'), u = widac.filter((a) => a.poziom !== 'krytyczny');
    const brak = (t) => `<li class="st-empty">${q ? 'Nic nie pasuje do „' + esc(szukaj.trim()) + '”.' : t}</li>`;
    $('alKryt').innerHTML = k.length ? k.map(wiersz).join('') : brak('Brak alertów krytycznych.');
    $('alUwaga').innerHTML = u.length ? u.map(wiersz).join('') : brak('Brak innych problemów.');
    $('alKrytBlock').hidden = filtrPoziom === 'uwaga';
    $('alUwagaBlock').hidden = filtrPoziom === 'krytyczny';
    if (!l.length) $('alKryt').innerHTML = '<li class="st-empty al-ok">✔ Brak alertów – sieć jest w dobrym stanie.</li>';
  }

  document.querySelector('.al-sum').addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    filtrPoziom = b.dataset.f;
    document.querySelectorAll('.al-tile').forEach((x) => x.classList.toggle('on', x === b));
    rysuj();
  });
  $('alQ').addEventListener('input', (e) => { szukaj = e.target.value; rysuj(); });
  $('alSort').addEventListener('change', (e) => { sortuj = e.target.value; rysuj(); });
  $('alTypes').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (!b) return; filtrTyp = b.dataset.t; rysuj(); });

  async function pobierz() {
    for (const u of [window.AL_DANE, window.AL_URL].filter(Boolean)) {
      try {
        const r = await fetch(u + '?t=' + Math.floor(Date.now() / 300000), { cache: 'no-cache' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const d = await r.json();
        if (d && Array.isArray(d.alerty)) return d;
      } catch { /* następne źródło */ }
    }
    throw new Error('brak danych');
  }
  async function load() {
    try {
      dane = await pobierz();
      $('alErr').hidden = true;
      rysuj();
      const t = dane.heure ? new Date(dane.heure) : new Date();
      $('alTime').textContent = t.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
      $('alState').textContent = 'aktualizacja co godzinę';
    } catch {
      $('alErr').hidden = false;
      $('alState').textContent = 'brak połączenia';
    }
  }
  load();
  setInterval(load, 600000);
})();
