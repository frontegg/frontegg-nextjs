import { FronteggConfig } from '@frontegg/nextjs';
import { authInitialState } from '@frontegg/redux-store';
import { parse } from 'url';

export default function FronteggRouter() {
  return <div/>
}

export async function getServerSideProps(context) {
  const routesObj = Object.keys({
    ...authInitialState.routes,
    ...FronteggConfig.authRoutes
  });
  const routesArr: string[] = routesObj.reduce((p, key) => [ ...p, routesObj[key] ], []);

  const { pathname } = parse(context.req.url, true)
  const notFound = routesArr.indexOf(pathname) === -1;
  return {
    notFound
  };
}
