![alt text](https://raw.githubusercontent.com/frontegg/frontegg-nextjs/master/logo.png)

Frontegg is a web platform where SaaS companies can set up their fully managed, scalable and brand aware - SaaS features
and integrate them into their SaaS portals in up to 5 lines of code.


### You are reading v6 docs, v7 docs under construction, Visit [the latest changelog](https://github.com/frontegg/frontegg-nextjs/releases/tag/v7.0.0) for migration from v6.

## Table of Contents

- [Installation](#installation)
  - [Create new NextJS project](#create-new-nextjs-project)
  - [Add to existing project](#add-to-existing-project)
  - [Using Vercel platform with custom domain](#using-vercel-platform-with-custom-domain)
- [Getting Started](#getting-started)
  - [Create Frontegg workspace](#create-frontegg-workspace)
  - [Setup environment](#setup-environment)
- [Documentation](#documentation)
  - [API Reference](#api-reference)
  - [Frontegg Provider Options](#frontegg-provider-options)
  - [getSession](#getsession)
  - [withSSRSession](#withssrsession)
  - [Next.js middlewares usage](#nextjs-middlewares-usage)
  - for more [visit](https://docs.frontegg.com/docs/self-service-introduction)

## Installation

### Add Frontegg to Next.JS project

To Add Frontegg to your existing Next.JS project, follow below steps:


Use package manager to install Frontegg Next.JS library.

   ```bash
     npm install --save @frontegg/nextjs
   ```

   or

   ```bash
     yarn add --save @frontegg/nextjs
   ```


**If you're using the App Directory architecture, you can skip the following Pages architecture steps and refer to the [AppDir guide](#nextjs-appdir-architecture) instead.**

1. Wrap the default export with `withFronteggApp` in `./pages/_app.tsx`:

   ```tsx
   // ./pages/_app.tsx

   import { withFronteggApp } from "@frontegg/nextjs/pages";

   function CustomApp({ Component, pageProps }: AppProps) {
     return <Component {...pageProps} />;
   }

    export default withFronteggApp(CustomApp, {
      // when change to false, you have also to provide FRONTEGG_HOSTED_LOGIN='false' in .env.local
      hostedLoginBox: true
    });
   ```

2. Create files for frontegg middleware under `./pages/api/frontegg/[...frontegg-middleware].ts`:

   ```tsx
   // ./pages/api/frontegg/[...frontegg-middleware].ts

   export { fronteggMiddleware as default } from '@frontegg/nextjs/middleware';
   ```

3. Create placeholder pages for frontegg router under `./pages/[...frontegg-router].tsx`:

   ```tsx
   // ./pages/[...frontegg-router].tsx

   export {
     FronteggRouter as default,
     FronteggRouterProps as getServerSideProps,
   } from '@frontegg/nextjs/pages';
   ```

### Using Vercel platform with custom domain

1. Visit `https://vercel.com/[ACCOUNT_ID]/[PROJECT_ID]/settings/environment-variables`
2. Add `FRONTEGG_APP_URL` environment variable for each Vercel Environment
   ![vercel-settings-pages](https://github.com/frontegg/frontegg-nextjs/blob/master/assets/vercel-environment.png)


## Getting Started

### Create Frontegg workspace

Navigate to [Frontegg Portal Settings](https://portal.frontegg.com/development/settings), If you don't have application
follow integration steps after signing up.

Next, configure the "Allowed Origins" in your application under "Domain" tab of the "Settings" page :

- http://localhost:3000 // for development environments
- https://my-company-domain.com // for production environments

Copy ClientID, Frontegg Domain from "Settings" page, You'll need these values in the next step.

### Setup environment

To set up your Next.js application to communicate with Frontegg, you have to create a new file named `.env.local` under
your root project directory, this file will be used to store environment variables that will be used, configuration
options:

```dotenv
# The AppUrl is used to tell Frontegg your application hostname
FRONTEGG_APP_URL='http://localhost:3000'

# The Frontegg domain is your unique URL to connect to the Frontegg gateway
FRONTEGG_BASE_URL='https://{YOUR_SUB_DOMAIN}.frontegg.com'

# Your Frontegg application's Client ID
# - For Dev environment [visit](https://portal.frontegg.com/development/settings/general)
# - For Prod environment [visit](https://portal.frontegg.com/production/settings/general)
FRONTEGG_CLIENT_ID='{YOUR_APPLICATION_CLIENT_ID}'

# Your Frontegg application's Client Secret
# - For Dev environment [visit](https://portal.frontegg.com/development/settings/general)
# - For Prod environment [visit](https://portal.frontegg.com/production/settings/general)
FRONTEGG_CLIENT_SECRET='{YOUR_APPLICATION_CLIENT_SECRET}'

# The stateless session encryption password used to encrypt the JWT before sending it to the client side.
# For quick password generation, use the following command:
#    node -e "console.log(crypto.randomBytes(32).toString('hex'))"
FRONTEGG_ENCRYPTION_PASSWORD='{SESSION_ENCRYPTION_PASSWORD}'

# The stateless cookie name for storing the encrypted JWT
# value as session cookies for supporting getServerSideProps and ServerComponents
FRONTEGG_COOKIE_NAME='FRONTEGG_COOKIE_NAME'

# Specifies the domain for storing the encrypted JWT as session cookies, 
# enabling support for `getServerSideProps` and `ServerComponents`.  
# If not provided, the domain will be the same as the `APP_URL` environment variable.
FRONTEGG_COOKIE_DOMAIN='FRONTEGG_COOKIE_DOMAIN'

# The JWT public key generated by Frontegg to verify JWT before creating a session.
# Retrieve it by visiting: https://[YOUR_FRONTEGG_DOMAIN]/.well-known/jwks.json.
# By default, this key will be fetched from the Frontegg server, but you can provide it manually.
# Copy and paste the first key from the response (not the whole array):
# {keys: [{__KEY__}]}
FRONTEGG_JWT_PUBLIC_KEY='{"kty":"RSA","kid":"...'

# When `true`, the initial props will not refresh the access token if it's still valid.
# This option saves the time of refreshing the token on the server side.
DISABLE_INITIAL_PROPS_REFRESH_TOKEN='true'

# Enable secure JWT by removing the signature from the JWT token.
# To enable this feature, you need to provide {@link EnvVariables.FRONTEGG_CLIENT_SECRET}
FRONTEGG_SECURE_JWT_ENABLED='false'

# The Frontegg Hosted Login URL used to redirect the user to the Frontegg login page.
# Set to 'true' to enable the hosted login feature.
FRONTEGG_HOSTED_LOGIN='true'
```

## Documentation

### API Reference

Visit [Frontegg Docs](https://docs.frontegg.com) for the full documentation.

### Frontegg Provider Options

Pass seconds argument to `withFronteggApp` function in `_app.ts` file to customize
Frontegg library.

```tsx
// ./pages/_app.tsx

import { withFronteggApp } from '@frontegg/nextjs/pages';

function CustomApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default withFronteggApp(CustomApp, {
  hostedLoginBox: true,
  /**
   * Frontegg options for customizations
   */
});
```

### getSession

For any pages that required AccessToken in Server Side, you can use:

```tsx
import { GetServerSideProps } from 'next';
import { getSession } from '@frontegg/nextjs/pages';

export default function MyPage({ products }) {
  return (
    <div>
      <h1>My Page</h1>
      {products}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context.req);
  if (session) {
    const { data } = await fetch('{external}/product', {
      headers: {
        Authorization: 'bearer ' + session.accessToken,
      },
    });
    return { props: { products: data } };
  }

  return { props: { products: [] } };
};
```

### withSSRSession

withSSRSession HOC can be used to automatic redirect users to login screen if not logged in:

```tsx
import { GetServerSideProps } from 'next';
import { withSSRSession } from '@frontegg/nextjs/pages';

export default function MyPage({ products }) {
  return (
    <div>
      <h1>My Page</h1>
      {products}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = withSSRSession(
  async (context, session) => {
    const { data } = await fetch('{external}/product', {
      headers: {
        Authorization: 'bearer ' + session.accessToken,
      },
    });
    return { props: { products: data } };
  }
);
```

## Next.js (AppDir architecture)
### wrapping your application
```tsx
// ./app/layout.tsx
import { FronteggAppProvider } from '@frontegg/nextjs/app';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <FronteggAppProvider hostedLoginBox>
      <html>
        <head></head>
        <body>{children}</body>
      </html>
    </FronteggAppProvider>
  );
}
```

### routing
```tsx
// ./app/[...frontegg-router]/page.tsx

export { FronteggAppRouter as default } from '@frontegg/nextjs/app';
```


### server component
notice that this session is not part of the state and therefore won't trigger ui changes when it changes
```tsx
// ./app/ServerComponent.tsx
import { getSession } from "@frontegg/nextjs/app";

export const ServerComponent = async () => {
  const session = await getSession();

  return <pre>{JSON.stringify(session, null, 2)}</pre>;
};

```

### client component
```tsx
// ./app/ClientComponent.tsx
"use client";
import { useAuth, useLoginWithRedirect } from "@frontegg/nextjs";
import { useRouter } from 'next/navigation'

export const ClientComponent = ({ baseUrl }: { baseUrl?: string }) => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const loginWithRedirect = useLoginWithRedirect();

  const logout = () => {
    router.replace('/account/logout')
  };

  return (
    <div className="App">
      {isAuthenticated ? (
        <div>
          <div>
            <img src={user?.profilePictureUrl} alt={user?.name} />
          </div>
          <div>
            <span>Logged in as: {user?.name}</span>
          </div>
          <div>
            <button onClick={() => alert(user?.accessToken)}>
              What is my access token?
            </button>
          </div>
          <div>
            <button onClick={() => logout()}>Click to logout</button>
          </div>
        </div>
      ) : (
        <div>
          <button onClick={() => loginWithRedirect()}>Click me to login</button>
        </div>
      )}
    </div>
  );
};
```

### Page
```tsx
// ./app/page.tsx
import { ClientComponent } from "./client";
import { ServerComponent } from "./server";

export default function MainPage() {
  return (
    <div>
      <h3>Next JS application with frontegg</h3>
      {/* @ts-ignore ignore server components error with typescript*/}
      <ServerComponent />
    </div>
  );
}
```

also keep fronteggMiddleware inside ./pages/api/frontegg/[...frontegg-middleware].ts as shown before

## Next.js middlewares usage

To prevent access unauthenticated user to all routes, use [Next.js middlewares](https://nextjs.org/docs/advanced-features/middleware).

**Note: If you were using Middleware prior to 12.2, please see the [upgrade guide](https://nextjs.org/docs/messages/middleware-upgrade-guide).**

```ts
// /middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionOnEdge, shouldByPassMiddleware, redirectToLogin } from '@frontegg/nextjs/edge';

export const middleware = async (request: NextRequest) => {
  const pathname = request.nextUrl.pathname;

  if (shouldByPassMiddleware(pathname)) {
    return NextResponse.next();
  }

  const session = await getSessionOnEdge(request);
  if (!session) {
    return redirectToLogin(pathname);
  }
  return NextResponse.next();
};

export const config = {
  matcher: '/(.*)',
};
```

## Quick start frontegg with vercel

To easily clone frontegg app sample and deploy with Vercel click [here](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ffrontegg%2Ffrontegg-nextjs%2Ftree%2Fmaster%2Fdemos%2Fquick-starter-demo&env=FRONTEGG_BASE_URL,FRONTEGG_CLIENT_ID,FRONTEGG_ENCRYPTION_PASSWORD&envDescription=Used%20to%20connect%20to%20your%20frontegg%20account%20and%20encrypt%20the%20frontegg%20session%20cookie&envLink=https%3A%2F%2Fdocs.frontegg.com%2Fdocs%2Fnextjs-12-13-ssr-hosted-login%23step-4-setup-environment&project-name=my-frontegg-app&repository-name=my-frontegg-app&demo-title=Authentication&demo-description=Basic%20application%20with%20Frontegg%20authentication%20&demo-url=https%3A%2F%2Fmy-frontegg-app.vercel.app&demo-image=https%3A%2F%2Ffronteggprodeustorage.blob.core.windows.net%2Fpublic-vendor-assets%2F4f091b2c-5755-4145-a313-10d9a530276f%2Fassets%2Flogo-fa2b14b1-d07d-49fd-8c24-a51f5d92c4d7.png)


