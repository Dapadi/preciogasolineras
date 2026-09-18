// Genera la página estática de una población: docs/gasolineras/{provincia}/{municipio}/index.html

import { SITE_URL, SITE_NAME, FUELS, DEFAULT_FUELS } from "../config.mjs";
import { escapeHtml, fmtPrice, mapsUrl } from "./format.mjs";
import { fill } from "./template.mjs";
import { renderAnalyticsScript, renderLegalFooterLinks, renderCookieBanner } from "./legal.mjs";
import { renderMapHead, renderMapScript, mapStationsJson } from "./map.mjs";
import { renderFilterBar, renderFilterStyles, renderFuelCatalogScript } from "./filters.mjs";
import { brandsPresent } from "./group.mjs";

// diff: número (positivo = ha subido, negativo = ha bajado) o null si no
// hay histórico de hace 7 días para comparar.
function trendHtml(diff) {
  if (diff === null || diff === undefined || Math.abs(diff) < 0.001) return "";
  const up = diff > 0;
  const arrow = up ? "▲" : "▼";
  const sign = up ? "+" : "−";
  return `<div class="trend ${up ? "trend-up" : "trend-down"}">${arrow} ${sign}${fmtPrice(Math.abs(diff))}</div>`;
}

// Precio y tendencia de cada carburante como atributos de la fila, para que
// el filtro del navegador pueda reordenar y reetiquetar las filas que ya
// vienen renderizadas sin volver a pedir nada.
function fuelDataAttrs(s, trends) {
  return FUELS.map((f) => {
    const price = s.prices[f.id];
    const trend = trends ? trends.get(`${s.ideess}|${f.id}`) : undefined;
    return (
      (price !== null && price !== undefined ? ` data-p-${f.id}="${price}"` : "") +
      (trend !== undefined ? ` data-t-${f.id}="${trend}"` : "")
    );
  }).join("");
}

function stationRowHtml(s, mins, trends) {
  const isBest = DEFAULT_FUELS.some((id) => s.prices[id] !== null && s.prices[id] === mins[id]);

  const priceCells = DEFAULT_FUELS.map((id, i) => {
    const price = s.prices[id];
    const best = price !== null && price === mins[id];
    const cls = "price" + (i === 1 ? " col-p2" : "") + (best ? " best" : "") + (price === null ? " na" : "");
    return `<div class="${cls}">${fmtPrice(price)}${trendHtml(trends ? trends.get(`${s.ideess}|${id}`) : undefined)}</div>`;
  }).join("\n        ");

  return `    <li class="station" data-brand="${escapeHtml(s.brand)}"${fuelDataAttrs(s, trends)}>
      <a class="row" href="${escapeHtml(mapsUrl(s))}" target="_blank" rel="noopener">
        <div class="id-cell">
          <div class="mono" style="background:${s.color}">${escapeHtml(s.initials)}</div>
          <div class="name-block">
            <div class="name">${escapeHtml(s.name)}${isBest ? '<span class="best-tag">MÁS BARATA</span>' : ""}</div>
            <div class="addr">${escapeHtml(s.addr)}${s.municipio ? " · " + escapeHtml(s.municipio) : ""}</div>
          </div>
        </div>
        ${priceCells}
        <div class="pin">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      </a>
    </li>`;
}

function jsonLdForMunicipio(municipioNombre, provinciaNombre, stations) {
  const itemListElement = stations.map((s, i) => {
    const item = {
      "@type": "GasStation",
      name: s.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: s.addr,
        addressLocality: municipioNombre,
        postalCode: s.cp,
        addressRegion: provinciaNombre,
        addressCountry: "ES"
      }
    };
    if (s.lat && s.lng) {
      item.geo = { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lng };
    }
    return { "@type": "ListItem", position: i + 1, item };
  });

  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Gasolineras en ${municipioNombre}`,
    itemListElement
  }).replace(/</g, "\\u003c");
}

// stationsSorted: gasolineras del municipio ya ordenadas de más barata a
// más cara. municipiosVecinos: [[slug, {nombre}], ...] del resto de
// poblaciones de la misma provincia (para el bloque de "cercanas"). trends:
// Map "ideess|diesel"/"ideess|g95" -> diferencia de precio vs hace 7 días
// (o ausente si no hay histórico todavía). chartHtml: bloque de gráfica ya
// renderizado (lib/sparkline.mjs), o null si aún no hay histórico
// suficiente.
export function renderMunicipioPage(
  template,
  {
    provinciaSlug,
    municipioSlug,
    provincia,
    municipio,
    stationsSorted,
    municipiosVecinos,
    updatedAt,
    trends,
    chartHtml,
    plausibleDomain
  }
) {
  const mins = {};
  for (const id of DEFAULT_FUELS) {
    const values = stationsSorted.map((s) => s.prices[id]).filter((v) => v !== null);
    mins[id] = values.length ? Math.min(...values) : null;
  }
  const minDiesel = mins.diesel;
  const minG95 = mins.g95;

  const rowsHtml = stationsSorted.map((s) => stationRowHtml(s, mins, trends)).join("\n");

  const neighborsHtml =
    municipiosVecinos.map(([slug, m]) => `<a href="../${slug}/">${escapeHtml(m.nombre)}</a>`).join('<span class="sep">·</span>') ||
    "—";

  const canonicalUrl = `${SITE_URL}/gasolineras/${provinciaSlug}/${municipioSlug}/`;
  const pageTitle = `Gasolinera más barata en ${municipio} hoy — diésel y gasolina 95 | ${SITE_NAME}`;
  const metaDescription =
    `Gasolinera más barata hoy en ${municipio}` +
    (minDiesel !== null ? `: diésel desde ${fmtPrice(minDiesel)} €/l` : "") +
    (minG95 !== null ? `, gasolina 95 desde ${fmtPrice(minG95)} €/l` : "") +
    `. ${stationsSorted.length} gasolinera${stationsSorted.length === 1 ? "" : "s"} comparadas, precios oficiales del Ministerio.`;

  const html = fill(template, {
    TITLE: pageTitle,
    META_DESCRIPTION: escapeHtml(metaDescription),
    CANONICAL_URL: canonicalUrl,
    JSONLD: jsonLdForMunicipio(municipio, provincia, stationsSorted),
    UPDATED_AT: updatedAt,
    MUNICIPIO_NOMBRE: escapeHtml(municipio),
    PROVINCIA_NOMBRE: escapeHtml(provincia),
    ROWS_HTML: rowsHtml,
    CHART_HTML:
      chartHtml ||
      `<div class="price-chart price-chart-empty"><h2>Evolución de precios (últimos 30 días)</h2><p>Aún no hay histórico suficiente para esta población: vuelve en unos días para ver la gráfica.</p></div>`,
    NEIGHBORS_HTML: neighborsHtml,
    HOME_URL: "../../../",
    MAP_HEAD: renderMapHead(),
    MAP_SCRIPT: renderMapScript(),
    MAP_STATIONS_JSON: mapStationsJson(stationsSorted),
    FILTER_STYLES: renderFilterStyles(),
    FILTER_BAR: renderFilterBar(brandsPresent(stationsSorted), { hidden: true }),
    FUEL_CATALOG_SCRIPT: renderFuelCatalogScript(),
    PLAUSIBLE_SCRIPT: renderAnalyticsScript(plausibleDomain),
    LEGAL_LINKS: renderLegalFooterLinks("../../../"),
    COOKIE_BANNER: renderCookieBanner("../../../privacidad/")
  });

  return { html, canonicalUrl };
}
