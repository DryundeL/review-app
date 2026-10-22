import { useEffect, useRef, useState } from "react";
import { isAbortError } from "@/shared/api";

export type RequestOutcome<T> = { ok: true; value: T } | { ok: false };

/** One in-flight request. A newer call aborts the previous one. */
export function useAbortableRequest() {
  const requestId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function run<T>(
    task: (signal: AbortSignal) => Promise<T>,
  ): Promise<RequestOutcome<T>> {
    const id = ++requestId.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    try {
      const value = await task(controller.signal);
      if (id !== requestId.current) return { ok: false };
      return { ok: true, value };
    } catch (error) {
      if (id !== requestId.current || isAbortError(error)) return { ok: false };
      throw error;
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }

  return { busy, run };
}
