# Change Log

## [8.0.1](https://github.com/frontegg/frontegg-nextjs/compare/v7.0.19...v8.0.1) (2023-9-27)

- Introduction of our new security page in the admin portal replacing the current security page.
- FR-13509 - Added GTM integration

NextJS Wrapper 8.0.1:
- FR-13274 - Fixed removed cookies in the pages directory for next-js version 13.4

#### Note: no migration is needed to upgrade between versions 7 to 8.


## [7.0.19](https://github.com/frontegg/frontegg-nextjs/compare/v7.0.18...v7.0.19) (2023-9-5)

- Releasing the new Security Center Page, which will replace the current Security Page. Currently exposed on Early Access with limited availability by a feature flag.


### NextJS Wrapper 7.0.19:
- FR-13346 - Support me authorization
# Change Log

## [7.0.18](https://github.com/frontegg/frontegg-nextjs/compare/v7.0.17...v7.0.18) (2023-8-28)

- FR-13142 - Support setRootAccountData action for all account feature 
- FR-12321 - Added max validations to session management fields 
- FR-12974 - Fixed the issue with permissions and roles granted from user groups on User context
- FR-12322 - Change redirect to SSO text
- FR-12979 - Fixed MFA options save button to be disabled if the user has no security write permission

# Change Log

## [7.0.17](https://github.com/frontegg/frontegg-nextjs/compare/v7.0.16...v7.0.17) (2023-8-14)

# v7.0.17
- FR-11857 - Added new support for hosted login to load user on load
- FR-12828 - Updated entitlements API response
- FR-12224 - Supported custom login for authenticated users without a tenant alias
- FR-12780 - Improved Entitlements Vanilla JS SDK

### NextJS Wrapper 7.0.17:
- FR-12947 - Fixed duplicated cookie issue with switching tenant
- FR-12634 - Added support for custom login box with sub domain
- FR-12942 - Fixed build issue with middleware

# Change Log

## [7.0.16](https://github.com/frontegg/frontegg-nextjs/compare/v7.0.15...v7.0.16) (2023-7-19)

- FR-12688 - Make Admin box compatible with the updated type of IUserProfile
- FR-12114 - Fix show inactive custom social login provider
- FR-12098 - Fix admin portal user status update if email verification is off 
- FR-12020 - Fix blinking workspace title in admin portal vivid theme
- FR-12664 - Fix custom webpack bug by renaming redux-saga file

### NextJS Wrapper 7.0.16:
- FR-12634 - Support custom login with sub-domain index 0 for app dir 
- FR-12629 - Support custom login with search params and withSSRSession
  
# Change Log

## [7.0.15](https://github.com/frontegg/frontegg-nextjs/compare/v7.0.14...v7.0.15) (2023-7-13)

• FR-12550 - Align all auth methods to get the right login response type
• FR-12664 - Rename redux-saga file to prevent loop imports by webpack
• FR-12098 - Updated Admin portal user status to the correct one if email verification is off
• FR-12020 - Fixed blinking workspace title in admin portal vivid theme
• FR-12114 - Fixed custom social login provider shouldn't be shown if not active
• FR-12628 - Fixed custom login with hosted Oauth in URL
• FR-12575 - Changed remember my device value to be true by default
• FR-12581 - Added support for custom inline html and script
• FR-12343 - Added support for SSO per tenant
• FR-12488 - Backward compatible support for loadUsersV1
• FR-12164 - Added support for MSP bulk user invitation
• FR-12479 - Fixed MSP warning dialog issue
• FR-12408 - Redesigned Entitlements structure

### NextJS Wrapper 7.0.15:
- FR-12629 - Support custom login with search params
# Change Log

## [7.0.14](https://github.com/frontegg/frontegg-nextjs/compare/v7.0.13...v7.0.14) (2023-6-30)

- MSP update visibility, bugfix
- Add security login flows

## [7.0.13](https://github.com/frontegg/frontegg-nextjs/compare/v7.0.12...v7.0.13) (2023-6-28)

- FR-12277 - Extended tenants state with the active tenant to support MSP sub-accounts
- FR-12405 - MSP bug fixes
- FR-12381 - Migrated users table to load users by users V2 API

### NextJS Wrapper 7.0.13:
- FR-12313 - Support tenants V3 and active tenant
- 
# Change Log

## [7.0.12](https://github.com/frontegg/frontegg-nextjs/compare/v7.0.11...v7.0.12) (2023-6-19)

- Added support to load cdn component with the new vite version
- Fix for new sso guide dark theme
- Fix for login per tenant embedded with sub domain logout route
- Create MSP all accounts main page


### NextJS Wrapper 7.0.12:
- Added a support to frontegg hooks inside custom components
- Fix frontegg middleware in NextJS 13.4 versions
- Fix headers for NodeJS +v18.1
  
# Change Log

## [7.0.11](https://github.com/frontegg/frontegg-nextjs/compare/v7.0.10...v7.0.11) (2023-6-6)

- Improve login preview for login per tenant self service to rendered inside iframe
- Added required to fields in invite user modal
- Improve error handling for login 
- Added MSP - all accounts main page and state

### NextJS Wrapper 7.0.11:
- Added support for null in custom component

# Change Log

## [7.0.10](https://github.com/frontegg/frontegg-nextjs/compare/v7.0.9...v7.0.10) (2023-5-28)

- Fixed hosted login with hash router
- Support login per tenant self service
- Added Cyprus phone area code 2 fa screen
- Added option to upload metadata file instead of metadata url


### NextJS Wrapper 7.0.10:
- Support react hooks inside custom components

# Change Log

## [7.0.9](https://github.com/frontegg/frontegg-nextjs/compare/v7.0.8...v7.0.9) (2023-5-12)

- FR-11442 - Removed admin portal provisioning feature flag
- FR-11723 - Fixed refresh token when computer clock is set to a future time
- FR-11735 - Added support for customizing login per tenant in the admin portal
- FR-11442 - Removed legacy SSO tab code
- FR-11718 - Fix users' table UI issues
- FR-11113 - Fixed Frontegg logo overlapping navigation
- FR-11442 - Extract the provisioning tab to a separated page in the admin portal
- FR-11617 - Fixed a11y enter key press issue
- FR-11352 - Added support for nested table
- [Snyk] Security upgrade @azure/storage-blob from 12.11.0 to 12.13.0

### NextJS Wrapper 7.0.9:
- FR-11632 - update CODEOWNERS
- 
# Change Log

## [7.0.8](https://github.com/frontegg/frontegg-nextjs/compare/v7.0.7...v7.0.8) (2023-5-4)

- FR-11581 - fix a11y login-box onEnter event for links
- FR-11353 - add new tree graph component

## [7.0.7](https://github.com/frontegg/frontegg-nextjs/compare/v7.0.6...v7.0.7) (2023-4-28)

- FR-11564 - Social login button shouldn't inherit from secondary color

## [7.0.6](https://github.com/frontegg/frontegg-nextjs/compare/v7.0.5...v7.0.6) (2023-4-27)

- Fixed passkeys issue with reCaptcha
- Removed feature flag from passkeys button
- Enable loading Frontegg helper scripts by providing query params to Frontegg external source
- Security upgrade webpack from 5.74.0 to 5.76.0

### NextJS Wrapper 7.0.6:
- FR-11538 - support-next-js-serach-param-for-login-per-tenant

## [7.0.5](https://github.com/frontegg/frontegg-nextjs/compare/v7.0.4...v7.0.5) (2023-4-27)

- Fixed input hover issue on suffix icon
- A11y improvements 
- Fixed Passkeys button style

## [7.0.4](https://github.com/frontegg/frontegg-nextjs/compare/v7.0.3...v7.0.4) (2023-4-23)
- Lock reduxjs/toolkit version to be compatible in Vite types plugin
- Fixed password input placeholder text in the login box
- Fixed social login buttons order
- Fix Vite js-sha256 warning
- Fixed company name error in split mode sign up
- Fixed phone number dropdown theming
- Added aria labels to buttons

### NextJS Wrapper 7.0.4:
- FR-11351 - preserve-query-params-for-login-per-tenant

## [7.0.3](https://github.com/frontegg/frontegg-nextjs/compare/v7.0.2...v7.0.3) (2023-4-3)

- Added support for SCIM groups
- Updated texts across login box - grammar and terminology
- Added impersonation indicator to show impersonator that they're in an impersonation session
- Added passkeys feature
- NextJS Wrapper 7.0.3:

### NextJS Wrapper 7.0.3:
- FR-11268 - Fix nextjs edge session check
- FR-11268 - build .env.test file in runtime with random values

## [7.0.2](https://github.com/frontegg/frontegg-nextjs/compare/v7.0.1...v7.0.2) (2023-3-29)

- FR-11247 - fix version branch 6.82

- FR-11065 - add passkeys mock ff
- FR-11189 - mfa authenticator app change input type
- FR-10821 - fix table color
- FR-11204 - add unit testing with jest
- FR-11139 - fix groups
- FR-11039 - fix groups dummy
- FR-11039 - ff groups
- FR-10530 - fix ff store name
- FR-11067 - error handling on profile image upload
- FR-11039 - extend users table with groups column

### NextJS Wrapper 7.0.2:
- FR-11268 - Fix nextjs edge session check
- FR-11268 - build .env.test file in runtime with random values
- FE-11268 - Add support for ForceMFA after SAML login

## [7.0.1](https://github.com/frontegg/frontegg-nextjs/compare/v7.0.0...v7.0.1) (2023-3-27)

- FR-11247 - fix version branch 6.82

- FR-11065 - add passkeys mock ff
- FR-11189 - mfa authenticator app change input type
- FR-10821 - fix table color
- FR-11204 - add unit testing with jest
- FR-11139 - fix groups
- FR-11039 - fix groups dummy
- FR-11039 - ff groups
- FR-10530 - fix ff store name
- FR-11067 - error handling on profile image upload
- FR-11039 - extend users table with groups column


## [7.0.0](https://github.com/frontegg/frontegg-nextjs/compare/v6.7.20...v7.0.0) (2023-3-16)

### Summary

In this release, we've introduced several breaking changes that might impact your existing code.
Please review the changes outlined below and update your code accordingly to ensure compatibility with the new version.

### Changes
- **Folder Hierarchy:** Separate files per runtime environment ( pages / edge / appDirectory)
    - `@frontegg/nextjs/pages` for **pages** architecture.
    - `@frontegg/nextjs/app` for **appDirectory** architecture.
    - `@frontegg/nextjs/edge` for **edge** runtime.
    - `@frontegg/nextjs/middleware` for **api middleware**.
- **Tree-Shaking:** Build package using babel.js with fully tree-shakable dist folder
- **Logger:** Add ability for print info logs for debugging. 
- **Improved Error handling:** Improve api middleware error handing. 
- **Node.js 18 Support:** Support the new Undici network handler.
- **Next.js 13.2 Support:** Next.js route handlers.
- **Tests:** Add e2e tests for the `FronteggApiMiddleware`. 


## Migrate from v6 to v7

- [Migrate api middleware (tree-shakable, externalResolver, responseLimit)](#frontegg-api-middleware-migration).
- [Edge middleware Migration (tree-shakable, stability)](#edge-middleware-migration)
- [Pages architecture (tree-shakable, share logic code between architectures)](#pages-architecture-migration)
- [AppDir architecture (tree-shakable, stability, support 13.2 routing)](#app-directory-architecture-migration)


### Frontegg API middleware migration
If you are using FronteggProviderNoSSR you can skip this migration:   
1. Rename imports to `@frontegg/nextjs/middleware`
2. export Next.JS config to mark as externalResolver and disable response limit.  

**API Middleware (before):**
```tsx 
export { fronteggMiddleware as default } from '@frontegg/nextjs';
```
**API Middleware (after):**
```tsx 
import { FronteggApiMiddleware } from '@frontegg/nextjs/middleware';

export default FronteggApiMiddleware;
export const config = {
  api: {
    externalResolver: true,
    // https://nextjs.org/docs/messages/api-routes-response-size-limit
    responseLimit: false,
  },
};
```
### Edge middleware migration

If you are using nextjs **edge** middleware, (Ex: `middleware.ts`):
1. Rename the imports to `@frontegg/nextjs/edge`.
2. Rename `getSession` to `getSessionOnEdge`.
3. Use `redirectToLogin` method instead of building login url.
   
    **API Middleware (before):**
    ```tsx 
    import { NextResponse } from 'next/server';
    import type { NextRequest } from 'next/server';
    import { getSession, shouldByPassMiddleware } from '@frontegg/nextjs/edge';
    
    export const middleware = async (request: NextRequest) => {
      const pathname = request.nextUrl.pathname;
    
      if (shouldByPassMiddleware(pathname /*, options: optional bypass configuration */)) {
        return NextResponse.next();
      }
    
      const session = await getSession(request);
      if (!session) {
        //  redirect unauthenticated user to /account/login page
        const loginUrl = `/account/login?redirectUrl=${encodeURIComponent(pathname)}`;
        return NextResponse.redirect(new URL(loginUrl, process.env['FRONTEGG_APP_URL']));
      }
    return NextResponse.next();
    };
    
    export const config = {
      matcher: '/(.*)',
    };
    ```
    **API Middleware (after):**
    ```tsx
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

### Pages architecture migration
1. Rename imports from `@frontegg/nextjs` to `@frontegg/nextjs/pages`.

    **Example (before):**
    ```tsx
    import { withFronteggApp } from '@frontegg/nextjs';
    ```
  
    **Example (after):**
    ```tsx
    import { withFronteggApp } from '@frontegg/nextjs/pages';
    ```
2. Import and then export `FronteggRouter` in your `pages/[...frontegg-router].tsx` file:

   **FronteggRouter (before):**
    ```tsx 
    export {
      FronteggRouter as default,
      FronteggRouterProps as getServerSideProps,
    } from '@frontegg/nextjs';
    ```
   **FronteggRouter (after):**
    ```tsx 
    import { FronteggRouter, FronteggRouterProps } from '@frontegg/nextjs/pages';

    export const getServerSideProps = FronteggRouterProps;
    export default FronteggRouter;
    ```

3. import getServerSideProps helpers from `@frontegg/nextjs/pages`:
    
   **Example Page (before):**
    ```tsx 
    import { GetServerSideProps } from 'next';
    import { getSession, withSSRSession } from '@frontegg/nextjs';
    
    export default function ExamplePage({ ssrSession }) {
      return  <div> My Example Page </div>;
    }
    
    export const getServerSideProps: GetServerSideProps = async (context) => {
      const session = await getSession(context.req);
      if (session) {
        // logged user
        return { props: { } };
      }
      // unauthorized user
      return { props: { } };
    };
    ```
    **Example Page (before):**
    ```tsx 
    import { GetServerSideProps } from 'next';
    import { getSession, withSSRSession } from '@frontegg/nextjs/pages';
    
    export default function ExamplePage({ ssrSession }) {
      return  <div> My Example Page </div>;
    }
    
    export const getServerSideProps: GetServerSideProps = async (context) => {
      const session = await getSession(context.req);
      
      // ...
    };
    ```
### App Directory architecture migration

1. Rename imports from `@frontegg/nextjs/server` to `@frontegg/nextjs/app`.
2. Move `FronteggAppProvider` to inside RootLayout's `<body>`:

    **RootLayout file (before):**
    ```tsx
    import { FronteggAppProvider } from '@frontegg/nextjs/server';

    export default function RootLayout({ children }: { children: React.ReactNode }) {
        const authOptions = {
          // keepSessionAlive: true // Uncomment this in order to maintain the session alive
        }
        return (
          <FronteggAppProvider authOptions={authOptions} hostedLoginBox={true}>
            <html>
              <head></head>
              <body>
                {children}
              </body>
            </html>
          </FronteggAppProvider>
        );
    }
    ```
   **RootLayout file (after):**
    ```tsx
    import { FronteggAppProvider } from '@frontegg/nextjs/app';

    export default function RootLayout({ children }: { children: React.ReactNode }) {
        const authOptions = {
          // keepSessionAlive: true // Uncomment this in order to maintain the session alive
        }
        return (
          <html>
            <head></head>
            <body>
                {/* @ts-expect-error Server Component for more details visit: https://github.com/vercel/next.js/issues/42292 */}
                <FronteggAppProvider authOptions={authOptions} hostedLoginBox={true}>
                    {children}
                </FronteggAppProvider>
            </body>
          </html>
        );
    }
    ```
3. Export FronteggAppRouter from `@frontegg/nextjs/app`, `app/[...frontegg-router]/page.tsx` file:

   **FronteggAppRouter (before):**
    ```tsx 
    export { FronteggAppRouter as default } from '@frontegg/nextjs/client';
    ```
   **FronteggAppRouter (after):**
    ```tsx 
    import { FronteggAppRouter } from '@frontegg/nextjs/app';

    export default FronteggAppRouter;
    ```

4. Rename `getSession` and `getUserTokens` to `getAppUserSession` and `getAppUserTokens`:

   **ServerComponent Example (before):**
    ```tsx
    import { getSession, getUserTokens } from '@frontegg/nextjs/app';

    export const ServerSession = async () => {
      const userSession = await getSession();
      const tokens = await getUserTokens();
      return (
        <div>
          <div>user session server side: {JSON.stringify(userSession)}</div>;
          <div>user tokens server side: {JSON.stringify(tokens)}</div>
        </div>
      );
    };
    ```
    
    **ServerComponent Example (after):**
    ```tsx
    import { getAppUserSession, getAppUserTokens } from '@frontegg/nextjs/app';

    export const ServerSession = async () => {
      const userSession = await getAppUserSession();
      const tokens = await getAppUserTokens();
      return (
        <div>
          <div>user session server side: {JSON.stringify(userSession)}</div>;
          <div>user tokens server side: {JSON.stringify(tokens)}</div>
        </div>
      );
    };
    ```

## Further Information
If you encounter any issues or have questions, please report them on our [Issues](https://github.com/frontegg/frontegg-nextjs/issues) page.

## [6.7.20](https://github.com/frontegg/frontegg-nextjs/compare/v6.7.19...v6.7.20) (2023-3-16)

- Fixed use permission regex issue to accept a wild card
- User groups design fixes
- Fixed passkeys loading mode and login flow with MFA
- Update dependencies between passkeys and MFA on the privacy page
- Added support to reset Idle session timeout by post messages from the client iFrame
- Added an option to enforce redirect URLs to the same site only to avoid security issues
- Added support for customized social login providers


## [6.7.19](https://github.com/frontegg/frontegg-nextjs/compare/v6.7.18...v6.7.19) (2023-3-10)

- Fixed resend OTC with reCaptcha
- Added  support to let tenants create a manage user groups in the admin portal under a FF
- Added support to login with passkeys and manage passkeys in the admin portal under a FF
- Fixed invite users issue when the vendor is not forcing roles and permissions
- Support auth strategy and social logins for login per tenants
- Refactored feature flag mechanism to be based on rest-api package
- Fixed validation for postcode in admin portal forms
- Fixed SMS code input to have input type number
- Improved auth screens form UX 


## [6.7.18](https://github.com/frontegg/frontegg-nextjs/compare/v6.7.17...v6.7.18) (2023-2-21)

- Fixed Admin portal SSO provider's options to be correlated with the vendor choice
- Fixed background for table pivot column
- Fixed impersonation by removing unnecessary redirects and adding a refresh call
- Fixed style reorder bug when using @emotion/react and Frontegg Next.JS

## [6.7.17](https://github.com/frontegg/frontegg-nextjs/compare/v6.7.16...v6.7.17) (2023-2-8)

- Updated M2M tokens to reflect the vendor choice

## [6.7.16](https://github.com/frontegg/frontegg-nextjs/compare/v6.7.15...v6.7.16) (2023-2-7)

- Fixed go-to-sign-up message position in speedy login layout
- Added an input component to the library for adding members to a tenant
- Fix filtering SSO providers according to the vendor selection
- Added user groups card header component to the library
- Improved the admin portal and login box performance and bundle size

## [6.7.15](https://github.com/frontegg/frontegg-nextjs/compare/v6.7.14...v6.7.15) (2023-2-6)


### NextJS Wrapper 6.7.15:
- FR-10557 - Fix logout bug, Fix errors in embedded
- FR-10557 - Improve NextJS navigation
- FR-10557 - update middleware example code, add option to check if should bypass middleware
- FR-10557 - Fix url for hosted login refresh token
- FR-10557 - Fix jose import JWK key
- FR-10557 - Fix social login embedded mode
- FR-10557 - Add playwright tests for FornteggMiddleware
- Bump http-cache-semantics from 4.1.0 to 4.1.1
- FR-10557 - Add playwright for testing + Fix cookie parsing

## [6.7.14](https://github.com/frontegg/frontegg-nextjs/compare/v6.7.13...v6.7.14) (2023-2-1)


### NextJS Wrapper 6.7.14:
- FR-10557 - Create proxy single request handler instead of handler per request

## [6.7.13](https://github.com/frontegg/frontegg-nextjs/compare/v6.7.12...v6.7.13) (2023-1-31)


### NextJS Wrapper 6.7.13:
- FR-10557 - Bypass session creation if bodyStr is empty

## [6.7.12](https://github.com/frontegg/frontegg-nextjs/compare/v6.7.11...v6.7.12) (2023-1-31)

- FR-10549 - fix error login with sms
- FR-10437 - select color
- FR-10518 - fix client id not show in model
- 

- FR-10485 - Update restapi version
- FR-10017 - add email type to all email inputs
- FR-10501 - Fix mobile width of login box
- FR-10196 - Fix scroll in privacy page
- FR-10489 - update scim ui
- FR-10483 - Added the option to customize forget password button
- FR-10374 - improve values ui in split mode
- FR-10184 - add access tokens
- FR-9995 - Accept Invitation text and icon change

### NextJS Wrapper 6.7.12:
- FR-10597 - Set default tenants state if not logged in
- FR-10584 - Set searchParam as optional in FronteggAppRouter
- FR-10557 - Improve FronteggMiddleware request handler

## [6.7.11](https://github.com/frontegg/frontegg-nextjs/compare/v6.7.10...v6.7.11) (2023-1-30)

- FR-10549 - fix error login with sms
- FR-10437 - select color
- FR-10518 - fix client id not show in model
- 

- FR-10485 - Update restapi version
- FR-10017 - add email type to all email inputs
- FR-10501 - Fix mobile width of login box
- FR-10196 - Fix scroll in privacy page
- FR-10489 - update scim ui
- FR-10483 - Added the option to customize forget password button
- FR-10374 - improve values ui in split mode
- FR-10184 - add access tokens
- FR-9995 - Accept Invitation text and icon change
- FR-10261 - fix sign up position in dark theme
- FR-10369 - change mfa ff name
- FR-10330 - fixes for bulk
- FR-9816 - Fix branch selection
- 

- FR-10112 - update admin box pipeline angular
- FR-10141 - update rest-api

- FR-9816 - fix version

### NextJS Wrapper 6.7.11:
- FR-10584 - Set searchParam as optional in FronteggAppRouter
- FR-10557 - Improve FronteggMiddleware request handler
- update frontegg manually
- FR-10379 - disable refresh token by default for ssr
- FR-10141 - Added support for logout on hosted login
- FR-10342 - update readme for app directory
- Bump json5 from 1.0.1 to 1.0.2
- Update Frontegg AdminPortal to 6.58.0

## [6.7.10](https://github.com/frontegg/frontegg-nextjs/compare/v6.7.9...v6.7.10) (2023-1-16)

- Added support for built-in authenticators, security keys, and SMS as MFA methods
- Fixed sign up position in dark theme
- Added margin to login error
- Disabled silent refresh token for SSR
- Added support for logout on hosted login
- Fixed session without keepSessionAlive


## [6.7.9](https://github.com/frontegg/frontegg-nextjs/compare/v6.7.8...v6.7.9) (2022-12-20)

- Added support for next 13 - app directory and server components
- Added support for tree shaking
- Added support for getSession on edge run time
- Update iron-session to decrease bundle size 


## [6.7.8](https://github.com/frontegg/frontegg-nextjs/compare/v6.7.7...v6.7.8) (2022-12-20)

- Fixed mfa input on mobile 
- Enabled scim without roles
- Fixed menu component for dark theme
- Added api navigation icon
- Added tests for mfa
- Added apple social login types
- Added support for Hiding Invoices


## [6.7.7](https://github.com/frontegg/frontegg-nextjs/compare/v6.7.6...v6.7.7) (2022-12-13)

- Fixed MFA flow issues
- Added support for subscriptions billing collection
- Fixed the issue of the OTC screen submit button is disabled on mobile devices
- Added SCIM section in admin portal under FF

## [6.7.6](https://github.com/frontegg/frontegg-nextjs/compare/v6.7.5...v6.7.6) (2022-12-12)
# v6.7.6
• Fixed ignoring urlPrefix issue
• Added the ability to Invite a user by bulk API in the admin portal
• Fixed OTC digits are not visible on mobile devices
• Added MFA devices management section in the admin portal under FF
• Fixed the ability to copy invite link for dynamic base URL as well
• Added new abilities to MFA flows under FF
• Added support for providing an external CDN to load fonts in Frontegg components
• Update hide fields API according to new security tabs naming
• Changed max length for secret fields to 100 characters
• Added support for customizing invite user dialog fields
• Fixed creating custom webhook on the Admin Portal is sent with the event ID and not with the event Key

### NextJS Wrapper 6.7.6:
- Improved SSR support for `withFronteggApp` function

## [6.7.5](https://github.com/frontegg/frontegg-nextjs/compare/v6.7.4...v6.7.5) (2022-11-28)

# v6.7.5
- Update hide fields API according to new security tabs naming
- Changed max length for secret fields to 100 characters
- Added support for customizing invite user dialog fields
- Added support for admin portal pre-defined theme options (dark, vivid, modern, and classic themes)
- Added support for customizing admin portal navigation hover color
- Fixed typo of Andorra country in countries dropdown
- Fixed select popup alignment issue
- Changed no local authentication feature to also hide the sign-up form when there is no local authentication option (use only social logins and SSO for signing up)
- Added mock for feature flags API for admin portal preview mode
- Fixed resend invitation and activate your account API calls
- Fixed creating custom webhook on the Admin Portal is sent with the event ID and not with the event Key
- Added support for customizing fields and tabs in the admin portal

### NextJS Wrapper 6.7.5:
- Updated next readme to include hosted login box integration

## [6.7.4](https://github.com/frontegg/frontegg-nextjs/compare/v6.7.3...v6.7.4) (2022-11-15)

- Fixed redirect to the app after signing up without forced email verification
- Fixed admin portal dark theme
- Added the ability to customize fields and tabs in the admin portal
- Fixed cleaning up error messages on sign up page when re-visiting the page
- Fixed resizing the login box when the logo is null
- Fix the ReCaptcha timeout issue

## [6.7.3](https://github.com/frontegg/frontegg-nextjs/compare/v6.7.2...v6.7.3) (2022-11-11)

- FR-9186 - support ssr with session and refresh token
- FR-9614 - Add support for innerThemeProvider for admin portal pages and tabs

- FR-9186 - fix pipeline
### AdminPortal 6.36.0:
- 

### AdminPortal 6.35.0:
- 
### AdminPortal 6.34.0:
- 

### NextJS Wrapper 6.7.3:
- FR-9544 - remove console logs
- FR-9544 - Add support for keep session a live
- FR-9187 - split cookie if exceeds length of 4096

## [6.7.2](https://github.com/frontegg/frontegg-nextjs/compare/v6.7.1...v6.7.2) (2022-10-26)

### AdminPortal 6.34.0:
- 

### NextJS Wrapper 6.7.2:
- FR-9186 - Fix Changelog
- FR-9186 - Generate changelog for pre-release / releases based on AdminPortal and LoginBox changes

