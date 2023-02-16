// import { markdown, danger, warn, fail, schedule, message } from 'danger';
import { danger, markdown, message, warn } from 'danger';
// import checkYarnLock from './check-yarn-lock';
// import { checkDebugger } from './check-debugger';
// import { printSummary } from './print-summary';
// import { checkPackageLock } from './check-package-lock';
import checkDependencies from './check-dependencies';
import yarn from 'danger-plugin-yarn';

markdown('## Frontegg Doctor :heart: report:');

// printSummary();
// checkYarnLock();
// checkDebugger();
// checkPackageLock();
checkDependencies();

// message(`Remove \`ready_for_review\`, \`review_requested\` from  on:pull_request:types`, {
//   file: danger.git.created_files.find((t) => t.indexOf('general-checks.yml') !== -1),
//   line: 4,
// });

// // // Always ensure we assign someone, so that our Slackbot can do its work correctly
// // if (danger.github.pr.assignee === null) {
// //   fail('Please assign someone to merge this PR, and optionally include people who should review.');
// // }
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
