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
  | "cartoon_movie";

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
};
