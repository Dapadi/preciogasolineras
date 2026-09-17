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
