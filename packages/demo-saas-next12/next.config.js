/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  publicRuntimeConfig: {
    fronteggClientId: process.env['FRONTEGG_CLIENT_ID'],
    fronteggAppUrl: process.env['FRONTEGG_APP_URL'],
    fronteggBaseUrl: process.env['FRONTEGG_BASE_URL'],
  },
};

module.exports = nextConfig;
