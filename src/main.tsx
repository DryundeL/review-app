import { createRoot, hydrateRoot } from "react-dom/client";
import { App } from "@/app/App";
import { readTelegramInitData } from "@/shared/platform";
import "@/app/styles/index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root not found");
}

const stateElement = document.getElementById("__REVIEW_SSR__");
if (readTelegramInitData()) {
  // Mini App starts with auth, without hydrating or reusing the guest feed.
  rootElement.replaceChildren();
  createRoot(rootElement).render(<App />);
} else if (stateElement?.textContent) {
  const dehydratedState = JSON.parse(stateElement.textContent);
  hydrateRoot(rootElement, <App dehydratedState={dehydratedState} />);
} else {
  createRoot(rootElement).render(<App />);
}
