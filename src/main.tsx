import { createRoot, hydrateRoot } from "react-dom/client";
import { App } from "@/app/App";
import { readTelegramInitData } from "@/shared/platform";
import { getAccessToken } from "@/shared/api/session";
import "@/app/styles/index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root not found");
}

function start(root: HTMLElement) {
  const stateElement = document.getElementById("__REVIEW_SSR__");
  if (readTelegramInitData() || getAccessToken()) {
    // Авторизация начинается с прелоудера, без гидратации гостевого интерфейса.
    root.replaceChildren();
    createRoot(root).render(<App />);
  } else if (stateElement?.textContent) {
    const dehydratedState = JSON.parse(stateElement.textContent);
    hydrateRoot(root, <App dehydratedState={dehydratedState} />);
  } else {
    createRoot(root).render(<App />);
  }
}

// Внутри Mini App SDK грузится асинхронно (public/telegram-bootstrap.js), а
// приложение читает window.Telegram.WebApp синхронно — стартуем после него.
const telegramSdk = window.__reviewTelegramSdk;
if (telegramSdk) void telegramSdk.then(() => start(rootElement));
else start(rootElement);
