import Logger from 'pino';
import sdkVersion from '../../sdkVersion';
import nextjsPkg from 'next/package.json';
import { LEVELS } from './constants';

/**
 * @see [enabling-debug-logging](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/enabling-debug-logging)
 * in GitHub actions in failed tests for more debugging logs
 */
const isGithubRunnerDebugMode =
  process.env.ACTIONS_STEP_DEBUG === 'true' || process.env.ACTIONS_RUNNER_DEBUG === 'true';

const fronteggLogger = Logger(
  {
    level: isGithubRunnerDebugMode ? 'debug' : process.env.FRONTEGG_LOG_LEVEL ?? 'info',
  },
  {
    write(messageJson: string) {
      const { msg, time, level, tag } = JSON.parse(messageJson);
      const args = [new Date(time), `|${LEVELS[level]}|`, msg];
      if (tag) {
        args.push(`[${tag}]`);
      }
      console.log.apply(console, args);
    },
  }
);

fronteggLogger.warn(`Frontegg Next.js Wrapper (${sdkVersion.version}), Next.js version (${nextjsPkg.version})`);
export default fronteggLogger;