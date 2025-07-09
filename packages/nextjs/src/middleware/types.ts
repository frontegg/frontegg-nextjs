import type { NextApiRequest, NextApiResponse } from 'next';

export type IpResolverFunction = (req: NextApiRequest) => string | undefined;

export type CorsOptions = {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  allowCredentials?: boolean;
};

export type FronteggMiddlewareOptions = {
  ipResolver?: IpResolverFunction;
  cors?: CorsOptions;
};

export type FronteggApiMiddlewareType = ((req: NextApiRequest, res: NextApiResponse) => Promise<void>) & {
  withOptions: (options: FronteggMiddlewareOptions) => (req: NextApiRequest, res: NextApiResponse) => Promise<void>;
};
