import { createContext } from "react";
import type { PageMeta } from "../lib/pageMeta";

/** Коллектор живёт только внутри одного серверного renderToString. */
export const PageMetaContext = createContext<{ current: PageMeta | null } | null>(null);
