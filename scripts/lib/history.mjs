// Histórico diario de precios por gasolinera (Fase 2 del plan de SEO).
//
// Guarda un archivo por día en data/history/{YYYY-MM-DD}.json con una
// entrada por gasolinera: { ideess, ...precio de cada carburante }. Los
// snapshots antiguos solo llevan diesel y g95: se leen igual, y los
// carburantes que no estén en ellos simplemente no tienen tendencia hasta
// que pasen suficientes días. Solo se escribe una vez
// al día (la primera ejecución del workflow que corre ese día "gana"; las
// siguientes ejecuciones horarias no la sobrescriben), porque con una
// lectura diaria por gasolinera es suficiente para ver la tendencia y así
// el histórico no crece sin control.
//
// data/history/ vive fuera de docs/, así que no se publica con GitHub
// Pages: es solo el almacén de datos que build.mjs usa para calcular la
// flecha de tendencia semanal y la gráfica de 30 días de cada población.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function pathForDate(historyDir, dateIso) {
  return join(historyDir, `${dateIso}.json`);
}

// Devuelve true si ha escrito el snapshot, false si ya existía uno para
// ese día (y por tanto no lo ha tocado).
export function recordDailySnapshot(historyDir, dateIso, stations) {
  mkdirSync(historyDir, { recursive: true });
  const path = pathForDate(historyDir, dateIso);
  if (existsSync(path)) return false;

  const entries = stations
    .filter((s) => s.ideess)
    .map((s) => ({ ideess: s.ideess, ...s.prices }));
  writeFileSync(path, JSON.stringify(entries), "utf8");
  return true;
}

const dayCache = new Map();

// Map ideess -> { precios por carburante } para un día concreto, o null si
// ese día no tiene histórico guardado. Cachea en memoria porque el mismo día
// se consulta una vez por cada población durante el build.
export function loadHistoryMap(historyDir, dateIso) {
  if (dayCache.has(dateIso)) return dayCache.get(dateIso);

  const path = pathForDate(historyDir, dateIso);
  let map = null;
  if (existsSync(path)) {
    try {
      const entries = JSON.parse(readFileSync(path, "utf8"));
      map = new Map(entries.map(({ ideess, ...prices }) => [ideess, prices]));
    } catch {
      map = null;
    }
  }
  dayCache.set(dateIso, map);
  return map;
}

export function isoDateMinusDays(dateIso, days) {
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

// Fechas ISO de los últimos `days` días (incluido dateIso), de más antigua
// a más reciente.
export function lastNDates(dateIso, days) {
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    dates.push(isoDateMinusDays(dateIso, i));
  }
  return dates;
}

// Compara el precio actual de una gasolinera con el de hace `days` días.
// Devuelve null si no hay dato de comparación (histórico aún insuficiente).
export function priceTrend(historyDir, todayIso, days, ideess, field, currentValue) {
  if (!ideess || currentValue === null || currentValue === undefined) return null;
  const pastMap = loadHistoryMap(historyDir, isoDateMinusDays(todayIso, days));
  if (!pastMap) return null;
  const past = pastMap.get(ideess);
  if (!past || past[field] === null || past[field] === undefined) return null;
  const diff = Math.round((currentValue - past[field]) * 1000) / 1000;
  return { diff };
}

// Serie diaria de precio medio (diésel y g95) de un conjunto de
// gasolineras (por ideess) a lo largo de los últimos `days` días.
export function averageSeries(historyDir, todayIso, days, ideessList) {
  const dates = lastNDates(todayIso, days);
  return dates.map((date) => {
    const map = loadHistoryMap(historyDir, date);
    if (!map) return { date, diesel: null, g95: null };

    let dSum = 0, dCount = 0, gSum = 0, gCount = 0;
    for (const id of ideessList) {
      const entry = map.get(id);
      if (!entry) continue;
      if (entry.diesel !== null && entry.diesel !== undefined) { dSum += entry.diesel; dCount++; }
      if (entry.g95 !== null && entry.g95 !== undefined) { gSum += entry.g95; gCount++; }
    }

    return {
      date,
      diesel: dCount ? Math.round((dSum / dCount) * 1000) / 1000 : null,
      g95: gCount ? Math.round((gSum / gCount) * 1000) / 1000 : null
    };
  });
}
