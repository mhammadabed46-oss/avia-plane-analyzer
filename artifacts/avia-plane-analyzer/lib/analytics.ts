import type { RecentStats, RoundRecord } from './models';

export const CATEGORY_LABELS = [
  'Below 1.20×',
  '1.20–1.49×',
  '1.50–1.99×',
  '2.00–2.99×',
  '3.00–4.99×',
  '5.00–9.99×',
  '10× and above',
] as const;

export function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function getRoundStats(records: RoundRecord[]): RecentStats {
  const values = records.map((record) => record.multiplier);
  const count = values.length;
  if (!count) {
    return {
      count: 0,
      average: 0,
      median: 0,
      minimum: 0,
      maximum: 0,
      belowTwoPercent: 0,
      aboveTwoPercent: 0,
      aboveFivePercent: 0,
      volatility: 0,
    };
  }
  const average = values.reduce((sum, value) => sum + value, 0) / count;
  return {
    count,
    average,
    median: medianOf(values),
    minimum: Math.min(...values),
    maximum: Math.max(...values),
    belowTwoPercent: (values.filter((value) => value < 2).length / count) * 100,
    aboveTwoPercent: (values.filter((value) => value >= 2).length / count) * 100,
    aboveFivePercent: (values.filter((value) => value >= 5).length / count) * 100,
    volatility: Math.sqrt(
      values.reduce((sum, value) => sum + (value - average) ** 2, 0) / count,
    ),
  };
}

export function getCategoryCounts(records: RoundRecord[]): number[] {
  const buckets = Array<number>(CATEGORY_LABELS.length).fill(0);
  for (const { multiplier } of records) {
    const index =
      multiplier < 1.2
        ? 0
        : multiplier < 1.5
          ? 1
          : multiplier < 2
            ? 2
            : multiplier < 3
              ? 3
              : multiplier < 5
                ? 4
                : multiplier < 10
                  ? 5
                  : 6;
    buckets[index] += 1;
  }
  return buckets;
}

export function getCurrentStreak(records: RoundRecord[], aboveTwo: boolean): number {
  const chronological = [...records].sort((a, b) => a.roundNumber - b.roundNumber);
  let streak = 0;
  for (let i = chronological.length - 1; i >= 0; i -= 1) {
    const matches = aboveTwo
      ? chronological[i].multiplier >= 2
      : chronological[i].multiplier < 2;
    if (!matches) break;
    streak += 1;
  }
  return streak;
}

export function getLongestStreak(records: RoundRecord[], aboveTwo: boolean): number {
  const chronological = [...records].sort((a, b) => a.roundNumber - b.roundNumber);
  let longest = 0;
  let streak = 0;
  for (const record of chronological) {
    const matches = aboveTwo ? record.multiplier >= 2 : record.multiplier < 2;
    streak = matches ? streak + 1 : 0;
    longest = Math.max(longest, streak);
  }
  return longest;
}

export function analyzeRecent(records: RoundRecord[], limit: number): RecentStats {
  return getRoundStats(records.slice(0, limit));
}

export function getPattern(records: RoundRecord[]): 'LOW' | 'NORMAL' | 'HIGH' {
  const recent = analyzeRecent(records, 20);
  if (!recent.count) return 'NORMAL';
  if (recent.average < 1.65) return 'LOW';
  if (recent.average >= 2.45) return 'HIGH';
  return 'NORMAL';
}

export function getDataQuality(count: number): {
  label: 'Insufficient sample' | 'Limited sample' | 'Moderate sample' | 'Large historical sample';
  tier: number;
} {
  if (count <= 20) return { label: 'Insufficient sample', tier: 0 };
  if (count <= 50) return { label: 'Limited sample', tier: 1 };
  if (count <= 100) return { label: 'Moderate sample', tier: 2 };
  return { label: 'Large historical sample', tier: 3 };
}
