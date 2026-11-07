import { cosmeticImageUrls } from "../../../shared/lib/cosmeticImageUrls.ts";
import { z } from "zod";
import { unexpectedResponseError } from "../../../shared/api/errors.ts";
import { safeHttpsUrl } from "../../../shared/lib/safeHttpsUrl.ts";
import type {
  FollowConnection,
  FollowConnectionList,
  PublicProfile,
} from "../model/types.ts";

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
  isProfilePrivate: z.boolean().optional().default(false),
  followStatus: z.enum(["none", "pending", "following"]).optional(),
  telegramId: z.number().optional(),
  languageCode: z.string().optional(),
  isPremium: z.boolean().optional(),
  photoUrl: z.string().optional().nullable(),
  background: z.string().nullish(),
  avatarFrame: z.string().nullish(),
  backdrop: z.string().nullish(),
});

const followConnectionSchema = z.object({
  userId: uuid,
  username: z.string(),
  photoUrl: z.string().optional().nullable(),
  background: z.string().nullish(),
  avatarFrame: z.string().nullish(),
  backdrop: z.string().nullish(),

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

  const {
    telegramId,
    background,
    avatarFrame,
    backdrop,
    photoUrl: rawPhotoUrl,
    ...rest
  } = parsed.data;
  const photoUrl = safeHttpsUrl(rawPhotoUrl ?? undefined);
  return {
    ...rest,
    ...cosmeticImageUrls({ background, avatarFrame, backdrop }),
    ...(rest.isMe && telegramId !== undefined ? { telegramId: String(telegramId) } : {}),
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
    ...cosmeticImageUrls(raw),
    ...(photoUrl ? { photoUrl } : {}),
  };
}

const followStateSchema = z
  .object({
    followStatus: z.enum(["none", "pending", "following"]),
    isFollowing: z.boolean(),
  })
  .refine((state) => state.isFollowing === (state.followStatus === "following"));

export function parseFollowStateText(text: string) {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw unexpectedResponseError();
  }
  const parsed = followStateSchema.safeParse(value);
  if (!parsed.success) throw unexpectedResponseError();
  return parsed.data;
}
