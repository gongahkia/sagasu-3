const { chromium } = require('playwright');
const fs = require('fs');
require('dotenv').config();

//
// --- HELPER FUNCTIONS ---
//

function requireEnv(key) {
  if (!process.env[key]) throw new Error(`Missing ${key} in .env`);
  return process.env[key];
}

//
// --- CONFIGURATION ---
//

const EMAIL = requireEnv('SMU_EMAIL');
const PASSWORD = requireEnv('SMU_PASSWORD');
const SCRAPE_CONFIG = {
  date: requireEnv('SCRAPE_DATE'),
  startTime: requireEnv('SCRAPE_START_TIME'),
  endTime: requireEnv('SCRAPE_END_TIME'),
  roomCapacity: requireEnv('SCRAPE_ROOM_CAPACITY'),
  buildingNames: requireEnv('SCRAPE_BUILDING_NAMES')
    ? requireEnv('SCRAPE_BUILDING_NAMES').split(',').map(s => s.trim())
    : [],
  floorNames: requireEnv('SCRAPE_FLOOR_NAMES')
    ? requireEnv('SCRAPE_FLOOR_NAMES').split(',').map(s => s.trim())
    : [],
  facilityTypes: requireEnv('SCRAPE_FACILITY_TYPES')
    ? requireEnv('SCRAPE_FACILITY_TYPES').split(',').map(s => s.trim())
    : [],
  equipment: requireEnv('SCRAPE_EQUIPMENT')
    ? requireEnv('SCRAPE_EQUIPMENT').split(',').map(s => s.trim())
    : [],
}

const url = "https://www.smubondue.com/facility-booking-system-fbs";
const screenshotDir = './screenshot_log/';
const outputLog = './booking_log/scraped_log.json';

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

  // 3. Wait for and set the date picker
  await frameContent.waitForSelector('input#DateBookingFrom_c1_textDate', { timeout: 20000 });
  await frameContent.click('input#DateBookingFrom_c1_textDate');
  const desiredDate = SCRAPE_CONFIG.date;
  for(let tries = 0; tries < 20; tries++) { 
    const currentDate = await frameContent.$eval(
      'input#DateBookingFrom_c1_textDate',
      el => el.value
    );
    if (currentDate === desiredDate) {
      console.log(`LOG: Date picker set to desired date: ${currentDate}`);
      break;
    }
    console.log(`LOG: Date is ${currentDate} and desired date is ${desiredDate}. Clicking next to try to reach ${desiredDate}`);
    await frameContent.click('a#BtnDpcNext');
    await frameContent.waitForTimeout(500);
  }
  const finalDate = await frameContent.$eval(
    'input#DateBookingFrom_c1_textDate',
    el => el.value
  );
  if (finalDate !== desiredDate) {
    throw new Error(`ERROR: Could not reach desired date "${desiredDate}". Final date was: "${finalDate}"`);
  }
  await fbsPage.screenshot({ path: `${screenshotDir}/date_picker_debug.png`, fullPage: true });

  // 4. Set start and end time dropdowns
  await frameContent.selectOption('select#TimeFrom_c1_ctl04', SCRAPE_CONFIG.startTime);
  await frameContent.selectOption('select#TimeTo_c1_ctl04', SCRAPE_CONFIG.endTime);
  console.log(`LOG: Set start and end time dropdowns to ${SCRAPE_CONFIG.startTime} and ${SCRAPE_CONFIG.endTime}`);
  await fbsPage.screenshot({ path: `${screenshotDir}/timeslots_debug.png`, fullPage: true });

  await frameContent.waitForTimeout(3000); 
  console.log(`LOG: Forcing a timeout of 3000ms to allow the page to update`);

  // 5. Set building(s)
  if (SCRAPE_CONFIG.buildingNames?.length) {
    await frameContent.locator('#DropMultiBuildingList_c1_textItem').click();
    for (const building of SCRAPE_CONFIG.buildingNames) {
      await frameContent.locator(`text="${building}"`).click();
    }
    const okButtonBuildingContainer = frameContent.locator('#DropMultiBuildingList_c1_panelContainer input[type="button"][value="OK"]');
    await okButtonBuildingContainer.waitFor({ state: 'visible', timeout: 5000 });
    if (await okButtonBuildingContainer.count() > 0) {
      await okButtonBuildingContainer.click();
      console.log('LOG: Clicked OK button in building selection');
    } else {
      console.warn('ERROR: OK button not found in building selection, fallback to pressing Escape');
      await fbsPage.keyboard.press('Escape');
    }
  }
  console.log(`LOG: Set building(s) to ${SCRAPE_CONFIG.buildingNames}`);
  await fbsPage.screenshot({ path: `${screenshotDir}/building_selection_debug.png`, fullPage: true });

  await frameContent.waitForTimeout(3000); 
  console.log(`LOG: Forcing a timeout of 3000ms to allow the page to update`);

  // 6. Set floor(s)
  if (SCRAPE_CONFIG.floorNames?.length) {
    await frameContent.locator('#DropMultiFloorList_c1_textItem').click();
    for (const floor of SCRAPE_CONFIG.floorNames) {
      await frameContent.locator(`text="${floor}"`).click();
    }
    const okButtonFloorContainer = await frameContent.locator('#DropMultiFloorList_c1_panelContainer input[type="button"][value="OK"]');
    if (await okButtonFloorContainer.count() > 0) {
      await okButtonFloorContainer.click();
      console.log('LOG: Clicked OK button in floor selection');
    } else {
      console.warn('ERROR: OK button not found in floor selection, fallback to pressing Escape');
      await fbsPage.keyboard.press('Escape');
    }
  }
  console.log(`LOG: Set floor(s) to ${SCRAPE_CONFIG.floorNames}`);
  await fbsPage.screenshot({ path: `${screenshotDir}/floor_selection_debug.png`, fullPage: true });

  await frameContent.waitForTimeout(3000); 
  console.log(`LOG: Forcing a timeout of 3000ms to allow the page to update`);

  // 7. Set facility type(s)
  if (SCRAPE_CONFIG.facilityTypes?.length) {
    await frameContent.locator('#DropMultiFacilityTypeList_c1_textItem').click();
    for (const facType of SCRAPE_CONFIG.facilityTypes) {
      await frameContent.locator(`text="${facType}"`).click();
    }
    const okButtonFacilityContainer = await frameContent.locator('#DropMultiFacilityTypeList_c1_panelContainer input[type="button"][value="OK"]');
    if (await okButtonFacilityContainer.count() > 0) {
      await okButtonFacilityContainer.click();
      console.log('LOG: Clicked OK button in facility type selection');
    } else {
      console.warn('ERROR: OK button not found in facility type selection, fallback to pressing Escape');
      await fbsPage.keyboard.press('Escape');
    }
  }
  console.log(`LOG: Set facility type(s) to ${SCRAPE_CONFIG.facilityTypes}`);
  await fbsPage.screenshot({ path: `${screenshotDir}/facility_type_selection_debug.png`, fullPage: true });

  await frameContent.waitForTimeout(3000); 
  console.log(`LOG: Forcing a timeout of 3000ms to allow the page to update`);

  // 8. Set room capacity
  await frameContent.locator('select#DropCapacity_c1').selectOption({ value: SCRAPE_CONFIG.roomCapacity });
  console.log(`LOG: Set room capacity to ${SCRAPE_CONFIG.roomCapacity}`);
  await fbsPage.screenshot({ path: `${screenshotDir}/room_capacity_selection_debug.png`, fullPage: true });

  await frameContent.waitForTimeout(3000); 
  console.log(`LOG: Forcing a timeout of 3000ms to allow the page to update`);

  // 9. Set equipment (optional)
  if (SCRAPE_CONFIG.equipment?.length) {
    await frameContent.locator('#DropMultiEquipmentList_c1_textItem').click();
    for (const eq of SCRAPE_CONFIG.equipment) {
      await frameContent.locator(`text="${eq}"`).click();
    }
    const okButtonEquipmentContainer= await frameContent.locator('#DropMultiEquipmentList_c1_panelContainer input[type="button"][value="OK"]');
    if (await okButtonEquipmentContainer.count() > 0) {
      await okButtonEquipmentContainer.click();
      console.log('LOG: Clicked OK button in equipment selection');
    } else {
      console.warn('ERROR: OK button not found in equipment selection, fallback to pressing Escape');
      await fbsPage.keyboard.press('Escape');
    }
  }
  console.log(`LOG: Set equipment to ${SCRAPE_CONFIG.equipment}`);
  await fbsPage.screenshot({ path: `${screenshotDir}/equipment_selection_debug.png`, fullPage: true });

  await frameContent.waitForTimeout(3000); 
  console.log(`LOG: Forcing a timeout of 3000ms to allow the page to update`);

  // 10. Click "Check Availability" and navigate to results page
  await frameContent.locator('a#CheckAvailability').click();
  await fbsPage.waitForLoadState('networkidle');
  console.log(`LOG: Clicked "Check Availability and navigated to results page`);
  await fbsPage.screenshot({ path: `${screenshotDir}/timeslots_debug.png`, fullPage: true });

  await frameContent.waitForTimeout(7000); 
  fbsPage.pause(); // debug pause

  // --- FUA continue editing from below here

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