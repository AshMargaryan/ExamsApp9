import type { AchievementRarity } from "../api/profile";

export const RARITY_LABELS: Record<AchievementRarity, string> = {
  common: "Սովորական",
  rare: "Հազվագյուտ",
  epic: "Էպիկական",
  legendary: "Լեգենդար",
};

export const RARITY_COLORS: Record<AchievementRarity, string> = {
  common: "var(--color-text-muted)",
  rare: "var(--color-primary)",
  epic: "var(--color-accent)",
  legendary: "var(--color-medium)",
};
