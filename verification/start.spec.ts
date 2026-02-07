import { test, expect } from '@playwright/test';

test('verify game start flow and greeting', async ({ page }) => {
  // Go to the locally hosted game
  await page.goto('http://localhost:3000');

  // Wait for loading to finish and game to initialize
  // The GameLoader should automatically show the selection modal now
  await page.waitForSelector('#selectionModal', { state: 'visible', timeout: 30000 });

  // Take a screenshot of the selection hub
  await page.screenshot({ path: 'verification/selection_hub.png' });

  // Check for the greeting
  const greeting = page.locator('#user-greeting');
  await expect(greeting).toBeVisible();
  const text = await greeting.innerText();
  console.log('Greeting text:', text);
  expect(text).toContain('Hey asifdotpy 👋');

  // Verify START INVESTIGATION button is GONE from loading screen
  const startBtn = page.locator('#start-investigation-btn');
  await expect(startBtn).toBeHidden();
});
