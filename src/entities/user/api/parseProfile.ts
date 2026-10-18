import { z } from "zod";
import { unexpectedResponseError } from "@/shared/api/errors";
import { safeHttpsUrl } from "@/shared/lib/safeHttpsUrl";
import type { FollowConnection, FollowConnectionList, PublicProfile } from "../model/types";

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

const followConnectionSchema = z.object({
  userId: uuid,
  username: z.string(),
  photoUrl: z.string().optional().nullable(),
  isFollowing: z.boolean(),
  createdAt: z.string().min(1),
});

const followConnectionListSchema = z.object({
  items: z.array(followConnectionSchema),
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

export function parseFollowConnectionListText(text: string): FollowConnectionList {
  let payload: unknown;
  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    throw unexpectedResponseError();
  }

  const parsed = followConnectionListSchema.safeParse(payload);
  if (!parsed.success) throw unexpectedResponseError();

  return {
    items: parsed.data.items.map(mapFollowConnection),
  };
}

function mapFollowConnection(
  raw: z.infer<typeof followConnectionSchema>,
): FollowConnection {
  const photoUrl = safeHttpsUrl(raw.photoUrl ?? undefined);
  return {
    userId: raw.userId,
    username: raw.username.trim(),
    isFollowing: raw.isFollowing,
    createdAt: raw.createdAt,
    ...(photoUrl ? { photoUrl } : {}),
  };
}
