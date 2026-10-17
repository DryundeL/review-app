import type { MediaType } from "@/shared/types";

export type SearchTrendsTab = "media" | "authors" | "types";

export type SearchAuthorHit = {
  id: string;
  username: string;
  firstName: string;
  followersCount: number;
  isFollowing: boolean;
};

export type SearchMediaTrend = {
  id: string;
  title: string;
  type: MediaType;
  posterUrl?: string;
  reviewsCount: number;
};

export type SearchTypeTrend = {
  code: MediaType;
  label: string;
  reviewsCount: number;
};

export type SearchTrendsResponse =
  | { tab: "media"; items: SearchMediaTrend[] }
  | { tab: "authors"; items: SearchAuthorHit[] }
  | { tab: "types"; items: SearchTypeTrend[] };

export type SearchReviewHit = {
  id: string;
  title: string;
  authorId: string;
  username: string;
  mediaObject: {
    id: string;
    title: string;
    type: MediaType;
    posterUrl?: string;
  };
  rating: number;
  likesCount: number;
  viewsCount: number;
};

export type SearchMediaHit = {
  id: string;
  title: string;
  type: MediaType;
  posterUrl?: string;
};

export type SearchResponse = {
  users: SearchAuthorHit[];
  reviews: SearchReviewHit[];
  mediaObjects: SearchMediaHit[];
};

export type FetchTrendsParams = {
  tab?: SearchTrendsTab;
  limit?: number;
};

export type FetchSearchParams = {
  q: string;
  limit?: number;
};
