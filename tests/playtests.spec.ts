import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Mock API responses
  await page.route('/api/init', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ type: 'init', postId: 't3_test', username: 'TestSleuth' }),
    });
  });

  await page.route('/api/game/init', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        type: 'game_init',
        username: 'TestSleuth',
        evidence: ['Clue 1: Daily', 'Clue 2: Daily', 'Clue 3: Daily'],
        hasPlayedToday: false,
        attempts: 0,
        isWinner: false,
        streak: 5,
        archivesSolved: 10,
        category: 'gaming',
        rank: 'Junior Sleuth',
        audioAssets: {}
      }),
    });
  });

  await page.route('/api/game/random', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        type: 'game_init',
        username: 'TestSleuth',
        evidence: ['Clue 1: Archive', 'Clue 2: Archive', 'Clue 3: Archive'],
        hasPlayedToday: false,
        attempts: 0,
        isWinner: false,
        streak: 5,
        archivesSolved: 10,
        category: 'humor',
        rank: 'Junior Sleuth',
        audioAssets: {}
      }),
    });
  });

  await page.route('/api/game/leaderboard', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        type: 'leaderboard_data',
        leaderboard: [
          { username: 'Sleuth1', score: 100 },
          { username: 'TestSleuth', score: 50 }
        ]
      }),
    });
  });

  await page.route('/api/game/guess', async (route) => {
    const postData = route.request().postDataJSON();
    if (postData.guess === 'correct') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'guess_result',
          correct: true,
          answer: 'correct',
          attempts: 1,
          streak: 6,
          archivesSolved: 10,
          rank: 'Junior Sleuth',
          audioTrigger: 'correct'
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'guess_result',
          correct: false,
          attempts: 1,
          streak: 5,
          archivesSolved: 10,
          audioTrigger: 'wrong'
        }),
      });
    }
  });

  await page.route('/api/game/abandon', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, streak: 0 }),
    });
  });

  await page.route('/api/game/share', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ type: 'share_result', success: true, commentUrl: 'https://reddit.com/test' }),
    });
  });
});

test('Daily Case Playtest: Win Scenario', async ({ page }) => {
  await page.goto('/');

  // Bypass loading screen
  await page.evaluate(() => {
    if ((window as any).gameInstance) {
      (window as any).gameInstance.showMainMenu();
    }
  });

  // Select Daily Case
  await page.click('#startDailyBtn');

  // Verify Initial State
  await expect(page.locator('#evidence1Text')).toContainText('Clue 1: Daily');
  await expect(page.locator('#streak-value')).toHaveText('5');

  // Reveal clues
  await page.click('#revealEvidence2');
  await expect(page.locator('#evidence2Text')).toContainText('Clue 2: Daily');

  await page.click('#revealEvidence3');
  await expect(page.locator('#evidence3Text')).toContainText('Clue 3: Daily');

  // Make a wrong guess
  await page.fill('#guessInput', 'wrong');
  await page.click('#submitBtn');
  await expect(page.locator('#feedbackMessage')).toContainText('Incorrect');

  // Make a correct guess
  await page.fill('#guessInput', 'correct');
  await page.click('#submitBtn');

  // Verify Win Modal and Stamp
  await expect(page.locator('#winModal')).toBeVisible();
  await expect(page.locator('#case-closed-stamp')).toHaveClass(/stamped/);
  await expect(page.locator('#win-streak-val')).toHaveText('6');

  await page.screenshot({ path: 'test-results/daily-win.png' });
});

test('Cold Case (Archives) Playtest', async ({ page }) => {
  await page.goto('/');
  // Bypass loading screen
  await page.evaluate(() => {
    if ((window as any).gameInstance) {
      (window as any).gameInstance.showMainMenu();
    }
  });

  // Select Archives Case
  await page.click('#startArchivesBtn');

  // Verify Archives mode UI
  await expect(page.locator('.game-container')).toHaveClass(/archives-case/);
  await expect(page.locator('.game-subtitle')).toContainText('The Archives');
  await expect(page.locator('#currentModeTag')).toContainText('ARCHIVES');
  await expect(page.locator('#evidence1Text')).toContainText('Clue 1: Archive');

  // Solve the case
  await page.fill('#guessInput', 'correct');
  await page.click('#submitBtn');

  await expect(page.locator('#winModal')).toBeVisible();
  await page.screenshot({ path: 'test-results/archives-win.png' });
});

test('Abandon Case Playtest', async ({ page }) => {
  await page.goto('/');
  // Bypass loading screen
  await page.evaluate(() => {
    if ((window as any).gameInstance) {
      (window as any).gameInstance.showMainMenu();
    }
  });
  await page.click('#startDailyBtn');

  // Reveal a clue to create progress
  await page.click('#revealEvidence2');

  // Click Back to Selection (Retreat to HQ equivalent)
  await page.click('#backToSelection');

  // Verify Abandonment Modal
  await expect(page.locator('#confirmModal')).toBeVisible();
  await expect(page.locator('#confirmModalTitle')).toContainText('Abandon Case?');

  // Confirm Abandon
  await page.click('#confirm-yes-btn');

  // Verify streak reset UI (streak should be 0 in mock after abandon)
  await expect(page.locator('#streak-value')).toHaveText('0');
  await expect(page.locator('#selectionModal')).toBeVisible();

  await page.screenshot({ path: 'test-results/abandon-case.png' });
});

test('Share (Report Findings) Playtest', async ({ page }) => {
  await page.goto('/');
  // Bypass loading screen
  await page.evaluate(() => {
    if ((window as any).gameInstance) {
      (window as any).gameInstance.showMainMenu();
    }
  });
  await page.click('#startDailyBtn');

  // Win the game
  await page.fill('#guessInput', 'correct');
  await page.click('#submitBtn');

  // Click Report Findings
  await page.click('#share-btn');

  // Verify Share Success
  await expect(page.locator('#share-btn')).toContainText('Findings Reported!');

  await page.screenshot({ path: 'test-results/share-success.png' });
});
