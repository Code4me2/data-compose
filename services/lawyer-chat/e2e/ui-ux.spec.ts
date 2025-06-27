import { test, expect } from '@playwright/test';
import { signIn } from './helpers/auth';
import { TEST_CREDENTIALS } from './test-config';

test.describe('UI/UX Features', () => {
  test.describe('Dark Mode', () => {
    test('should toggle dark mode', async ({ page }) => {
      await page.goto('/');
      
      // Check initial state (light mode)
      await expect(page.locator('html')).not.toHaveClass(/dark/);
      
      // Click dark mode toggle
      await page.click('button[aria-label*="Switch to dark mode"]');
      
      // Verify dark mode is active
      await expect(page.locator('html')).toHaveClass(/dark/);
      
      // Verify UI elements have dark mode styles
      await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(17, 24, 39)'); // gray-900
    });

    test('should persist dark mode preference', async ({ page }) => {
      await page.goto('/');
      
      // Enable dark mode
      await page.click('button[aria-label*="Switch to dark mode"]');
      
      // Reload page
      await page.reload();
      
      // Dark mode should still be active
      await expect(page.locator('html')).toHaveClass(/dark/);
    });

    test('should apply dark mode to all components', async ({ page }) => {
      await signIn(page, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password);
      
      // Enable dark mode
      await page.click('button[aria-label*="Switch to dark mode"]');
      
      // Check various components
      const sidebar = page.locator('.taskbar');
      const chatArea = page.locator('.chat-container');
      const inputArea = page.locator('.input-area');
      
      // Verify dark styles are applied
      await expect(sidebar).toHaveClass(/bg-gray-800|dark/);
      await expect(chatArea).toHaveClass(/bg-gray-900|dark/);
      await expect(inputArea).toHaveClass(/bg-gray-800|dark/);
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt to mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      
      // Sidebar should be collapsed by default on mobile
      const sidebar = page.locator('.taskbar');
      await expect(sidebar).toHaveClass(/w-16|collapsed/);
      
      // Input area should be full width
      const inputArea = page.locator('.input-container');
      await expect(inputArea).toHaveCSS('width', /100%|full/);
    });

    test('should adapt to tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');
      
      // Layout should be optimized for tablet
      const mainContent = page.locator('.main-content');
      await expect(mainContent).toBeVisible();
    });

    test('should adapt to desktop viewport', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');
      
      // Sidebar can be expanded on desktop
      const sidebar = page.locator('.taskbar');
      const expandButton = sidebar.locator('button[aria-label="Expand sidebar"]');
      
      if (await expandButton.isVisible()) {
        await expandButton.click();
        await expect(sidebar).toHaveClass(/w-64|expanded/);
      }
    });
  });

  test.describe('Sidebar Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await signIn(page, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password);
    });

    test('should expand and collapse sidebar', async ({ page }) => {
      const sidebar = page.locator('.taskbar');
      
      // Find expand/collapse button
      const toggleButton = sidebar.locator('button').first();
      
      // Get initial state
      const isCollapsed = await sidebar.evaluate(el => el.classList.contains('w-16'));
      
      // Toggle sidebar
      await toggleButton.click();
      
      // Verify state changed
      if (isCollapsed) {
        await expect(sidebar).toHaveClass(/w-64|expanded/);
      } else {
        await expect(sidebar).toHaveClass(/w-16|collapsed/);
      }
    });

    test('should show chat history when expanded', async ({ page }) => {
      const sidebar = page.locator('.taskbar');
      
      // Expand sidebar if collapsed
      if (await sidebar.evaluate(el => el.classList.contains('w-16'))) {
        await sidebar.locator('button').first().click();
      }
      
      // Chat history should be visible
      await expect(sidebar.locator('.chat-history')).toBeVisible();
      await expect(sidebar.locator('text=Chat History')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should show error for network failure', async ({ page }) => {
      await signIn(page, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password);
      
      // Simulate network failure
      await page.route('**/api/chat', route => route.abort());
      
      // Try to send message
      await page.locator('textarea[placeholder*="Type your legal question"]').fill('Test message');
      await page.click('button[aria-label="Send message"]');
      
      // Should show error message
      await expect(page.locator('.error-message, .text-red-600')).toContainText(/error|failed|try again/i);
    });

    test('should handle rate limiting', async ({ page }) => {
      await signIn(page, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password);
      
      // Send multiple messages quickly
      const messageInput = page.locator('textarea[placeholder*="Type your legal question"]');
      const sendButton = page.locator('button[aria-label="Send message"]');
      
      // Send 21 messages (exceeding 20/minute limit)
      for (let i = 0; i < 21; i++) {
        await messageInput.fill(`Message ${i + 1}`);
        await sendButton.click();
        await page.waitForTimeout(100); // Small delay between messages
      }
      
      // Should show rate limit error
      await expect(page.locator('.error-message, .text-red-600')).toContainText(/rate limit|too many requests|slow down/i);
    });

    test('should validate input length', async ({ page }) => {
      await signIn(page, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password);
      
      const messageInput = page.locator('textarea[placeholder*="Type your legal question"]');
      
      // Try to input very long message (over 10,000 characters)
      const longMessage = 'a'.repeat(10001);
      await messageInput.fill(longMessage);
      
      // Should show length error or truncate
      const actualValue = await messageInput.inputValue();
      expect(actualValue.length).toBeLessThanOrEqual(10000);
    });
  });

  test.describe('Loading States', () => {
    test('should show loading indicator while sending message', async ({ page }) => {
      await signIn(page, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password);
      
      // Send message
      await page.locator('textarea[placeholder*="Type your legal question"]').fill('Test message');
      await page.click('button[aria-label="Send message"]');
      
      // Should show loading indicator
      await expect(page.locator('.loading-indicator, .animate-pulse, [aria-busy="true"]')).toBeVisible();
    });

    test('should show typing indicator for AI response', async ({ page }) => {
      await signIn(page, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password);
      
      // Send message
      await page.locator('textarea[placeholder*="Type your legal question"]').fill('Test message');
      await page.click('button[aria-label="Send message"]');
      
      // Should show typing/streaming indicator
      await expect(page.locator('.typing-indicator, .streaming-text, .assistant-message')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/auth/signin');
      
      // Tab through form elements
      await page.keyboard.press('Tab'); // Focus email
      await page.keyboard.type(TEST_CREDENTIALS.admin.email);
      
      await page.keyboard.press('Tab'); // Focus password
      await page.keyboard.type(TEST_CREDENTIALS.admin.password);
      
      await page.keyboard.press('Tab'); // Focus submit button
      await page.keyboard.press('Enter'); // Submit form
      
      // Should successfully sign in
      await page.waitForURL('/');
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/');
      
      // Check for ARIA labels
      await expect(page.locator('button[aria-label="Send message"]')).toBeVisible();
      await expect(page.locator('button[aria-label*="dark mode"]')).toBeVisible();
      await expect(page.locator('textarea[aria-label*="Message input"]')).toBeVisible();
    });

    test('should announce dynamic content changes', async ({ page }) => {
      await signIn(page, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password);
      
      // Send message
      await page.locator('textarea[placeholder*="Type your legal question"]').fill('Test message');
      await page.click('button[aria-label="Send message"]');
      
      // Check for live region updates
      await expect(page.locator('[aria-live="polite"], [role="status"]')).toBeVisible();
    });
  });
});