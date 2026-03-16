import { test, expect } from '@playwright/test';

// Generate unique user for each run (or use a dedicated test user)
const uniqueId = Date.now();
const user = {
  name: `Test User ${uniqueId}`,
  email: `test${uniqueId}@mindsphere.app`,
  password: 'Password123!',
};

test.describe('MindSphere Smoke Test', () => {
  test('User can register, login, and complete a session', async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', exception => console.log(`PAGE ERROR: ${exception}`));
    page.on('requestfailed', request => console.log(`REQUEST FAILED: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`));

    // 1. Register
    await page.goto('/register');
    await page.fill('input[name="name"]', user.name);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');

    // Expect redirect to Survey
    await expect(page).toHaveURL(/.*survey/);
    
    // Complete Survey
    // Complete Survey
    await page.getByRole('button', { name: 'Technology' }).click();
    await page.getByText('Save & Continue').click();

    // Expect redirect to Home
    // Expect redirect to Home
    await expect(page).toHaveURL(/^http:\/\/localhost:5173\/?$/);
    
    // 2. Verify Home Page Load
    await expect(page.getByText(`Welcome back, ${user.name}`)).toBeVisible();
    
    // 3. Start Session
    // Wait for recommendations to load
    const startButton = page.getByText('Start Session').first();
    await expect(startButton).toBeVisible({ timeout: 10000 });
    await startButton.click();
    
    // Check Session Runner URL
    await expect(page).toHaveURL(/.*session\/.*/);
    
    // 4. Run Session (Fast forward?)
    // This depends on how the timer is implemented. 
    // For smoke test, maybe just verify timer starts and "End Session" works.
    await expect(page.getByText('Running Session...')).toBeVisible();
    
    // Wait 2 seconds
    await page.waitForTimeout(2000);
    
    await page.click('button:has-text("End Session")');
    
    // 5. Verify Redirect and Gamification Update
    await expect(page).toHaveURL('/');
    await expect(page.getByText('XP Level')).toBeVisible(); 
  });
});
