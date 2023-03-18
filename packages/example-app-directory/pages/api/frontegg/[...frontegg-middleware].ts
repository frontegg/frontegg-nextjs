import { FronteggApiMiddleware } from '@frontegg/nextjs/middleware';

export default FronteggApiMiddleware;
export const config = {
  api: {
    externalResolver: true,
    responseLimit: false,
  },
};
