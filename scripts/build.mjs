// Descarga los precios de carburantes del Ministerio para las provincias de
// Alicante, Castellón y Valencia, y genera:
//   - docs/index.html: buscador + directorio de poblaciones (a partir de
//     template.html).
//   - docs/gasolineras/{provincia}/{municipio}/index.html: una página
//     estática por población, con la tabla de precios ya renderizada en el
//     HTML (sin depender de JS), para que Google pueda indexarla.
//   - docs/sitemap.xml y docs/robots.txt.
//
// Uso local:
//   node scripts/build.mjs
//
// Requiere Node 18+ (usa fetch nativo).

import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DOCS = join(ROOT, "docs");

const API_URL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/";

const SITE_URL = "https://dapadi.github.io/preciogasolineras";

// Alicante, Castellón, Valencia
const PROVINCIAS = ["03", "12", "46"];

function parsePrice(v) {
  if (!v) return null;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseCoord(v) {
  if (!v) return null;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function colorFromName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 42%, 38%)`;
}

function initialsFromName(name) {
  const words = name
    .replace(/[^\p{L}\s]/gu, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function slugify(str) {
  return String(str)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "sin-nombre";
}

const LOWERCASE_WORDS = new Set(["de", "del", "la", "las", "el", "los", "les", "i", "y", "d"]);

function titleCase(str) {
  return String(str)
    .toLowerCase()
    .split(/(\s+|\/|-)/)
    .map((word, i) => {
      if (/^\s+$/.test(word) || word === "/" || word === "-") return word;
      if (i > 0 && LOWERCASE_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join("");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtPrice(n) {
  return n === null ? "—" : n.toFixed(3).replace(".", ",");
}

function mapsUrl(s) {
  if (s.lat && s.lng) {
    return `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`;
  }
  const q = encodeURIComponent(`${s.name}, ${s.addr}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

async function fetchProvincia(codigo) {
  const res = await fetch(API_URL + codigo, {
    headers: { Accept: "application/json" }
  });
  if (!res.ok) {
    throw new Error(`La API del Ministerio respondió con estado ${res.status} para la provincia ${codigo}`);
  }
  const json = await res.json();
  return json;
}

function toIsoDate(fechaStr) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(fechaStr);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(fechaStr);
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

function sortByCheapest(stations) {
  return [...stations].sort((a, b) => {
    const av = (a.diesel ?? 99) + (a.g95 ?? 99);
    const bv = (b.diesel ?? 99) + (b.g95 ?? 99);
    return av - bv;
  });
}

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

async function main() {
  let updatedAt = new Date().toISOString();
  const stations = [];

  for (const codigo of PROVINCIAS) {
    const json = await fetchProvincia(codigo);
    if (json["Fecha"]) updatedAt = json["Fecha"];
    const all = json.ListaEESSPrecio || [];

    for (const e of all) {
      const name = e["Rótulo"] || "Gasolinera";
      const diesel = parsePrice(e["Precio Gasoleo A"]);
      const g95 = parsePrice(e["Precio Gasolina 95 E5"]);
      if (diesel === null && g95 === null) continue;

      const municipio = (e["Municipio"] || "").trim();
      // Algunas provincias vienen como "VALENCIA/VALÈNCIA": nos quedamos con
      // el primer nombre para el slug y el nombre mostrado de la provincia.
      const provincia = (e["Provincia"] || "").trim().split("/")[0].trim();

      stations.push({
        name,
        addr: (e["Dirección"] || "").trim(),
        cp: (e["C.P."] || "").trim(),
        municipio,
        provincia,
        municipioSlug: slugify(municipio),
        provinciaSlug: slugify(provincia),
        diesel,
        g95,
        lat: parseCoord(e["Latitud"]),
        lng: parseCoord(e["Longitud (WGS84)"]),
        color: colorFromName(name),
        initials: initialsFromName(name)
      });
    }
  }

  // Agrupar por provincia -> municipio (la clave incluye la provincia para
  // evitar colisiones entre municipios homónimos de provincias distintas).
  const provincias = new Map(); // provinciaSlug -> { nombre, municipios: Map }
  for (const s of stations) {
    if (!provincias.has(s.provinciaSlug)) {
      provincias.set(s.provinciaSlug, { nombre: titleCase(s.provincia), municipios: new Map() });
    }
    const prov = provincias.get(s.provinciaSlug);
    if (!prov.municipios.has(s.municipioSlug)) {
      prov.municipios.set(s.municipioSlug, { nombre: titleCase(s.municipio), stations: [] });
    }
    prov.municipios.get(s.municipioSlug).stations.push(s);
  }

  const template = readFileSync(join(ROOT, "template.html"), "utf8");
  const templateMunicipio = readFileSync(join(ROOT, "template-municipio.html"), "utf8");

  // Directorio de poblaciones para la home, agrupado por provincia.
  const provinciasOrdenadas = [...provincias.entries()].sort((a, b) =>
    a[1].nombre.localeCompare(b[1].nombre, "es")
  );

  const directorioHtml = provinciasOrdenadas
    .map(([provinciaSlug, prov]) => {
      const municipiosOrdenados = [...prov.municipios.entries()].sort((a, b) =>
        a[1].nombre.localeCompare(b[1].nombre, "es")
      );
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

  const homeHtml = template
    .replace("__STATIONS_JSON__", () => JSON.stringify(stations).replace(/</g, "\\u003c"))
    .replaceAll("__UPDATED_AT__", () => updatedAt)
    .replace("__DIRECTORIO_HTML__", () => directorioHtml);

  mkdirSync(DOCS, { recursive: true });
  writeFileSync(join(DOCS, "index.html"), homeHtml, "utf8");

  // Regenerar desde cero las páginas por población para no dejar páginas
  // huérfanas de municipios que ya no tengan gasolineras.
  const gasolinerasDir = join(DOCS, "gasolineras");
  rmSync(gasolinerasDir, { recursive: true, force: true });

  const lastmod = toIsoDate(updatedAt);
  const sitemapUrls = [{ loc: `${SITE_URL}/`, lastmod }];

  for (const [provinciaSlug, prov] of provinciasOrdenadas) {
    const municipiosOrdenados = [...prov.municipios.entries()].sort((a, b) =>
      a[1].nombre.localeCompare(b[1].nombre, "es")
    );

    for (const [municipioSlug, muni] of municipiosOrdenados) {
      const sorted = sortByCheapest(muni.stations);
      const dieselVals = sorted.map((s) => s.diesel).filter((v) => v !== null);
      const g95Vals = sorted.map((s) => s.g95).filter((v) => v !== null);
      const minDiesel = dieselVals.length ? Math.min(...dieselVals) : null;
      const minG95 = g95Vals.length ? Math.min(...g95Vals) : null;

      const rowsHtml = sorted.map((s) => stationRowHtml(s, minDiesel, minG95)).join("\n");

      const neighborsHtml = municipiosOrdenados
        .filter(([slug]) => slug !== municipioSlug)
        .map(
          ([slug, m]) =>
            `<a href="../${slug}/">${escapeHtml(m.nombre)}</a>`
        )
        .join('<span class="sep">·</span>');

      const canonicalUrl = `${SITE_URL}/gasolineras/${provinciaSlug}/${municipioSlug}/`;
      const metaDescription =
        `Gasolinera más barata hoy en ${muni.nombre}` +
        (minDiesel !== null ? `: diésel desde ${fmtPrice(minDiesel)} €/l` : "") +
        (minG95 !== null ? `, gasolina 95 desde ${fmtPrice(minG95)} €/l` : "") +
        `. ${sorted.length} gasolinera${sorted.length === 1 ? "" : "s"} comparadas, precios oficiales del Ministerio.`;

      const pageTitle = `Gasolinera más barata en ${muni.nombre} hoy — diésel y gasolina 95 | Gasolina CV`;
      const pageHtml = templateMunicipio
        .replaceAll("__TITLE__", () => pageTitle)
        .replace("__META_DESCRIPTION__", () => escapeHtml(metaDescription))
        .replaceAll("__CANONICAL_URL__", () => canonicalUrl)
        .replace("__JSONLD__", () => jsonLdForMunicipio(muni.nombre, prov.nombre, sorted))
        .replaceAll("__UPDATED_AT__", () => updatedAt)
        .replaceAll("__MUNICIPIO_NOMBRE__", () => escapeHtml(muni.nombre))
        .replaceAll("__PROVINCIA_NOMBRE__", () => escapeHtml(prov.nombre))
        .replace("__ROWS_HTML__", () => rowsHtml)
        .replace("__NEIGHBORS_HTML__", () => neighborsHtml || "—")
        .replaceAll("__HOME_URL__", () => "../../../");

      const pageDir = join(gasolinerasDir, provinciaSlug, municipioSlug);
      mkdirSync(pageDir, { recursive: true });
      writeFileSync(join(pageDir, "index.html"), pageHtml, "utf8");

      sitemapUrls.push({ loc: canonicalUrl, lastmod });
    }
  }

  const sitemapXml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    sitemapUrls
      .map((u) => `  <url>\n    <loc>${escapeHtml(u.loc)}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n  </url>`)
      .join("\n") +
    `\n</urlset>\n`;
  writeFileSync(join(DOCS, "sitemap.xml"), sitemapXml, "utf8");

  const robotsTxt = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
  writeFileSync(join(DOCS, "robots.txt"), robotsTxt, "utf8");

  const totalMunicipios = [...provincias.values()].reduce((acc, p) => acc + p.municipios.size, 0);
  console.log(
    `OK: ${stations.length} gasolinera(s) en ${totalMunicipios} población(es) de Alicante, Castellón y Valencia. Última actualización oficial: ${updatedAt}`
  );
}

main().catch((err) => {
  console.error("Error generando la página:", err.message);
  process.exit(1);
});
