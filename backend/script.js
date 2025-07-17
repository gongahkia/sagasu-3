const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false }); // for debugging
//   const browser = await chromium.launch({ headless: true }); 
  const page = await browser.newPage();
  await page.goto('https://www.smubondue.com/facility-booking-system-fbs', { waitUntil: 'networkidle' });
  const smuFBSLink = await page.waitForSelector('a[aria-label="SMU FBS"]');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    smuFBSLink.click()
  ]);
  await page.screenshot({ path: 'after_smu_fbs_click.png', fullPage: true });
  const placeholderInput = await page.waitForSelector('div.placeholderContainer input');
  await placeholderInput.fill('gabriel.ong.2023@scis.smu.edu.sg');
  const buttonInput = await page.waitForSelector('div.inline-block.button-item.ext-button-item input');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    buttonInput.click()
  ]);
  await page.screenshot({ path: 'after_login_click.png', fullPage: true });
  await browser.close();
})();