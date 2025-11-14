import { test, expect } from '@playwright/test';

test.describe('Onboarding Wizard', () => {
  test('should complete full onboarding flow', async ({ page }) => {
    // Navigate to onboarding
    await page.goto('/onboarding');

    // Step 1: Welcome
    await expect(page.locator('h1')).toContainText('Welcome to Curator');
    await expect(page.getByText('Music')).toBeVisible();
    await expect(page.getByText('News')).toBeVisible();
    await expect(page.getByText('Recipes')).toBeVisible();
    await expect(page.getByText('Learning')).toBeVisible();
    await expect(page.getByText('Events')).toBeVisible();

    await page.getByRole('button', { name: /Get Started/i }).click();

    // Step 2: Interests
    await expect(page.getByText('What are you interested in?')).toBeVisible();

    // Select some music interests
    await page.getByRole('button', { name: /🎵 Music/i }).click();
    await page.getByRole('button', { name: 'Jazz', exact: true }).click();
    await page.getByRole('button', { name: 'Rock', exact: true }).click();

    // Switch to news domain
    await page.getByRole('button', { name: /📰 News/i }).click();
    await page.getByRole('button', { name: 'Technology', exact: true }).click();
    await page.getByRole('button', { name: 'Science', exact: true }).click();

    // Switch to recipes domain
    await page.getByRole('button', { name: /🍳 Recipes/i }).click();
    await page.getByRole('button', { name: 'Italian', exact: true }).click();

    // Verify count
    await expect(page.getByText('5 interests selected')).toBeVisible();

    await page.getByRole('button', { name: /Next: Constraints/i }).click();

    // Step 3: Constraints
    await expect(page.getByText('Set Your Preferences')).toBeVisible();

    // Select dietary restrictions
    await page.getByRole('button', { name: 'Vegetarian', exact: true }).click();
    await page.getByRole('button', { name: 'Gluten-Free', exact: true }).click();

    // Select topics to avoid in news
    await page.getByRole('button', { name: 'Politics', exact: true }).click();

    await page.getByRole('button', { name: /Next: Connect Accounts/i }).click();

    // Step 4: Connect Accounts
    await expect(page.getByText('Connect Your Accounts')).toBeVisible();
    await expect(page.getByText('Spotify')).toBeVisible();
    await expect(page.getByText('Google')).toBeVisible();

    // Optionally connect an account (stub)
    await page.getByRole('button', { name: /Connect/i }).first().click();

    // Wait for connection to complete
    await expect(page.getByText('✓ Connected')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: /Complete Setup/i }).click();

    // Step 5: Completion
    await expect(page.getByText("You're All Set!")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('5')).toBeVisible(); // Interests count
    await expect(page.getByText('3')).toBeVisible(); // Constraints count
    await expect(page.getByText('1')).toBeVisible(); // Connected accounts

    await expect(page.getByRole('button', { name: /Start Exploring/i })).toBeVisible();
  });

  test('should show progress bar', async ({ page }) => {
    await page.goto('/onboarding');

    // Step 1
    await expect(page.getByText('Step 1 of 5')).toBeVisible();

    await page.getByRole('button', { name: /Get Started/i }).click();

    // Step 2
    await expect(page.getByText('Step 2 of 5')).toBeVisible();
  });

  test('should allow navigation back and forth', async ({ page }) => {
    await page.goto('/onboarding');

    // Go to interests
    await page.getByRole('button', { name: /Get Started/i }).click();

    // Select an interest
    await page.getByRole('button', { name: 'Jazz', exact: true }).click();

    // Go to constraints
    await page.getByRole('button', { name: /Next: Constraints/i }).click();

    // Go back
    await page.getByRole('button', { name: /← Back/i }).click();

    // Should be back on interests
    await expect(page.getByText('What are you interested in?')).toBeVisible();

    // Previously selected interest should still be selected
    const jazzButton = page.getByRole('button', { name: 'Jazz', exact: true });
    await expect(jazzButton).toHaveClass(/indigo/);
  });

  test('should persist selections across steps', async ({ page }) => {
    await page.goto('/onboarding');

    // Step 1 -> 2
    await page.getByRole('button', { name: /Get Started/i }).click();

    // Select interests
    await page.getByRole('button', { name: 'Jazz', exact: true }).click();
    await page.getByRole('button', { name: 'Rock', exact: true }).click();

    // Step 2 -> 3
    await page.getByRole('button', { name: /Next: Constraints/i }).click();

    // Step 3 -> 2 (back)
    await page.getByRole('button', { name: /← Back/i }).click();

    // Step 2 -> 3 (forward again)
    await page.getByRole('button', { name: /Next: Constraints/i }).click();

    // Select constraints
    await page.getByRole('button', { name: 'Vegetarian', exact: true }).click();

    // Step 3 -> 2 (back again)
    await page.getByRole('button', { name: /← Back/i }).click();

    // Interests should still be selected
    await expect(page.getByText('2 interests selected')).toBeVisible();

    // Forward to constraints
    await page.getByRole('button', { name: /Next: Constraints/i }).click();

    // Constraints should still be selected
    await expect(page.getByText('1 preferences set')).toBeVisible();
  });

  test('should require at least one interest to proceed', async ({ page }) => {
    await page.goto('/onboarding');

    await page.getByRole('button', { name: /Get Started/i }).click();

    // Next button should be disabled
    const nextButton = page.getByRole('button', { name: /Next: Constraints/i });
    await expect(nextButton).toBeDisabled();

    // Select an interest
    await page.getByRole('button', { name: 'Jazz', exact: true }).click();

    // Next button should now be enabled
    await expect(nextButton).toBeEnabled();
  });

  test('should allow skipping constraints', async ({ page }) => {
    await page.goto('/onboarding');

    // Go through to constraints step
    await page.getByRole('button', { name: /Get Started/i }).click();
    await page.getByRole('button', { name: 'Jazz', exact: true }).click();
    await page.getByRole('button', { name: /Next: Constraints/i }).click();

    // Skip without selecting any
    await page.getByRole('button', { name: /Next: Connect Accounts/i }).click();

    // Should be on connect accounts step
    await expect(page.getByText('Connect Your Accounts')).toBeVisible();
  });

  test('should allow skipping account connections', async ({ page }) => {
    await page.goto('/onboarding');

    // Go through all steps
    await page.getByRole('button', { name: /Get Started/i }).click();
    await page.getByRole('button', { name: 'Jazz', exact: true }).click();
    await page.getByRole('button', { name: /Next: Constraints/i }).click();
    await page.getByRole('button', { name: /Next: Connect Accounts/i }).click();

    // Complete without connecting accounts
    await page.getByRole('button', { name: /Complete Setup/i }).click();

    // Should see completion
    await expect(page.getByText("You're All Set!")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('0')).toBeVisible(); // 0 connected accounts
  });

  test('should handle multiple domain selections', async ({ page }) => {
    await page.goto('/onboarding');

    await page.getByRole('button', { name: /Get Started/i }).click();

    // Music
    await page.getByRole('button', { name: /🎵 Music/i }).click();
    await page.getByRole('button', { name: 'Jazz', exact: true }).click();

    // News
    await page.getByRole('button', { name: /📰 News/i }).click();
    await page.getByRole('button', { name: 'Technology', exact: true }).click();

    // Recipes
    await page.getByRole('button', { name: /🍳 Recipes/i }).click();
    await page.getByRole('button', { name: 'Italian', exact: true }).click();

    // Learning
    await page.getByRole('button', { name: /📚 Learning/i }).click();
    await page.getByRole('button', { name: 'Programming', exact: true }).click();

    // Events
    await page.getByRole('button', { name: /📅 Events/i }).click();
    await page.getByRole('button', { name: 'Concerts', exact: true }).click();

    // Should have 5 interests across 5 domains
    await expect(page.getByText('5 interests selected across 5 domains')).toBeVisible();
  });
});
