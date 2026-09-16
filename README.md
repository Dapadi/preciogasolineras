# Precios de gasolina en Aspe — actualización automática

Genera una página con los precios de todas las gasolineras de un municipio
(por defecto, Aspe) y la actualiza sola cada hora, publicándola gratis con
GitHub Pages.

## Cómo funciona

1. `scripts/build.mjs` descarga el listado oficial de precios del
   Ministerio (`sedeaplicaciones.minetur.gob.es`), filtra las gasolineras
   del municipio indicado y genera `docs/index.html` a partir de
   `template.html`.
2. `.github/workflows/update-precios.yml` ejecuta ese script cada hora
   (`cron: "0 * * * *"`) y, si los precios han cambiado, hace commit y push
   del nuevo `docs/index.html` automáticamente.
3. GitHub Pages sirve el contenido de `docs/` como una web pública normal.

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

## Cambiar de municipio

Edita la línea `MUNICIPIO: Aspe` en
`.github/workflows/update-precios.yml` (y opcionalmente en el comando de
`README` si lo ejecutas en local). El nombre debe coincidir con el que usa
el Ministerio en su base de datos (normalmente el nombre del municipio tal
cual, sin acentos raros ni provincia).

## Probarlo en tu ordenador

```bash
npm install   # no hay dependencias externas, solo confirma que usas Node 18+
MUNICIPIO=Aspe node scripts/build.mjs
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
