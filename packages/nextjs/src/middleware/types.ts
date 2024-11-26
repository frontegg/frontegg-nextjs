import type { NextApiRequest, NextApiResponse } from 'next';

export type CorsOptions = {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  allowCredentials?: boolean;
};

export type FronteggApiMiddlewareType = ((req: NextApiRequest, res: NextApiResponse) => Promise<void>) & {
  cors: (options: CorsOptions) => (req: NextApiRequest, res: NextApiResponse) => Promise<void>;
};
