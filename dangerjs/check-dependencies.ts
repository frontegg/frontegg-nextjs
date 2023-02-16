// import { danger, fail } from "danger";
// @ts-ignore
const { danger, fail } = global.danger;

const dependencyCodeOwners = ['frontegg-david'];

export default function checkDependencies() {
  // Warns if there are changes to package.json, and tags the team.
  const packageChanged = danger.git.modified_files.includes('package.json');
  const reviews = danger.github.reviews;

  reviews.find((review) => review.state === 'APPROVED' && review.user.login);
  if (packageChanged) {
    const title = ':lock: package.json';
    const mentions = dependencyCodeOwners.map((mention) => `@${mention}`).join(', ');
    const idea = `Changes made to package.json should be reviewed by DependencyCodeOwners. (${mentions}).`;
    fail(`${title} - <i>${idea}</i>`);
  }
}
