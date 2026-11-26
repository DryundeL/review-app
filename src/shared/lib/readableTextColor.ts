const DARK = "#111";
const LIGHT = "#fff";

function channel(hex: string): number {
  const value = Number.parseInt(hex, 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** Относительная яркость по WCAG 2.x. */
function luminance(hex: string): number {
  return (
    0.2126 * channel(hex.slice(1, 3)) +
    0.7152 * channel(hex.slice(3, 5)) +
    0.0722 * channel(hex.slice(5, 7))
  );
}

const DARK_LUMINANCE = luminance("#111111");

/** Цвет текста с большим контрастом к фону `#rrggbb`; при невалидном фоне — тёмный. */
export function readableTextColor(background: string): "#111" | "#fff" {
  if (!/^#[0-9a-fA-F]{6}$/.test(background)) return DARK;
  const bg = luminance(background);
  const onDark = (bg + 0.05) / (DARK_LUMINANCE + 0.05);
  const onLight = 1.05 / (bg + 0.05);
  return onDark >= onLight ? DARK : LIGHT;
}
