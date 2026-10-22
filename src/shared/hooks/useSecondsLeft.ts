import { useEffect, useState } from "react";

/** Seconds until an epoch deadline. Zero once the deadline has passed. */
export function useSecondsLeft(deadline: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (deadline <= Date.now()) return;
    const update = () => setNow(Date.now());
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [deadline]);

  if (deadline <= 0 || deadline <= now) return 0;
  return Math.ceil((deadline - now) / 1000);
}
