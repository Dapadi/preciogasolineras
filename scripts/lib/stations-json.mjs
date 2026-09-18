// Serializa gasolineras para el JavaScript de las páginas (buscador de la
// home y marcadores del mapa).
//
// Solo van los campos que el navegador necesita, y de `prices` se omiten los
// carburantes que la gasolinera no vende: con ~1.500 gasolineras y 6
// carburantes, guardar los nulos engordaría el HTML de la home para nada.

export function clientStationsJson(stations) {
  const items = stations.map((s) => {
    const prices = {};
    for (const [id, price] of Object.entries(s.prices)) {
      if (price !== null && price !== undefined) prices[id] = price;
    }
    return {
      name: s.name,
      addr: s.addr,
      cp: s.cp,
      municipio: s.municipio,
      brand: s.brand,
      lat: s.lat,
      lng: s.lng,
      color: s.color,
      initials: s.initials,
      prices
    };
  });

  // Los JSON van dentro de un <script>: escapamos "<" para que un nombre o
  // una dirección con "</script>" no rompa la página.
  return JSON.stringify(items).replace(/</g, "\\u003c");
}
