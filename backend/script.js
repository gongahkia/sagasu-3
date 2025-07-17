const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Go to the initial site
  await page.goto('https://www.smubondue.com/facility-booking-system-fbs', { waitUntil: 'networkidle' });

  // 2. Prepare to watch for the new tab (Microsoft login)
  const [newPage] = await Promise.all([
    context.waitForEvent('page', { timeout: 30000 }), // Wait up to 30s for popup
    page.click('a[aria-label="SMU FBS"]'),
  ]);

  // 3. Wait for the Microsoft login URL to load
  await newPage.waitForURL(/login\.microsoftonline\.com/, { timeout: 30000 });

  // (Optional, but recommended): wait explicitly for the Microsoft email input field (very robust!)
  await newPage.waitForSelector('input[type="email"], #i0116', { timeout: 30000 });

  // 4. Screenshot after the SSO login page is fully ready
  await newPage.screenshot({ path: 'after_smu_fbs_click.png', fullPage: true });

  // 5. Fill in the Microsoft login email (try both possible selectors)
  // Try input[type="email"]
  let emailInput = await newPage.$('input[type="email"]');
  if (!emailInput) {
    // Try alternate Microsoft selector
    emailInput = await newPage.$('#i0116');
  }
  if (!emailInput) {
    throw new Error('Email input not found on Microsoft login page');
  }
  await emailInput.fill('gabriel.ong.2023@scis.smu.edu.sg');

  // 6. Click the "Next" or login button, wait for redirect (adjust selector as needed)
  let nextButton = await newPage.$('input[type="submit"], button[type="submit"]');
  if (!nextButton) {
    // Try another possible Microsoft selector
    nextButton = await newPage.$('#idSIButton9');
  }
  if (!nextButton) {
    throw new Error('Login/Next button not found on Microsoft login page');
  }
  await Promise.all([
    newPage.waitForNavigation({ waitUntil: 'load', timeout: 30000 }).catch(() => {}), // Optional, may fail on AJAX
    newPage.waitForLoadState('networkidle'),
    nextButton.click()
  ]);

  // 7. Final screenshot after login attempt
  await newPage.screenshot({ path: 'after_login_click.png', fullPage: true });
  await newPage.pause();
  

  await browser.close();
})();
