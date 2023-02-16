// import { markdown, danger, warn, fail, schedule, message } from 'danger';
import { danger, fail, markdown, message, warn } from 'danger';

// import yarn from 'danger-plugin-yarn';

function printSummary() {
  const docs = danger.git.fileMatch('**/*.md');
  const next12App = danger.git.fileMatch('packages/demo-saas/**/*');
  const next13App = danger.git.fileMatch('packages/demo-saas-next12/**/*');
  const library = danger.git.fileMatch('packages/nextjs/**/*');
  const tests = danger.git.fileMatch('*/unit-tests/*');

  const summery = ['### Summary:'];
  docs.edited && summery.push('- Detect changes in docs.');
  tests.edited && summery.push('- Detect changes in Unit Tests.');
  next12App.edited && summery.push('- Detected changes in `Next.js 12` example project.');
  next13App.edited && summery.push('- Detected changes in `Next.js 13` example project.');
  library.edited && summery.push('- Detected change in `@frontegg/nextjs`.');

  markdown(summery.join('\n'));
}

function checkYarnLock() {
  const packageChanged = danger.git.modified_files.includes('package.json');
  const lockfileChanged = danger.git.modified_files.includes('yarn.lock');
  if (packageChanged && !lockfileChanged) {
    const message = 'Changes were made to package.json, but not to yarn.lock';
    const idea = 'Perhaps you need to run `yarn install`?';
    fail(`${message} - <i>${idea}</i>`);
  }
}

async function checkDebugger() {
  const editedFiles = danger.git.created_files.concat(danger.git.modified_files);

  await Promise.all(
    editedFiles.map(async (file) => {
      const diffForFile = await danger.git.diffForFile(file);
      if (diffForFile != null) {
        const data = diffForFile.after;
        const matches = /\bdebugger\b/.exec(data);
        if (matches?.index != null) {
          const line = data.substring(0, matches.index).split('\n').length;
          fail('Remove debugger symbols', file, line);
        }
      }
    })
  );
}

function checkPackageLock() {
  const npmLockFiles = danger.git.fileMatch('**/package-lock.json');

  if (npmLockFiles.edited) {
    fail(
      `Detected package-lock file. remove all package-lock.json and use \`yarn install\` for installing dependencies`
    );
  }
}

const dependencyCodeOwners = ['frontegg-david', 'rotemzif1'];

function checkDependencies() {
  // Warns if there are changes to package.json, and tags the team.
  const packageChanged = danger.git.modified_files.includes('package.json');
  const reviews = danger.github.reviews;

  const approvedBy = reviews.find(
    (review) => review.state === 'APPROVED' && dependencyCodeOwners.indexOf(review.user.login) !== -1
  );
  if (packageChanged && !approvedBy) {
    const title = ':lock: package.json';
    const mentions = dependencyCodeOwners.map((mention) => `@${mention}`).join(', ');
    const idea = `Changes made to package.json should be reviewed by DependencyCodeOwners. (${mentions}).`;
    fail(`${title} - <i>${idea}</i>`);
  }
}

// Always ensure we assign someone, so that our Slackbot can do its work correctly
function checkAssignee() {
  if (danger.github.pr.assignee === null) {
    fail('Please assign someone to merge this PR, and optionally include people who should review.');
  }
}

markdown('## Frontegg Doctor :heart: report:');

printSummary();
checkYarnLock();
checkDebugger();
checkPackageLock();
checkDependencies();
checkAssignee();

// message(`Remove \`ready_for_review\`, \`review_requested\` from  on:pull_request:types`, {
//   file: danger.git.created_files.find((t) => t.indexOf('general-checks.yml') !== -1),
//   line: 4,
// });

// //
// // // TODO: add no console logs detection
// // // TODO: add no debugger detection
// // // TODO: add critical changes detection:
// // //       - lerna config
// // //       - lib package version
// // //       - tslint
// // //       - tsconfig
// // //       - babel.config.js
// // //       - script files
// // //       - .snyk
// // //       - all .dot files
// //
// // // TODO: add iron-session incorrect imports detection
// // // TODO: add check for main exported methods
