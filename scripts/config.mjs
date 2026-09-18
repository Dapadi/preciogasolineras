// Configuración centralizada del proyecto. Cambiar aquí el dominio (Fase 4),
// el nombre del sitio o añadir/quitar provincias no debería requerir tocar
// ningún otro archivo.

export const SITE_URL = "https://dapadi.github.io/preciogasolineras";
export const SITE_NAME = "Gasolina CV";

// Códigos de provincia del Ministerio (dos dígitos): 03 Alicante,
// 12 Castellón, 46 Valencia.
export const PROVINCIAS = ["03", "12", "46"];

export const API_URL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/";

// Carburantes que se leen de la API y por los que se puede filtrar.
// `apiField` es el nombre exacto del campo en la respuesta del Ministerio;
// si alguno dejara de existir o cambiara de nombre, build.mjs avisa por
// consola de que ese carburante no ha casado con ninguna gasolinera.
// `label` se usa en los selectores y `short` en las cabeceras de la tabla.
export const FUELS = [
  { id: "diesel", label: "Diésel", short: "Diésel", apiField: "Precio Gasoleo A" },
  // Los ids van en minúscula sin separadores: viajan como nombres de
  // atributo (data-p-glp) en las páginas de población y el navegador
  // normaliza los nombres de atributo a minúsculas.
  { id: "dieselpremium", label: "Diésel Premium", short: "Dsl. Prem.", apiField: "Precio Gasoleo Premium" },
  { id: "g95", label: "Gasolina 95", short: "G. 95", apiField: "Precio Gasolina 95 E5" },
  { id: "g98", label: "Gasolina 98", short: "G. 98", apiField: "Precio Gasolina 98 E5" },
  { id: "glp", label: "GLP (autogás)", short: "GLP", apiField: "Precio Gases licuados del petróleo" },
  { id: "gnc", label: "Gas natural (GNC)", short: "GNC", apiField: "Precio Gas Natural Comprimido" }
];

// Los dos carburantes que se muestran como columnas cuando no hay ningún
// filtro de combustible aplicado.
export const DEFAULT_FUELS = ["diesel", "g95"];

// Histórico de precios (Fase 2): cuántos días atrás se compara para la
// flecha de tendencia por gasolinera, y cuántos días de histórico entran en
// la gráfica de evolución de cada población.
export const HISTORY_TREND_DAYS = 7;
export const HISTORY_CHART_DAYS = 30;

// Aviso legal / privacidad (Fase 3). LEGAL_NAME y CONTACT_EMAIL aparecen
// públicamente en docs/aviso-legal/ y docs/privacidad/.
export const LEGAL_NAME = "David";
export const CONTACT_EMAIL = "dpdiaz2006@gmail.com";

// Dominio dado de alta en https://plausible.io para la analítica del
// sitio. Vacío = todavía no hay cuenta creada, así que no se incluye
// ningún script de analítica en las páginas.
export const PLAUSIBLE_DOMAIN = "";
