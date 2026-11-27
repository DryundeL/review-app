import { safeHttpsUrl } from "./safeHttpsUrl.ts";
import { storageImageUrl } from "./storageImageUrl.ts";

/** URL картинки для img src: путь публичного storage или https (постеры каталога). */
export function displayImageUrl(value: unknown): string | undefined {
  return storageImageUrl(value) ?? safeHttpsUrl(value);
}
