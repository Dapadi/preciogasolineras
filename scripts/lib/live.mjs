// Refresco de precios en vivo desde el navegador.
//
// Las páginas se generan cada cierto tiempo, pero GitHub no cumple el horario
// del cron (ver el README), así que el HTML publicado puede llevar horas de
// retraso. Esto consulta la API del Ministerio directamente desde el
// navegador y actualiza los precios de la página sin recargar.
//
// Es estrictamente una mejora progresiva: si no hay JavaScript, si la API no
// permite CORS, si tarda demasiado o si falla por lo que sea, no pasa nada y
// se quedan los precios del build, que es lo que ve Google y lo que lleva el
// HTML estático.
//
// Para no castigar a la API ni al móvil del usuario, la respuesta se guarda
// en localStorage con una caducidad: quien navegue por varias páginas hace
// una sola consulta, no una por página.

import { API_URL, PROVINCIAS, FUELS } from "../config.mjs";

const CACHE_KEY = "precios-live-v1";
const CACHE_MINUTES = 15;
const TIMEOUT_MS = 8000;

export function renderLiveScript() {
  const fuelFields = Object.fromEntries(FUELS.map((f) => [f.id, f.apiField]));

  return `<script>
(function () {
  var API = ${JSON.stringify(API_URL)};
  var PROVINCIAS = ${JSON.stringify(PROVINCIAS)};
  var FUEL_FIELDS = ${JSON.stringify(fuelFields)};
  var CACHE_KEY = ${JSON.stringify(CACHE_KEY)};
  var CACHE_MS = ${CACHE_MINUTES} * 60 * 1000;
  var TIMEOUT_MS = ${TIMEOUT_MS};

  function parsePrice(v) {
    if (!v) return null;
    var n = parseFloat(String(v).replace(",", "."));
    return isFinite(n) ? n : null;
  }

  // localStorage puede lanzar (modo privado, cookies bloqueadas): nunca debe
  // tumbar la página.
  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var cached = JSON.parse(raw);
      if (!cached || Date.now() - cached.at > CACHE_MS) return null;
      return cached;
    } catch (e) { return null; }
  }

  function writeCache(value) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(value)); } catch (e) {}
  }

  function fetchProvincia(codigo, signal) {
    return fetch(API + codigo, { signal: signal, headers: { Accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  // { ideess: { carburante: precio } } con lo que devuelva la API ahora mismo.
  function load() {
    var cached = readCache();
    if (cached) return Promise.resolve(cached);

    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;
    var signal = controller ? controller.signal : undefined;

    return Promise.all(PROVINCIAS.map(function (p) { return fetchProvincia(p, signal); }))
      .then(function (responses) {
        if (timer) clearTimeout(timer);

        var prices = {};
        var fechas = [];
        var any = false;

        responses.forEach(function (json) {
          if (!json) return;
          if (json["Fecha"]) fechas.push(json["Fecha"]);
          (json.ListaEESSPrecio || []).forEach(function (e) {
            var id = (e["IDEESS"] || "").trim();
            if (!id) return;
            var row = {};
            for (var fuel in FUEL_FIELDS) {
              var price = parsePrice(e[FUEL_FIELDS[fuel]]);
              if (price !== null) row[fuel] = price;
            }
            prices[id] = row;
            any = true;
          });
        });

        if (!any) return null;
        var result = { at: Date.now(), fecha: fechas[0] || null, prices: prices };
        writeCache(result);
        return result;
      })
      .catch(function () {
        if (timer) clearTimeout(timer);
        return null;
      });
  }

  // onData recibe { fecha, prices } y solo se llama si hay datos de verdad.
  function refresh(onData) {
    if (typeof fetch !== "function" || typeof Promise === "undefined") return;
    load().then(function (result) {
      if (result && result.prices) onData(result);
    }).catch(function () {});
  }

  function markLive(fecha) {
    var pill = document.getElementById("status-pill");
    if (pill) pill.innerHTML = '<i></i> Precios en directo del Ministerio' + (fecha ? " \\u00b7 " + fecha : "");
  }

  window.LivePrices = { refresh: refresh, markLive: markLive };
})();
</script>`;
}
