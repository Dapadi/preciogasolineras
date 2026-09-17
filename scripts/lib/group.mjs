// Agrupación de gasolineras por provincia y población.

import { slugify, titleCase } from "./format.mjs";

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

export function sortByCheapest(stations) {
  return [...stations].sort((a, b) => {
    const av = (a.diesel ?? 99) + (a.g95 ?? 99);
    const bv = (b.diesel ?? 99) + (b.g95 ?? 99);
    return av - bv;
  });
}
