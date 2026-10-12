const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export function isJwt(value: string): boolean {
  return value.length >= 20 && value.length <= 8192 && JWT_PATTERN.test(value);
}
