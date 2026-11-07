import { storageImageUrl } from "./storageImageUrl.ts";

export function cosmeticImageUrls(raw: {
  background?: unknown;
  avatarFrame?: unknown;
  backdrop?: unknown;
}) {
  const background = storageImageUrl(raw.background);
  const avatarFrame = storageImageUrl(raw.avatarFrame);
  const backdrop = storageImageUrl(raw.backdrop);
  return {
    ...(background ? { background } : {}),
    ...(avatarFrame ? { avatarFrame } : {}),
    ...(backdrop ? { backdrop } : {}),
  };
}
