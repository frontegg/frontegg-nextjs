// import { danger, fail } from 'danger';

export default function checkYarnLock() {
  const packageChanged = global.danger.git.modified_files.includes('package.json');
  const lockfileChanged = global.git.modified_files.includes('yarn.lock');
  if (packageChanged && !lockfileChanged) {
    const message = 'Changes were made to package.json, but not to yarn.lock';
    const idea = 'Perhaps you need to run `yarn install`?';
    fail(`${message} - <i>${idea}</i>`);
  }
}
