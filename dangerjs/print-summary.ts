import { danger, markdown } from 'danger';

export function printSummary() {
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
