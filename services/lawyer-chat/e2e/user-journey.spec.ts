import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from './test-config';

test.describe('Complete User Journeys', () => {
  test('new user onboarding flow', async ({ page }) => {
    // 1. Start at home page as guest
    await page.goto('/');
    
    // Should redirect to signin
    await expect(page).toHaveURL('/auth/signin');
    
    // 2. Navigate to registration
    await page.click('text=Create account');
    await expect(page).toHaveURL('/auth/register');
    
    // 3. Fill registration form
    const timestamp = Date.now();
    const testEmail = `newuser${timestamp}@reichmanjorgensen.com`;
    
    await page.fill('input[name="name"]', 'Test Lawyer');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
    
    // Verify password requirements are met
    await expect(page.locator('text=All requirements met')).toBeVisible();
    
    // 4. Submit registration
    await page.click('button[type="submit"]');
    
    // 5. Should show email verification message
    await expect(page.locator('.success-message, .text-green-600')).toContainText(/verification|verify|email sent/i);
    
    // 6. In real scenario, user would click email link
    // For test, we'll assume verification and go to signin
    await page.goto('/auth/signin');
    
    // 7. Sign in with new account
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    
    // 8. First time user experience
    await page.waitForURL('/');
    
    // Should see welcome or onboarding elements
    await expect(page.locator('h1')).toContainText('AI Legal Assistant');
    
    // 9. Send first message
    await page.locator('textarea[placeholder*="Type your legal question"]').fill('What is a contract?');
    await page.click('button[aria-label="Send message"]');
    
    // 10. Verify response
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 10000 });
  });

  test('returning user research flow', async ({ page }) => {
    // 1. Sign in as existing user
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', TEST_CREDENTIALS.admin.email);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.admin.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/');
    
    // 2. Check for existing chats in sidebar
    const sidebar = page.locator('.taskbar');
    const chatHistory = sidebar.locator('.chat-item');
    
    if (await chatHistory.count() > 0) {
      // 3. Select a previous chat
      await chatHistory.first().click();
      
      // Should load previous messages
      await expect(page.locator('.user-message')).toHaveCount({ minimum: 1 });
    }
    
    // 4. Continue conversation
    await page.locator('textarea[placeholder*="Type your legal question"]').fill('Tell me more about contract breaches');
    await page.click('button[aria-label="Send message"]');
    
    // 5. Wait for response
    await expect(page.locator('.assistant-message').last()).toBeVisible({ timeout: 10000 });
    
    // 6. Use advanced features - select tools
    await page.click('button[aria-label="Select tools"]');
    await page.click('text=Analytics');
    
    // 7. Send analytical query
    await page.locator('textarea[placeholder*="Type your legal question"]').fill('Show me trends in breach of contract cases');
    await page.click('button[aria-label="Send message"]');
    
    // 8. View analytics
    await page.waitForTimeout(3000);
    await page.locator('.assistant-message').last().locator('button:has-text("Analytics")').click();
    await expect(page.locator('.analytics-dropdown')).toBeVisible();
    
    // 9. Export results
    await page.click('button[aria-label="Download chat"]');
    
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=PDF')
    ]);
    
    expect(download).toBeTruthy();
  });

  test('guest to user conversion flow', async ({ page }) => {
    // 1. Start as guest
    await page.goto('/auth/signin');
    await page.click('text=Continue Without Signing In');
    
    // 2. Use basic features
    await page.locator('textarea[placeholder*="Type your legal question"]').fill('What is negligence?');
    await page.click('button[aria-label="Send message"]');
    
    await expect(page.locator('.assistant-message')).toBeVisible({ timeout: 10000 });
    
    // 3. Try to use advanced feature
    await page.click('button[aria-label="Select tools"]');
    
    // Should see prompt to sign in
    await expect(page.locator('text=Sign in for full access')).toBeVisible();
    
    // 4. Click sign in prompt
    await page.click('text=Sign in for full access');
    
    // 5. Should be on signin page
    await expect(page).toHaveURL('/auth/signin');
    
    // 6. User decides to create account
    await page.click('text=Create account');
    
    // 7. Complete registration
    const timestamp = Date.now();
    await page.fill('input[name="name"]', 'Guest User');
    await page.fill('input[name="email"]', `guest${timestamp}@reichmanjorgensen.com`);
    await page.fill('input[name="password"]', 'GuestPass123!');
    await page.fill('input[name="confirmPassword"]', 'GuestPass123!');
    await page.click('button[type="submit"]');
    
    // 8. After email verification (simulated), sign in
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', `guest${timestamp}@reichmanjorgensen.com`);
    await page.fill('input[name="password"]', 'GuestPass123!');
    await page.click('button[type="submit"]');
    
    // 9. Now has full access
    await page.waitForURL('/');
    await page.click('button[aria-label="Select tools"]');
    
    // Can now select tools
    await expect(page.locator('text=Page Turn')).toBeVisible();
    await expect(page.locator('text=Analytics')).toBeVisible();
  });

  test('legal research workflow', async ({ page }) => {
    // 1. Sign in
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', TEST_CREDENTIALS.admin.email);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    // 2. Start new research session
    await page.click('button[aria-label="New chat"]');
    
    // 3. Ask initial legal question
    await page.locator('textarea[placeholder*="Type your legal question"]').fill('What are the elements of negligence in tort law?');
    await page.click('button[aria-label="Send message"]');
    
    // 4. Wait for response with citations
    await page.waitForTimeout(3000);
    
    // 5. View citations
    const assistantMsg = page.locator('.assistant-message').last();
    await assistantMsg.locator('button:has-text("CITATIONS")').click();
    await expect(page.locator('.citation-panel')).toBeVisible();
    
    // 6. Read through citations
    await page.waitForTimeout(2000);
    
    // 7. Close citations and ask follow-up
    await page.click('button[aria-label="Close citations"]');
    await page.locator('textarea[placeholder*="Type your legal question"]').fill('How does comparative negligence work?');
    await page.click('button[aria-label="Send message"]');
    
    // 8. Use analytics for case trends
    await page.click('button[aria-label="Select tools"]');
    await page.click('text=Analytics');
    await page.locator('textarea[placeholder*="Type your legal question"]').fill('Show trends in negligence cases over the past 5 years');
    await page.click('button[aria-label="Send message"]');
    
    // 9. View analytics
    await page.waitForTimeout(3000);
    await page.locator('.assistant-message').last().locator('button:has-text("Analytics")').click();
    await expect(page.locator('.analytics-dropdown')).toBeVisible();
    
    // 10. Export complete research
    await page.click('button[aria-label="Download chat"]');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=PDF')
    ]);
    
    expect(download.suggestedFilename()).toMatch(/chat.*\.pdf/);
  });

  test('password recovery journey', async ({ page }) => {
    // 1. Try to sign in but forgot password
    await page.goto('/auth/signin');
    await page.click('text=Forgot your password?');
    
    // 2. Request password reset
    await page.fill('input[name="email"]', TEST_CREDENTIALS.admin.email);
    await page.click('button[type="submit"]');
    
    // 3. See confirmation message
    await expect(page.locator('.success-message, .text-green-600')).toContainText(/email|sent|instructions/i);
    
    // 4. In real scenario, user clicks email link
    // For test, simulate going to reset page with token
    await page.goto('/auth/reset-password?token=test-token-123');
    
    // 5. Enter new password
    await page.fill('input[name="password"]', 'NewSecurePass123!');
    await page.fill('input[name="confirmPassword"]', 'NewSecurePass123!');
    
    // 6. Verify password requirements
    await expect(page.locator('text=All requirements met')).toBeVisible();
    
    // 7. Submit new password
    await page.click('button[type="submit"]');
    
    // 8. Should redirect to signin or show success
    if (page.url().includes('/auth/signin')) {
      // Try signing in with new password
      await page.fill('input[name="email"]', TEST_CREDENTIALS.admin.email);
      await page.fill('input[name="password"]', 'NewSecurePass123!');
      await page.click('button[type="submit"]');
      
      // Should successfully sign in
      await page.waitForURL('/');
    }
  });

  test('multi-device session management', async ({ browser }) => {
    // 1. Sign in on first device
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    
    await page1.goto('/auth/signin');
    await page1.fill('input[name="email"]', TEST_CREDENTIALS.admin.email);
    await page1.fill('input[name="password"]', TEST_CREDENTIALS.admin.password);
    await page1.click('button[type="submit"]');
    await page1.waitForURL('/');
    
    // 2. Create a chat on first device
    await page1.locator('textarea[placeholder*="Type your legal question"]').fill('First device message');
    await page1.click('button[aria-label="Send message"]');
    await page1.waitForTimeout(2000);
    
    // 3. Sign in on second device
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    
    await page2.goto('/auth/signin');
    await page2.fill('input[name="email"]', TEST_CREDENTIALS.admin.email);
    await page2.fill('input[name="password"]', TEST_CREDENTIALS.admin.password);
    await page2.click('button[type="submit"]');
    await page2.waitForURL('/');
    
    // 4. Should see the same chat history
    await expect(page2.locator('.chat-item')).toHaveCount({ minimum: 1 });
    
    // 5. Continue chat on second device
    await page2.locator('textarea[placeholder*="Type your legal question"]').fill('Second device message');
    await page2.click('button[aria-label="Send message"]');
    
    // 6. Clean up
    await context1.close();
    await context2.close();
  });
});