export type {
  FetchSearchParams,
  FetchTrendsParams,
  SearchAuthorHit,
  SearchMediaHit,
  SearchMediaTrend,
  SearchResponse,
  SearchReviewHit,
  SearchTrendsResponse,
  SearchTrendsTab,
  SearchTypeTrend,
} from "./model/types";
export { fetchSearch, fetchSearchTrends, sanitizeSearchQuery } from "./api/searchApi";
