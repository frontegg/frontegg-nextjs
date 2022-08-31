const { execSync } = require('child_process');
const { writeFileSync } = require('fs');
const path = require('path');

function getCurrentVersion() {
  const pkg = require('../libs/nextjs/package.json');
  const [major = 0, minor = 0, patch = 0] = pkg.version.split('.').map(Number);
  return { major, minor, patch };
}

function isAdminPortalPackageUpdated() {
  const yarnLockChanges = execSync(
    'git diff HEAD $(git describe --tags --match "v*" --abbrev=0) -- \'yarn.lock\''
  );
  return (
    yarnLockChanges.toString().indexOf('@frontegg/rest-api@') !== -1 ||
    yarnLockChanges.toString().indexOf('@frontegg/redux-store@') !== -1 ||
    yarnLockChanges.toString().indexOf('@frontegg/js@') !== -1
  );
}

function modifyVersion(newVersion) {
  const packageJsonPath = path.join(__dirname, `../libs/nextjs/package.json`);
  console.log('Modifying package.json', packageJsonPath);
  const pkg = require(packageJsonPath);
  pkg.version = `${newVersion.major}.${newVersion.minor}.${newVersion.patch}`;
  writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2), {
    encoding: 'utf8',
  });
}

function versioning() {
  const version = getCurrentVersion();
  let newVersion = { ...version };

  const adminPortalChanged = isAdminPortalPackageUpdated();

  console.log(
    `Current version: ${version.major}.${version.minor}.${version.patch}`
  );
  if (adminPortalChanged) {
    console.log('New version of Admin Portal');
  }

  if (adminPortalChanged) {
    // minor version
    newVersion.minor = version.minor + 1;
    newVersion.patch = 0;
  } else {
    newVersion.patch = version.patch + 1;
  }
  modifyVersion(newVersion);
  console.log('new version', newVersion);
}

versioning();
