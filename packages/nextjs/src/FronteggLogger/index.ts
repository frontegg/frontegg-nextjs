import { Logger, createLogger, format, transports } from 'winston';
import pkg from '../../package.json';
import nextjsPkg from 'next/package.json';

const { combine, timestamp, label, printf } = format;

const myFormat = printf(({ level, message, label, timestamp }) => {
  return `[FronteggNextJS] ${timestamp} - ${level.toUpperCase()}: ${message}`;
});
/**
 * @see [enabling-debug-logging](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/enabling-debug-logging)
 * in GitHub actions in failed tests for more debugging logs
 */
const isGithubRunnerDebugMode =
  process.env.ACTIONS_STEP_DEBUG === 'true' || process.env.ACTIONS_RUNNER_DEBUG === 'true';

const FronteggLogger: Logger = createLogger({
  level: isGithubRunnerDebugMode ? 'verbose' : process.env.FRONTEGG_LOG_LEVEL ?? 'info',
  format: combine(
    label({ label: 'right meow!' }),
    timestamp(),
    myFormat
  ),
  exitOnError: false,
  transports: [new transports.Console()],
});


FronteggLogger.warn(`Frontegg Next.js Wrapper (${pkg.version}), Next.js version (${nextjsPkg.version})`)
export default FronteggLogger;
