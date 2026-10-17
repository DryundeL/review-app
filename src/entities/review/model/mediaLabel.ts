import { MEDIA_TYPE_LABELS } from "../../../shared/types/media.ts";
import type { MediaObjectSummary } from "./remote.ts";

/** Строка метаданных для различения одноимённых тайтлов: тип · год · originalTitle. */
export function mediaMetaLine(
  media: Pick<MediaObjectSummary, "title" | "type" | "originalTitle" | "releaseYear">,
): string {
  const parts: string[] = [MEDIA_TYPE_LABELS[media.type]];
  if (media.releaseYear != null) parts.push(String(media.releaseYear));
  const original = media.originalTitle?.trim();
  if (original && original !== media.title.trim()) parts.push(original);
  return parts.join(" · ");
}
