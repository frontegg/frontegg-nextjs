import { Logger, createLogger, format, transports } from 'winston';
import sdkVersion from '../sdkVersion';
import nextjsPkg from 'next/package.json';

const { combine, timestamp, printf } = format;

const myFormat = printf(({ level, message, tag, timestamp }) => {
  let _level = level
    .replace('error', 'error  ')
    .replace('warn', 'warn   ')
    .replace('info', 'info   ')
    .replace('debug', 'debug  ')
    .replace('verbose', 'verbose');

  let _tag = (tag ?? '').length > 40 ? `${tag.slice(0, 37)}...` : tag;

  return `@frontegg/nextjs | ${timestamp} | ${_level} | ${_tag ? `${_tag} | ` : ''}${message}`;
});
/**
 * @see [enabling-debug-logging](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/enabling-debug-logging)
 * in GitHub actions in failed tests for more debugging logs
 */
const isGithubRunnerDebugMode =
  process.env.ACTIONS_STEP_DEBUG === 'true' || process.env.ACTIONS_RUNNER_DEBUG === 'true';

const FronteggLogger: Logger = createLogger({
  level: isGithubRunnerDebugMode ? 'verbose' : process.env.FRONTEGG_LOG_LEVEL ?? 'info',
  format: combine(format.colorize(), timestamp(), myFormat),
  exitOnError: false,
  transports: [new transports.Console()],
});

FronteggLogger.warn(`Frontegg Next.js Wrapper (${sdkVersion.version}), Next.js version (${nextjsPkg.version})`);
export default FronteggLogger;
