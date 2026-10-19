export type MediaType =
  | "manga"
  | "manhwa"
  | "manhua"
  | "light_novel"
  | "comic"
  | "book"
  | "series"
  | "movie"
  | "dorama"
  | "anime_series"
  | "anime_movie"
  | "cartoon_series"
  | "cartoon_movie"
  | "game";

export type ReleaseStatus = "released" | "ongoing" | "announced";

export type StatusSource = "admin" | "api" | "user";

export const STATUS_LABELS: Record<ReleaseStatus, string> = {
  released: "Вышло",
  ongoing: "Выходит",
  announced: "Анонс",
};

export const SOURCE_LABELS: Record<StatusSource, string> = {
  admin: "подтверждено",
  api: "каталог",
  user: "не подтверждено",
};

export const FEED_GROUPS: { id: string; label: string; types: MediaType[] }[] = [
  { id: "manga", label: "Манга", types: ["manga", "manhwa", "manhua"] },
  { id: "anime", label: "Аниме", types: ["anime_series", "anime_movie"] },
  { id: "series", label: "Сериалы", types: ["series", "dorama"] },
  { id: "movies", label: "Фильмы", types: ["movie", "cartoon_movie"] },
];

export function isMediaType(value: unknown): value is MediaType {
  return typeof value === "string" && value in MEDIA_TYPE_LABELS;
}

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  manga: "Манга",
  manhwa: "Манхва",
  manhua: "Маньхуа",
  light_novel: "Ранобэ",
  comic: "Комикс",
  book: "Книга",
  series: "Сериал",
  movie: "Фильм",
  dorama: "Дорама",
  anime_series: "Аниме-сериал",
  anime_movie: "Аниме-фильм",
  cartoon_series: "Мультсериал",
  cartoon_movie: "Мультфильм",
  game: "Игра",
};
