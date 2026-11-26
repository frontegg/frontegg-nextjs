import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LEVELS, LEVEL_NAMES } from '../../../../src/utils/fronteggLogger/constants';

/**
 * The global setup mocks the logger, so this file loads the real implementation
 * through vi.importActual after resetting the module registry. The log level is
 * computed at module load time from env vars, hence a fresh import per scenario.
 */
type LoggerModule = typeof import('../../../../src/utils/fronteggLogger');

const LOGGER_PATH = '../../../../src/utils/fronteggLogger';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

async function loadLogger(env: Record<string, string | undefined> = {}) {
  vi.stubEnv('FRONTEGG_LOG_LEVEL', env.FRONTEGG_LOG_LEVEL ?? '');
  vi.stubEnv('ACTIONS_STEP_DEBUG', env.ACTIONS_STEP_DEBUG ?? '');
  vi.stubEnv('ACTIONS_RUNNER_DEBUG', env.ACTIONS_RUNNER_DEBUG ?? '');
  vi.resetModules();
  const mod = await vi.importActual<LoggerModule>(LOGGER_PATH);
  return mod.default;
}

const spies = () => ({
  log: vi.spyOn(console, 'log').mockImplementation(() => undefined),
  info: vi.spyOn(console, 'info').mockImplementation(() => undefined),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => undefined),
  error: vi.spyOn(console, 'error').mockImplementation(() => undefined),
});

let consoleSpies: ReturnType<typeof spies>;

const emitAll = (logger: { debug: Function; info: Function; warn: Function; error: Function }) => {
  logger.debug('d');
  logger.info('i');
  logger.warn('w');
  logger.error('e');
};

const emittedLevels = () => ({
  debug: consoleSpies.log.mock.calls.length,
  info: consoleSpies.info.mock.calls.length,
  warn: consoleSpies.warn.mock.calls.length,
  error: consoleSpies.error.mock.calls.length,
});

beforeEach(() => {
  consoleSpies = spies();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('constants', () => {
  it('maps every level name to a code and back to its upper-case label', () => {
    Object.entries(LEVEL_NAMES).forEach(([name, code]) => {
      expect(LEVELS[code]).toBe(name.toUpperCase());
    });
  });

  it('orders level codes by severity', () => {
    expect(LEVEL_NAMES.debug).toBeLessThan(LEVEL_NAMES.info);
    expect(LEVEL_NAMES.info).toBeLessThan(LEVEL_NAMES.warn);
    expect(LEVEL_NAMES.warn).toBeLessThan(LEVEL_NAMES.error);
  });
});

describe('FronteggLogger default level', () => {
  it('defaults to warn when no env vars are set', async () => {
    // Arrange
    const Logger = await loadLogger();

    // Act
    emitAll(Logger.child({ tag: 'test' }));

    // Assert
    expect(emittedLevels()).toEqual({ debug: 0, info: 0, warn: 1, error: 1 });
  });

  it('uses FRONTEGG_LOG_LEVEL when it is a known level', async () => {
    const Logger = await loadLogger({ FRONTEGG_LOG_LEVEL: 'info' });

    emitAll(Logger.child({ tag: 'test' }));

    expect(emittedLevels()).toEqual({ debug: 0, info: 1, warn: 1, error: 1 });
  });

  it('falls back to warn when FRONTEGG_LOG_LEVEL is unknown', async () => {
    const Logger = await loadLogger({ FRONTEGG_LOG_LEVEL: 'verbose' });

    emitAll(Logger.child({ tag: 'test' }));

    expect(emittedLevels()).toEqual({ debug: 0, info: 0, warn: 1, error: 1 });
  });

  it.each(['ACTIONS_STEP_DEBUG', 'ACTIONS_RUNNER_DEBUG'])(
    'forces debug level when GitHub runner debug flag %s is true',
    async (flag) => {
      const Logger = await loadLogger({ FRONTEGG_LOG_LEVEL: 'error', [flag]: 'true' });

      emitAll(Logger.child({ tag: 'test' }));

      expect(emittedLevels()).toEqual({ debug: 1, info: 1, warn: 1, error: 1 });
    }
  );

  it('only prints errors when the level is error', async () => {
    const Logger = await loadLogger({ FRONTEGG_LOG_LEVEL: 'error' });

    emitAll(Logger.child({ tag: 'test' }));

    expect(emittedLevels()).toEqual({ debug: 0, info: 0, warn: 0, error: 1 });
  });
});

describe('FronteggLogger instance', () => {
  it('lets an explicit level option override the global level', async () => {
    const Logger = await loadLogger({ FRONTEGG_LOG_LEVEL: 'error' });

    emitAll(Logger.child({ tag: 'test', level: 'debug' }));

    expect(emittedLevels()).toEqual({ debug: 1, info: 1, warn: 1, error: 1 });
  });

  it('prefixes messages with an ISO timestamp, the level label and the tag', async () => {
    // Arrange
    const Logger = await loadLogger();
    const logger = Logger.child({ tag: 'MyTag', level: 'debug' });

    // Act
    logger.info('hello', { a: 1 });

    // Assert
    const [timestamp, prefix, ...rest] = consoleSpies.info.mock.calls[0];
    expect(timestamp).toMatch(ISO_DATE);
    expect(prefix).toBe(`|INFO| ${' '.repeat(20)}MyTag:`);
    expect(rest).toEqual(['hello', { a: 1 }]);
  });

  it.each([
    ['debug', 'log', 'DEBUG'],
    ['warn', 'warn', 'WARN'],
    ['error', 'error', 'ERROR'],
  ] as const)('writes %s messages to console.%s with the %s label', async (method, consoleMethod, label) => {
    const Logger = await loadLogger();
    const logger = Logger.child({ tag: 'T', level: 'debug' });

    logger[method]('msg');

    expect(consoleSpies[consoleMethod].mock.calls[0][1]).toBe(`|${label}| ${' '.repeat(24)}T:`);
  });

  it('left-pads short tags to 25 characters', async () => {
    const Logger = await loadLogger();

    Logger.child({ tag: 'abc' }).error('x');

    const prefix: string = consoleSpies.error.mock.calls[0][1];
    const tag = prefix.replace('|ERROR| ', '').replace(/:$/, '');
    expect(tag).toHaveLength(25);
    expect(tag.trim()).toBe('abc');
  });

  it('keeps a tag of exactly 25 characters unchanged', async () => {
    const Logger = await loadLogger();
    const exact = 'x'.repeat(25);

    Logger.child({ tag: exact }).error('x');

    expect(consoleSpies.error.mock.calls[0][1]).toBe(`|ERROR| ${exact}:`);
  });

  it('truncates long tags to 25 characters keeping the head and the tail', async () => {
    // Arrange
    const Logger = await loadLogger();
    const longTag = 'SessionCreator.createSession.extra';

    // Act
    Logger.child({ tag: longTag }).error('x');

    // Assert
    const tag = (consoleSpies.error.mock.calls[0][1] as string).replace('|ERROR| ', '').replace(/:$/, '');
    expect(tag).toHaveLength(25);
    expect(tag).toBe(`${longTag.slice(0, 7)}...${longTag.slice(-15)}`);
  });
});
