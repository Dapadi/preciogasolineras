// Utilidades de formato y texto compartidas por los distintos generadores
// de páginas.

export function colorFromName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 42%, 38%)`;
}

export function initialsFromName(name) {
  const words = name
    .replace(/[^\p{L}\s]/gu, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Marcas conocidas, en el orden en el que se comprueban. La API solo da el
// "Rótulo" en texto libre ("E.S. REPSOL LA PLANA", "BALLENOIL 42"...), así
// que la marca se deduce buscando el nombre de la enseña como palabra
// suelta. Lo que no casa con ninguna se agrupa en "Otras" (independientes,
// cooperativas, estaciones sin enseña reconocible).
const BRANDS = [
  "Repsol", "Cepsa", "BP", "Shell", "Galp", "Petronor", "Campsa", "Avia",
  "Q8", "Disa", "Meroil", "Tamoil",
  "Ballenoil", "Plenoil", "Petroprix", "Esclatoil", "Easygas",
  "Carrefour", "Alcampo", "Eroski", "BonÀrea", "Makro", "Costco",
  "Valcarce", "Farruco", "Gasexpress"
];

const BRAND_PATTERNS = BRANDS.map((brand) => ({
  brand,
  // \b para que "Disa" no case dentro de "Paradisa" ni "BP" dentro de "BPX".
  re: new RegExp(`\\b${normalizeText(brand).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`)
}));

export const OTHER_BRAND = "Otras";

function normalizeText(str) {
  return String(str)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
}

// "E.S. REPSOL LA PLANA" -> "Repsol"; "GASOLINERA PEPITO S.L." -> "Otras".
export function brandFromName(name) {
  const normalized = normalizeText(name);
  for (const { brand, re } of BRAND_PATTERNS) {
    if (re.test(normalized)) return brand;
  }
  return OTHER_BRAND;
}

export function slugify(str) {
  return (
    String(str)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "sin-nombre"
  );
}

const LOWERCASE_WORDS = new Set(["de", "del", "la", "las", "el", "los", "les", "i", "y", "d"]);

export function titleCase(str) {
  return String(str)
    .toLowerCase()
    .split(/(\s+|\/|-)/)
    .map((word, i) => {
      if (/^\s+$/.test(word) || word === "/" || word === "-") return word;
      if (i > 0 && LOWERCASE_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join("");
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function fmtPrice(n) {
  return n === null ? "—" : n.toFixed(3).replace(".", ",");
}

export function mapsUrl(s) {
  if (s.lat && s.lng) {
    return `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`;
  }
  const q = encodeURIComponent(`${s.name}, ${s.addr}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

// DD/MM/YYYY HH:mm:ss (formato de "Fecha" de la API) -> YYYY-MM-DD.
export function toIsoDate(fechaStr) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(fechaStr);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(fechaStr);
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}
