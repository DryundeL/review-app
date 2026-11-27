import { MEDIA_TYPE_LABELS, isMediaType } from "../../../shared/types/media.ts";

/** Зарезервированный typeCode смешанного шаблона: произведения любых типов. */
export const MIXED_TYPE_CODE = "mixed";

export const MIXED_TYPE_LABEL = "Смешанный";

export function isMixedType(typeCode: string): boolean {
  return typeCode === MIXED_TYPE_CODE;
}

/** Подпись типа топа или шаблона; null — неизвестный код (не показываем). */
export function listTypeLabel(typeCode: string): string | null {
  if (isMixedType(typeCode)) return MIXED_TYPE_LABEL;
  return isMediaType(typeCode) ? MEDIA_TYPE_LABELS[typeCode] : null;
}

/** Подпись типа элемента (только у произведений из каталога). */
export function itemTypeLabel(mediaType: string | undefined): string | null {
  return mediaType && isMediaType(mediaType) ? MEDIA_TYPE_LABELS[mediaType] : null;
}
