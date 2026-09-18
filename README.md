# Precios de gasolina en la Comunitat Valenciana — actualización automática

Genera una web con los precios de todas las gasolineras de Alicante,
Castellón y Valencia: una home con buscador y directorio de poblaciones, más
una página estática por población (para que Google pueda indexarlas), y se
actualiza sola cada hora, publicándose gratis con GitHub Pages.

## Cómo funciona

1. `scripts/build.mjs` descarga el listado oficial de precios del
   Ministerio (`sedeaplicaciones.minetur.gob.es`) para las provincias de
   Alicante (03), Castellón (12) y Valencia (46), agrupa las gasolineras por
   provincia y población, y genera:
   - `docs/index.html`: buscador (por CP, población o nombre) + directorio
     de poblaciones agrupadas por provincia, a partir de `templates/home.html`.
   - `docs/gasolineras/{provincia}/{municipio}/index.html`: una página por
     población con la tabla de precios ya renderizada en el HTML (sin
     depender de JS), título, meta description, canonical y JSON-LD, a
     partir de `templates/municipio.html`.
   - `docs/sitemap.xml` y `docs/robots.txt`.
   - `data/history/{AAAA-MM-DD}.json`: una entrada `{ ideess, diesel, g95 }`
     por gasolinera, una vez al día (la primera ejecución del día "gana"
     esa lectura; las siguientes ejecuciones horarias no la tocan). Con eso
     cada página de población calcula la flecha de tendencia a 7 días de
     cada gasolinera (▲/▼) y la gráfica de precio medio de los últimos 30
     días. `data/history/` no se publica con GitHub Pages (vive fuera de
     `docs/`), es solo el almacén de datos del histórico.
2. `.github/workflows/update-precios.yml` ejecuta ese script cada hora
   (`cron: "0 * * * *"`) y, si algo ha cambiado, hace commit y push de todo
   `docs/` y `data/history/` automáticamente.
3. GitHub Pages sirve el contenido de `docs/` como una web pública normal.
4. En la home, el buscador filtra en el navegador (sin llamadas de red) por
   código postal, población o nombre de gasolinera. Desde cada página de
   población se puede volver a la home con una búsqueda ya rellenada
   (`?q=...`).
5. El botón de geolocalización (📍, junto al buscador) pide permiso al
   navegador con `navigator.geolocation`, calcula la distancia a cada
   gasolinera con la fórmula de Haversine (usando `lat`/`lng`, que ya vienen
   de la API del Ministerio) y muestra las más cercanas en un radio de 15 km
   ordenadas de más a menos cerca, con la distancia junto a la dirección. Si
   el usuario ya ha compartido su ubicación, las búsquedas por texto también
   muestran la distancia de cada resultado (el orden de la búsqueda sigue
   siendo por precio). Si el navegador no soporta geolocalización o el
   usuario deniega el permiso, se muestra un aviso y el resto de la página
   sigue funcionando igual.

## Puesta en marcha (10 minutos)

1. Crea un repositorio nuevo en GitHub (puede ser privado o público) y sube
   el contenido de esta carpeta.
2. En el repositorio, ve a **Settings → Pages** y en "Build and deployment"
   elige **Deploy from a branch** → rama `main`, carpeta `/docs`. Guarda.
3. Ve a la pestaña **Actions** del repositorio y comprueba que el workflow
   "Actualizar precios de gasolina" aparece habilitado. Puedes lanzarlo a
   mano una vez con el botón **Run workflow** para generar la primera
   versión sin esperar a la siguiente hora en punto.
4. Al cabo de unos minutos, tu página estará en
   `https://<tu-usuario>.github.io/<nombre-del-repo>/`.

A partir de ahí, GitHub Actions se encarga solo: cada hora vuelve a
consultar el Ministerio y, si algún precio ha cambiado, actualiza la página.
No hace falta que hagas nada más ni que mantengas nada encendido — corre en
los servidores de GitHub, gratis dentro del uso normal de un repo personal.

## Añadir o quitar provincias

Edita el array `PROVINCIAS` en `scripts/config.mjs`. Los códigos de
provincia del Ministerio son de dos dígitos (por ejemplo `03` Alicante,
`12` Castellón, `46` Valencia). El dominio del sitio (`SITE_URL`, usado en
el sitemap, los canonical y el robots.txt) también vive en ese archivo.

## Estructura del proyecto

```
scripts/
  config.mjs             # SITE_URL, SITE_NAME, provincias, URL de la API
  build.mjs               # orquesta el proceso de generación (punto de entrada)
  lib/
    api.mjs                # descarga y normaliza los datos del Ministerio
    format.mjs             # slugify, escapeHtml, formato de precios/fechas...
    group.mjs               # agrupa gasolineras por provincia y población
    template.mjs             # motor de plantillas (sustitución de __CLAVE__)
    render-home.mjs           # genera el HTML de la home
    render-municipio.mjs       # genera el HTML de cada página de población
    render-legal.mjs            # genera aviso legal y privacidad
    sitemap.mjs                  # genera sitemap.xml y robots.txt
    history.mjs                   # snapshot diario y consultas al histórico de precios
    sparkline.mjs                  # gráfica SVG de evolución de precios
    legal.mjs                       # banner de cookies, script de analítica, enlaces del footer
templates/
  home.html               # plantilla de la home
  municipio.html           # plantilla de las páginas de población
  aviso-legal.html         # plantilla del aviso legal
  privacidad.html          # plantilla de la política de privacidad
data/
  history/                # histórico diario de precios (no se publica en docs/)
docs/                      # salida generada, servida por GitHub Pages (no editar a mano)
```

Para añadir contenido nuevo el patrón es: un módulo nuevo en `scripts/lib/`
que sepa generar ese HTML o datos, invocado desde `build.mjs`.

## Histórico de precios (Fase 2)

- `scripts/lib/history.mjs` guarda un snapshot en `data/history/{fecha}.json`
  una vez al día, y expone `priceTrend` (diferencia de precio de una
  gasolinera respecto a hace N días) y `averageSeries` (precio medio diario
  de un conjunto de gasolineras a lo largo de N días). Los días de
  comparación (`HISTORY_TREND_DAYS` = 7, `HISTORY_CHART_DAYS` = 30) se
  configuran en `scripts/config.mjs`.
- `scripts/lib/sparkline.mjs` dibuja esa serie como un `<svg>` generado en
  el build (sin Chart.js ni canvas), para que la gráfica se vea igual con o
  sin JavaScript.
- Cuando una población no tiene todavía 2 días de histórico, su página
  muestra un aviso de "vuelve en unos días" en vez de la gráfica.
- Pendiente (no bloqueante, no implementado todavía): un job semanal que
  comprima el histórico de más de ~90 días a agregados mensuales, para que
  `data/history/` no crezca sin control con el tiempo.

## Legal, cookies y analítica (Fase 3)

- `docs/aviso-legal/` y `docs/privacidad/` se generan a partir de
  `templates/aviso-legal.html` y `templates/privacidad.html`. El nombre del
  titular y el email de contacto que aparecen en ambas páginas se
  configuran en `scripts/config.mjs` (`LEGAL_NAME`, `CONTACT_EMAIL`).
- Analítica: el sitio usa [Plausible](https://plausible.io) (sin cookies,
  no requiere consentimiento) en vez de Google Analytics. Para activarla,
  crea una cuenta/sitio en Plausible con el dominio del sitio y pon ese
  dominio en `PLAUSIBLE_DOMAIN` (`scripts/config.mjs`); mientras esté
  vacío, no se incluye ningún script de analítica en las páginas.
- Banner de cookies (`scripts/lib/legal.mjs`): aparece la primera vez que
  alguien visita el sitio, explica que la analítica no usa cookies y avisa
  de que la publicidad (Google AdSense), cuando se active, sí las
  necesitará. Guarda la aceptación en `localStorage` y expone
  `window.cookieConsentGiven()` para que el futuro script de AdSense
  compruebe el consentimiento antes de cargarse.
- Pendiente (Fase 3, puntos 5-6 del plan, requieren tráfico real primero):
  solicitar la cuenta de Google AdSense y colocar los anuncios una vez las
  páginas de población estén indexadas en Google Search Console y haya
  varias semanas de tráfico orgánico.

## Probarlo en tu ordenador

```bash
npm install   # no hay dependencias externas, solo confirma que usas Node 18+
npm run build # equivalente a: node scripts/build.mjs
open docs/index.html
```

## Notas

- La API del Ministerio se actualiza por su parte cada 30 minutos
  aproximadamente, así que consultarla cada hora es más que suficiente.
- Si un día la API no responde, el workflow simplemente falla ese ciclo y
  lo reintenta en la siguiente hora; la página se queda con los últimos
  datos válidos.
- El diseño (`templates/home.html` y `templates/municipio.html`) es HTML y
  CSS planos: se pueden editar a mano, los colores de los círculos se
  generan automáticamente a partir del nombre de cada gasolinera.
- Los colores e iniciales por gasolinera son generados (hash del nombre),
  no son logos oficiales de las marcas.
