import type { Format } from "@/entities/list";

export const FORMAT_LABELS: Record<Format, string> = {
  tiers: "Тир-лист",
  // «Топ» — общее название результата, поэтому формат по местам — «Рейтинг».
  ranked: "Рейтинг",
  collection: "Подборка",
};
