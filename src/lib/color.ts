export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const int = parseInt(full, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const t = amount < 0 ? 0 : 255;
  const p = Math.abs(amount);
  return rgbToHex([
    r + (t - r) * p,
    g + (t - g) * p,
    b + (t - b) * p,
  ]);
}

export function cardGradient(hex: string): string {
  const light = shade(hex, 0.18);
  const dark = shade(hex, -0.45);
  return `linear-gradient(135deg, ${light} 0%, ${hex} 45%, ${dark} 100%)`;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastText(hex: string): "#ffffff" | "#0b0b12" {
  return relativeLuminance(hex) > 0.55 ? "#0b0b12" : "#ffffff";
}

export const CARD_COLOR_PRESETS = [
  "#1a1a2e",
  "#0f3460",
  "#16213e",
  "#3a0ca3",
  "#7209b7",
  "#b5179e",
  "#f72585",
  "#e63946",
  "#e85d04",
  "#2a9d8f",
  "#1b998b",
  "#264653",
  "#023047",
  "#495057",
  "#6c757d",
];
