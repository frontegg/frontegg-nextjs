/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Lets the E2E flow suite run several instances of this app side by side.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: {
    appDir: true,
  },
};

module.exports = nextConfig;
