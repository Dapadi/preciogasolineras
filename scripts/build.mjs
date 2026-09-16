// Descarga los precios de carburantes del Ministerio para las provincias de
// Alicante, Castellón y Valencia, y genera docs/index.html a partir de
// template.html con el listado completo de gasolineras de la Comunitat
// Valenciana (con buscador por código postal, población o nombre).
//
// Uso local:
//   node scripts/build.mjs
//
// Requiere Node 18+ (usa fetch nativo).

import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_URL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/";

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

      stations.push({
        name,
        addr: (e["Dirección"] || "").trim(),
        cp: (e["C.P."] || "").trim(),
        municipio: (e["Municipio"] || "").trim(),
        provincia: (e["Provincia"] || "").trim(),
        diesel,
        g95,
        lat: parseCoord(e["Latitud"]),
        lng: parseCoord(e["Longitud (WGS84)"]),
        color: colorFromName(name),
        initials: initialsFromName(name)
      });
    }
  }

  const template = readFileSync(join(__dirname, "..", "template.html"), "utf8");
  const html = template
    .replace("__STATIONS_JSON__", JSON.stringify(stations))
    .replaceAll("__UPDATED_AT__", updatedAt);

  mkdirSync(join(__dirname, "..", "docs"), { recursive: true });
  writeFileSync(join(__dirname, "..", "docs", "index.html"), html, "utf8");

  console.log(
    `OK: ${stations.length} gasolinera(s) en Alicante, Castellón y Valencia. Última actualización oficial: ${updatedAt}`
  );
}

main().catch((err) => {
  console.error("Error generando la página:", err.message);
  process.exit(1);
});
