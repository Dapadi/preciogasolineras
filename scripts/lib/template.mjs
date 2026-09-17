// Motor de plantillas mínimo: sustituye placeholders __CLAVE__ por texto.
//
// A propósito NO usamos String.prototype.replace con el valor directamente:
// si el valor viene de datos externos (nombre de una gasolinera, dirección)
// y contiene "$", replace() lo interpreta como patrón especial ($&, $$...)
// y puede corromper la salida. split(...).join(...) trata el valor como
// texto literal siempre.
export function fill(template, replacements) {
  let out = template;
  for (const [key, value] of Object.entries(replacements)) {
    out = out.split(`__${key}__`).join(String(value));
  }
  return out;
}
