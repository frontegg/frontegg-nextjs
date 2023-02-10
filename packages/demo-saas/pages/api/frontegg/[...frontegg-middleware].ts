export { FronteggApiMiddleware as default } from '@frontegg/nextjs/middlewares';

export const config = {
  api: {
    externalResolver: true,
    responseLimit: true,
  },
};
