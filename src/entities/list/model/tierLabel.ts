/** Название тира для показа: в черновике оно может быть пустым. */
export function tierLabel(name: string): string {
  return name.trim() === "" ? "Без названия" : name;
}
