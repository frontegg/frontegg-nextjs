import type { AppContext, AppProps, AppInitialProps } from 'next/app';
import type {
  AppType,
  AppContextType,
  AppPropsType,
  NextComponentType,
} from 'next/dist/shared/lib/utils';
import { FronteggNextJSSession, MeAndTenants } from './types';
import { refreshToken, meAndTenants } from './helpers';
import { FronteggProvider } from './FronteggProvider';
import { FronteggAppOptions } from '@frontegg/types';
import fronteggConfig from './FronteggConfig';

export const withFronteggApp = (
  app: ((props: AppProps) => JSX.Element) & {
    getInitialProps?: AppType['getInitialProps'];
  },
  options?: Omit<FronteggAppOptions, 'contextOptions'> & {
    contextOptions?: FronteggAppOptions['contextOptions'];
  }
): NextComponentType<
  AppContextType & { session: FronteggNextJSSession | null },
  AppInitialProps,
  AppPropsType
> => {
  type GetInitialProps = NextComponentType<
    AppContextType & { session: FronteggNextJSSession | null },
    AppInitialProps,
    AppPropsType
  >['getInitialProps'];
  const originalGetInitialProps: GetInitialProps | undefined =
    app.getInitialProps;

  app.getInitialProps = async (
    appContext: AppContext & {
      session: FronteggNextJSSession | null;
    } & MeAndTenants
  ): Promise<AppInitialProps> => {
    const { ctx, Component } = appContext;

    if (ctx.req?.url?.indexOf('/_next/data/') === -1) {
      const session = await refreshToken(ctx);
      const { user, tenants } = await meAndTenants(ctx, session?.accessToken);
      appContext.session = session;
      appContext.user = user;
      appContext.tenants = tenants;
      const envAppUrl = fronteggConfig.getEnvAppUrl();
      if (!envAppUrl) {
        throw Error(
          '@frontegg/nextjs: .env.local must contain FRONTEGG_APP_URL'
        );
      }
      if (!process.env['FRONTEGG_BASE_URL']) {
        throw Error(
          '@frontegg/nextjs: .env.local must contain FRONTEGG_BASE_URL'
        );
      }
      if (!process.env['FRONTEGG_CLIENT_ID']) {
        throw Error(
          '@frontegg/nextjs: .env.local must contain FRONTEGG_CLIENT_ID'
        );
      }
      return {
        pageProps: {
          ...(originalGetInitialProps
            ? await originalGetInitialProps(appContext)
            : {}),
          ...(Component.getInitialProps
            ? await Component.getInitialProps(ctx)
            : {}),
          session,
          user,
          tenants,
          envAppUrl,
          envBaseUrl: process.env['FRONTEGG_BASE_URL'],
          envClientId: process.env['FRONTEGG_CLIENT_ID'],
        },
      };
    } else {
      appContext.session = null;
      return {
        pageProps: {
          ...(originalGetInitialProps
            ? await originalGetInitialProps(appContext)
            : {}),
          ...(Component.getInitialProps
            ? await Component.getInitialProps(ctx)
            : {}),
        },
      };
    }
  };

  fronteggConfig.authRoutes = options?.authOptions?.routes ?? {};
  fronteggConfig.fronteggAppOptions = options ?? {};

  function CustomFronteggApp(appProps: AppProps) {
    const { user, tenants, session, envAppUrl, envBaseUrl, envClientId } =
      appProps.pageProps;
    return (
      <FronteggProvider
        {...options}
        {...{ user, tenants, session, envAppUrl, envBaseUrl, envClientId }}
      >
        {app(appProps) as any}
      </FronteggProvider>
    );
  }

  CustomFronteggApp.getInitialProps = app.getInitialProps;

  return CustomFronteggApp as AppType;
};
