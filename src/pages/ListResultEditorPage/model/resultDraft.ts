import {
  entriesFromLayout,
  layoutFromResult,
  type Layout,
  type Result,
  type ResultInput,
} from "@/entities/list";

export const LIMITS = { title: 150, description: 2000 } as const;

export type ResultDraft = { title: string; description: string; layout: Layout };

export function toDraft(result: Result): ResultDraft {
  return {
    title: result.title,
    description: result.description,
    layout: layoutFromResult(result),
  };
}

export function toResultInput(
  draft: ResultDraft,
  result: Pick<Result, "tiers">,
  revision: number,
): ResultInput {
  return {
    revision,
    title: draft.title,
    description: draft.description,
    entries: entriesFromLayout(draft.layout, result.tiers),
  };
}

/** Результат не создаёт новых id: локальный draft (в том числе текст) остаётся как есть. */
export const rebaseDraft = (local: ResultDraft): ResultDraft => local;
