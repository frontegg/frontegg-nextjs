import type { NextApiRequest, NextApiResponse } from 'next';

export type GetClientIpFunction = (req: NextApiRequest) => string | undefined;

export type CorsOptions = {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  allowCredentials?: boolean;
};

export type FronteggMiddlewareOptions = {
  getClientIp?: GetClientIpFunction;
  cors?: CorsOptions;
};

export type FronteggApiMiddlewareType = ((req: NextApiRequest, res: NextApiResponse) => Promise<void>) & {
  withOptions: (options: FronteggMiddlewareOptions) => (req: NextApiRequest, res: NextApiResponse) => Promise<void>;
};
