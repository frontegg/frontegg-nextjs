# Change Log

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

