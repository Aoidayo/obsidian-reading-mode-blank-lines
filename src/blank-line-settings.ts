export const MIN_BLANK_LINE_HEIGHT = 0.1;
export const MAX_BLANK_LINE_HEIGHT = 3;
export const BLANK_LINE_HEIGHT_STEP = 0.1;

export interface ReadingModeBlankLinesSettings {
  blankLineHeight: number;
}

export const DEFAULT_SETTINGS: ReadingModeBlankLinesSettings = {
  blankLineHeight: 1,
};

export function normalizeBlankLineHeight(value: unknown): number {
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue)) return DEFAULT_SETTINGS.blankLineHeight;
  return Math.min(
    MAX_BLANK_LINE_HEIGHT,
    Math.max(MIN_BLANK_LINE_HEIGHT, numberValue),
  );
}

export function normalizeSettings(
  data: Partial<ReadingModeBlankLinesSettings> | null | undefined,
): ReadingModeBlankLinesSettings {
  return {
    blankLineHeight: normalizeBlankLineHeight(data?.blankLineHeight),
  };
}
