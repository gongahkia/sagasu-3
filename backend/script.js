const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false }); // set true for headless automation
  const page = await browser.newPage();

  // 1. Go to the target page
  await page.goto('https://www.smubondue.com/facility-booking-system-fbs', { waitUntil: 'networkidle' });

  // 2. Find the anchor and click it, then wait for navigation
  const smuFBSLink = await page.waitForSelector('a[aria-label="SMU FBS"]');
  const [newPageUrl] = await Promise.all([
    // Wait for the URL to change or any navigation to complete (update regex as needed)
    page.waitForURL(url => url !== 'https://www.smubondue.com/facility-booking-system-fbs', { timeout: 10000 }),
    smuFBSLink.click()
  ]);

  // Optionally: add a wait for DOM/content to settle
  await page.waitForLoadState('networkidle');

  // Screenshot after SMU FBS click
  await page.screenshot({ path: 'after_smu_fbs_click.png', fullPage: true });

  // 3. Find the input and enter email
  const placeholderInput = await page.waitForSelector('div.placeholderContainer input', { timeout: 10000 });
  await placeholderInput.fill('gabriel.ong.2023@scis.smu.edu.sg');

  // 4. Find and click the login button, wait for navigation
  const buttonInput = await page.waitForSelector('div.inline-block.button-item.ext-button-item input', { timeout: 10000 });
  await Promise.all([
    // Wait for URL to change. Adjust the regex if you know the expected pattern.
    page.waitForURL(url => url !== page.url(), { timeout: 10000 }),
    buttonInput.click()
  ]);
  await page.waitForLoadState('networkidle');

  // Screenshot after login click
  await page.screenshot({ path: 'after_login_click.png', fullPage: true });

  await browser.close();
})();
