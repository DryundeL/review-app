/** Структурный вид ApiError: файл тестируется без алиасов `@/`. */
export type ErrorLike = {
  status: number;
  code: string;
  message: string;
  details?: { field?: string; index?: number };
};

/** Что не так с объектом при публикации (422 VALIDATION_ERROR). */
export function publishFieldMessage(field?: string, index?: number): string | null {
  const item = index === undefined ? "" : ` ${index + 1}`;
  switch (field) {
    case "title":
      return "Не хватает: названия";
    case "items":
      return "Не хватает: элементов";
    case "items.title":
      return `Не хватает: названия у элемента${item}`;
    case "items.image":
      return `Не хватает: картинки у элемента${item}`;
    case "tiers.name":
      return `Не хватает: названия у тира${item}`;
    case "entries":
      return "Не хватает: расстановки элементов";
    default:
      return null;
  }
}

export type OwnerAction = "publish" | "other";

export function ownerActionMessage(error: ErrorLike, action: OwnerAction): string {
  if (error.status === 403 && error.code === "HIDDEN_BY_MODERATOR") {
    return "Скрыто модератором";
  }
  if (error.status === 409 && error.code === "REVISION_CONFLICT") {
    return "Объект изменился, обновите страницу";
  }
  if (action === "publish" && error.status === 422 && error.code === "VALIDATION_ERROR") {
    return (
      publishFieldMessage(error.details?.field, error.details?.index) ?? error.message
    );
  }
  return error.message;
}

/** Ошибки POST /list-templates/:id/results. */
export function createResultMessage(error: ErrorLike): string {
  if (error.status === 409) return "Сначала опубликуйте шаблон";
  if (error.status === 403 && error.code === "HIDDEN_BY_MODERATOR") {
    return "Шаблон скрыт модератором";
  }
  if (error.status === 422 && error.code === "QUOTA_EXCEEDED") {
    return "Достигнут лимит: 200 топов";
  }
  return error.message;
}
