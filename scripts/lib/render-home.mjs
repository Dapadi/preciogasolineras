// Genera docs/index.html: buscador (JS) + directorio estático de
// poblaciones agrupadas por provincia.

import { escapeHtml } from "./format.mjs";
import { fill } from "./template.mjs";
import { renderAnalyticsScript, renderLegalFooterLinks, renderCookieBanner } from "./legal.mjs";

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
  // JSON-LD/inline <script> ya cierran con </script>; escapamos "<" para que
  // un nombre o dirección con "</script>" en el texto no rompa la página.
  const stationsJson = JSON.stringify(stations).replace(/</g, "\\u003c");

  return fill(template, {
    STATIONS_JSON: stationsJson,
    UPDATED_AT: updatedAt,
    DIRECTORIO_HTML: directorioHtml(provinciasOrdenadas),
    PLAUSIBLE_SCRIPT: renderAnalyticsScript(plausibleDomain),
    LEGAL_LINKS: renderLegalFooterLinks(""),
    COOKIE_BANNER: renderCookieBanner("privacidad/")
  });
}
