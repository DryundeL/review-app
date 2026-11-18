/**
 * SSR ходит в API с IP сервера, поэтому rate limit API должен считать запросы
 * по IP посетителя. Провайдер задаёт только серверная точка входа; в браузере
 * его нет и заголовок не отправляется.
 */
let provider: (() => string | undefined) | null = null;

export function setForwardedForProvider(next: () => string | undefined): void {
  provider = next;
}

export function getForwardedFor(): string | undefined {
  return provider?.();
}
