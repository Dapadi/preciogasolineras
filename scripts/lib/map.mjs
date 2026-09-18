// Mapa interactivo (Leaflet + tiles de OpenStreetMap) compartido por la home
// y las páginas de población: etiquetas del CDN, estilos y la lógica de
// pintar un conjunto de gasolineras.
//
// El script expone un único global, window.FuelMap, con:
//   FuelMap.render(items, pos)
// donde items son gasolineras ({ name, addr, municipio, lat, lng, color,
// initials, diesel, g95 }) y pos es { lat, lng } con la ubicación del
// usuario, o null. Si no hay nada que pintar (o Leaflet no ha cargado), el
// contenedor #map se oculta y la página sigue funcionando igual.

const LEAFLET_VERSION = "1.9.4";
const LEAFLET_CSS_SRI = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
const LEAFLET_JS_SRI = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";

// Va en el <head>: CSS de Leaflet + estilos propios del mapa.
export function renderMapHead() {
  return `<link rel="stylesheet" href="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css" integrity="${LEAFLET_CSS_SRI}" crossorigin="">
<style>
  #map { height: 230px; border-radius: 12px; border: 1px solid var(--line); background: var(--card); }
  #map.hidden { display: none; }
  @media (prefers-color-scheme: dark) {
    #map .leaflet-tile { filter: grayscale(0.35) invert(92%) hue-rotate(180deg) brightness(0.95) contrast(90%); }
    #map .leaflet-control-zoom a { background: var(--card); color: var(--ink); border-color: var(--line) !important; }
    #map .leaflet-control-attribution { background: rgba(30,32,34,.75); color: var(--ink-faint); }
    #map .leaflet-control-attribution a { color: var(--ink-dim); }
  }
  .station-pin { background: transparent; border: none; }
  .station-pin-inner {
    width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 700; font-size: 10.5px; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,.35);
  }
  .user-pin { background: #2f7dd6; width: 14px; height: 14px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 0 2px #2f7dd6, 0 1px 5px rgba(0,0,0,.4); }
  .map-popup { font-family: 'Barlow', system-ui, sans-serif; min-width: 160px; }
  .map-popup .name { font-weight: 600; font-size: 13.5px; margin-bottom: 2px; }
  .map-popup .addr { font-size: 11.5px; color: #6f6e66; margin-bottom: 6px; }
  .map-popup .prices { display: flex; gap: 12px; font-size: 12.5px; font-variant-numeric: tabular-nums; margin-bottom: 6px; }
  .map-popup .prices b { font-weight: 700; }
  .map-popup a.go { font-size: 12px; font-weight: 600; color: var(--go); text-decoration: none; }
</style>`;
}

// Va al final del <body>, antes de los scripts propios de cada página.
export function renderMapScript() {
  return `<script src="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js" integrity="${LEAFLET_JS_SRI}" crossorigin=""></script>
<script>
(function () {
  var map = null, markersLayer = null, userMarker = null;

  function fmt(n) { return n === null || n === undefined ? "\\u2014" : n.toFixed(3).replace(".", ","); }

  // Los nombres y direcciones vienen de la API del Ministerio y se insertan
  // como HTML en el popup: los escapamos por si alguno trae "<" o comillas.
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function mapsUrl(s) {
    if (s.lat && s.lng) {
      return "https://www.google.com/maps/search/?api=1&query=" + s.lat + "," + s.lng;
    }
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(s.name + ", " + s.addr);
  }

  function ensureMap() {
    if (map) return map;
    map = L.map("map", { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    markersLayer = L.layerGroup().addTo(map);
    map.setView([39.6, -0.4], 9);
    return map;
  }

  function stationIcon(s) {
    return L.divIcon({
      className: "station-pin",
      html: '<div class="station-pin-inner" style="background:' + esc(s.color) + '">' + esc(s.initials) + '</div>',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      popupAnchor: [0, -13]
    });
  }

  function popupHtml(s) {
    return '<div class="map-popup">' +
      '<div class="name">' + esc(s.name) + '</div>' +
      '<div class="addr">' + esc(s.addr) + (s.municipio ? " \\u00b7 " + esc(s.municipio) : "") + '</div>' +
      '<div class="prices"><span>Di\\u00e9sel <b>' + fmt(s.diesel) + '</b></span><span>G. 95 <b>' + fmt(s.g95) + '</b></span></div>' +
      '<a class="go" href="' + esc(mapsUrl(s)) + '" target="_blank" rel="noopener">C\\u00f3mo llegar \\u2192</a>' +
      '</div>';
  }

  function render(items, pos) {
    var mapEl = document.getElementById("map");
    if (!mapEl) return;

    var withCoords = (items || []).filter(function (s) { return s.lat && s.lng; });

    // Sin puntos que pintar, o Leaflet no ha cargado (CDN caído, sin red):
    // el mapa simplemente no se muestra y el resto de la página sigue igual.
    if ((!withCoords.length && !pos) || typeof L === "undefined") {
      mapEl.classList.add("hidden");
      return;
    }

    mapEl.classList.remove("hidden");
    ensureMap();
    map.invalidateSize();
    markersLayer.clearLayers();

    var bounds = [];
    withCoords.forEach(function (s) {
      L.marker([s.lat, s.lng], { icon: stationIcon(s) }).bindPopup(popupHtml(s)).addTo(markersLayer);
      bounds.push([s.lat, s.lng]);
    });

    if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
    if (pos) {
      var userIcon = L.divIcon({
        className: "station-pin",
        html: '<div class="user-pin"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });
      userMarker = L.marker([pos.lat, pos.lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
      bounds.push([pos.lat, pos.lng]);
    }

    if (bounds.length === 1) {
      map.setView(bounds[0], 15);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });
    }
  }

  window.FuelMap = { render: render };
})();
</script>`;
}

// Datos mínimos que necesita el mapa de cada gasolinera (el resto de campos
// del objeto no se embeben en la página para no engordar el HTML).
export function mapStationsJson(stations) {
  const items = stations
    .filter((s) => s.lat && s.lng)
    .map((s) => ({
      name: s.name,
      addr: s.addr,
      municipio: s.municipio,
      lat: s.lat,
      lng: s.lng,
      color: s.color,
      initials: s.initials,
      diesel: s.diesel,
      g95: s.g95
    }));
  return JSON.stringify(items).replace(/</g, "\\u003c");
}
