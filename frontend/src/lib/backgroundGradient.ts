export interface BackgroundGradient {
  colors: string[];
  angle: number;
}

const STORAGE_KEY = "backgroundGradient";

export function getStoredBackground(): BackgroundGradient | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.colors) && parsed.colors.length >= 1 && typeof parsed.angle === "number") {
      return parsed as BackgroundGradient;
    }
  } catch {
    // malformed value — treat as unset
  }
  return null;
}

export function applyBackground(gradient: BackgroundGradient | null) {
  const root = document.documentElement;
  if (gradient && gradient.colors.length >= 1) {
    root.style.setProperty("--gradient-bg", `linear-gradient(${gradient.angle}deg, ${gradient.colors.join(", ")})`);
  } else {
    root.style.removeProperty("--gradient-bg");
  }
}

export function saveBackground(gradient: BackgroundGradient) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gradient));
  applyBackground(gradient);
}

export function clearBackground() {
  localStorage.removeItem(STORAGE_KEY);
  applyBackground(null);
}
