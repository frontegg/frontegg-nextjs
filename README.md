
![alt text](./logo.png)

Frontegg is a web platform where SaaS companies can set up their fully managed, scalable and brand aware - SaaS features
and integrate them into their SaaS portals in up to 5 lines of code.

## Table of Contents

- [Installation](#installation)
    - [Create new NextJs project](#new-project)
    - [Add to your existing project](#existing-project)
- [Getting Started](#getting-started)
    - [Create Frontegg worksapce](#create-workspace)
    - [Setup environment](#setup-environment)
    - [Setup environment](#setup-environment)



## Installation

### Create new NextJs project

To start a new Create Next App project with TypeScript, you can run:

```bash
  npx create-next-app --example https://github.com/frontegg/frontegg-nextjs --example-path apps/example my-nextjs-app-name 
```
or
```bash
  yarn create next-app --example https://github.com/frontegg/frontegg-nextjs --example-path apps/example my-nextjs-app-name
```

> If you've previously installed `create-react-app` globally via `npm install -g create-next-app`, we recommend you uninstall the package using `npm uninstall -g create-next-app` or `yarn global remove create-next-app` to ensure that `npx` always uses the latest version.
>
> Global installations of `create-next-app` are no longer supported.


### Add to your existing project

To Add Frontegg to your existing Nextjs project, follow below steps:

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
   
    import { withFronteggApp } from '@frontegg/nextjs';
    
    function CustomApp({Component, pageProps}: AppProps){
      return <Component {...pageProps}/>
    }

    export default withFronteggApp(CustomApp);
   ```

3. Create files for frontegg middleware under `./pages/api/frontegg/[...middleware].ts`:
   ```tsx
    // ./pages/api/frontegg/[...middleware].ts
    
    export { fronteggMiddleware as default } from '@frontegg/nextjs';
   ```

4. Create placeholder pages for frontegg router under `./pages/account/[...frontegg-router].tsx`:
   ```tsx
    // ./pages/account/[...frontegg-router].tsx
    
    export { fronteggRouter as default } from '@frontegg/nextjs';
   ```

