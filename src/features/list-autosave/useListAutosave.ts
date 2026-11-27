import { useSyncExternalStore } from "react";
import type { AutosaveState, ListAutosave } from "./model/listAutosave.ts";

export function useListAutosave<D, S extends { revision?: number }>(
  session: ListAutosave<D, S>,
): AutosaveState<D, S> {
  return useSyncExternalStore(session.subscribe, session.snapshot, session.snapshot);
}
