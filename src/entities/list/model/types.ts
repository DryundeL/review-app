export type Format = "tiers" | "ranked" | "collection";
export type Status = "draft" | "published";
export type Visibility = "public" | "unlisted";

export interface Author {
  id: string;
  username: string;
  photoUrl?: string;
}

/** color: "#rrggbb" */
export interface Tier {
  id: string;
  name: string;
  color: string;
}

export interface Item {
  id: string;
  title: string;
  /** Элемент из каталога. */
  mediaObjectId?: string;
  /** Тип произведения каталога; нет у своих и удалённых из каталога. */
  mediaType?: string;
  imageUrl?: string;
  /** Только автору шаблона и только для его загрузки. */
  imageId?: string;
}

/** Поля, которые получает только автор объекта. */
export interface OwnerFields {
  revision?: number;
  status?: Status;
  visibility?: Visibility;
  /** Объект (или шаблон результата) скрыт модератором. */
  moderation?: "hidden";
  createdAt?: string;
  updatedAt?: string;
}

export interface Template extends OwnerFields {
  id: string;
  typeCode: string;
  format: Format;
  title: string;
  description: string;
  coverUrl?: string;
  author: Author;
  firstPublishedAt?: string;
  /** Пусто для ranked и collection. */
  tiers: Tier[];
  items: Item[];
  canCreateResult: boolean;
}

export interface Entry {
  itemId: string;
  tierId?: string;
  position: number;
}

export interface Result extends OwnerFields {
  id: string;
  typeCode: string;
  format: Format;
  title: string;
  description: string;
  coverUrl?: string;
  author: Author;
  firstPublishedAt?: string;
  template: { id?: string; title: string; author?: Author };
  canCreateOwn: boolean;
  /** Из снимка шаблона. */
  tiers: Tier[];
  /** Из снимка шаблона. */
  items: Item[];
  /** В каноническом порядке. */
  entries: Entry[];
  likesCount: number;
  dislikesCount: number;
  viewsCount: number;
  /** true — лайк, false — дизлайк; нет поля — не голосовал или гость. */
  viewerIsLike?: boolean;
}

export interface Card
  extends Pick<OwnerFields, "status" | "visibility" | "moderation" | "updatedAt"> {
  id: string;
  title: string;
  typeCode: string;
  format: Format;
  coverUrl?: string;
  author: Author;
  firstPublishedAt?: string;
  /** Только у результатов. */
  templateTitle?: string;
}

/** Страница списка (в спеке — `Page`). */
export interface ListPage {
  items: Card[];
  nextCursor?: string;
}

export interface ListReport {
  id: string;
  target: "template" | "result";
  targetId: string;
  reasonCode: string;
  status: string;
  createdAt: string;
}
