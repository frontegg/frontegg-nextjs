# Change Log

## [6.7.6](https://github.com/frontegg/frontegg-nextjs/compare/v6.7.5...v6.7.6) (2022-12-12)

- FR-9969 - fix getBaseUrl never returns context prefix
- FR-9927 - fix validation invite with bulk
- FR-9914 - Move initial api calls to NextJS server-side before the first render
- FR-9887 - OTC digits are not visible on mobile devices
- FR-9860 - mfa devices management
- FR-9418 - invite email bulk
- FR-9852 - copy invite link fix
- FR-9858 - fix - appearance and settings should be optional for invite user customization
- FR-9852 - Support copy invite link for dynamic base URL as well (mainly for Next.js)
- FR-9742 - login with mfa
- FR-9520 - FR-9504 - fonts improvements
- FR-9750 - change api according to the new names security tabs
- FR-9717 - update rest api to have optional name in add user payload - and make sure to not send name if not exist
- FR-9826 - fix table header in dark theme
- FR-9237 - Max length for secret fields increased to 100 
- FR-9742 - enroll mfa list
- FR-9772 - Send NULL on profilePictureUrl rather than null
- FR-9717 - Invite user customize form API
- FR-9597 - Webhooks - missing validation error on UI when added not allowed URL

### NextJS Wrapper 6.7.6:
- FR-9891 - better support for SSR in withFrontegg
- FR-9844 - propagate customLoginBox param to admin box

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

