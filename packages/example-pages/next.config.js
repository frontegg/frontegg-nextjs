/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets the E2E flow suite use its own build dir for this app.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: true,
  swcMinify: true,
};

module.exports = nextConfig;
