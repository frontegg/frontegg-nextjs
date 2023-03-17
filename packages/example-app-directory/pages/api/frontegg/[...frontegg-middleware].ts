export { FronteggApiMiddleware as default } from '@frontegg/nextjs/middleware';

export const config = {
  api: {
    externalResolver: true,
    responseLimit: false,
  },
};
