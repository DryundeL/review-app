import type { MediaType, ReleaseStatus, StatusSource } from "@/shared/types";

export type MediaItem = {
  id: string;
  title: string;
  altTitles: string[];
  primaryType: MediaType;
  types: MediaType[];
  year: number;
  status: ReleaseStatus;
  statusSource: StatusSource;
  synopsis: string;
  relatedIds: string[];
};
