// import { markdown, danger, warn, fail, schedule, message } from 'danger';
import { danger, message, warn } from 'danger';
// import yarn from 'danger-plugin-yarn';

// const docs = danger.git.fileMatch('**/*.md');
// const next12App = danger.git.fileMatch('packages/demo-saas/**/*');
// const next13App = danger.git.fileMatch('packages/demo-saas-next12/**/*');
// const library = danger.git.fileMatch('packages/nextjs/**/*');
// const tests = danger.git.fileMatch('*/unit-tests/*');
// const npmLockFiles = danger.git.fileMatch('**/package-lock.json');

console.log(danger.git.modified_files);
message('Testing comment on file', {
  file: danger.git.modified_files.find((t) => t.indexOf('general-checks.yml') !== -1),
  line: 5,
});

//
// markdown('## Frontegg Doctor :heart: report:');
//
// const summery = ['### Summary:'];
//
// docs.edited && summery.push('- Detect changes in docs.');
// tests.edited && summery.push('- Detect changes in Unit Tests.');
// next12App.edited && summery.push('- Detected changes in `Next.js 12` example project.');
// next13App.edited && summery.push('- Detected changes in `Next.js 13` example project.');
// library.edited && summery.push('- Detected change in `@frontegg/nextjs`.');
//
// markdown(summery.join('\n'));
//
// if (npmLockFiles.edited) {
//   fail(`Detected package-lock file. remove all package-lock.json and use \`yarn install\` for installing dependencies`);
// }
//
// schedule(
//   yarn({
//     disableCheckForLockfileDiff: true,
//     pathToPackageJSON: './packages/nextjs/package.json',
//   })
// );
//
//
// const packageChanged = danger.git.modified_files.includes('package.json');
// const lockfileChanged = danger.git.modified_files.includes('yarn.lock');
// if (packageChanged && !lockfileChanged) {
//   const message = 'Changes were made to package.json, but not to yarn.lock';
//   const idea = 'Perhaps you need to run `yarn install`?';
//   warn(`${message} - <i>${idea}</i>`);
// }
//
// // Always ensure we assign someone, so that our Slackbot can do its work correctly
// if (danger.github.pr.assignee === null) {
//   fail('Please assign someone to merge this PR, and optionally include people who should review.');
// }
//
// // TODO: add no console logs detection
// // TODO: add no debugger detection
// // TODO: add critical changes detection:
// //       - lerna config
// //       - lib package version
// //       - tslint
// //       - tsconfig
// //       - babel.config.js
// //       - script files
// //       - .snyk
// //       - all .dot files
//
// // TODO: add iron-session incorrect imports detection
// // TODO: add check for main exported methods
