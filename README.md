![alt text](https://github.com/frontegg/frontegg-nextjs/blob/master/logo.png)

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

1. Use package manager to install Frontegg Next.JS library.

   ```bash
     npm install --save @frontegg/nextjs
   ```

   or

   ```bash
     yarn add --save @frontegg/nextjs
   ```

2. Wrap the default export with `withFronteggApp` in `./pages/_app.tsx`:

   ```tsx
   // ./pages/_app.tsx

   import { withFronteggApp } from "@frontegg/nextjs";

   function CustomApp({ Component, pageProps }: AppProps) {
     return <Component {...pageProps} />;
   }

    export default withFronteggApp(CustomApp, {
    hostedLoginBox: true
    });
   ```

3. Create files for frontegg middleware under `./pages/api/frontegg/[...frontegg-middleware].ts`:

   ```tsx
   // ./pages/api/frontegg/[...frontegg-middleware].ts

   export { fronteggMiddleware as default } from '@frontegg/nextjs';
   ```

4. Create placeholder pages for frontegg router under `./pages/[...frontegg-router].tsx`:

   ```tsx
   // ./pages/[...frontegg-router].tsx

   export {
     FronteggRouter as default,
     FronteggRouterProps as getServerSideProps,
   } from '@frontegg/nextjs';
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
# The AppUrl is to tell Frontegg your application hostname
FRONTEGG_APP_URL='http://localhost:3000'

# The Frontegg domain is your unique URL to connect to the Frontegg gateway
FRONTEGG_BASE_URL='https://{YOUR_SUB_DOMAIN}.frontegg.com'

# Your Frontegg application's Client ID
FRONTEGG_CLIENT_ID='{YOUR_APPLICATION_CLIENT_ID}'

# The statless session encruption password, used to encrypt
# jwt before sending it to the client side.
#
# For quick password generation use the following command:
#    node -e "console.log(crypto.randomBytes(32).toString('hex'))"
FRONTEGG_ENCRYPTION_PASSWORD='{SESSION_ENCRYPTION_PASSWORD}'

# The statless session cookie name
FRONTEGG_COOKIE_NAME='fe_session'
```

## Documentation

### API Reference

Visit [Frontegg Docs](https://docs.frontegg.com) for the full documentation.

### Frontegg Provider Options

Pass seconds argument to `withFronteggApp` function in `_app.ts` file to customize
Frontegg library.

```tsx
// ./pages/_app.tsx

import { withFronteggApp } from '@frontegg/nextjs';

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
import { getSession } from '@frontegg/nextjs';

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
import { withSSRSession } from '@frontegg/nextjs';

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

## Next.js 13
### wrapping your application
```tsx
// ./app/layout.tsx
import { FronteggAppProvider } from '@frontegg/nextjs/server';

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
export { FronteggAppRouter as default } from '@frontegg/nextjs/client';
```

### server component
notice that this session is not part of the state and therefore won't trigger ui changes when it changes
```tsx
// ./app/ServerComponent.tsx
import { getSession } from "@frontegg/nextjs/server";

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

export const ClientComponent = ({ baseUrl }: { baseUrl?: string }) => {
  const { user, isAuthenticated } = useAuth();

  const loginWithRedirect = useLoginWithRedirect();

  const logout = () => {
    window.location.href = `${baseUrl}/account/logout`;
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
  const baseUrl = process.env["FRONTEGG_APP_URL"];
  return (
    <div>
      <h3>Next JS application with frontegg</h3>
      {/* @ts-ignore ignore server components error with typescript*/}
      <ServerComponent />
      <ClientComponent baseUrl={baseUrl} />
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
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from '@frontegg/nextjs/edge';

export const middleware = async (request: NextRequest) => {
  const session = await getSession(request);
  const isAuthRoute = request.url.endsWith(YOUR_AUTH_ROUTES)

  if(!session && isAuthRoute){
    // redirect unauthenticated user to /account/login page
    return NextResponse.redirect(new URL('/account/login', request))
  }
  
  return NextResponse.next();
};

export const config = {
  matcher: "/(.*)",
};
```
