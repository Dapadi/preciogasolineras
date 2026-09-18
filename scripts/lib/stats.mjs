// Cifras agregadas que se calculan en el build a partir de las gasolineras
// ya descargadas: totales para la cabecera, precio medio por provincia y
// precio medio por marca. No hace falta ninguna fuente de datos nueva.

import { DEFAULT_FUELS } from "../config.mjs";
import { escapeHtml, fmtPrice } from "./format.mjs";

function average(values) {
  const nums = values.filter((v) => v !== null && v !== undefined);
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 1000) / 1000;
}

export function siteStats(stations, provinciasOrdenadas) {
  const municipios = provinciasOrdenadas.reduce((acc, [, , municipios]) => acc + municipios.length, 0);
  return {
    gasolineras: stations.length,
    provincias: provinciasOrdenadas.length,
    municipios
  };
}

// Precio medio de cada carburante por defecto (diésel y gasolina 95) en cada
// provincia, marcando la más barata y la más cara de gasolina 95.
export function provinceAverages(provinciasOrdenadas) {
  const rows = provinciasOrdenadas.map(([slug, prov]) => {
    const stations = [...prov.municipios.values()].flatMap((m) => m.stations);
    const averages = {};
    for (const id of DEFAULT_FUELS) {
      averages[id] = average(stations.map((s) => s.prices[id]));
    }
    return { slug, nombre: prov.nombre, averages, total: stations.length };
  });

  const main = DEFAULT_FUELS[DEFAULT_FUELS.length - 1]; // gasolina 95
  const values = rows.map((r) => r.averages[main]).filter((v) => v !== null);
  const cheapest = values.length ? Math.min(...values) : null;
  const dearest = values.length ? Math.max(...values) : null;

  // Con una sola provincia no tiene sentido pintar "la más barata".
  const compare = values.length > 1;
  for (const row of rows) {
    row.isCheapest = compare && row.averages[main] === cheapest;
    row.isDearest = compare && row.averages[main] === dearest;
  }
  return rows;
}

// Precio medio de gasolina 95 por marca, de más barata a más cara. `diff` es
// la diferencia con la media general: por debajo de 3 céntimos se pinta en
// verde, por encima de la media en rojo.
export function brandAverages(stations) {
  const main = DEFAULT_FUELS[DEFAULT_FUELS.length - 1];
  const overall = average(stations.map((s) => s.prices[main]));

  const byBrand = new Map();
  for (const s of stations) {
    if (!byBrand.has(s.brand)) byBrand.set(s.brand, []);
    byBrand.get(s.brand).push(s.prices[main]);
  }

  return [...byBrand.entries()]
    .map(([brand, values]) => ({
      brand,
      count: values.filter((v) => v !== null && v !== undefined).length,
      avg: average(values)
    }))
    .filter((b) => b.avg !== null)
    .sort((a, b) => a.avg - b.avg)
    .map((b) => ({
      ...b,
      cheap: overall !== null && b.avg <= overall - 0.03,
      dear: overall !== null && b.avg > overall
    }));
}

export function renderProvinceRows(rows) {
  return rows
    .map((r) => {
      const cls = r.isCheapest ? " cheap" : r.isDearest ? " dear" : "";
      const [first, second] = DEFAULT_FUELS;
      return `      <div class="prov-row">
        <span class="prov-name">${escapeHtml(r.nombre)}</span>
        <span class="prov-val${cls}">${fmtPrice(r.averages[second])}</span>
        <span class="prov-val second">${fmtPrice(r.averages[first])}</span>
      </div>`;
    })
    .join("\n");
}

export function renderBrandChips(brands) {
  return brands
    .map((b) => {
      const cls = b.cheap ? " cheap" : b.dear ? " dear" : "";
      return `      <span class="chip"><span class="chip-name">${escapeHtml(b.brand)}</span><span class="chip-val${cls}">${fmtPrice(b.avg)}</span></span>`;
    })
    .join("\n");
}
