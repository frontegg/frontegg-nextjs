import { test, Page, expect } from '@playwright/test';

const LUNCH_BROWSERS = 2;
const PAGES_PER_BROWSER = 5;
const CALL_PER_PAGE = 5;
let visibleIds: string[] = [];

const COUNT = LUNCH_BROWSERS * PAGES_PER_BROWSER * CALL_PER_PAGE;
let percentage = 0;
const delay = (timeout = 2000) => new Promise((resolve) => setTimeout(resolve, timeout));
test('MiddlewareTest | run app with multiple browsers', async ({ browser }) => {
  const browserCounter = Array.from(Array(LUNCH_BROWSERS).keys());
  const pageCounter = Array.from(Array(PAGES_PER_BROWSER).keys());
  const pagesPerBrowser: Record<string, Page[]> = {};

  // Create isolated browser contexts
  const browsers = await Promise.all(
    browserCounter.map(async (index) => {
      const userAgent = `browser-${index}`;
      pagesPerBrowser[userAgent] = [];
      return browser.newContext({ userAgent: `browser-${index}` });
    })
  );

  // Create pages for each browser
  await Promise.all(
    browsers.map(async (browser, index) => {
      const userAgent = `browser-${index}`;
      const browserPages = await Promise.all(pageCounter.map(async () => browser.newPage()));
      pagesPerBrowser[userAgent] = browserPages;
    })
  );

  console.log(`created (${Object.keys(pagesPerBrowser).length}) browsers with (${PAGES_PER_BROWSER}) per browser`);

  let startTime = Date.now();
  await Promise.all(
    Object.keys(pagesPerBrowser).map(async (userAgent) => {
      const browserPages = pagesPerBrowser[userAgent];
      console.log(`START test on ${userAgent} for (${browserPages.length}) pages`);
      await Promise.all(browserPages.map(async (page) => runStressRefreshTokenOnPages(userAgent, page)));
      console.log(`FINISH test on ${userAgent} for (${browserPages.length}) pages`);
    })
  );
  console.log('Api calls count:', visibleIds.length);
  await expect(visibleIds.length).toBe(LUNCH_BROWSERS * PAGES_PER_BROWSER * CALL_PER_PAGE);
  const duration = Date.now() - startTime;
  console.log('Duration: ', `${duration / 1000} sec`);

  const avgSimReq = (visibleIds.length * 300) / duration;
  console.log('Middleware avg simultaneously request: ~', avgSimReq.toFixed(0));

  await expect(avgSimReq).toBeGreaterThan(1);
});

async function runStressRefreshTokenOnPages(userAgent: string, page: Page) {
  await page.goto('http://localhost:3000');

  const button = await page.getByTestId('test-middleware-button');
  const userAgentValue = await page.getByTestId('test-middleware-useragent');
  const idValue = await page.getByTestId('test-middleware-id');
  let lastValue = '';
  for (let i = 1; i <= CALL_PER_PAGE; i++) {
    await button.click();
    await expect(await userAgentValue).toHaveValue(userAgent, { timeout: 10000 });
    await expect(await idValue).not.toHaveValue(lastValue, { timeout: 10000 });
    lastValue = await idValue.inputValue();
    await expect(visibleIds).not.toContain(lastValue);
    visibleIds.push(lastValue);

    let newPercentage = (visibleIds.length / COUNT) * 100;
    if (newPercentage > percentage + 5) {
      percentage = newPercentage;
      console.log(`${newPercentage.toFixed(0)}%`);
    }
    await delay(100);
  }
}
