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

import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { SITE_URL, PROVINCIAS, HISTORY_TREND_DAYS, HISTORY_CHART_DAYS, PLAUSIBLE_DOMAIN, FUELS } from "./config.mjs";
import { fetchStations } from "./lib/api.mjs";
import { groupByProvinciaYMunicipio, sortedEntries, sortByCheapest } from "./lib/group.mjs";
import { toIsoDate } from "./lib/format.mjs";
import { renderHome } from "./lib/render-home.mjs";
import { renderMunicipioPage } from "./lib/render-municipio.mjs";
import { buildSitemapXml, buildRobotsTxt } from "./lib/sitemap.mjs";
import { recordDailySnapshot, priceTrend, averageSeries } from "./lib/history.mjs";
import { renderPriceChart } from "./lib/sparkline.mjs";
import { renderAvisoLegal, renderPrivacidad } from "./lib/render-legal.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DOCS = join(ROOT, "docs");
const TEMPLATES = join(ROOT, "templates");
const HISTORY_DIR = join(ROOT, "data", "history");
const STATE_PATH = join(ROOT, "data", "state.json");

// Huella de los precios de todas las gasolineras. Sirve para saber si esta
// consulta trae algo nuevo o es idéntica a la anterior.
function pricesSignature(stations) {
  const rows = stations
    .map((s) => `${s.ideess}:${FUELS.map((f) => s.prices[f.id] ?? "").join(",")}`)
    .sort();
  return createHash("sha1").update(rows.join("|")).digest("hex");
}

function readState() {
  if (!existsSync(STATE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  // `fetchedAt` es la fecha que devuelve la API, que es la hora de la
  // consulta: cambia en cada ejecución aunque no cambie ningún precio.
  const { updatedAt: fetchedAt, stations } = await fetchStations(PROVINCIAS);
  const provincias = groupByProvinciaYMunicipio(stations);
  const provinciasOrdenadas = sortedEntries(provincias);

  // Si los precios son idénticos a los de la última consulta, reutilizamos la
  // fecha de entonces. Así las páginas salen byte a byte iguales y el
  // workflow no hace un commit por cada ejecución: lo que se publica es
  // "cuándo cambiaron los precios", no "cuándo miramos". Cuando cambia algo
  // más (una plantilla, el diseño), el HTML difiere igualmente y sí se
  // publica.
  const signature = pricesSignature(stations);
  const previous = readState();
  const pricesChanged = !previous || previous.pricesHash !== signature;
  const contentAt = pricesChanged ? fetchedAt : previous.lastChangedAt;

  if (pricesChanged) {
    mkdirSync(dirname(STATE_PATH), { recursive: true });
    writeFileSync(STATE_PATH, JSON.stringify({ pricesHash: signature, lastChangedAt: contentAt }, null, 2), "utf8");
  }

  // Fecha real de la consulta para el histórico (si los precios llevan días
  // sin moverse, el snapshot diario tiene que seguir guardándose hoy) y
  // fecha del contenido para el sitemap.
  const todayIso = toIsoDate(fetchedAt);
  const lastmod = toIsoDate(contentAt);

  // --- Histórico diario (Fase 2) ---
  // Solo se guarda una vez al día: la primera ejecución del día "gana" esa
  // lectura de referencia, las siguientes no la sobrescriben.
  recordDailySnapshot(HISTORY_DIR, todayIso, stations);

  mkdirSync(DOCS, { recursive: true });

  // --- Home: buscador + directorio ---
  const homeTemplate = readFileSync(join(TEMPLATES, "home.html"), "utf8");
  const homeHtml = renderHome(homeTemplate, {
    stations,
    updatedAt: contentAt,
    provinciasOrdenadas,
    plausibleDomain: PLAUSIBLE_DOMAIN
  });
  writeFileSync(join(DOCS, "index.html"), homeHtml, "utf8");

  // --- Aviso legal y privacidad (Fase 3) ---
  const avisoLegalTemplate = readFileSync(join(TEMPLATES, "aviso-legal.html"), "utf8");
  const privacidadTemplate = readFileSync(join(TEMPLATES, "privacidad.html"), "utf8");
  const avisoLegal = renderAvisoLegal(avisoLegalTemplate, { updatedAt: contentAt, plausibleDomain: PLAUSIBLE_DOMAIN });
  const privacidad = renderPrivacidad(privacidadTemplate, { updatedAt: contentAt, plausibleDomain: PLAUSIBLE_DOMAIN });
  mkdirSync(join(DOCS, "aviso-legal"), { recursive: true });
  mkdirSync(join(DOCS, "privacidad"), { recursive: true });
  writeFileSync(join(DOCS, "aviso-legal", "index.html"), avisoLegal.html, "utf8");
  writeFileSync(join(DOCS, "privacidad", "index.html"), privacidad.html, "utf8");

  // --- Páginas por población ---
  // Se regeneran desde cero para no dejar páginas huérfanas de municipios
  // que ya no tengan gasolineras.
  const gasolinerasDir = join(DOCS, "gasolineras");
  rmSync(gasolinerasDir, { recursive: true, force: true });

  const municipioTemplate = readFileSync(join(TEMPLATES, "municipio.html"), "utf8");
  const sitemapUrls = [
    { loc: `${SITE_URL}/`, lastmod },
    { loc: avisoLegal.canonicalUrl, lastmod },
    { loc: privacidad.canonicalUrl, lastmod }
  ];

  for (const [provinciaSlug, prov, municipiosOrdenados] of provinciasOrdenadas) {
    for (const [municipioSlug, muni] of municipiosOrdenados) {
      const stationsSorted = sortByCheapest(muni.stations);
      const municipiosVecinos = municipiosOrdenados.filter(([slug]) => slug !== municipioSlug);

      const trends = new Map();
      for (const s of stationsSorted) {
        if (!s.ideess) continue;
        for (const fuel of FUELS) {
          const trend = priceTrend(HISTORY_DIR, todayIso, HISTORY_TREND_DAYS, s.ideess, fuel.id, s.prices[fuel.id]);
          if (trend) trends.set(`${s.ideess}|${fuel.id}`, trend.diff);
        }
      }

      const ideessList = stationsSorted.map((s) => s.ideess).filter(Boolean);
      const series = averageSeries(HISTORY_DIR, todayIso, HISTORY_CHART_DAYS, ideessList);
      const chartHtml = renderPriceChart(series, {
        title: `Precio medio en ${muni.nombre} (últimos ${HISTORY_CHART_DAYS} días)`
      });

      const { html, canonicalUrl } = renderMunicipioPage(municipioTemplate, {
        provinciaSlug,
        municipioSlug,
        provincia: prov.nombre,
        municipio: muni.nombre,
        stationsSorted,
        municipiosVecinos,
        updatedAt: contentAt,
        trends,
        chartHtml,
        plausibleDomain: PLAUSIBLE_DOMAIN
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
    `OK: ${stations.length} gasolinera(s) en ${totalMunicipios} población(es) de Alicante, Castellón y Valencia. Consultado: ${fetchedAt}`
  );
  console.log(
    pricesChanged
      ? `  Precios nuevos: la página pasa a mostrar ${contentAt}.`
      : `  Sin cambios desde ${contentAt}: se regenera igual, pero sale idéntica y el workflow no hará commit.`
  );

  // Cuántas gasolineras vende cada carburante. Un 0 casi siempre significa
  // que el `apiField` de config.mjs ya no coincide con el nombre del campo
  // en la respuesta del Ministerio, no que nadie lo venda.
  for (const fuel of FUELS) {
    const count = stations.filter((s) => s.prices[fuel.id] !== null).length;
    if (count === 0) {
      console.warn(
        `AVISO: ningún dato de "${fuel.label}". Revisa que el campo "${fuel.apiField}" siga existiendo en la API del Ministerio.`
      );
    } else {
      console.log(`  ${fuel.label}: ${count} gasolinera(s)`);
    }
  }
}

main().catch((err) => {
  console.error("Error generando la página:", err.message);
  process.exit(1);
});
