import { chromium } from 'C:/Users/donad/AppData/Roaming/npm/node_modules/playwright/index.mjs';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1920, height: 1080 });

await page.goto('http://localhost:5173');
await page.waitForTimeout(1500);

// Try to join the first available match
const joinBtn = page.locator('button:has-text("Join")').first();
if (await joinBtn.isVisible()) {
  await joinBtn.click();
  await page.waitForTimeout(4000);
}

await page.screenshot({ path: 'screenshot-game.png' });
console.log('Screenshot saved');
await browser.close();
