// Agrupación de gasolineras por provincia y población.

import { DEFAULT_FUELS } from "../config.mjs";
import { OTHER_BRAND, slugify, titleCase } from "./format.mjs";

// Añade provinciaSlug/municipioSlug a cada estación (mutando la lista que
// devuelve lib/api.mjs) y devuelve un Map:
//   provinciaSlug -> { nombre, municipios: Map municipioSlug -> { nombre, stations } }
export function groupByProvinciaYMunicipio(stations) {
  const provincias = new Map();

  for (const s of stations) {
    s.provinciaSlug = slugify(s.provincia);
    s.municipioSlug = slugify(s.municipio);
  }

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

  return provincias;
}

// Devuelve las entradas [provinciaSlug, provincia] ordenadas alfabéticamente
// por nombre, y dentro de cada una los municipios también ordenados.
export function sortedEntries(provincias) {
  const provinciasOrdenadas = [...provincias.entries()].sort((a, b) =>
    a[1].nombre.localeCompare(b[1].nombre, "es")
  );
  return provinciasOrdenadas.map(([provinciaSlug, prov]) => {
    const municipiosOrdenados = [...prov.municipios.entries()].sort((a, b) =>
      a[1].nombre.localeCompare(b[1].nombre, "es")
    );
    return [provinciaSlug, prov, municipiosOrdenados];
  });
}

// Ordena de más barata a más cara. Sin `fuelId` compara la suma de los
// carburantes por defecto (diésel + gasolina 95, que es lo que muestran las
// dos columnas); con `fuelId`, solo el precio de ese carburante. Las que no
// venden un carburante puntúan 99 y caen al final.
export function sortByCheapest(stations, fuelId = null) {
  const keys = fuelId ? [fuelId] : DEFAULT_FUELS;
  const score = (s) => keys.reduce((acc, k) => acc + (s.prices[k] ?? 99), 0);
  return [...stations].sort((a, b) => score(a) - score(b));
}

// Marcas presentes en un conjunto de gasolineras, de más a menos frecuente,
// con "Otras" siempre al final. Sirve para poblar el selector de marca solo
// con las que de verdad existen en esa página.
export function brandsPresent(stations) {
  const counts = new Map();
  for (const s of stations) {
    counts.set(s.brand, (counts.get(s.brand) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => {
      if (a[0] === OTHER_BRAND) return 1;
      if (b[0] === OTHER_BRAND) return -1;
      return b[1] - a[1] || a[0].localeCompare(b[0], "es");
    })
    .map(([brand, count]) => ({ brand, count }));
}
