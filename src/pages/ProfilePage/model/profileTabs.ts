export type ProfileSection = "reviews" | "lists" | "requests";
export type ReviewsSub = "published" | "drafts";
export type ListsSub = "results" | "templates" | "drafts";

export type ProfileTabState =
  | { section: "reviews"; sub: ReviewsSub }
  | { section: "lists"; sub: ListsSub }
  | { section: "requests" };

export type ProfileTabAccess = {
  /** Владелец видит черновики. */
  own: boolean;
  /** Вкладка запросов на подписку — только у своего закрытого профиля. */
  showRequests: boolean;
};

const DEFAULT_STATE: ProfileTabState = { section: "reviews", sub: "published" };

/**
 * Читает ?tab=&sub= профиля. Чужому недоступные значения (черновики, запросы)
 * откатываются к ближайшему разрешённому разделу, а не к ошибке.
 * Старые ссылки ?tab=drafts и ?tab=lists продолжают работать.
 */
export function parseProfileTab(
  params: URLSearchParams,
  access: ProfileTabAccess,
): ProfileTabState {
  const tab = params.get("tab");
  const sub = params.get("sub");

  if (tab === "requests")
    return access.showRequests ? { section: "requests" } : DEFAULT_STATE;

  if (tab === "lists") {
    if (sub === "templates") return { section: "lists", sub: "templates" };
    if (sub === "drafts" && access.own) return { section: "lists", sub: "drafts" };
    return { section: "lists", sub: "results" };
  }

  // Наследие: ?tab=drafts раньше было вкладкой черновиков обзоров.
  const reviewsSub = tab === "drafts" ? "drafts" : sub;
  if (reviewsSub === "drafts" && access.own) return { section: "reviews", sub: "drafts" };
  return DEFAULT_STATE;
}

/** Пишет состояние в параметры, сохраняя посторонние ключи; дефолты не пишутся. */
export function writeProfileTab(
  previous: URLSearchParams,
  state: ProfileTabState,
): URLSearchParams {
  const params = new URLSearchParams(previous);
  params.delete("tab");
  params.delete("sub");
  if (state.section === "requests") {
    params.set("tab", "requests");
  } else if (state.section === "lists") {
    params.set("tab", "lists");
    if (state.sub !== "results") params.set("sub", state.sub);
  } else if (state.sub !== "published") {
    params.set("sub", state.sub);
  }
  return params;
}
