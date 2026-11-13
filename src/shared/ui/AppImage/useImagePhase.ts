import { useLayoutEffect, useState } from "react";

export type ImagePhase = "loading" | "ready" | "error";

export function useImagePhase(src?: string | null): ImagePhase | "idle" {
  const [phase, setPhase] = useState<ImagePhase | "idle">(src ? "loading" : "idle");

  useLayoutEffect(() => {
    if (!src) {
      setPhase("idle");
      return;
    }
    let active = true;
    const image = new Image();
    image.onload = () => {
      if (active) setPhase("ready");
    };
    image.onerror = () => {
      if (active) setPhase("error");
    };
    image.src = src;
    if (image.complete) setPhase(image.naturalWidth > 0 ? "ready" : "error");
    else setPhase("loading");
    return () => {
      active = false;
    };
  }, [src]);

  return phase;
}
