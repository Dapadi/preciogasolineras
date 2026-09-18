// Genera docs/index.html: buscador (JS) + directorio estático de
// poblaciones agrupadas por provincia.

import { escapeHtml } from "./format.mjs";
import { fill } from "./template.mjs";
import { renderAnalyticsScript, renderLegalFooterLinks, renderCookieBanner } from "./legal.mjs";
import { renderMapHead, renderMapScript } from "./map.mjs";
import { clientStationsJson } from "./stations-json.mjs";
import { brandsPresent } from "./group.mjs";
import { renderFilterBar, renderFilterStyles, renderFuelCatalogScript } from "./filters.mjs";

function directorioHtml(provinciasOrdenadas) {
  return provinciasOrdenadas
    .map(([provinciaSlug, prov, municipiosOrdenados]) => {
      const links = municipiosOrdenados
        .map(
          ([municipioSlug, muni]) =>
            `<a href="gasolineras/${provinciaSlug}/${municipioSlug}/">${escapeHtml(muni.nombre)}</a>`
        )
        .join("\n      ");
      return `    <div class="provincia">
      <h3>${escapeHtml(prov.nombre)}</h3>
      <div class="municipios">
      ${links}
      </div>
    </div>`;
    })
    .join("\n");
}

export function renderHome(template, { stations, updatedAt, provinciasOrdenadas, plausibleDomain }) {
  return fill(template, {
    STATIONS_JSON: clientStationsJson(stations),
    FILTER_STYLES: renderFilterStyles(),
    FILTER_BAR: renderFilterBar(brandsPresent(stations)),
    FUEL_CATALOG_SCRIPT: renderFuelCatalogScript(),
    UPDATED_AT: updatedAt,
    DIRECTORIO_HTML: directorioHtml(provinciasOrdenadas),
    PLAUSIBLE_SCRIPT: renderAnalyticsScript(plausibleDomain),
    LEGAL_LINKS: renderLegalFooterLinks(""),
    COOKIE_BANNER: renderCookieBanner("privacidad/"),
    MAP_HEAD: renderMapHead(),
    MAP_SCRIPT: renderMapScript()
  });
}
