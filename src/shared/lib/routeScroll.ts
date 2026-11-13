/** Positions belong to history entries, so revisiting the same URL stays independent. */
export function createRouteScrollRestoration() {
  const positions = new Map<string, number>();
  const previousRestoration = window.history.scrollRestoration;
  window.history.scrollRestoration = "manual";
  let activeKey: string | undefined;
  let activePath: string | undefined;
  let lastY = window.scrollY;
  let stopRestore = () => {};
  const onScroll = () => {
    lastY = window.scrollY;
  };
  window.addEventListener("scroll", onScroll, { passive: true });

  return {
    navigate(key: string, type: string, pathname: string) {
      stopRestore();
      if (activeKey === key) return;
      if (activeKey === undefined) {
        activeKey = key;
        activePath = pathname;
        return;
      }
      positions.set(activeKey, lastY);
      if (positions.size > 50) positions.delete(positions.keys().next().value!);
      const samePage = activePath === pathname;
      activeKey = key;
      activePath = pathname;
      const target = type === "POP" ? (positions.get(key) ?? 0) : samePage ? lastY : 0;
      let restoring = true;
      const restore = () => {
        if (!restoring) return;
        window.scrollTo({ top: target, behavior: "instant" });
        lastY = window.scrollY;
        if (Math.abs(lastY - target) < 1) stopRestore();
      };
      // A cached list may need another layout pass before it reaches its old height.
      let observer: ResizeObserver | undefined;
      const cancel = () => {
        restoring = false;
        observer?.disconnect();
        window.removeEventListener("wheel", cancel);
        window.removeEventListener("touchstart", cancel);
        window.removeEventListener("keydown", cancel);
      };
      stopRestore = cancel;
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(restore);
        observer.observe(window.document.body);
      }
      window.addEventListener("wheel", cancel, { passive: true });
      window.addEventListener("touchstart", cancel, { passive: true });
      window.addEventListener("keydown", cancel);
      restore();
    },
    dispose() {
      stopRestore();
      window.removeEventListener("scroll", onScroll);
      window.history.scrollRestoration = previousRestoration;
    },
  };
}
