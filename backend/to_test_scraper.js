const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = {
  storageState: './state.json', // Must be generated during your login automation
  targetUrl: 'https://fbs.intranet.smu.edu.sg/home',
  date: '18-Jul-2025', // DD-MMM-YYYY
  startTime: '12:00',   // HH:MM in 24h
  endTime: '16:00',     // HH:MM in 24h
  roomCapacity: 'From6To10Pax',
  buildingNames: ['School of Accountancy'],
  floorNames: ['Level 5'],
  facilityTypes: ['Group Study Room'],
  equipment: ['Projector'],
  screenshotDir: './screenshot_log/',
  outputLog: './booking_log/scraped_log.json'
};

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    storageState: CONFIG.storageState,
  });
  const page = await context.newPage();

  // 1. Go to the FBS system
  await page.goto(CONFIG.targetUrl, { waitUntil: 'networkidle' });

  // 2. Wait for content frame to load
  const frame = await page.frameLocator('iframe[name="frameContent"]');

  // 3. Wait for and set the date picker
  await frame.locator('input#DateBookingFrom_c1_textDate').waitFor({ timeout: 20000 });
  await frame.locator('input#DateBookingFrom_c1_textDate').fill(CONFIG.date);

  // 4. Set start and end time dropdowns
  await frame.locator('select#TimeFrom_c1_ctl04').selectOption({ value: CONFIG.startTime });
  await frame.locator('select#TimeTo_c1_ctl04').selectOption({ value: CONFIG.endTime });

  // 5. Set building(s)
  if (CONFIG.buildingNames?.length) {
    await frame.locator('#DropMultiBuildingList_c1_textItem').click();
    for (const building of CONFIG.buildingNames) {
      await frame.locator(`text="${building}"`).click();
    }
    await page.keyboard.press('Escape');
  }

  // 6. Set floor(s)
  if (CONFIG.floorNames?.length) {
    await frame.locator('#DropMultiFloorList_c1_textItem').click();
    for (const floor of CONFIG.floorNames) {
      await frame.locator(`text="${floor}"`).click();
    }
    await page.keyboard.press('Escape');
  }

  // 7. Set facility type(s)
  if (CONFIG.facilityTypes?.length) {
    await frame.locator('#DropMultiFacilityTypeList_c1_textItem').click();
    for (const facType of CONFIG.facilityTypes) {
      await frame.locator(`text="${facType}"`).click();
    }
    await page.keyboard.press('Escape');
  }

  // 8. Set room capacity
  await frame.locator('select#DropCapacity_c1').selectOption({ value: CONFIG.roomCapacity });

  // 9. Set equipment (optional)
  if (CONFIG.equipment?.length) {
    await frame.locator('#DropMultiEquipmentList_c1_textItem').click();
    for (const eq of CONFIG.equipment) {
      await frame.locator(`text="${eq}"`).click();
    }
    await page.keyboard.press('Escape');
  }

  // 10. Click "Check Availability"
  await frame.locator('a#CheckAvailability').click();
  await page.waitForLoadState('networkidle');

  // 11. Screenshot results table
  await page.screenshot({ path: CONFIG.screenshotDir + 'timeslots.png', fullPage: true });

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
    date: CONFIG.date,
    start_time: CONFIG.startTime,
    end_time: CONFIG.endTime,
    building_names: CONFIG.buildingNames,
    floor_names: CONFIG.floorNames,
    facility_types: CONFIG.facilityTypes,
    equipment: CONFIG.equipment,
    matched_rooms: matchingRooms,
    timeslots_raw: bookings,
    timestamp: (new Date()).toISOString(),
  };
  fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
  fs.mkdirSync(CONFIG.outputLog.substring(0, CONFIG.outputLog.lastIndexOf('/')), { recursive: true });
  fs.writeFileSync(CONFIG.outputLog, JSON.stringify(logData, null, 2));
  console.log('✅ Scraping complete. Data written to:', CONFIG.outputLog);

  await page.pause(); 
  await browser.close();
})();