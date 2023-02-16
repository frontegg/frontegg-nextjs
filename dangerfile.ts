import { message, danger, warn, fail, schedule } from 'danger';
import yarn from 'danger-plugin-yarn';
import spellcheck from 'danger-plugin-spellcheck';

const docs = danger.git.fileMatch('**/*.md');
const app = danger.git.fileMatch('src/**/*.ts');
const tests = danger.git.fileMatch('*/unit-tests/*');
const npmLockFiles = danger.git.fileMatch('**/package-lock.json');

// if (docs.edited) {
// message('Thanks - We :heart: our [documentarians](http://www.writethedocs.org/)!');
// }

if (app.modified && !tests.modified) {
  warn('You have app changes without tests.');
}

if (npmLockFiles.edited) {
  fail(`Detected package-lock file. remove all package-lock.json and use \`yarn install\` for installing dependencies`);
}

schedule(
  yarn({
    disableCheckForLockfileDiff: true,
    pathToPackageJSON: './packages/nextjs/package.json',
  })
);

schedule(
  spellcheck({
    ignore: [
      'withSSRSession',
      'frontegg',
      'nextjs',
      'npm',
      'next.js',
      'SaaS',
      'Vercel',
      'ClientID',
      'AccessToken',
      'getSession',
      'fronteggMiddleware',
      'api',
      'frontegg-middleware',
      'middlewares',
    ],
  })
);

const packageChanged = danger.git.modified_files.includes('package.json');
const lockfileChanged = danger.git.modified_files.includes('yarn.lock');
if (packageChanged && !lockfileChanged) {
  const message = 'Changes were made to package.json, but not to yarn.lock';
  const idea = 'Perhaps you need to run `yarn install`?';
  warn(`${message} - <i>${idea}</i>`);
}

// Always ensure we assign someone, so that our Slackbot can do its work correctly
if (danger.github.pr.assignee === null) {
  fail('Please assign someone to merge this PR, and optionally include people who should review.');
}

// TODO: add no console logs detection
// TODO: add no debugger detection
// TODO: add critical changes detection:
//       - lerna config
//       - lib package version
//       - tslint
//       - tsconfig
//       - babel.config.js
//       - script files
//       - .snyk
//       - all .dot files

// TODO: add iron-session incorrect imports detection
// TODO: add check for main exported methods
