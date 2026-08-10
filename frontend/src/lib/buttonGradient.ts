export interface ButtonGradient {
  colors: string[];
  angle: number;
}

const STORAGE_KEY = "buttonGradient";

export function getStoredGradient(): ButtonGradient | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.colors) && parsed.colors.length >= 1 && typeof parsed.angle === "number") {
      return parsed as ButtonGradient;
    }
  } catch {
    // malformed value — treat as unset
  }
  return null;
}

export function applyGradient(gradient: ButtonGradient | null) {
  const root = document.documentElement;
  if (gradient && gradient.colors.length >= 1) {
    root.style.setProperty("--gradient-primary", `linear-gradient(${gradient.angle}deg, ${gradient.colors.join(", ")})`);
  } else {
    root.style.removeProperty("--gradient-primary");
  }
}

export function saveGradient(gradient: ButtonGradient) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gradient));
  applyGradient(gradient);
}

export function clearGradient() {
  localStorage.removeItem(STORAGE_KEY);
  applyGradient(null);
}
