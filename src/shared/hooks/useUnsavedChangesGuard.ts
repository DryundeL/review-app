import { useEffect } from "react";

export const UNSAVED_CHANGES_PROMPT = "Есть несохранённые изменения. Уйти?";

/** Метка в history.state у записи-заглушки, которую ставит guard. */
const SENTINEL_KEY = "__unsavedChangesGuard";

/** true — можно уходить. */
export function confirmLeave(dirty: boolean): boolean {
  return !dirty || window.confirm(UNSAVED_CHANGES_PROMPT);
}

function isSentinel(state: unknown): boolean {
  return typeof state === "object" && state !== null && SENTINEL_KEY in state;
}

function pushSentinel(): void {
  const current: unknown = window.history.state;
  // Сохраняем key/idx роутера: возврат на заглушку для него — та же запись.
  const base = typeof current === "object" && current !== null ? current : {};
  window.history.pushState({ ...base, [SENTINEL_KEY]: true }, "", window.location.href);
}

/** Ссылка, переход по которой не уводит со страницы (новая вкладка, скачивание). */
function opensElsewhere(event: MouseEvent, link: Element): boolean {
  if (event.button !== 0) return true;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return true;
  if (link.hasAttribute("download")) return true;
  const target = link.getAttribute("target");
  return target !== null && target !== "" && target !== "_self";
}

/**
 * Пока есть несохранённые правки: предупреждение при закрытии/перезагрузке вкладки
 * и закрытии Mini App, подтверждение перехода по ссылкам приложения и «назад» в истории.
 * BrowserRouter не data router, `useBlocker` недоступен: ссылки перехватываются
 * в фазе захвата, «назад» — через запись-заглушку в истории, а кнопки выхода
 * страница проверяет сама через `confirmLeave`.
 */
export function useUnsavedChangesGuard(dirty: boolean): void {
  // Заглушка живёт, пока смонтирован экран: при повторных правках используется снова.
  useEffect(
    () => () => {
      if (isSentinel(window.history.state)) window.history.back();
    },
    [],
  );

  useEffect(() => {
    if (!dirty) return;
    const telegram = window.Telegram?.WebApp;
    telegram?.enableClosingConfirmation?.();
    let leaving = false;
    if (!isSentinel(window.history.state)) pushSentinel();

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (leaving) return;
      event.preventDefault();
      // Старые браузеры показывают диалог только при непустом returnValue.
      event.returnValue = "";
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      const link = target instanceof Element ? target.closest("a[href]") : null;
      if (!link || opensElsewhere(event, link)) return;
      if (!confirmLeave(true)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const onPopState = () => {
      if (leaving || isSentinel(window.history.state)) return;
      if (!window.confirm(UNSAVED_CHANGES_PROMPT)) {
        pushSentinel();
        return;
      }
      leaving = true;
      window.removeEventListener("popstate", onPopState);
      // Заглушка уже позади: шаг назад уводит на предыдущую страницу.
      window.history.back();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("click", onClick, true);
      telegram?.disableClosingConfirmation?.();
    };
  }, [dirty]);
}
