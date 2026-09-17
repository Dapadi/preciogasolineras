// Descarga los precios de carburantes del Ministerio para las provincias de
// Alicante, Castellón y Valencia, y genera:
//   - docs/index.html: buscador + directorio de poblaciones (a partir de
//     templates/home.html).
//   - docs/gasolineras/{provincia}/{municipio}/index.html: una página
//     estática por población, con la tabla de precios ya renderizada en el
//     HTML (sin depender de JS), para que Google pueda indexarla.
//   - docs/sitemap.xml y docs/robots.txt.
//
// La lógica está repartida en scripts/lib/*: api.mjs (descarga), group.mjs
// (agrupar por provincia/población), render-home.mjs y render-municipio.mjs
// (generar HTML) y sitemap.mjs. Este archivo solo orquesta esos pasos.
//
// Uso local:
//   node scripts/build.mjs
//
// Requiere Node 18+ (usa fetch nativo).

import { writeFileSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { SITE_URL, PROVINCIAS } from "./config.mjs";
import { fetchStations } from "./lib/api.mjs";
import { groupByProvinciaYMunicipio, sortedEntries, sortByCheapest } from "./lib/group.mjs";
import { toIsoDate } from "./lib/format.mjs";
import { renderHome } from "./lib/render-home.mjs";
import { renderMunicipioPage } from "./lib/render-municipio.mjs";
import { buildSitemapXml, buildRobotsTxt } from "./lib/sitemap.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DOCS = join(ROOT, "docs");
const TEMPLATES = join(ROOT, "templates");

async function main() {
  const { updatedAt, stations } = await fetchStations(PROVINCIAS);
  const provincias = groupByProvinciaYMunicipio(stations);
  const provinciasOrdenadas = sortedEntries(provincias);
  const lastmod = toIsoDate(updatedAt);

  mkdirSync(DOCS, { recursive: true });

  // --- Home: buscador + directorio ---
  const homeTemplate = readFileSync(join(TEMPLATES, "home.html"), "utf8");
  const homeHtml = renderHome(homeTemplate, { stations, updatedAt, provinciasOrdenadas });
  writeFileSync(join(DOCS, "index.html"), homeHtml, "utf8");

  // --- Páginas por población ---
  // Se regeneran desde cero para no dejar páginas huérfanas de municipios
  // que ya no tengan gasolineras.
  const gasolinerasDir = join(DOCS, "gasolineras");
  rmSync(gasolinerasDir, { recursive: true, force: true });

  const municipioTemplate = readFileSync(join(TEMPLATES, "municipio.html"), "utf8");
  const sitemapUrls = [{ loc: `${SITE_URL}/`, lastmod }];

  for (const [provinciaSlug, prov, municipiosOrdenados] of provinciasOrdenadas) {
    for (const [municipioSlug, muni] of municipiosOrdenados) {
      const stationsSorted = sortByCheapest(muni.stations);
      const municipiosVecinos = municipiosOrdenados.filter(([slug]) => slug !== municipioSlug);

      const { html, canonicalUrl } = renderMunicipioPage(municipioTemplate, {
        provinciaSlug,
        municipioSlug,
        provincia: prov.nombre,
        municipio: muni.nombre,
        stationsSorted,
        municipiosVecinos,
        updatedAt
      });

      const pageDir = join(gasolinerasDir, provinciaSlug, municipioSlug);
      mkdirSync(pageDir, { recursive: true });
      writeFileSync(join(pageDir, "index.html"), html, "utf8");

      sitemapUrls.push({ loc: canonicalUrl, lastmod });
    }
  }

  // --- sitemap.xml y robots.txt ---
  writeFileSync(join(DOCS, "sitemap.xml"), buildSitemapXml(sitemapUrls), "utf8");
  writeFileSync(join(DOCS, "robots.txt"), buildRobotsTxt(SITE_URL), "utf8");

  const totalMunicipios = [...provincias.values()].reduce((acc, p) => acc + p.municipios.size, 0);
  console.log(
    `OK: ${stations.length} gasolinera(s) en ${totalMunicipios} población(es) de Alicante, Castellón y Valencia. Última actualización oficial: ${updatedAt}`
  );
}

main().catch((err) => {
  console.error("Error generando la página:", err.message);
  process.exit(1);
});
