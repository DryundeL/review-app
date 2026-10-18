import { z } from "zod";
import { unexpectedResponseError } from "@/shared/api/errors";
import { safeHttpsUrl } from "@/shared/lib/safeHttpsUrl";
import type { PublicProfile } from "../model/types";

const uuid = z.string().uuid();

const publicProfileSchema = z.object({
  id: uuid,
  username: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  followersCount: z.number().int().nonnegative(),
  followingCount: z.number().int().nonnegative(),
  isFollowing: z.boolean(),
  isMe: z.boolean(),
  telegramId: z.number().optional(),
  languageCode: z.string().optional(),
  isPremium: z.boolean().optional(),
  photoUrl: z.string().optional().nullable(),
});

export function parsePublicProfileText(text: string): PublicProfile {
  let payload: unknown;
  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    throw unexpectedResponseError();
  }

  const parsed = publicProfileSchema.safeParse(payload);
  if (!parsed.success) throw unexpectedResponseError();

  const { telegramId, photoUrl: rawPhotoUrl, ...rest } = parsed.data;
  const photoUrl = safeHttpsUrl(rawPhotoUrl ?? undefined);
  return {
    ...rest,
    ...(telegramId !== undefined ? { telegramId: String(telegramId) } : {}),
    ...(photoUrl ? { photoUrl } : {}),
  };
}
