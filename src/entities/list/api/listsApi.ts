import { apiClient, ApiError } from "@/shared/api";
import type { Entry, Format, Result, Template, Visibility } from "../model/types";
import type { ListPage, ListReport } from "../model/types";
import { listPath, listQueryParams, type ListFilters, type ListKind, type ListScope } from "./listQuery";
import {
  parseListPageText,
  parseListReportText,
  parseResultText,
  parseTemplateText,
} from "./parseLists";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REASON_CODE = /^[a-z0-9_]{1,64}$/i;

export type TemplateItemInput =
  | { id: string; title: string; imageId?: string }
  | { mediaObjectId: string; title?: string; imageId?: string }
  | { title: string; imageId: string };

/** Тело PUT /list-templates/:id (полная замена содержимого). */
export type TemplateInput = {
  revision: number;
  title: string;
  description: string;
  typeCode?: string;
  format?: Format;
  tiers: { id?: string; name: string; color: string }[];
  items: TemplateItemInput[];
};

/** Тело PUT /list-results/:id. */
export type ResultInput = {
  revision: number;
  title: string;
  description: string;
  entries: Entry[];
};

function assertUuid(value: string): string {
  if (!UUID.test(value)) {
    throw new ApiError(404, "NOT_FOUND", "Не найдено.");
  }
  return value;
}

function assertReasonCode(value: string): string {
  const code = value.trim();
  if (!REASON_CODE.test(code)) {
    throw new ApiError(422, "VALIDATION_ERROR", "Выберите причину жалобы.");
  }
  return code;
}

function objectPath(kind: ListKind, id: string): string {
  return `/v1/list-${kind}/${assertUuid(id)}`;
}

function parserFor(kind: "templates"): (text: string) => Template;
function parserFor(kind: "results"): (text: string) => Result;
function parserFor(kind: ListKind): (text: string) => Template | Result;
function parserFor(kind: ListKind): (text: string) => Template | Result {
  return kind === "templates" ? parseTemplateText : parseResultText;
}

/** 204 и пустое тело — успех. */
function parseEmpty(): void {}

export function fetchLists(
  scope: ListScope,
  filters: ListFilters,
  signal?: AbortSignal,
): Promise<ListPage> {
  return apiClient(listPath(scope), {
    method: "GET",
    query: listQueryParams(scope, filters),
    signal,
    parse: parseListPageText,
  });
}

export function fetchTemplate(id: string, signal?: AbortSignal): Promise<Template> {
  return apiClient(objectPath("templates", id), {
    method: "GET",
    signal,
    parse: parseTemplateText,
  });
}

export function fetchResult(id: string, signal?: AbortSignal): Promise<Result> {
  return apiClient(objectPath("results", id), {
    method: "GET",
    signal,
    parse: parseResultText,
  });
}

export function createTemplate(
  input: { typeCode: string; format?: Format; title?: string },
  signal?: AbortSignal,
): Promise<Template> {
  return apiClient("/v1/list-templates", {
    method: "POST",
    body: input,
    signal,
    parse: parseTemplateText,
  });
}

export function saveTemplate(
  id: string,
  input: TemplateInput,
  signal?: AbortSignal,
): Promise<Template> {
  return apiClient(objectPath("templates", id), {
    method: "PUT",
    body: input,
    signal,
    parse: parseTemplateText,
  });
}

export function createResult(templateId: string, signal?: AbortSignal): Promise<Result> {
  return apiClient(`${objectPath("templates", templateId)}/results`, {
    method: "POST",
    signal,
    parse: parseResultText,
  });
}

export function saveResult(
  id: string,
  input: ResultInput,
  signal?: AbortSignal,
): Promise<Result> {
  return apiClient(objectPath("results", id), {
    method: "PUT",
    body: input,
    signal,
    parse: parseResultText,
  });
}

export function publishList(
  kind: "templates",
  id: string,
  revision: number,
  visibility: Visibility,
  signal?: AbortSignal,
): Promise<Template>;
export function publishList(
  kind: "results",
  id: string,
  revision: number,
  visibility: Visibility,
  signal?: AbortSignal,
): Promise<Result>;
export function publishList(
  kind: ListKind,
  id: string,
  revision: number,
  visibility: Visibility,
  signal?: AbortSignal,
): Promise<Template | Result>;
export function publishList(
  kind: ListKind,
  id: string,
  revision: number,
  visibility: Visibility,
  signal?: AbortSignal,
): Promise<Template | Result> {
  return apiClient(`${objectPath(kind, id)}/publish`, {
    method: "POST",
    body: { revision, visibility },
    signal,
    parse: parserFor(kind),
  });
}

export function unpublishList(kind: "templates", id: string, signal?: AbortSignal): Promise<Template>;
export function unpublishList(kind: "results", id: string, signal?: AbortSignal): Promise<Result>;
export function unpublishList(kind: ListKind, id: string, signal?: AbortSignal): Promise<Template | Result>;
export function unpublishList(
  kind: ListKind,
  id: string,
  signal?: AbortSignal,
): Promise<Template | Result> {
  return apiClient(`${objectPath(kind, id)}/unpublish`, {
    method: "POST",
    signal,
    parse: parserFor(kind),
  });
}

export function setListVisibility(
  kind: "templates",
  id: string,
  visibility: Visibility,
  signal?: AbortSignal,
): Promise<Template>;
export function setListVisibility(
  kind: "results",
  id: string,
  visibility: Visibility,
  signal?: AbortSignal,
): Promise<Result>;
export function setListVisibility(
  kind: ListKind,
  id: string,
  visibility: Visibility,
  signal?: AbortSignal,
): Promise<Template | Result>;
export function setListVisibility(
  kind: ListKind,
  id: string,
  visibility: Visibility,
  signal?: AbortSignal,
): Promise<Template | Result> {
  return apiClient(`${objectPath(kind, id)}/visibility`, {
    method: "PATCH",
    body: { visibility },
    signal,
    parse: parserFor(kind),
  });
}

export function copyList(kind: "templates", id: string, signal?: AbortSignal): Promise<Template>;
export function copyList(kind: "results", id: string, signal?: AbortSignal): Promise<Result>;
export function copyList(kind: ListKind, id: string, signal?: AbortSignal): Promise<Template | Result>;
export function copyList(
  kind: ListKind,
  id: string,
  signal?: AbortSignal,
): Promise<Template | Result> {
  return apiClient(`${objectPath(kind, id)}/copy`, {
    method: "POST",
    signal,
    parse: parserFor(kind),
  });
}

export function deleteList(kind: ListKind, id: string, signal?: AbortSignal): Promise<void> {
  return apiClient(objectPath(kind, id), {
    method: "DELETE",
    signal,
    parse: parseEmpty,
  });
}

export function refreshItemFromCatalog(
  templateId: string,
  itemId: string,
  revision: number,
  signal?: AbortSignal,
): Promise<Template> {
  return apiClient(
    `${objectPath("templates", templateId)}/items/${assertUuid(itemId)}/refresh-from-catalog`,
    {
      method: "POST",
      body: { revision },
      signal,
      parse: parseTemplateText,
    },
  );
}

/** Лайк или дизлайк результата; снять голос нельзя. */
export function voteResult(id: string, isLike: boolean, signal?: AbortSignal): Promise<void> {
  return apiClient(`${objectPath("results", id)}/vote`, {
    method: "PUT",
    body: { isLike },
    signal,
  });
}

/** Просмотр засчитывается сервером один раз на пользователя. */
export function viewResult(id: string, signal?: AbortSignal): Promise<void> {
  return apiClient(`${objectPath("results", id)}/view`, { method: "PUT", signal });
}

export function reportList(
  kind: ListKind,
  id: string,
  reasonCode: string,
  signal?: AbortSignal,
): Promise<ListReport> {
  return apiClient(`${objectPath(kind, id)}/reports`, {
    method: "POST",
    body: { reasonCode: assertReasonCode(reasonCode) },
    signal,
    parse: parseListReportText,
  });
}
