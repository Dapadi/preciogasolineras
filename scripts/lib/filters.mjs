// Barra de filtros (marca y carburante) compartida por la home y las
// páginas de población: estilos, HTML de los dos selectores y el catálogo de
// carburantes que necesita el JavaScript de cada página.
//
// El comportamiento no se comparte, porque cada página filtra sobre algo
// distinto: la home vuelve a dibujar la lista desde su JSON, y las páginas
// de población ocultan filas que ya vienen renderizadas en el HTML.

import { FUELS, DEFAULT_FUELS } from "../config.mjs";
import { escapeHtml } from "./format.mjs";

export function renderFilterStyles() {
  return `  .filters { display: flex; gap: 8px; margin-top: 10px; }
  .filters select {
    flex: 1; min-width: 0; font-family: inherit; font-size: 13.5px; color: var(--ink);
    background: var(--card); border: 1px solid var(--line); border-radius: 10px;
    padding: 9px 10px; cursor: pointer; appearance: none;
    background-image: url("data:image/svg+xml;charset=utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239c9b92' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 8px center; background-size: 16px;
    padding-right: 28px;
  }
  .filters select:focus { border-color: var(--ink-faint); outline: none; }
  .filters select.on { border-color: var(--go); color: var(--go); font-weight: 600; }
  .filters.hidden { display: none; }
  /* Con un carburante concreto elegido, la tabla pasa de dos columnas de
     precio (diésel + G95) a una sola con la del carburante elegido. */
  body.single-fuel .col-labels,
  body.single-fuel a.row { grid-template-columns: 1fr 62px 20px; }
  body.single-fuel .col-labels .col-p2,
  body.single-fuel a.row .price.col-p2 { display: none; }`;
}

// `hidden` la deja oculta hasta que el JavaScript de la página la active:
// en las páginas de población la tabla ya viene renderizada en el HTML, así
// que sin JS no debe verse una barra de filtros que no haría nada.
export function renderFilterBar(brands, { hidden = false } = {}) {
  const brandOptions = brands
    .map(({ brand, count }) => `<option value="${escapeHtml(brand)}">${escapeHtml(brand)} (${count})</option>`)
    .join("\n        ");

  const fuelOptions = FUELS.map(
    (f) => `<option value="${escapeHtml(f.id)}">${escapeHtml(f.label)}</option>`
  ).join("\n        ");

  return `    <div class="filters${hidden ? " hidden" : ""}" id="filters">
      <select id="filter-brand" aria-label="Filtrar por marca">
        <option value="">Todas las marcas</option>
        ${brandOptions}
      </select>
      <select id="filter-fuel" aria-label="Filtrar por carburante">
        <option value="">Todos los carburantes</option>
        ${fuelOptions}
      </select>
    </div>`;
}

// Catálogo que consume el JS de cada página: etiqueta corta por carburante
// y cuáles son los dos que se muestran cuando no hay filtro.
export function renderFuelCatalogScript() {
  const labels = Object.fromEntries(FUELS.map((f) => [f.id, f.short]));
  return `<script>
  var FUEL_LABELS = ${JSON.stringify(labels)};
  var DEFAULT_FUELS = ${JSON.stringify(DEFAULT_FUELS)};
</script>`;
}
