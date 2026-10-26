import { createRoot, hydrateRoot } from "react-dom/client";
import { App } from "@/app/App";
import { redirectBrowserToTelegramIfNeeded } from "@/shared/platform";
import "@/app/styles/index.css";

if (!redirectBrowserToTelegramIfNeeded()) {
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    throw new Error("Root element #root not found");
  }

  const stateElement = document.getElementById("__REVIEW_SSR__");
  if (stateElement?.textContent) {
    const dehydratedState = JSON.parse(stateElement.textContent);
    hydrateRoot(rootElement, <App dehydratedState={dehydratedState} />);
  } else {
    createRoot(rootElement).render(<App />);
  }
}
