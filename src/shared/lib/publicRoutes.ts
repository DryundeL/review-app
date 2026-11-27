/** Общая граница гостевого просмотра для SSR, авторизации и браузерных переходов. */
export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/search" ||
    pathname === "/lists" ||
    /^\/(reviews|media-objects|profiles|list-templates|list-results)\/[^/]+$/.test(
      pathname,
    )
  );
}

export function isClientOnlyPath(pathname: string): boolean {
  return /^\/(profile|settings|notifications|create|achievements|shop|my-lists)$|^\/(reviews|list-templates|list-results)\/[^/]+\/edit$/.test(
    pathname,
  );
}
