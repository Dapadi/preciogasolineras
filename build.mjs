// Descarga los precios de carburantes del Ministerio y genera docs/index.html
// filtrado por el municipio indicado en la variable de entorno MUNICIPIO.
//
// Uso local:
//   MUNICIPIO=Aspe node scripts/build.mjs
//
// Requiere Node 18+ (usa fetch nativo).

import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MUNICIPIO = process.env.MUNICIPIO || "Aspe";
const API_URL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";

function parsePrice(v) {
  if (!v) return null;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function slug(str) {
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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

async function main() {
  const res = await fetch(API_URL, {
    headers: { Accept: "application/json" }
  });
  if (!res.ok) {
    throw new Error(`La API del Ministerio respondió con estado ${res.status}`);
  }
  const json = await res.json();
  const all = json.ListaEESSPrecio || [];
  const target = slug(MUNICIPIO);

  const stations = all
    .filter((e) => slug(e.Municipio || "") === target)
    .map((e) => {
      const name = e["Rótulo"] || "Gasolinera";
      return {
        name,
        addr: (e["Dirección"] || "").trim(),
        diesel: parsePrice(e["Precio Gasoleo A"]),
        g95: parsePrice(e["Precio Gasolina 95 E5"]),
        lat: parsePrice(e["Latitud"]),
        lng: parsePrice(e["Longitud (WGS84)"]),
        color: colorFromName(name),
        initials: initialsFromName(name)
      };
    })
    .filter((s) => s.diesel !== null || s.g95 !== null);

  const updatedAt = json["Fecha"] || new Date().toISOString();

  const template = readFileSync(join(__dirname, "..", "template.html"), "utf8");
  const html = template
    .replace("__STATIONS_JSON__", JSON.stringify(stations))
    .replaceAll("__UPDATED_AT__", updatedAt)
    .replaceAll("__MUNICIPIO__", MUNICIPIO);

  mkdirSync(join(__dirname, "..", "docs"), { recursive: true });
  writeFileSync(join(__dirname, "..", "docs", "index.html"), html, "utf8");

  console.log(
    `OK: ${stations.length} gasolinera(s) en ${MUNICIPIO}. Última actualización oficial: ${updatedAt}`
  );
}

main().catch((err) => {
  console.error("Error generando la página:", err.message);
  process.exit(1);
});
