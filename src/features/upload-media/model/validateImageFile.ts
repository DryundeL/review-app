export const MAX_IMAGE_BYTES = 307_200;
const ALLOWED_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/** Удобство для пользователя: сервер всё равно проверяет размер и формат сам. */
export function validateImageFile(file: { size: number; type: string }): string | null {
  if (!ALLOWED_TYPES.has(file.type)) return "Поддерживаются JPEG, PNG и WebP";
  if (file.size <= 0) return "Файл пустой";
  if (file.size > MAX_IMAGE_BYTES) return "Файл больше 300 КБ";
  return null;
}
