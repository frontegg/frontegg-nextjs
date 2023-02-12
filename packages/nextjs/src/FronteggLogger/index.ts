import Logger from 'pino';
import sdkVersion from '../sdkVersion';
import nextjsPkg from 'next/package.json';
import pretty from 'pino-pretty';

// const { combine, timestamp, printf } = format;

// const myFormat = printf(({ level, message, tag, timestamp }) => {
//   let _level = level
//     .replace('error', 'error  ')
//     .replace('warn', 'warn   ')
//     .replace('info', 'info   ')
//     .replace('debug', 'debug  ')
//     .replace('verbose', 'verbose');
//
//   let _tag = (tag ?? '').length > 40 ? `${tag.slice(0, 37)}...` : tag;
//
//   return `@frontegg/nextjs | ${timestamp} | ${_level} | ${_tag ? `${_tag} | ` : ''}${message}`;
// });
/**
 * @see [enabling-debug-logging](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/enabling-debug-logging)
 * in GitHub actions in failed tests for more debugging logs
 */
const isGithubRunnerDebugMode =
  process.env.ACTIONS_STEP_DEBUG === 'true' || process.env.ACTIONS_RUNNER_DEBUG === 'true';

const LEVELS: any = {
  60: 'FATAL',
  50: 'ERROR',
  40: 'WARN',
  30: 'INFO',
  20: 'DEBUG',
  10: 'TRACE',
};

const LEVEL_NAMES = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
};

// const FronteggLogger: Logger = createLogger({
//   level: isGithubRunnerDebugMode ? 'trace' : process.env.FRONTEGG_LOG_LEVEL ?? 'info',
//   format: combine(format.colorize(), timestamp(), myFormat),
//   exitOnError: false,
//
//   transports: [new transports.Console()],
// });

const FronteggLogger = Logger(
  {
    level: isGithubRunnerDebugMode ? 'debug' : process.env.FRONTEGG_LOG_LEVEL ?? 'info',
  },
  {
    write(messageJson: string) {
      const { msg, time, level, tag } = JSON.parse(messageJson);
      const args = [new Date(time), '|'];
      if (tag) {
        args.push(tag);
      }
      args.push(LEVELS[level], ':', msg);
      console.log.apply(console, args);
    },
  }
);

FronteggLogger.warn(`Frontegg Next.js Wrapper (${sdkVersion.version}), Next.js version (${nextjsPkg.version})`);
export default FronteggLogger;
