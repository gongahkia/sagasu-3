const { chromium } = require('playwright');
require('dotenv').config(); 

const EMAIL = process.env.SMU_EMAIL;
const PASSWORD = process.env.SMU_PASSWORD;

const url = "https://www.smubondue.com/facility-booking-system-fbs";

if (!EMAIL || !PASSWORD) {
  throw new Error('Missing SMU_EMAIL or SMU_PASSWORD in .env');
}

(async () => {

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Go to the initial site
  await page.goto(url, { waitUntil: 'networkidle' });
  console.log(`LOG: Navigating to ${url}`);

  // 2. Open Microsoft login in new tab
  const [newPage] = await Promise.all([
    context.waitForEvent('page', { timeout: 30000 }),
    page.click('a[aria-label="SMU FBS"]'),
  ]);

  // 3. Wait for Microsoft login URL to appear
  await newPage.waitForURL(/login\.microsoftonline\.com/, { timeout: 30000 });
  await newPage.waitForSelector('input[type="email"], #i0116', { timeout: 30000 });
  console.log(`LOG: Navigating to ${newPage.url()}`);

  // 4. Fill email and proceed
  let emailInput = await newPage.$('input[type="email"]') || await newPage.$('#i0116');
  if (!emailInput) throw new Error('Email input not found');
  await emailInput.fill(EMAIL);
  let nextButton = await newPage.$('input[type="submit"]') || await newPage.$('button[type="submit"]') || await newPage.$('#idSIButton9');
  if (!nextButton) throw new Error('Next button not found');
  await Promise.all([
    nextButton.click(),
    newPage.waitForLoadState('networkidle'),
  ]);
  console.log(`LOG: Filled in email ${EMAIL} and clicked next`);

  // 5. Wait for SMU redirect or click fallback
  let redirected = false;
  try {
    await newPage.waitForURL(/login2\.smu\.edu\.sg/, { timeout: 10000 });
    redirected = true; 
  } catch (e) {
    const redirectLink = await newPage.$('a#redirectTopLink');
    if (redirectLink) {
      console.log('Redirect took too long, clicking #redirectTopLink...');
      await Promise.all([
        redirectLink.click(),
      ]);
    } else {
      console.log('Redirect delay detected, but #redirectTopLink not found.');
    }
    await newPage.waitForURL(/login2\.smu\.edu\.sg/, { timeout: 30000 });
  }
  console.log(`LOG: Navigated to ${newPage.url()}`);

  // 6. Wait for password input, fill in password
  await newPage.waitForSelector('input#passwordInput', { timeout: 30000 });
  const passwordInput = await newPage.$('input#passwordInput');
  if (!passwordInput) throw new Error('Password input not found');
  await passwordInput.fill(PASSWORD);
  console.log(`LOG: Filled in password ${PASSWORD}`);

  // 7. Find and click the submit button
  await newPage.waitForSelector('div#submissionArea span#submitButton', { timeout: 30000 });
  const submitButton = await newPage.$('div#submissionArea span#submitButton');
  if (!submitButton) throw new Error('Submit button not found');
  await Promise.all([
    submitButton.click(),
    newPage.waitForLoadState('networkidle')
  ]);
  console.log(`LOG: Clicked submit button`);

  await newPage.screenshot({ path: 'after_smu_login2_login_debug.png', fullPage: true });
  console.log('LOG: Arrived at dashboard and saved screenshot');

  await newPage.pause(); // debug

  await browser.close();

})();