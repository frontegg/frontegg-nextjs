# Change Log

## [6.7.5](https://github.com/frontegg/frontegg-nextjs/compare/v6.7.4...v6.7.5) (2022-11-28)

- FR-9750 - change api according to the new names security tabs
- FR-9717 - update rest api to have optional name in add user payload - and make sure to not send name if not exist
- FR-9826 - fix table header in dark theme
- FR-9237 - Max length for secret fields increased to 100 
- FR-9742 - enroll mfa list
- FR-9772 - Send NULL on profilePictureUrl rather than null
- FR-9717 - Invite user customize form API
- FR-9597 - Webhooks - missing validation error on UI when added not allowed URL
- FR-9792 - fix theme chunk
- FR-9784 - pass merged palette to themes json
- FR-9777 - add option to color hover in navigation
- FR-9235 - Fix AndorrA typo in country dropdown
- FR-9725 - fix select popup
- FR-9771 - refactor toggle button
- FR-9749 - fix big titles on speedy login thumb nail mode
- FR-9730 - select tree for dark theme
- FR-9721 - add possibilities to security tabs for dark theme
- FR-9696 - fix responsiveness on builder preview
- FR-8402 - Hide sign up form when there is not local authentication same as we do in the login flow
- FR-9652 - mock flags
- FR-9667 - fix copy of restrictions
- FR-9677 - add slack provider to social login types
- FR-8849 - Resend invite and activate your account calls fix
- FR-9260 - Creating Custom webhook on the Admin Portal is sent with the evnetId and not with the eventKey

- FR-9665 - Support logout from hosted login in vanilla.js via app instance
- FR-9662 - pagination in dark them

### NextJS Wrapper 6.7.5:
- FR-9729 - update next readme to include hosted login box true

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

