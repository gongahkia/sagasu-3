const { chromium } = require('playwright');
const fs = require('fs');
require('dotenv').config();

//
// --- CONFIGURATION ---
//

const EMAIL = process.env.SMU_EMAIL;
const PASSWORD = process.env.SMU_PASSWORD;

if (!EMAIL || !PASSWORD)
  throw new Error('ERROR: Missing SMU_EMAIL or SMU_PASSWORD in .env');

const url = "https://www.smubondue.com/facility-booking-system-fbs";
const screenshotDir = './screenshot_log/';
const outputLog = './booking_log/scraped_log.json';

const SCRAPE_CONFIG = {
  date: '25-Jul-2025', 
  startTime: '12:00',   
  endTime: '16:00',     
  roomCapacity: 'From6To10Pax',
  buildingNames: ['School of Accountancy'],
  floorNames: ['Level 1', 'Level 2', 'Level 3'],
  facilityTypes: ['Group Study Room'],
  equipment: ['Projector']
};

//
// --- MAIN SCRIPT ---
//

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
  if (!emailInput) throw new Error('ERROR: Email input not found');
  await emailInput.fill(EMAIL);
  let nextButton = await newPage.$('input[type="submit"]') || await newPage.$('button[type="submit"]') || await newPage.$('#idSIButton9');
  if (!nextButton) throw new Error('ERROR: Next button not found');
  await Promise.all([
    nextButton.click(),
    newPage.waitForLoadState('networkidle'),
  ]);
  console.log(`LOG: Filled in email ${EMAIL} and clicked next`);

  // 5. Wait for SMU redirect or click fallback
  try {
    await newPage.waitForURL(/login2\.smu\.edu\.sg/, { timeout: 10000 });
    console.log('LOG: Redirected to SMU SSO');
  } catch (e) {
    const redirectLink = await newPage.$('a#redirectToIdpLink');
    if (redirectLink) {
      console.log('Redirect took too long, clicking #redirectToIdpLink...');
      await Promise.all([
        redirectLink.click(),
      ]);
    } else {
      console.log('Redirect delay detected, but #redirectToIdpLink not found.');
    }
    await newPage.waitForURL(/login2\.smu\.edu\.sg/, { timeout: 30000 });
  }
  console.log(`LOG: Navigated to ${newPage.url()}`);

  // 6. Wait for password input, fill in password
  await newPage.waitForSelector('input#passwordInput', { timeout: 30000 });
  const passwordInput = await newPage.$('input#passwordInput');
  if (!passwordInput) throw new Error('ERROR: Password input not found');
  await passwordInput.fill(PASSWORD);
  console.log(`LOG: Filled in password`);

  // 7. Find and click the submit button
  await newPage.waitForSelector('div#submissionArea span#submitButton', { timeout: 30000 });
  const submitButton = await newPage.$('div#submissionArea span#submitButton');
  if (!submitButton) throw new Error('ERROR: Submit button not found');
  await Promise.all([
    submitButton.click(),
    newPage.waitForLoadState('networkidle')
  ]);
  console.log(`LOG: Clicked submit button`);

  // 8. Wait for dashboard and validate correct site
  await newPage.waitForURL(/https:\/\/fbs\.intranet\.smu\.edu\.sg\//, { timeout: 30000 });

  const finalUrl = newPage.url();
  const fbsPage = newPage;
  fs.mkdirSync(screenshotDir, { recursive: true });
  await fbsPage.screenshot({ path: `${screenshotDir}/after_smu_login2_login_debug.png`, fullPage: true });
  console.log(`LOG: Arrived at dashboard at url ${finalUrl} and saved screenshot`);

  // ---- SCRAPING & FILTERING ---- //

  // 1. Switch to core frame
  await fbsPage.waitForSelector('iframe#frameBottom', { timeout: 20000 });
  const frameBottomElement = await fbsPage.$('iframe#frameBottom');
  if (!frameBottomElement) throw new Error('iframe#frameBottom not found');
  const frameBottom = await frameBottomElement.contentFrame();
  if (!frameBottom) throw new Error('Frame object for frameBottom not available');
  console.log(`LOG: Content frame bottom loaded`);

  // 2. Switch to core content frame
  await frameBottom.waitForSelector('iframe#frameContent', { timeout: 20000 });
  const frameContentElement = await frameBottom.$('iframe#frameContent');
  if (!frameContentElement) throw new Error('iframe#frameContent not found inside frameBottom');
  const frameContent = await frameContentElement.contentFrame();
  if (!frameContent) throw new Error('Frame object for frameContent not available');
  console.log(`LOG: Core content frame loaded`);

  // --- FUA continue editing from below here

  // 3. Wait for and set the date picker
  await frame.locator('input#DateBookingFrom_c1_textDate').waitFor({ timeout: 20000 });
  await frame.locator('input#DateBookingFrom_c1_textDate').fill(SCRAPE_CONFIG.date);

  // 4. Set start and end time dropdowns
  await frame.locator('select#TimeFrom_c1_ctl04').selectOption({ value: SCRAPE_CONFIG.startTime });
  await frame.locator('select#TimeTo_c1_ctl04').selectOption({ value: SCRAPE_CONFIG.endTime });

  // 5. Set building(s)
  if (SCRAPE_CONFIG.buildingNames?.length) {
    await frame.locator('#DropMultiBuildingList_c1_textItem').click();
    for (const building of SCRAPE_CONFIG.buildingNames) {
      await frame.locator(`text="${building}"`).click();
    }
    await fbsPage.keyboard.press('Escape');
  }

  // 6. Set floor(s)
  if (SCRAPE_CONFIG.floorNames?.length) {
    await frame.locator('#DropMultiFloorList_c1_textItem').click();
    for (const floor of SCRAPE_CONFIG.floorNames) {
      await frame.locator(`text="${floor}"`).click();
    }
    await fbsPage.keyboard.press('Escape');
  }

  // 7. Set facility type(s)
  if (SCRAPE_CONFIG.facilityTypes?.length) {
    await frame.locator('#DropMultiFacilityTypeList_c1_textItem').click();
    for (const facType of SCRAPE_CONFIG.facilityTypes) {
      await frame.locator(`text="${facType}"`).click();
    }
    await fbsPage.keyboard.press('Escape');
  }

  // 8. Set room capacity
  await frame.locator('select#DropCapacity_c1').selectOption({ value: SCRAPE_CONFIG.roomCapacity });

  // 9. Set equipment (optional)
  if (SCRAPE_CONFIG.equipment?.length) {
    await frame.locator('#DropMultiEquipmentList_c1_textItem').click();
    for (const eq of SCRAPE_CONFIG.equipment) {
      await frame.locator(`text="${eq}"`).click();
    }
    await fbsPage.keyboard.press('Escape');
  }

  // 10. Click "Check Availability"
  await frame.locator('a#CheckAvailability').click();
  await fbsPage.waitForLoadState('networkidle');

  // 11. Screenshot results table
  await fbsPage.screenshot({ path: `${screenshotDir}/timeslots.png`, fullPage: true });

  // 12. Scrape table results (room and timeslot booking state)
  await frame.locator('table#GridResults_gv').waitFor({ timeout: 20000 });
  const rooms = await frame.locator('table#GridResults_gv tbody tr').all();

  let matchingRooms = [];
  for (const row of rooms) {
    const tds = await row.locator('td').all();
    if (tds.length > 1) {
      const roomName = (await tds[1].innerText()).trim();
      matchingRooms.push(roomName);
    }
  }
  if (matchingRooms.length === 0) {
    console.log('No rooms found.');
    await browser.close();
    return;
  }
  console.log(`Matched rooms:`, matchingRooms);

  // 13. Scrape time slots (custom demo: print title popovers)
  const availableTimeslots = await frame.locator('div.scheduler_bluewhite_event.scheduler_bluewhite_event_line0').all();
  let bookings = [];
  for (const slotDiv of availableTimeslots) {
    const timeslotInfo = await slotDiv.getAttribute('title');
    bookings.push(timeslotInfo);
  }
  bookings = bookings.filter(Boolean);
  console.log('Raw timeslot titles:', bookings);

  // 14. Write to log
  const logData = {
    date: SCRAPE_CONFIG.date,
    start_time: SCRAPE_CONFIG.startTime,
    end_time: SCRAPE_CONFIG.endTime,
    building_names: SCRAPE_CONFIG.buildingNames,
    floor_names: SCRAPE_CONFIG.floorNames,
    facility_types: SCRAPE_CONFIG.facilityTypes,
    equipment: SCRAPE_CONFIG.equipment,
    matched_rooms: matchingRooms,
    timeslots_raw: bookings,
    timestamp: (new Date()).toISOString(),
  };
  fs.mkdirSync(screenshotDir, { recursive: true });
  fs.mkdirSync(outputLog.substring(0, outputLog.lastIndexOf('/')), { recursive: true });
  fs.writeFileSync(outputLog, JSON.stringify(logData, null, 2));
  console.log('✅ Scraping complete. Data written to:', outputLog);

  await fbsPage.pause(); // Pause for manual inspection; remove/comment for automation
  await browser.close();

})();