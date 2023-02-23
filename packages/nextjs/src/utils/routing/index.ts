import { authInitialState } from '@frontegg/redux-store';
import config from '../../config';

export function getAuthRoutes(): { routesArr: string[]; routesObj: Record<string, string> } {
  const routesObj = {
    ...authInitialState.routes,
    ...config.authRoutes,
  };
  const routesArr: string[] = Object.keys(routesObj).reduce(
    (p: string[], key: string) => [...p, (routesObj as any)[key]],
    []
  );
  return { routesArr, routesObj };
}

export function isAuthRoute(pathname: string): boolean {
  const { routesArr, routesObj } = getAuthRoutes();

  if (config.fronteggAppOptions.hostedLoginBox) {
    return (
      routesObj.loginUrl === pathname ||
      routesObj.logoutUrl === pathname ||
      routesObj.hostedLoginRedirectUrl === pathname
    );
  } else {
    return routesArr.indexOf(pathname) !== -1;
  }
}
