// Runs in <head> before the body: hides guest SSR content during session restore
// and loads the Telegram SDK only inside a Mini App, so browsers skip ~130 KB of
// parser-blocking third-party script.
(function () {
  var SDK_URL = "https://telegram.org/js/telegram-web-app.js";

  function hasValue(value) {
    return typeof value === "string" && value.length > 0;
  }

  // Mirrors telegram-web-app.js: initData comes only from tgWebAppData in the
  // launch hash or from params the SDK saved in sessionStorage for reloads.
  function hasMiniAppInitData() {
    var hash = "";
    try {
      hash = String(window.location.hash || "").replace(/^#/, "");
    } catch (_error) {
      // Location may be unavailable in sandboxed contexts.
    }
    var query = hash.indexOf("?");
    if (query >= 0) hash = hash.slice(query + 1);
    var pairs = hash ? hash.split("&") : [];
    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i].split("=");
      if (pair[0] === "tgWebAppData" && hasValue(pair[1])) return true;
    }
    try {
      var stored = JSON.parse(window.sessionStorage.getItem("__telegram__initParams"));
      return Boolean(stored) && hasValue(stored.tgWebAppData);
    } catch (_error) {
      // Storage can be blocked or hold foreign data.
      return false;
    }
  }

  var miniApp = hasMiniAppInitData();
  var hasToken = false;
  try {
    hasToken = Boolean(window.sessionStorage.getItem("review.auth.token"));
  } catch (_error) {
    // Storage can be blocked; React will resolve the session from memory.
  }
  if (miniApp || hasToken) {
    document.documentElement.setAttribute("data-telegram-startup", "");
  }
  if (miniApp) {
    // The app reads window.Telegram.WebApp synchronously, so main.tsx waits
    // for this promise. A failed load starts the app as a regular browser.
    window.__reviewTelegramSdk = new Promise(function (resolve) {
      var script = document.createElement("script");
      script.src = SDK_URL;
      script.onload = function () {
        resolve();
      };
      script.onerror = function () {
        resolve();
      };
      document.head.appendChild(script);
    });
  }
})();
