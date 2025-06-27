import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load and display main navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loads
    await expect(page).toHaveTitle(/Data Compose/);
    
    // Check main navigation tabs
    await expect(page.locator('[data-tab="home"]')).toBeVisible();
    await expect(page.locator('[data-tab="chat"]')).toBeVisible();
    await expect(page.locator('[data-tab="workflows"]')).toBeVisible();
  });

  test('should navigate between tabs', async ({ page }) => {
    await page.goto('/');
    
    // Click on chat tab
    await page.click('[data-tab="chat"]');
    await expect(page.locator('#chat-section')).toBeVisible();
    await expect(page.locator('#home-section')).not.toBeVisible();
    
    // Click on workflows tab
    await page.click('[data-tab="workflows"]');
    await expect(page.locator('#workflows-section')).toBeVisible();
    await expect(page.locator('#chat-section')).not.toBeVisible();
  });

  test('should test system connectivity', async ({ page }) => {
    await page.goto('/');
    
    // Click test connection button
    await page.click('button:has-text("Test System")');
    
    // Wait for response
    await expect(page.locator('.status-message')).toBeVisible();
  });
});

test.describe('Chat Feature', () => {
  test('should send a message', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-tab="chat"]');
    
    // Type a message
    const messageInput = page.locator('#message-input');
    await messageInput.fill('Hello, test message');
    
    // Send message
    await page.click('#send-button');
    
    // Check that message appears in chat
    await expect(page.locator('.message:has-text("Hello, test message")')).toBeVisible();
  });

  test('should handle Enter key to send message', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-tab="chat"]');
    
    // Type and press Enter
    const messageInput = page.locator('#message-input');
    await messageInput.fill('Test with Enter key');
    await messageInput.press('Enter');
    
    // Check that message was sent
    await expect(page.locator('.message:has-text("Test with Enter key")')).toBeVisible();
  });
});