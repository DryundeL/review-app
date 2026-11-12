// Runs before the body to prevent guest SSR content flashing during session restore.
(function () {
  var initData =
    window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData;
  var hasToken = false;
  try {
    hasToken = Boolean(window.sessionStorage.getItem("review.auth.token"));
  } catch (_error) {
    // Storage can be blocked; React will resolve the session from memory.
  }
  if ((typeof initData === "string" && initData.length > 0) || hasToken) {
    document.documentElement.setAttribute("data-telegram-startup", "");
  }
})();
