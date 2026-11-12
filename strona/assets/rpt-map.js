// Odpytuje NAJPIERW bezpośrednio stats.meshcoresouth.pl z przeglądarki użytkownika
// (to omija firewall hostingu blokujący połączenia serwer->serwer w /api/rpt.php).
// Wymaga nagłówka CORS (Access-Control-Allow-Origin) na stats.meshcoresouth.pl —
// bez niego przeglądarka odrzuci odpowiedź i kod przejdzie do /api/rpt.php (fallback).
document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('rpt-status');
  const countEl = document.getElementById('rpt-count');
  const markersGroup = document.getElementById('rpt-markers');
  const mapSvg = document.getElementById('coverage-map');
  if (!mapSvg || !markersGroup) return; // ta strona nie ma mapy — nic do roboty

  const voiPaths = Array.from(document.querySelectorAll('.voi'));
  const svgNS = 'http://www.w3.org/2000/svg';

  // Ten sam wzór projekcji co w includes/config.php (project_lat_lon) —
  // potrzebny tu, bo przy bezpośrednim fetchu z przeglądarki nikt inny
  // nie przelicza współrzędnych geograficznych na piksele.
  const mapEZero = 14.07, mapNZero = 54.90, mapEFull = 24.27, mapNFull = 49.00;
  const degN = 950 / Math.abs(mapNZero - mapNFull);
  const degE = 1000 / Math.abs(mapEZero - mapEFull);
  function projectLatLon(lat, lon) {
    return {
      x: Math.abs(lon - mapEZero) * degE,
      y: Math.abs(lat - mapNZero) * degN,
    };
  }

  function highlightVoivodeships(points) {
    voiPaths.forEach(p => p.classList.remove('voi-active'));
    const pt = mapSvg.createSVGPoint();
    points.forEach(({ x, y }) => {
      pt.x = x; pt.y = y;
      for (const path of voiPaths) {
        if (path.classList.contains('voi-active')) continue;
        if (path.isPointInFill(pt)) {
          path.classList.add('voi-active');
          path.parentNode.appendChild(path); // na wierzch, żeby sąsiedzi nie zasłaniali konturu
          break;
        }
      }
    });
  }

  function drawMarkers(points) {
    markersGroup.innerHTML = '';
    points.forEach(({ x, y, name, city, id_byte }) => {
      const circle = document.createElementNS(svgNS, 'circle');
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', y);
      circle.setAttribute('r', '6');
      circle.setAttribute('fill', '#10B981');
      circle.setAttribute('stroke', '#06110D');
      circle.setAttribute('stroke-width', '1.2');

      const title = document.createElementNS(svgNS, 'title');
      title.textContent = `${name} (${id_byte}) — ${city}`;
      circle.appendChild(title);

      markersGroup.appendChild(circle);
    });
    highlightVoivodeships(points);
  }

  // Ścieżka A: bezpośrednio z przeglądarki do stats.meshcoresouth.pl (wymaga CORS)
  async function tryDirectFetch() {
    const res = await fetch(`https://stats.meshcoresouth.pl/nodes.json?t=${Date.now()}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const nodes = await res.json();
    const points = nodes
      .filter(n => n.lat != null && n.lon != null && typeof n.role === 'string' && /repeat/i.test(n.role))
      .map(n => {
        const { x, y } = projectLatLon(n.lat, n.lon);
        return { x, y, name: n.name || 'RPT', city: n.city || '', id_byte: (n.id_byte || '??').toString().toUpperCase() };
      });
    drawMarkers(points);
    if (statusEl) statusEl.textContent = `${points.length} węzłów RPT · dane z 24h · na żywo`;
    if (countEl) countEl.textContent = points.length;
  }

  // Ścieżka B: nasz PHP proxy /api/rpt.php (współrzędne już przeliczone po stronie serwera)
  async function tryProxyFetch() {
    const res = await fetch('/api/rpt.php');
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    drawMarkers(data.nodes);
    if (statusEl) {
      const suffix = data.fallback
        ? ' · migawka · źródło chwilowo niedostępne'
        : ' · dane z 24h · na żywo';
      statusEl.textContent = `${data.count} węzłów RPT${suffix}`;
      if (countEl) countEl.textContent = data.count;
    }
  }

  async function loadRptNodes() {
    try {
      await tryDirectFetch();
    } catch (err) {
      try {
        await tryProxyFetch();
      } catch (err2) {
        if (statusEl) statusEl.textContent = 'Nie udało się pobrać danych RPT';
      }
    }
  }

  loadRptNodes();
  setInterval(loadRptNodes, 30000);
});
