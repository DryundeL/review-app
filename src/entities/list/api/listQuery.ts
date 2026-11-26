import { ApiError } from "../../../shared/api/errors.ts";
import type { ApiQuery } from "../../../shared/api/url.ts";
import type { Format } from "../model/types.ts";

export type ListKind = "templates" | "results";

export type ListScope = {
  kind: ListKind;
  owner: "all" | { userId: string } | "me";
};

export type ListFilters = {
  q?: string;
  type?: string;
  format?: Format;
  status?: "draft" | "published" | "unlisted" | "hidden";
  limit?: number;
  cursor?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const Q_MAX = 100;
const LIMIT_MIN = 1;
const LIMIT_MAX = 50;

export function listPath(scope: ListScope): string {
  const segment = `list-${scope.kind}`;
  if (scope.owner === "all") return `/v1/${segment}`;
  if (scope.owner === "me") return `/v1/profile/${segment}`;
  if (!UUID.test(scope.owner.userId)) {
    throw new ApiError(404, "NOT_FOUND", "Не найдено.");
  }
  return `/v1/profiles/${scope.owner.userId}/${segment}`;
}

function clean(value: string | undefined): string | undefined {
  const text = value?.trim();
  return text ? text : undefined;
}

export function listQueryParams(scope: ListScope, filters: ListFilters): ApiQuery {
  const own = scope.owner === "me";
  const query: ApiQuery = {};

  if (!own) {
    const q = clean(filters.q)?.slice(0, Q_MAX).trim();
    if (q) query.q = q;
    const type = clean(filters.type);
    if (type) query.type = type;
    const format = clean(filters.format);
    if (format) query.format = format;
  } else {
    const status = clean(filters.status);
    if (status) query.status = status;
  }

  if (typeof filters.limit === "number" && Number.isFinite(filters.limit)) {
    query.limit = Math.min(LIMIT_MAX, Math.max(LIMIT_MIN, Math.trunc(filters.limit)));
  }
  const cursor = clean(filters.cursor);
  if (cursor) query.cursor = cursor;
  return query;
}
