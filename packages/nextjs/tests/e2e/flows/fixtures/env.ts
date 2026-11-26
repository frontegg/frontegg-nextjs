/** Fixed ports and IDs for the server-side flow suite (playwright.flows.config.ts). */
const MOCK_PORT = 4010;
const EMBEDDED_PORT = 3100;
const HOSTED_PORT = 3101;
const PAGES_PORT = 3102;

export const FLOWS = Object.freeze({
  clientId: 'e2e00000-0000-4000-8000-000000000001',
  mockPort: MOCK_PORT,
  mockBaseUrl: `http://localhost:${MOCK_PORT}`,
  embeddedPort: EMBEDDED_PORT,
  embeddedAppUrl: `http://localhost:${EMBEDDED_PORT}`,
  hostedPort: HOSTED_PORT,
  hostedAppUrl: `http://localhost:${HOSTED_PORT}`,
  pagesPort: PAGES_PORT,
  pagesAppUrl: `http://localhost:${PAGES_PORT}`,
});
