/** Общая граница гостевого просмотра для SSR, авторизации и браузерных переходов. */
export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/search" ||
    /^\/(reviews|media-objects|profiles)\/[^/]+$/.test(pathname)
  );
}

export function isClientOnlyPath(pathname: string): boolean {
  return /^\/(profile|settings|notifications|create|achievements|shop)$|^\/reviews\/[^/]+\/edit$/.test(
    pathname,
  );
}
