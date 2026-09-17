// Piezas compartidas de cumplimiento legal (Fase 3 del plan de SEO):
// script de analítica, enlaces del footer y banner de cookies. Se generan
// una vez aquí y se inyectan igual en la home, en cada página de población
// y en las propias páginas legales.

// Plausible no usa cookies ni datos personales, así que se puede cargar
// directamente sin pedir consentimiento (a diferencia de Google Analytics
// o de los anuncios de AdSense, que si se añaden en el futuro sí lo
// necesitarán). Si PLAUSIBLE_DOMAIN está vacío (todavía no hay cuenta
// creada) simplemente no se incluye ningún script.
export function renderAnalyticsScript(plausibleDomain) {
  if (!plausibleDomain) return "";
  return `<script defer data-domain="${plausibleDomain}" src="https://plausible.io/js/script.js"></script>`;
}

// basePath: ruta relativa a la raíz del sitio ("" en la home, "../../../"
// en una página de población).
export function renderLegalFooterLinks(basePath) {
  return `<a href="${basePath}aviso-legal/">Aviso legal</a> · <a href="${basePath}privacidad/">Privacidad</a>`;
}

// privacyUrl: ruta (relativa o absoluta) a la política de privacidad, para
// el enlace dentro del propio texto del banner.
export function renderCookieBanner(privacyUrl) {
  return `<div id="cookie-banner" class="cookie-banner" hidden>
    <p>Usamos <a href="${privacyUrl}">analítica sin cookies</a> (Plausible) para saber cuánta gente visita el sitio. Si en el futuro activamos publicidad (Google AdSense), pediremos tu consentimiento aparte para sus cookies.</p>
    <button id="cookie-banner-accept" type="button">Entendido</button>
  </div>
  <script>
    (function () {
      try {
        var KEY = "cookie-consent";
        var banner = document.getElementById("cookie-banner");
        var btn = document.getElementById("cookie-banner-accept");
        if (!banner || !btn) return;
        if (!localStorage.getItem(KEY)) banner.hidden = false;
        btn.addEventListener("click", function () {
          try { localStorage.setItem(KEY, "accepted"); } catch (e) {}
          banner.hidden = true;
        });
        // Para cuando en el futuro se añadan cookies no esenciales (p. ej.
        // el script de AdSense): comprobar esto antes de inyectarlas.
        window.cookieConsentGiven = function () {
          try { return localStorage.getItem(KEY) === "accepted"; } catch (e) { return false; }
        };
      } catch (e) {}
    })();
  </script>`;
}
