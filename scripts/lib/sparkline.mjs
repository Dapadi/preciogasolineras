// Gráfica de evolución de precios como SVG generado en el build (sin
// Chart.js ni canvas): se ve igual con o sin JavaScript, lo que encaja con
// el resto del sitio y es mejor señal para SEO que un gráfico que solo
// aparece tras ejecutar script.

const WIDTH = 320;
const HEIGHT = 64;
const PADDING = 6;

function points(series, field) {
  return series
    .map((p, i) => (p[field] === null || p[field] === undefined ? null : { x: i, y: p[field] }))
    .filter(Boolean);
}

function toPolyline(pts, n, min, range) {
  if (pts.length < 2) return "";
  const scaleX = (i) => PADDING + (i / (n - 1)) * (WIDTH - PADDING * 2);
  const scaleY = (v) => HEIGHT - PADDING - ((v - min) / range) * (HEIGHT - PADDING * 2);
  const coords = pts.map((p) => `${scaleX(p.x).toFixed(1)},${scaleY(p.y).toFixed(1)}`).join(" ");
  return coords;
}

// series: [{ date, diesel, g95 }, ...] ordenada de más antigua a más
// reciente. Devuelve el HTML del bloque de gráfica, o null si no hay
// suficiente histórico todavía para dibujar nada útil.
export function renderPriceChart(series, { title } = {}) {
  const dieselPts = points(series, "diesel");
  const g95Pts = points(series, "g95");

  if (dieselPts.length < 2 && g95Pts.length < 2) return null;

  const allValues = [...dieselPts, ...g95Pts].map((p) => p.y);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 0.01;
  const n = series.length;

  const dieselLine = toPolyline(dieselPts, n, min, range);
  const g95Line = toPolyline(g95Pts, n, min, range);

  return `<div class="price-chart">
    <h2>${title || "Evolución de precios (últimos 30 días)"}</h2>
    <svg viewBox="0 0 ${WIDTH} ${HEIGHT}" width="100%" height="${HEIGHT}" role="img" aria-label="${title || "Evolución de precios"}">
      ${dieselLine ? `<polyline points="${dieselLine}" fill="none" stroke-width="2" style="stroke:var(--line-diesel)" />` : ""}
      ${g95Line ? `<polyline points="${g95Line}" fill="none" stroke-width="2" style="stroke:var(--line-g95)" />` : ""}
    </svg>
    <div class="chart-legend">
      <span><i style="background:var(--line-diesel)"></i>Diésel</span>
      <span><i style="background:var(--line-g95)"></i>Gasolina 95</span>
    </div>
  </div>`;
}
