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
