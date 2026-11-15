// Statystyki sieci z mapy na żywo (live.meshcoresouth.pl/api/export/statystyki.json), odświeżane co minutę.
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => (n == null ? '–' : Number(n).toLocaleString('pl-PL'));
  const set = (k, v) => document.querySelectorAll(`[data-k="${k}"]`).forEach((e) => (e.textContent = v));

  function tiles(d) {
    const l = d.liczniki || {}, doba = d.doba || {};
    set('aktywne', fmt(l.aktywne));
    set('wezly-sub', l.wezly != null ? `z ${fmt(l.wezly)} znanych węzłów` : '');
    set('repeatery', fmt(l.repeatery));
    set('obserwatorzy', fmt(l.obserwatorzyOnline));
    set('obs-sub', l.obserwatorzy != null ? `z ${fmt(l.obserwatorzy)} wszystkich` : '');
    set('lacza24h', fmt(l.lacza24h));
    set('pakietyMinuta', l.pakietyMinuta == null ? '–' : Number(l.pakietyMinuta).toLocaleString('pl-PL', { maximumFractionDigits: 1 }));
    set('pakietyGodzina', fmt(l.pakietyGodzina));
    set('pakiety24', fmt(doba.pakiety));
    set('kanal', doba.zajecieKanaluPct == null ? '–' : `${Number(doba.zajecieKanaluPct).toLocaleString('pl-PL', { maximumFractionDigits: 1 })} %`);
  }

  // 24 słupki godzinowe; brakujące godziny = 0
  function hours(d) {
    const box = $('stHours'), axis = $('stHoursAxis');
    const m = new Map(((d.doba || {}).godziny || []).map((g) => [Math.floor(new Date(g.godzina).getTime() / 3600000), g.nb]));
    const teraz = Math.floor(Date.now() / 3600000), h = [];
    for (let i = 23; i >= 0; i--) h.push({ t: teraz - i, nb: m.get(teraz - i) || 0 });
    const max = Math.max(1, ...h.map((x) => x.nb));
    const godz = (t) => new Date(t * 3600000).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    box.innerHTML = h.map((x) => `<div class="st-col" tabindex="0" title="${godz(x.t)}–${godz(x.t + 1)}: ${fmt(x.nb)} pakietów"><i style="height:${x.nb ? Math.max(3, (x.nb / max) * 100) : 0}%"></i></div>`).join('');
    box.setAttribute('aria-label', 'Pakiety w kolejnych godzinach: ' + h.map((x) => `${godz(x.t)} ${x.nb}`).join(', '));
    axis.innerHTML = h.map((x, i) => `<span>${i % 6 === 0 || i === 23 ? godz(x.t) : ''}</span>`).join('');
  }

  function rank(d) {
    const r = ((d.doba || {}).repeatery || []);
    const ol = $('stRank');
    if (!r.length) { ol.innerHTML = '<li class="st-empty">Zbieramy dane…</li>'; return; }
    const max = Math.max(1, ...r.map((x) => x.nb));
    ol.innerHTML = r.map((x) => {
      const nazwa = x.nazwa ? esc(x.nazwa) : x.kandydaci > 1 ? `<span class="mono">${esc(x.prefiks)}</span> <small>(wspólny prefiks)</small>` : `<span class="mono">${esc(x.prefiks)}</span> <small>(nieznany)</small>`;
      return `<li title="${fmt(x.nb)} pakietów"><div class="st-rank-row"><span class="st-rank-name">${nazwa}</span><b>${fmt(x.nb)}</b></div><div class="st-bar"><i style="width:${(x.nb / max) * 100}%"></i></div></li>`;
    }).join('');
  }

  function hops(d) {
    const s = ((d.doba || {}).skoki || []).filter((x) => x.skoki != null);
    const box = $('stHops');
    if (!s.length) { box.innerHTML = '<div class="st-empty">Zbieramy dane…</div>'; return; }
    // 0…9 osobno, 10 i więcej razem
    const g = new Map();
    for (const x of s) { const k = Math.min(x.skoki, 10); g.set(k, (g.get(k) || 0) + x.nb); }
    const rows = [...g.entries()].sort((a, b) => a[0] - b[0]);
    const total = rows.reduce((t, [, n]) => t + n, 0), max = Math.max(1, ...rows.map(([, n]) => n));
    box.innerHTML = rows.map(([k, n]) => `<div class="st-hop" title="${fmt(n)} pakietów (${Math.round((n / total) * 100)} %)"><span class="st-hop-k">${k === 10 ? '10+' : k}</span><div class="st-bar"><i style="width:${(n / max) * 100}%"></i></div><b>${Math.round((n / total) * 100)} %</b></div>`).join('');
  }

  async function load() {
    try {
      const r = await fetch(window.ST_URL + '?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      $('stErr').hidden = true;
      tiles(d); hours(d); rank(d); hops(d);
      const t = d.heure ? new Date(d.heure) : new Date();
      $('stTime').textContent = t.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
      $('stState').textContent = 'na żywo · co minutę';
    } catch (e) {
      $('stErr').hidden = false;
      $('stState').textContent = 'brak połączenia';
    }
  }
  load();
  setInterval(load, 60000);
})();
