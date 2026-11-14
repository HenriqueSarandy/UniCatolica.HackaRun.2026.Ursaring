export type Theme = "default" | "contrast" | "dark";
export const FONT_SIZES = [20, 24, 28] as const;

const KEY_FONT = "capibot.fontSize";
const KEY_THEME = "capibot.theme";

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* storage indisponível */ }
}

export function getFontSize(): number {
  const n = Number(read(KEY_FONT));
  return (FONT_SIZES as readonly number[]).includes(n) ? n : FONT_SIZES[0];
}
export function getTheme(): Theme {
  const t = read(KEY_THEME);
  return t === "contrast" || t === "dark" ? t : "default";
}

export function applyFontSize(px: number) {
  document.documentElement.style.setProperty("--font-size-base", `${px}px`);
  write(KEY_FONT, String(px));
}
export function applyTheme(theme: Theme) {
  if (theme === "default") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
  write(KEY_THEME, theme);
}

export function nextFontSize(current: number): number {
  const i = (FONT_SIZES as readonly number[]).indexOf(current);
  return FONT_SIZES[(i + 1) % FONT_SIZES.length];
}
