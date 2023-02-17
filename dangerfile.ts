// import { markdown, danger, warn, fail, schedule, message } from 'danger';
import { danger, fail, markdown, message, schedule, warn } from 'danger';

// import yarn from 'danger-plugin-yarn';

const sourceCodeFileMatcher = 'packages/nextjs/**/*';

function printSummary() {
  const docs = danger.git.fileMatch('**/*.md');
  const next12App = danger.git.fileMatch('packages/demo-saas/**/*');
  const next13App = danger.git.fileMatch('packages/demo-saas-next12/**/*');
  const library = danger.git.fileMatch(sourceCodeFileMatcher);
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

function checkContains(data: string, regex: RegExp): number[] {
  const lines: number[] = [];

  const iterator = data.matchAll(regex);
  let match = iterator.next();
  while (!match.done) {
    const line = data.substring(0, match.value.index).split('\n').length;
    lines.push(line);
    match = iterator.next();
  }
  return lines;
}

const delay = (time: number = 200) => new Promise((resolve) => setTimeout(resolve, time));

type CodeCheckFailed = { message: string; file: string; line: number };

async function checkCode() {
  const editedFiles = danger.git.fileMatch(sourceCodeFileMatcher).getKeyedPaths().edited;

  const fails: CodeCheckFailed[] = [];

  await Promise.all(
    editedFiles.map(async (file) => {
      const diffForFile = await danger.git.structuredDiffForFile(file);
      if (diffForFile != null) {
        for (let chunkIdx = 0; chunkIdx < diffForFile.chunks.length; chunkIdx++) {
          const chunk = diffForFile.chunks[chunkIdx];
          for (let changeIdx = 0; changeIdx < chunk.changes.length; changeIdx++) {
            const change = chunk.changes[changeIdx];
            if (change.type === 'add') {
              const data = change.content;

              if (/\bdebugger\b/.test(data)) {
                const message = 'No debugger';
                fails.push({ message, file, line: change.ln });
              } else if (/console\.(log|error|warn|info)/.test(data)) {
                if (data.indexOf('node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))"') !== -1) {
                  // skip for docs
                } else {
                  const message = 'No console.log';
                  fails.push({ message, file, line: change.ln });
                }
              }
            }
          }
        }
      }
    })
  );

  if (fails.length < 20) {
    for (let i = 0; i < fails.length; i++) {
      const fileData = fails[i];
      fail(fileData.message, fileData.file, fileData.line);
      await delay(100);
    }
  } else {
    warn(`Skip commenting on line due to many fails: ${fails.length}`);
    const failedRows = fails
      .map((failData) => `- ${failData.message} - <i>file:${failData.file}#${failData.line}</i>`)
      .join('\n');
    fail(`Code Quality Failed:\n${failedRows}`);
  }
}

function disableNewJsFiles() {
  const JS_EXT = /\.jsx?$/;
  const hasJS = danger.git
    .fileMatch(sourceCodeFileMatcher)
    .getKeyedPaths()
    .created.some((file) => JS_EXT.test(file));

  if (hasJS) {
    fail('JavaScript detected. All new files must be TypeScript.');
  }
}

markdown('## Frontegg Doctor :heart: report:');

printSummary();
checkYarnLock();
checkPackageLock();
checkDependencies();
checkAssignee();
disableNewJsFiles();
checkCode();

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
