# Contributing to @frontegg/nextjs

Thank you for considering contributing to `@frontegg/nextjs`! We welcome all contributions, including bug fixes, feature requests, documentation improvements, and pull requests.

## Contributing Guidelines

- To report a bug or request a new feature, please [open an issue](https://github.com/frontegg/frontegg-nextjs/issues).
- Before submitting a pull request, please create an issue to discuss the proposed changes.
- All pull requests must be submitted with a clear and detailed description of the changes made.
- We encourage you to write tests for new code, and to ensure that all tests pass before submitting a pull request.
- Please keep your commits focused and concise, and ensure that your code changes do not affect existing functionality.
- When submitting a pull request, please provide an informative commit message that clearly and concisely describes the changes made.
- All contributions will be subject to review by the project maintainers before being merged.

## Environment variables
Setup the environment variable for demo projects:
- `/packages/demo-saas/.env.local`
- `/packages/demo-saas-next12/.env.local`

```bash
# The AppUrl is to tell Frontegg your application hostname
FRONTEGG_APP_URL='http://localhost:3000'

# The Frontegg domain is your unique URL to connect to the Frontegg gateway
FRONTEGG_BASE_URL='[YOUR_FRONTEGG_DOMAIN]'

# Your Frontegg application's Client ID
FRONTEGG_CLIENT_ID='b6adfe4c-d695-4c04-b95f-3ec9fd0c6cca'

# The stateless session encryption password, used to encrypt
# jwt before sending it to the client side.
#
# For quick password generation use the following command:
#    node -e "console.log(crypto.randomBytes(32).toString('hex'))"
FRONTEGG_ENCRYPTION_PASSWORD='7adec29c60414777b30814da94db2263d8db827cd8d59c68434225e661b17eba'

# The stateless session cookie name
FRONTEGG_COOKIE_NAME='fe_session'

# Library Log Level, use debug for more logs, warn for production
FRONTEGG_LOG_LEVEL='info'
```

## Development setup

- Make sure you have node and npm installed.
- Run `yarn install` to install dependencies.
- `yarn build`: Build `@frontegg/nextjs` for production.
- `yarn dev`: Build and watch `@frontegg/nextjs` for development.
- `yarn test`: Run the unit tests using `@playwright/test`.
- `yarn test-middleware`: Run the middleware performance tests using `@playwright/test`.
- `yarn prettier`: Run code prettify script before commit changes.
- `yarn demo`: Run demo project on `localhost:3000` using Next.js version 13+
- `yarn demo12`: Run demo project on `localhost:3000` using Next.js version 12+

## Getting Started

To get started contributing, please fork the repository and clone it to your local machine. Then, create a new branch for your changes:

```shell
git checkout -b my-feature-branch
```

Make your changes, write tests (if applicable), and ensure that all tests pass:

```shell
yarn test
```

Run Demo application using by:

```shell
yarn demo # for Next.js 13+

yarn demo12 # for Next.js 12+
```


When you're ready to submit your changes, run prettier:

```shell
yarn prettier
```

Then, push your branch to your fork:

```shell
git push origin my-feature-branch
```


Then, create a new pull request from your fork to the main repository. Please provide a clear and concise description of the changes made in your pull request.

If your pull request is accepted, it will be merged into the main repository and your changes will be included in the next release.


