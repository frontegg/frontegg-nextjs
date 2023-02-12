/**
 * Map between level code and severity message
 */
export const LEVELS: Record<number, string> = {
  60: 'FATAL',
  50: 'ERROR',
  40: 'WARN',
  30: 'INFO',
  20: 'DEBUG',
  10: 'TRACE',
};

/**
 * Map between severity message and level code
 */
export const LEVEL_NAMES: Record<string, number> = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
};
