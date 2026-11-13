/** Content stays visible without animation APIs; only newly visible identities animate. */
export function observeContentReveal(root: HTMLElement, skipInitial: boolean) {
  if (typeof IntersectionObserver === "undefined" || !root.animate) return () => {};
  const seen = new Set<string>();
  const animations = new Set<Animation>();
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const styles = window.getComputedStyle(root);
  const duration = parseFloat(styles.getPropertyValue("--motion-duration-normal")) || 240;
  const easing = styles.getPropertyValue("--motion-ease").trim() || "ease-out";
  const observer = new IntersectionObserver(
    (entries) => {
      let order = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        const node = entry.target as HTMLElement;
        const id = node.dataset.revealId;
        if (!id || seen.has(id) || !root.contains(node)) continue;
        seen.add(id);
        if (preference.matches || node.contains(root.ownerDocument.activeElement))
          continue;
        const opacity = window.getComputedStyle(node).opacity || "1";
        const animation = node.animate(
          [
            { opacity: 0, transform: "translateY(6px)" },
            { opacity, transform: "translateY(0)" },
          ],
          { duration, easing, delay: Math.min(order++, 4) * 30, fill: "backwards" },
        );
        animations.add(animation);
        animation.onfinish = animation.oncancel = () => animations.delete(animation);
      }
    },
    { threshold: 0.05 },
  );
  const visit = (node: Element, callback: (item: HTMLElement) => void) => {
    if (node.matches("[data-reveal-id]")) callback(node as HTMLElement);
    node.querySelectorAll<HTMLElement>("[data-reveal-id]").forEach(callback);
  };
  const watch = (node: HTMLElement) => {
    if (node.dataset.revealId && !seen.has(node.dataset.revealId)) observer.observe(node);
  };
  visit(root, (node) => {
    if (skipInitial && node.dataset.revealId) seen.add(node.dataset.revealId);
    else watch(node);
  });
  const mutations = new window.MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "attributes") watch(record.target as HTMLElement);
      for (const node of record.removedNodes) {
        if (node.nodeType === 1)
          visit(node as Element, (item) => observer.unobserve(item));
      }
      for (const node of record.addedNodes) {
        if (node.nodeType === 1) visit(node as Element, watch);
      }
    }
  });
  mutations.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-reveal-id"],
  });
  const cancel = () => {
    for (const animation of animations) animation.cancel();
    animations.clear();
  };
  const onPreferenceChange = () => {
    if (preference.matches) cancel();
  };
  preference.addEventListener("change", onPreferenceChange);
  root.addEventListener("focusin", cancel);
  return () => {
    observer.disconnect();
    mutations.disconnect();
    preference.removeEventListener("change", onPreferenceChange);
    root.removeEventListener("focusin", cancel);
    cancel();
  };
}
