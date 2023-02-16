import { danger, fail } from 'danger';

export function checkPackageLock() {
  const npmLockFiles = danger.git.fileMatch('**/package-lock.json');

  if (npmLockFiles.edited) {
    fail(
      `Detected package-lock file. remove all package-lock.json and use \`yarn install\` for installing dependencies`
    );
  }
}
