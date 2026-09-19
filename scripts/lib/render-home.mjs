// Genera docs/index.html: buscador (JS) + directorio estático de
// poblaciones agrupadas por provincia.

import { BRAND_PALETTE } from "../config.mjs";
import { escapeHtml } from "./format.mjs";
import { fill } from "./template.mjs";
import { renderAnalyticsScript, renderLegalFooterLinks, renderCookieBanner } from "./legal.mjs";
import { renderMapHead, renderMapScript } from "./map.mjs";
import { clientStationsJson } from "./stations-json.mjs";
import { brandsPresent } from "./group.mjs";
import { renderFilterBar, renderFilterStyles, renderFuelCatalogScript } from "./filters.mjs";
import { FONTS_TAG, LOCATE_ICON, PUMP_ICON, renderThemeStyles } from "./theme.mjs";
import { renderLiveScript } from "./live.mjs";
import { siteStats, provinceAverages, brandAverages, renderProvinceRows, renderBrandChips } from "./stats.mjs";

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
  const stats = siteStats(stations, provinciasOrdenadas);

  return fill(template, {
    STATIONS_JSON: clientStationsJson(stations),
    FONTS_TAG,
    THEME_STYLES: renderThemeStyles(BRAND_PALETTE),
    LIVE_SCRIPT: renderLiveScript(),
    PUMP_ICON,
    LOCATE_ICON,
    TOTAL_STATIONS: stats.gasolineras.toLocaleString("es-ES"),
    TOTAL_MUNICIPIOS: stats.municipios.toLocaleString("es-ES"),
    TOTAL_PROVINCIAS: stats.provincias,
    PROVINCIA_ROWS: renderProvinceRows(provinceAverages(provinciasOrdenadas)),
    BRAND_CHIPS: renderBrandChips(brandAverages(stations)),
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
