# Precios de gasolina en la Comunitat Valenciana — actualización automática

Genera una web con los precios de todas las gasolineras de Alicante,
Castellón y Valencia: una home con buscador y directorio de poblaciones, más
una página estática por población (para que Google pueda indexarlas), y se
actualiza sola cada pocos minutos, publicándose gratis con GitHub Pages.

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
     esa lectura; las siguientes ejecuciones del día no la tocan). Con eso
     cada página de población calcula la flecha de tendencia a 7 días de
     cada gasolinera (▲/▼) y la gráfica de precio medio de los últimos 30
     días. `data/history/` no se publica con GitHub Pages (vive fuera de
     `docs/`), es solo el almacén de datos del histórico.
2. `.github/workflows/update-precios.yml` ejecuta ese script cada 10 minutos
   (`cron: "*/10 * * * *"`) y, si algo ha cambiado, hace commit y push de todo
   `docs/` y `data/` automáticamente. Ver "Cada cuánto se actualiza de
   verdad" más abajo, porque GitHub no cumple ese horario.
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
6. Mapa interactivo ([Leaflet](https://leafletjs.com) + tiles de
   OpenStreetMap, cargados desde CDN). Cada gasolinera es un marcador
   circular con sus iniciales (mismo color que en la lista); al tocarlo se
   abre un popup con nombre, dirección y precios, y un enlace "Cómo llegar"
   a Google Maps. El mapa encuadra automáticamente todos los puntos
   visibles (`fitBounds`).
   - En la **home** aparece encima de la lista cada vez que hay resultados
     que mostrar (una búsqueda con texto o el modo "cerca de mí"), y se
     oculta por completo cuando no hay ninguna de las dos cosas, para no
     penalizar la carga inicial. Con geolocalización activa añade además un
     marcador azul con la posición del usuario.
   - En cada **página de población** aparece entre la tabla de precios y la
     gráfica, con las gasolineras de esa población.

   El código del mapa (etiquetas del CDN, estilos y lógica) vive una sola vez
   en `scripts/lib/map.mjs` y se inyecta en las dos plantillas; expone
   `FuelMap.render(gasolineras, posicionUsuario)`. Es una mejora progresiva:
   si no hay coordenadas, no hay JavaScript o el CDN de Leaflet falla, el
   mapa no se muestra y el resto de la página (que ya viene renderizada en
   el HTML) funciona igual.
7. Filtros de **marca** y **carburante**, en la home y en cada página de
   población. Al elegir un carburante concreto se ocultan las gasolineras que
   no lo venden, la tabla pasa de dos columnas de precio (diésel + gasolina
   95) a una sola con la del carburante elegido, y se reordena y se recalcula
   la etiqueta "MÁS BARATA" por ese precio. En la home los filtros funcionan
   también sin texto de búsqueda (p. ej. "todas las Ballenoil") y se combinan
   con el modo "cerca de mí".
   - La marca no viene en la API: se deduce del "Rótulo" con
     `brandFromName()` (`scripts/lib/format.mjs`), que busca la enseña como
     palabra suelta para que "PARADISA" no acabe contando como "Disa". Lo que
     no casa con ninguna marca conocida se agrupa en "Otras". Cada selector
     se rellena solo con las marcas que de verdad existen en esa página, con
     el número de gasolineras de cada una.
   - La barra y sus estilos viven en `scripts/lib/filters.mjs` y se inyectan
     en las dos plantillas; el comportamiento no se comparte porque cada
     página filtra sobre algo distinto: la home vuelve a dibujar la lista
     desde su JSON, y las páginas de población ocultan y reordenan las filas
     que ya vienen en el HTML (cada `<li>` lleva su marca y el precio y la
     tendencia de cada carburante en atributos `data-*`). Por eso en las
     páginas de población la barra de filtros solo aparece si hay
     JavaScript: sin él la tabla se ve completa, como antes.

## Diseño

Todo el aspecto visual vive en `scripts/lib/theme.mjs` y lo comparten las dos
plantillas, para que la home y las páginas de población no se separen cuando
se toca una de las dos: tokens de color, tipografía (Barlow, con Barlow
Condensed en los titulares) y los estilos base de cabecera, héroe, tarjetas,
tabla de precios y pie.

La cabecera y el héroe son siempre oscuros, porque son el elemento de marca;
el contenido es claro y respeta el modo oscuro del sistema. Cada página añade
en su propio `<style>` solo lo que es suyo (la gráfica, los vecinos, el
buscador...).

El color de marca se cambia en un sitio: `BRAND_PALETTE` en
`scripts/config.mjs`. Las paletas disponibles están en `theme.mjs`
(`petroleo`, `violeta`, `frambuesa`) y cada una define el fondo oscuro, el
acento, su versión suave, el color del texto que va encima del acento y el
acento en RGB, que es lo que permite derivar las transparencias (la píldora
de "actualizado", el halo del botón, el foco del buscador) sin repetir el
color a mano en cada regla.

Los verdes y rojos de "más barata" / "más cara" no forman parte de la
paleta y no cambian al cambiarla: son significado, no marca.

En la home, `scripts/lib/stats.mjs` calcula en el build las cifras de la
cabecera y dos secciones más, sin ninguna fuente de datos nueva: el precio
medio por provincia (en verde la más barata, en rojo la más cara) y la media
por marca en chips (en verde las que están más de 3 céntimos por debajo de la
media general). En las páginas de población, las cifras del héroe son el
diésel y la gasolina 95 más baratos de esa población.

## Cada cuánto se actualiza de verdad

El cron dice cada 10 minutos, pero **GitHub no lo cumple**. Los eventos
`schedule` son best-effort: se retrasan y se saltan cuando hay carga, y en
repos públicos van con baja prioridad. Midiendo los huecos reales entre
ejecuciones programadas con el cron anterior (que pedía cada hora), salía una
media de 265 minutos, con picos de 5,5 horas. Bajar el cron ayuda porque hay
más intentos, pero no lo convierte en puntual.

Para que sea de verdad puntual hay que llamar a `workflow_dispatch` desde
fuera, que no sufre esos retrasos: un cron externo (cron-job.org, un VPS, una
función programada) haciendo un `POST` a
`/repos/Dapadi/preciogasolineras/actions/workflows/update-precios.yml/dispatches`
con un token con permiso `actions:write`.

Para que subir la frecuencia no llene el repositorio de commits, `build.mjs`
guarda en `data/state.json` una huella de todos los precios junto con la
fecha en la que cambiaron por última vez. Si la consulta trae exactamente los
mismos precios, se reutiliza esa fecha y las páginas salen byte a byte
iguales, así que el workflow no hace commit. Esto importa porque la API
devuelve en su campo `Fecha` la hora de la consulta, no la del último cambio:
sin esta comprobación, cada ejecución reescribiría las ~290 páginas y
commitearía aunque no se hubiera movido un solo precio.

El efecto secundario es que la fecha que se ve en la web significa "cuándo
cambiaron los precios por última vez", que es más útil que "cuándo miramos".
Un cambio de plantilla o de diseño sí se publica igual, porque el HTML
generado difiere aunque los precios sean los mismos.

## Carburantes

`FUELS` en `scripts/config.mjs` define los carburantes que se descargan y por
los que se puede filtrar: gasóleo A, gasóleo premium, gasolina 95, gasolina
98, GLP y GNC. Cada uno lleva el nombre exacto del campo en la respuesta del
Ministerio (`apiField`), la etiqueta del selector y la etiqueta corta de la
cabecera de la tabla. `DEFAULT_FUELS` son los dos que se muestran como
columnas cuando no hay filtro.

Para añadir o quitar un carburante basta con tocar ese array. Al terminar,
`build.mjs` imprime cuántas gasolineras venden cada uno; si alguno sale a 0
avisa por consola, porque casi siempre significa que el `apiField` ya no
coincide con el nombre del campo en la API y no que nadie lo venda.

Los precios de cada gasolinera viven en `s.prices` (un objeto
`{ idCarburante: precio | null }`), y el histórico diario guarda todos los
carburantes. Los snapshots antiguos, que solo llevaban `diesel` y `g95`, se
siguen leyendo sin problema: los carburantes que no estén en ellos
simplemente no tienen flecha de tendencia hasta que pasen suficientes días.

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

A partir de ahí, GitHub Actions se encarga solo: cada pocos minutos vuelve a
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
  config.mjs             # SITE_URL, SITE_NAME, provincias, URL de la API, carburantes
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
    map.mjs                          # mapa interactivo (Leaflet) compartido por home y poblaciones
    filters.mjs                       # barra de filtros de marca y carburante (compartida)
    stations-json.mjs                  # serializa gasolineras para el JS de las páginas
    theme.mjs                           # sistema de diseño: tokens, tipografía y estilos base
    stats.mjs                            # totales y medias por provincia y por marca
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
  aproximadamente, así que consultarla cada 10 minutos la coge en cuanto cambia.
- Si un día la API no responde, el workflow simplemente falla ese ciclo y
  lo reintenta en la siguiente hora; la página se queda con los últimos
  datos válidos.
- El diseño (`templates/home.html` y `templates/municipio.html`) es HTML y
  CSS planos: se pueden editar a mano, los colores de los círculos se
  generan automáticamente a partir del nombre de cada gasolinera.
- Los colores e iniciales por gasolinera son generados (hash del nombre),
  no son logos oficiales de las marcas.
