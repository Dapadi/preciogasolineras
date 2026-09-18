// Sistema de diseño compartido por todas las páginas: tokens de color,
// tipografía y estilos base (cabecera, héroe, tarjetas, tablas de precios,
// pie). Vive aquí, y no en cada plantilla, para que la home y las páginas de
// población no se separen visualmente cuando se toca una de las dos.
//
// La cabecera y el héroe son siempre oscuros (son el elemento de marca); el
// contenido es claro y respeta el modo oscuro del sistema.

// Paletas de marca disponibles. Se elige con BRAND_PALETTE en config.mjs.
// `onAccent` es el color del texto que va encima del acento (los botones
// llenos), y `accentRgb` permite derivar transparencias del acento sin
// repetir el color a mano en cada regla.
const PALETTES = {
  violeta: {
    dark: "#15141c", darkSoft: "#1e1c29", darkLine: "#322d45",
    accent: "#8b5cf6", accentSoft: "#a78bfa", accentRgb: "139,92,246", onAccent: "#ffffff"
  },
  petroleo: {
    dark: "#0c1b1f", darkSoft: "#13282d", darkLine: "#1f3c43",
    accent: "#14b8a6", accentSoft: "#5eead4", accentRgb: "20,184,166", onAccent: "#04201c"
  },
  frambuesa: {
    dark: "#1a1016", darkSoft: "#271722", darkLine: "#402336",
    accent: "#ec4899", accentSoft: "#f9a8d4", accentRgb: "236,72,153", onAccent: "#ffffff"
  }
};

export function palette(name) {
  return PALETTES[name] || PALETTES.violeta;
}

export const PALETTE_NAMES = Object.keys(PALETTES);

export const FONTS_TAG =
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700&display=swap" rel="stylesheet">';

export function renderThemeStyles(paletteName) {
  const p = palette(paletteName);
  return `<style>
  :root {
    /* Marca (scripts/config.mjs -> BRAND_PALETTE) */
    --navy: ${p.dark}; --navy-soft: ${p.darkSoft}; --navy-line: ${p.darkLine};
    --accent: ${p.accent}; --accent-soft: ${p.accentSoft};
    --accent-rgb: ${p.accentRgb}; --on-accent: ${p.onAccent};
    /* Contenido */
    --bg: #f3f6fa; --card: #ffffff; --line: #e3e8ef;
    --ink: #101828; --ink-dim: #566175; --ink-faint: #8b95a5;
    --go: #15803d; --go-bg: #e8f6ed;
    --bad: #c2321f;
    --line-diesel: #c2410c; --line-g95: #2563eb;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #101726; --card: #172033; --line: #26314a;
      --ink: #eef2f8; --ink-dim: #a3adc0; --ink-faint: #76839a;
      --go: #4ade80; --go-bg: #12301f;
      --bad: #fb7185;
      --line-diesel: #f0975a; --line-g95: #6ea8fe;
    }
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: var(--bg); color: var(--ink);
    font-family: 'Barlow', system-ui, sans-serif; -webkit-font-smoothing: antialiased;
    min-height: 100vh;
  }
  a { color: inherit; }
  .wrap { max-width: 920px; margin: 0 auto; padding: 0 16px; }
  h1, h2, h3, .display { font-family: 'Barlow Condensed', 'Barlow', system-ui, sans-serif; letter-spacing: .01em; }

  /* --- Cabecera --- */
  .topbar { background: var(--navy); border-bottom: 1px solid var(--navy-line); }
  .topbar-inner { max-width: 920px; margin: 0 auto; padding: 12px 16px; display: flex; align-items: center; gap: 12px; }
  .logo { display: flex; align-items: center; gap: 9px; text-decoration: none; color: #fff; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 19px; letter-spacing: .04em; }
  .logo-mark { width: 30px; height: 30px; border-radius: 8px; background: var(--accent); color: var(--on-accent); display: flex; align-items: center; justify-content: center; }
  .logo-mark svg { width: 17px; height: 17px; }
  .logo em { font-style: normal; color: var(--accent); }
  .topbar-actions { margin-left: auto; display: flex; gap: 8px; }
  .btn-ghost {
    display: inline-flex; align-items: center; gap: 7px; font-family: 'Barlow', sans-serif;
    font-size: 12.5px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase;
    color: #dbe3f0; background: transparent; border: 1px solid var(--navy-line);
    border-radius: 999px; padding: 8px 14px; cursor: pointer; text-decoration: none;
  }
  .btn-ghost svg { width: 15px; height: 15px; }
  .btn-ghost:hover { border-color: var(--accent); color: #fff; }
  .btn-ghost.on { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }

  /* --- Héroe --- */
  .hero { background: var(--navy); color: #fff; padding: 26px 0 30px; }
  .hero-inner { max-width: 920px; margin: 0 auto; padding: 0 16px; }
  .status-pill {
    display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600;
    color: var(--accent-soft); background: rgba(var(--accent-rgb),.10); border: 1px solid rgba(var(--accent-rgb),.28);
    border-radius: 999px; padding: 6px 13px;
  }
  .status-pill i { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; flex-shrink: 0; }
  .hero h1 { font-size: 40px; font-weight: 700; line-height: 1.05; margin: 16px 0 10px; }
  .hero h1 em { font-style: normal; color: var(--accent); }
  .hero-sub { font-size: 15px; line-height: 1.55; color: #aab6c9; margin: 0 0 20px; max-width: 620px; }
  .hero-sub b { color: #fff; font-weight: 600; }

  /* Cifras */
  .stats { display: flex; flex-wrap: wrap; gap: 26px; margin-top: 20px; }
  .stats div { display: flex; flex-direction: column; }
  .stats b { font-family: 'Barlow Condensed', sans-serif; font-size: 28px; font-weight: 700; color: var(--accent); line-height: 1; }
  .stats span { font-size: 12px; color: #8996aa; margin-top: 3px; }

  /* CTAs */
  .cta-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
  .btn-primary, .btn-outline {
    display: inline-flex; align-items: center; gap: 8px; font-family: 'Barlow', sans-serif;
    font-size: 14.5px; font-weight: 600; border-radius: 999px; padding: 11px 20px;
    cursor: pointer; text-decoration: none; border: 1px solid transparent;
  }
  .btn-primary { background: var(--accent); color: var(--on-accent); box-shadow: 0 6px 20px rgba(var(--accent-rgb),.25); }
  .btn-primary:hover { background: var(--accent-soft); }
  .btn-outline { background: transparent; color: #dbe3f0; border-color: var(--navy-line); }
  .btn-outline:hover { border-color: var(--accent); color: #fff; }
  .btn-primary svg, .btn-outline svg { width: 17px; height: 17px; }

  /* --- Contenido --- */
  main { padding: 26px 0 50px; }
  .section { margin-top: 30px; }
  .section > h2 { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
  .section > .section-sub { font-size: 13.5px; color: var(--ink-dim); margin: 0 0 14px; line-height: 1.5; }
  .panel { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 16px; }
  .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }

  /* Tabla de precios */
  .col-labels { display: grid; grid-template-columns: 1fr 62px 62px 20px; gap: 10px; padding: 0 4px 8px; font-size: 11.5px; color: var(--ink-faint); border-bottom: 1px solid var(--line); }
  .col-labels span:nth-child(2), .col-labels span:nth-child(3) { text-align: right; }
  ul.stations { list-style: none; margin: 0; padding: 0; }
  li.station { border-bottom: 1px solid var(--line); }
  li.station:last-child { border-bottom: none; }
  a.row { display: grid; grid-template-columns: 1fr 62px 62px 20px; align-items: center; gap: 10px; padding: 13px 4px; text-decoration: none; color: inherit; }
  .id-cell { display: flex; align-items: center; gap: 11px; min-width: 0; }
  .mono { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; color: #fff; flex-shrink: 0; }
  .name-block { min-width: 0; }
  .name { font-weight: 600; font-size: 15px; }
  .best-tag { font-size: 10.5px; font-weight: 700; color: var(--go); background: var(--go-bg); border-radius: 3px; padding: 1px 5px; margin-left: 6px; letter-spacing: .02em; }
  .addr { font-size: 12px; color: var(--ink-faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .price { text-align: right; font-variant-numeric: tabular-nums; font-size: 14.5px; }
  .price.best { color: var(--go); font-weight: 700; }
  .price.na { color: var(--ink-faint); }
  .dist { font-size: 12px; color: var(--ink-dim); white-space: nowrap; }
  .trend { font-size: 10.5px; font-weight: 600; font-variant-numeric: tabular-nums; margin-top: 1px; }
  .trend-up { color: var(--bad); }
  .trend-down { color: var(--go); }
  .pin { color: var(--ink-faint); display: flex; justify-content: center; }
  .pin svg { width: 16px; height: 16px; }
  .empty { padding: 24px 4px; color: var(--ink-faint); font-size: 14px; }

  /* Chips de precio (marcas) */
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip {
    display: inline-flex; align-items: baseline; gap: 7px; font-size: 13px;
    background: var(--card); border: 1px solid var(--line); border-radius: 999px; padding: 7px 13px;
    text-decoration: none;
  }
  .chip .chip-name { font-weight: 600; letter-spacing: .02em; }
  .chip .chip-val { font-variant-numeric: tabular-nums; font-weight: 700; }
  .chip .chip-val.cheap { color: var(--go); }
  .chip .chip-val.dear { color: var(--bad); }

  /* Tabla de provincias */
  .prov-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0 22px; }
  .prov-row { display: grid; grid-template-columns: 1fr auto auto; gap: 12px; align-items: baseline; padding: 9px 2px; border-bottom: 1px solid var(--line); font-size: 14px; }
  .prov-row .prov-name { font-weight: 500; }
  .prov-row .prov-val { font-variant-numeric: tabular-nums; font-weight: 700; min-width: 52px; text-align: right; }
  .prov-row .prov-val.second { font-weight: 400; color: var(--ink-dim); }
  .prov-row .prov-val.cheap { color: var(--go); }
  .prov-row .prov-val.dear { color: var(--bad); }

  /* Pie */
  footer { border-top: 1px solid var(--line); margin-top: 34px; padding: 20px 0 0; font-size: 12.5px; color: var(--ink-faint); line-height: 1.6; }
  footer .note { margin-bottom: 6px; }
  .legal-links { margin-top: 8px; }
  .legal-links a { color: var(--ink-faint); text-decoration: underline; }

  .cookie-banner { position: fixed; left: 12px; right: 12px; bottom: 12px; max-width: 560px; margin: 0 auto; background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; box-shadow: 0 8px 30px rgba(0,0,0,.22); font-size: 12.5px; color: var(--ink-dim); z-index: 999; }
  .cookie-banner p { margin: 0 0 10px; line-height: 1.5; }
  .cookie-banner a { color: var(--ink); }
  .cookie-banner button { font-family: inherit; font-size: 13px; font-weight: 600; color: var(--on-accent); background: var(--accent); border: none; border-radius: 8px; padding: 8px 14px; cursor: pointer; }

  @media (max-width: 560px) {
    .hero h1 { font-size: 31px; }
    .hero { padding: 20px 0 24px; }
    .stats { gap: 18px; }
    .stats b { font-size: 23px; }
    .btn-primary, .btn-outline { flex: 1; justify-content: center; }
  }
</style>`;
}

// Icono de surtidor del logotipo.
export const PUMP_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M4 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15"/><path d="M3 20h11"/><path d="M6.5 8.5h4"/>' +
  '<path d="M16 9l2.2 2.2a2 2 0 0 1 .6 1.4V17a1.6 1.6 0 0 0 3.2 0v-6"/></svg>';

export const LOCATE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>';
