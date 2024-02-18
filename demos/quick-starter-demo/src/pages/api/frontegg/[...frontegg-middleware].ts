import { FronteggApiMiddleware } from '@frontegg/nextjs/middleware';

// Use FronteggApiMiddleware to handle Frontegg API requests
export default FronteggApiMiddleware;
export const config = {
  api: {
    externalResolver: true,
    responseLimit: false,
  },
};
