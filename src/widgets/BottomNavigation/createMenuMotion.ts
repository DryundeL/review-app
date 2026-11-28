/**
 * Движение меню «Что добавить» для Web Animations API.
 *
 * Ключевые кадры собираются из готовых чисел в px: анимации transform/opacity
 * с конкретными значениями браузеры (включая WebKit в Telegram на iOS) отдают
 * композитору. CSS-кадры с var() WebKit может гонять на главном потоке
 * с перерисовкой — отсюда были ~20 кадров на телефоне.
 */

export type MenuMotion = {
  inMs: number;
  outMs: number;
  /** Задержка между каплями при открытии. */
  stepMs: number;
  /** Задержка между каплями при закрытии (дальняя уходит первой). */
  outStepMs: number;
  scrimInMs: number;
};

export const EASE_IN = "cubic-bezier(0.22, 1, 0.36, 1)";
export const EASE_OUT = "cubic-bezier(0.4, 0, 1, 1)";

/** Телефон — коротко; ПК — дольше и мягче. */
export function menuMotion(desktop: boolean): MenuMotion {
  return desktop
    ? { inMs: 640, outMs: 300, stepMs: 60, outStepMs: 25, scrimInMs: 240 }
    : { inMs: 380, outMs: 220, stepMs: 40, outStepMs: 20, scrimInMs: 200 };
}

function transform(x: number, y: number, sx: number, sy: number): string {
  return `translate3d(${round(x)}px, ${round(y)}px, 0) scale(${sx}, ${sy})`;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Капля вылетает из центра кнопки (смещение dx/dy от её места), узкой,
 * вытягивается и встаёт на место. На ПК — с мягким «переливом» в конце.
 */
export function dropInKeyframes(dx: number, dy: number, desktop: boolean): Keyframe[] {
  if (desktop) {
    return [
      { offset: 0, opacity: 0, transform: transform(dx, dy, 0.18, 0.7) },
      { offset: 0.55, opacity: 1, transform: transform(dx * 0.15, dy * 0.15, 1.04, 0.93) },
      { offset: 0.8, opacity: 1, transform: transform(0, 0, 0.99, 1.015) },
      { offset: 1, opacity: 1, transform: transform(0, 0, 1, 1) },
    ];
  }
  return [
    { offset: 0, opacity: 0, transform: transform(dx, dy, 0.25, 0.6) },
    { offset: 0.6, opacity: 1, transform: transform(dx * 0.08, dy * 0.08, 0.95, 1.04) },
    { offset: 1, opacity: 1, transform: transform(0, 0, 1, 1) },
  ];
}

/** Капля втягивается обратно в кнопку. */
export function dropOutKeyframes(dx: number, dy: number, desktop: boolean): Keyframe[] {
  const end = desktop ? transform(dx, dy, 0.18, 0.7) : transform(dx, dy, 0.25, 0.6);
  return [
    { offset: 0, opacity: 1, transform: transform(0, 0, 1, 1) },
    { offset: 1, opacity: 0, transform: end },
  ];
}
