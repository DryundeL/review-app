import { apiClient } from "@/shared/api";
import type {
  FetchSearchParams,
  FetchTrendsParams,
  SearchResponse,
  SearchTrendsResponse,
  SearchTrendsTab,
} from "../model/types";
import { parseSearchText, parseSearchTrendsText } from "./parseSearch";

const TREND_TABS = new Set<SearchTrendsTab>(["media", "authors", "types"]);
const QUERY_MAX = 100;

function clampTrendLimit(limit?: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return 10;
  const rounded = Math.floor(limit);
  if (rounded < 1 || rounded > 20) return 10;
  return rounded;
}

function clampSearchLimit(limit?: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return 20;
  const rounded = Math.floor(limit);
  if (rounded < 1 || rounded > 50) return 20;
  return rounded;
}

function normalizeTab(tab?: SearchTrendsTab): SearchTrendsTab {
  if (tab && TREND_TABS.has(tab)) return tab;
  return "media";
}

/** Клиентская проверка перед запросом; бэкенд всё равно нормализует. */
export function sanitizeSearchQuery(q: string): string | null {
  const trimmed = q.trim().slice(0, QUERY_MAX);
  return trimmed.length > 0 ? trimmed : null;
}

export function fetchSearchTrends(
  params: FetchTrendsParams = {},
  signal?: AbortSignal,
): Promise<SearchTrendsResponse> {
  const tab = normalizeTab(params.tab);
  return apiClient("/v1/search/trends", {
    method: "GET",
    query: {
      tab,
      ...(tab === "types" ? {} : { limit: clampTrendLimit(params.limit) }),
    },
    signal,
    parse: parseSearchTrendsText,
  });
}

export function fetchSearch(
  params: FetchSearchParams,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const q = sanitizeSearchQuery(params.q);
  if (!q) {
    return Promise.resolve({ users: [], reviews: [], mediaObjects: [] });
  }
  return apiClient("/v1/search", {
    method: "GET",
    query: {
      q,
      limit: clampSearchLimit(params.limit),
    },
    signal,
    parse: parseSearchText,
  });
}
