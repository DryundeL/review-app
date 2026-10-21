import { z } from "zod";
import { unexpectedResponseError } from "../../../shared/api/errors.ts";
import { parseShopCode } from "../../../shared/lib/shopCode.ts";
import type { Achievement, ProfileAchievements } from "../model/types.ts";

const itemSchema = z.object({
  code: z.string(),
  title: z.string().trim().min(1).max(128),
  description: z.string().max(512).default(""),
  progress: z.number(),
  current: z.number(),
  target: z.number(),
  unlockedAt: z.string().datetime({ offset: true }).optional(),
});

const listSchema = z.object({
  achievements: z.array(itemSchema),
});

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw unexpectedResponseError();
  }
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function mapItem(raw: z.infer<typeof itemSchema>): Achievement | null {
  const code = parseShopCode(raw.code);
  if (!code) return null;

  const current = Number.isFinite(raw.current) ? Math.max(0, Math.floor(raw.current)) : 0;
  const target =
    Number.isFinite(raw.target) && raw.target > 0
      ? Math.max(1, Math.floor(raw.target))
      : 1;
  const unlockedAt =
    typeof raw.unlockedAt === "string" && raw.unlockedAt.trim()
      ? raw.unlockedAt.trim()
      : undefined;

  return {
    code,
    title: raw.title.trim(),
    description: raw.description.trim(),
    progress: clampProgress(raw.progress),
    current,
    target,
    unlockedAt,
  };
}

export function parseProfileAchievementsText(text: string): ProfileAchievements {
  const parsed = listSchema.safeParse(parseJson(text));
  if (!parsed.success) throw unexpectedResponseError();

  return {
    achievements: parsed.data.achievements
      .map(mapItem)
      .filter((item): item is Achievement => item !== null),
  };
}
