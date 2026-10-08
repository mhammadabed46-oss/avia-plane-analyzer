export type Language = 'en' | 'ar';
export type ThemePreference = 'system' | 'light' | 'dark';
export type CaptureStatus =
  | 'off'
  | 'paused'
  | 'active'
  | 'waiting'
  | 'detecting'
  | 'saved'
  | 'error';

export type RoundRecord = {
  id: string;
  roundNumber: number;
  multiplier: number;
  capturedAt: string;
  confidence: number;
  corrected?: boolean;
};

export type ScreenRegion = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export const AUTO_SCAN_REGION: ScreenRegion = {
  left: 0.08,
  top: 0.06,
  right: 0.92,
  bottom: 0.9,
};

export type Preferences = {
  language: Language;
  theme: ThemePreference;
  patternIndicator: boolean;
  minimumConfidence: number;
  samplingIntervalMs: number;
  calibrated: boolean;
  region: ScreenRegion;
};

export const DEFAULT_PREFERENCES: Preferences = {
  language: 'en',
  theme: 'system',
  patternIndicator: true,
  minimumConfidence: 0.86,
  samplingIntervalMs: 1200,
  calibrated: false,
  region: { left: 0.2, top: 0.15, right: 0.8, bottom: 0.6 },
};

export type DetectionEvent =
  | { kind: 'status'; status: CaptureStatus; message?: string }
  | { kind: 'reading'; value: number; confidence: number }
  | { kind: 'round'; value: number; confidence: number; capturedAt?: string; eventId?: string }
  | { kind: 'message'; message: string };

export type RecentStats = {
  count: number;
  average: number;
  median: number;
  minimum: number;
  maximum: number;
  belowTwoPercent: number;
  aboveTwoPercent: number;
  aboveFivePercent: number;
  volatility: number;
};
