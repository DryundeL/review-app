import { useEffect, useRef, type RefObject } from "react";
import { observeContentReveal } from "@/shared/lib/contentReveal";

export function useContentReveal(
  ref: RefObject<HTMLElement | null>,
  skipInitial: boolean,
) {
  const skipInitialRef = useRef(skipInitial);
  useEffect(() => {
    if (ref.current) return observeContentReveal(ref.current, skipInitialRef.current);
  }, [ref]);
}
