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
     de poblaciones agrupadas por provincia, a partir de `template.html`.
   - `docs/gasolineras/{provincia}/{municipio}/index.html`: una página por
     población con la tabla de precios ya renderizada en el HTML (sin
     depender de JS), título, meta description, canonical y JSON-LD, a
     partir de `template-municipio.html`.
   - `docs/sitemap.xml` y `docs/robots.txt`.
2. `.github/workflows/update-precios.yml` ejecuta ese script cada hora
   (`cron: "0 * * * *"`) y, si algo ha cambiado, hace commit y push de todo
   `docs/` automáticamente.
3. GitHub Pages sirve el contenido de `docs/` como una web pública normal.
4. En la home, el buscador filtra en el navegador (sin llamadas de red) por
   código postal, población o nombre de gasolinera. Desde cada página de
   población se puede volver a la home con una búsqueda ya rellenada
   (`?q=...`).

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

Edita el array `PROVINCIAS` en `scripts/build.mjs`. Los códigos de
provincia del Ministerio son de dos dígitos (por ejemplo `03` Alicante,
`12` Castellón, `46` Valencia).

## Probarlo en tu ordenador

```bash
npm install   # no hay dependencias externas, solo confirma que usas Node 18+
node scripts/build.mjs
open docs/index.html
```

## Notas

- La API del Ministerio se actualiza por su parte cada 30 minutos
  aproximadamente, así que consultarla cada hora es más que suficiente.
- Si un día la API no responde, el workflow simplemente falla ese ciclo y
  lo reintenta en la siguiente hora; la página se queda con los últimos
  datos válidos.
- El diseño (`template.html`) es el mismo que viste en el chat: puedes
  editarlo a mano, los colores de los círculos se generan automáticamente
  a partir del nombre de cada gasolinera.
- Los colores e iniciales por gasolinera son generados (hash del nombre),
  no son logos oficiales de las marcas.
