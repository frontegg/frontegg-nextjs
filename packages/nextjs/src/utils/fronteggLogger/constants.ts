/**
 * Map between level code and severity message
 */
export const LEVELS: Record<number, string> = {
  40: 'ERROR',
  30: 'WARN',
  20: 'INFO',
  10: 'DEBUG',
};

/**
 * Map between severity message and level code
 */
export const LEVEL_NAMES = {
  error: 40,
  warn: 30,
  info: 20,
  debug: 10,
};
