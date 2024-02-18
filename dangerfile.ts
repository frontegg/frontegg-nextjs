import { danger, fail, markdown, message, schedule, warn } from 'danger';
import type { AddChange, Change } from 'parse-diff';
import path from 'path';

// import yarn from 'danger-plugin-yarn';

const sourceCodeFileMatcher = 'packages/nextjs/**/*';

function printSummary() {
  const docs = danger.git.fileMatch('**/*.md');
  const next12App = danger.git.fileMatch('packages/example-app-directory/**/*');
  const next13App = danger.git.fileMatch('packages/example-pages/**/*');
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
    warn(`${message} - <i>${idea}</i>`);
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

const dependencyCodeOwners = ['frontegg-david', 'rotemzif1', 'yuvalotem1'];

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
    warn('Please assign someone to merge this PR, and optionally include people who should review.');
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

const loopOverChanges = async (fileMatch: string, checkChange: (file: string, change: AddChange) => Promise<void>) => {
  // get all affected files
  const editedFiles = danger.git.fileMatch(fileMatch).getKeyedPaths().edited;
  const fileChecker = editedFiles.map(async (file) => {
    // get diff changes
    const diffForFile = await danger.git.structuredDiffForFile(file);
    if (!diffForFile) {
      // no chunks
      return;
    }

    // merge all added changes from chunks
    const changes = diffForFile.chunks.reduce((p: Change[], chunk) => {
      return [...p, ...chunk.changes.filter((change) => change.type === 'add')];
    }, []);

    await Promise.all(changes.map((change) => checkChange(file, change as AddChange)));
  });
  await Promise.all(fileChecker);
};

async function checkCode() {
  const fails: CodeCheckFailed[] = [];

  await loopOverChanges(sourceCodeFileMatcher, async (file, change) => {
    const data = change.content;

    if (file.indexOf('utils/fronteggLogger/index.ts') !== -1) {
      return;
    }
    if (/\bdebugger\b/.test(data)) {
      const message = 'No debugger';
      fails.push({ message, file, line: change.ln });
      return;
    }

    if (/console\.(log|error|warn|info)/.test(data)) {
      if (data.indexOf('node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))"') !== -1) {
        // skip for docs
      } else {
        const message = 'No console.log';
        fails.push({ message, file, line: change.ln });
      }
      return;
    }
  });

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

function getRelativePath(from: string, to: string): string {
  const relativePath = path.relative(from, to);
  const correctPath = relativePath.substring('../'.length);
  if (!relativePath.startsWith('../')) {
    return `./${correctPath}`;
  }
  return correctPath;
}

async function checkIronSessionImports() {
  const fails: CodeCheckFailed[] = [];

  await loopOverChanges(sourceCodeFileMatcher, async (file, change) => {
    if (
      file === 'packages/nextjs/src/utils/encryption/index.ts' ||
      file === 'packages/nextjs/src/utils/encryption-edge/index.ts'
    ) {
      // ignored files. these files can direct import iron-session
      return;
    }

    const data = change.content;

    if (/\biron-session\b/.test(data)) {
      const pathFromSrc = file.substring('packages/nextjs/src'.length);

      let relativePath;
      if (file.indexOf('src/edge/') !== -1) {
        relativePath = getRelativePath(pathFromSrc, '/utils/encryption-edge');
      } else {
        relativePath = getRelativePath(pathFromSrc, '/utils/encryption');
      }

      const message =
        `Don't use iron-session directly, this may break SSR and Edge runtime, to use \`sealData/unsealData\`:\n\n` +
        `\`\`\`tsx\n  import { sealTokens, unsealTokens } from '${relativePath}' \n\`\`\``;
      fails.push({ message, file, line: change.ln });
      return;
    }
  });

  for (let i = 0; i < fails.length; i++) {
    const fileData = fails[i];
    fail(fileData.message, fileData.file, fileData.line);
    await delay(100);
  }
}

markdown('## Frontegg Pull Request Review:');
printSummary();

checkYarnLock();
checkPackageLock();
checkDependencies();
checkAssignee();
disableNewJsFiles();
schedule(Promise.all([checkCode(), checkIronSessionImports()]));

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
// // // TODO: add check for main exported methods
