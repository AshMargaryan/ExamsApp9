export interface RankTier {
  text: string;
  bg: string;
  line: string;
}

const TIERS: Record<1 | 2 | 3, RankTier> = {
  1: { text: "var(--color-gold)", bg: "var(--color-gold-bg)", line: "var(--color-gold-line)" },
  2: { text: "var(--color-silver)", bg: "var(--color-silver-bg)", line: "var(--color-silver-line)" },
  3: { text: "var(--color-bronze)", bg: "var(--color-bronze-bg)", line: "var(--color-bronze-line)" },
};

export function rankTier(rank: number): RankTier | null {
  return rank === 1 || rank === 2 || rank === 3 ? TIERS[rank] : null;
}
