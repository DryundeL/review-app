const RU = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
const LAT = [
  "a", "b", "v", "g", "d", "e", "e", "zh", "z", "i", "y", "k", "l", "m", "n", "o", "p", "r", "s", "t", "u", "f", "h", "ts", "ch", "sh", "sch", "", "y", "", "e", "yu", "ya",
];

const MAX_QUERY = 80;

export function fold(value: string): string {
  let out = "";
  for (const char of value.toLowerCase()) {
    const index = RU.indexOf(char);
    out += index >= 0 ? LAT[index] : char;
  }
  return out;
}

/** Пустой запрос — явное «показать список». Слишком длинный не совпадает ни с чем. */
export function matchesQuery(query: string, fields: readonly string[]): boolean {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) return true;
  if (normalized.length > MAX_QUERY) return false;
  const folded = fold(normalized);
  return fields.some((field) => {
    const value = field.toLowerCase();
    return value.includes(normalized) || fold(value).includes(folded);
  });
}
