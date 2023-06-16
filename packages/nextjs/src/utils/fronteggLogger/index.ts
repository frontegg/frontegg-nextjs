import { LEVEL_NAMES, LEVELS } from './constants';

/**
 * @see [enabling-debug-logging](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/enabling-debug-logging)
 * in GitHub actions in failed tests for more debugging logs
 */
const isGithubRunnerDebugMode =
  process.env.ACTIONS_STEP_DEBUG === 'true' || process.env.ACTIONS_RUNNER_DEBUG === 'true';

let logLevel: keyof typeof LEVEL_NAMES = 'warn';
if (process.env.FRONTEGG_LOG_LEVEL) {
  logLevel = process.env.FRONTEGG_LOG_LEVEL as keyof typeof LEVEL_NAMES;
}
if (isGithubRunnerDebugMode) {
  logLevel = 'debug';
}
if (Object.keys(LEVEL_NAMES).indexOf(logLevel) === -1) {
  logLevel = 'warn';
}

type FronteggLoggerOptions = {
  tag: string;
  level?: keyof typeof LEVEL_NAMES;
};

const maxTagLength = 25;

function repeat(num: number) {
  return [...new Array(num)].map(() => ' ').join('');
}

class FronteggLogger {
  private readonly tag: string;
  private readonly level: keyof typeof LEVEL_NAMES;

  constructor(options: FronteggLoggerOptions) {
    if (options.tag.length > maxTagLength) {
      this.tag = options.tag.slice(0, 7) + '...' + options.tag.slice(options.tag.length - maxTagLength + 10);
    } else {
      this.tag = repeat(maxTagLength - options.tag.length) + options.tag;
    }

    this.level = options.level ?? logLevel;
  }

  private prepare(printLevel: keyof typeof LEVEL_NAMES, args: any[]) {
    const levelName = LEVELS[LEVEL_NAMES[printLevel]];
    return [new Date().toISOString(), `|${levelName}| ${this.tag}:`, ...args];
  }

  debug(...args: any[]) {
    if (LEVEL_NAMES[this.level] <= LEVEL_NAMES.debug) {
      console.log.apply(console, this.prepare('debug', args));
    }
  }

  info(...args: any[]) {
    if (LEVEL_NAMES[this.level] <= LEVEL_NAMES.info) {
      console.info.apply(console, this.prepare('info', args));
    }
  }

  warn(...args: any[]) {
    if (LEVEL_NAMES[this.level] <= LEVEL_NAMES.warn) {
      console.warn.apply(console, this.prepare('warn', args));
    }
  }

  error(...args: any[]) {
    console.error.apply(console, this.prepare('error', args));
  }

  static child(options: FronteggLoggerOptions): FronteggLogger {
    return new FronteggLogger(options);
  }
}

export default FronteggLogger;
