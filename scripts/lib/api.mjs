// Descarga y normalización de los datos de la API de precios de
// carburantes del Ministerio.

import { API_URL, FUELS } from "../config.mjs";
import { brandFromName, colorFromName, initialsFromName } from "./format.mjs";

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

async function fetchProvincia(codigo) {
  const res = await fetch(API_URL + codigo, {
    headers: { Accept: "application/json" }
  });
  if (!res.ok) {
    throw new Error(`La API del Ministerio respondió con estado ${res.status} para la provincia ${codigo}`);
  }
  return res.json();
}

// Descarga las provincias indicadas y devuelve { updatedAt, stations }.
// stations no lleva todavía slugs (eso lo añade lib/group.mjs), solo los
// campos "en bruto" ya normalizados a números y texto.
export async function fetchStations(provincias) {
  let updatedAt = new Date().toISOString();
  const stations = [];

  for (const codigo of provincias) {
    const json = await fetchProvincia(codigo);
    if (json["Fecha"]) updatedAt = json["Fecha"];
    const all = json.ListaEESSPrecio || [];

    for (const e of all) {
      const name = e["Rótulo"] || "Gasolinera";

      // Precio de cada carburante del catálogo (null si esta gasolinera no
      // lo vende). Si no vende ninguno de los que seguimos, se descarta.
      const prices = {};
      let sellsSomething = false;
      for (const fuel of FUELS) {
        const price = parsePrice(e[fuel.apiField]);
        prices[fuel.id] = price;
        if (price !== null) sellsSomething = true;
      }
      if (!sellsSomething) continue;

      const municipio = (e["Municipio"] || "").trim();
      // Algunas provincias vienen como "VALENCIA/VALÈNCIA": nos quedamos
      // con el primer nombre para el slug y el nombre mostrado.
      const provincia = (e["Provincia"] || "").trim().split("/")[0].trim();

      stations.push({
        // Identificador estable del Ministerio: se usa como clave del
        // histórico de precios porque, a diferencia del nombre, no cambia
        // si la gasolinera se renombra.
        ideess: (e["IDEESS"] || "").trim(),
        name,
        addr: (e["Dirección"] || "").trim(),
        cp: (e["C.P."] || "").trim(),
        municipio,
        provincia,
        prices,
        brand: brandFromName(name),
        lat: parseCoord(e["Latitud"]),
        lng: parseCoord(e["Longitud (WGS84)"]),
        color: colorFromName(name),
        initials: initialsFromName(name)
      });
    }
  }

  return { updatedAt, stations };
}
