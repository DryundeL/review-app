// Runs after Telegram SDK and before the body to prevent a flash of guest SSR content.
(function () {
  var initData =
    window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData;
  if (typeof initData === "string" && initData.length > 0) {
    document.documentElement.setAttribute("data-telegram-startup", "");
  }
})();
