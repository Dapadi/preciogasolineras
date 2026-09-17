// Genera la página estática de una población: docs/gasolineras/{provincia}/{municipio}/index.html

import { SITE_URL, SITE_NAME } from "../config.mjs";
import { escapeHtml, fmtPrice, mapsUrl } from "./format.mjs";
import { fill } from "./template.mjs";

function stationRowHtml(s, minDiesel, minG95) {
  const isDieselBest = s.diesel !== null && s.diesel === minDiesel;
  const isG95Best = s.g95 !== null && s.g95 === minG95;
  return `    <li class="station">
      <a class="row" href="${escapeHtml(mapsUrl(s))}" target="_blank" rel="noopener">
        <div class="id-cell">
          <div class="mono" style="background:${s.color}">${escapeHtml(s.initials)}</div>
          <div class="name-block">
            <div class="name">${escapeHtml(s.name)}${isDieselBest || isG95Best ? '<span class="best-tag">MÁS BARATA</span>' : ""}</div>
            <div class="addr">${escapeHtml(s.addr)}${s.municipio ? " · " + escapeHtml(s.municipio) : ""}</div>
          </div>
        </div>
        <div class="price${isDieselBest ? " best" : ""}${s.diesel === null ? " na" : ""}">${fmtPrice(s.diesel)}</div>
        <div class="price${isG95Best ? " best" : ""}${s.g95 === null ? " na" : ""}">${fmtPrice(s.g95)}</div>
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
// poblaciones de la misma provincia (para el bloque de "cercanas").
export function renderMunicipioPage(
  template,
  { provinciaSlug, municipioSlug, provincia, municipio, stationsSorted, municipiosVecinos, updatedAt }
) {
  const dieselVals = stationsSorted.map((s) => s.diesel).filter((v) => v !== null);
  const g95Vals = stationsSorted.map((s) => s.g95).filter((v) => v !== null);
  const minDiesel = dieselVals.length ? Math.min(...dieselVals) : null;
  const minG95 = g95Vals.length ? Math.min(...g95Vals) : null;

  const rowsHtml = stationsSorted.map((s) => stationRowHtml(s, minDiesel, minG95)).join("\n");

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
    NEIGHBORS_HTML: neighborsHtml,
    HOME_URL: "../../../"
  });

  return { html, canonicalUrl };
}
