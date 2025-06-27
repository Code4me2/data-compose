import { test, expect } from '@playwright/test';
import { signIn } from './helpers/auth';
import { TEST_CREDENTIALS } from './config';

test.describe('Chat Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in before each test
    await signIn(page, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password);
  });

  test.describe('Basic Chat', () => {
    test('should send and receive messages', async ({ page }) => {
      // Type a message
      const messageInput = page.locator('textarea[placeholder*="Type your legal question"]');
      await messageInput.fill('What is the statute of limitations for breach of contract?');
      
      // Send message
      await page.click('button[aria-label="Send message"]');
      
      // Verify message appears in chat
      await expect(page.locator('text=What is the statute of limitations for breach of contract?')).toBeVisible();
      
      // Wait for AI response to start streaming
      await expect(page.locator('.assistant-message').last()).toBeVisible({ timeout: 10000 });
      
      // Verify streaming animation or response text
      const response = page.locator('.assistant-message').last();
      await expect(response).toContainText(/./); // Should contain some text
    });

    test('should handle markdown in responses', async ({ page }) => {
      // Send a message that typically gets markdown response
      const messageInput = page.locator('textarea[placeholder*="Type your legal question"]');
      await messageInput.fill('List the elements of a valid contract');
      
      await page.click('button[aria-label="Send message"]');
      
      // Wait for response
      await page.waitForTimeout(3000);
      
      // Check for markdown elements (bullets, bold, etc.)
      const response = page.locator('.assistant-message').last();
      
      // Verify markdown is rendered (not raw markdown text)
      await expect(response.locator('ul, ol, strong, em')).toHaveCount({ minimum: 1 });
    });

    test('should clear input after sending', async ({ page }) => {
      const messageInput = page.locator('textarea[placeholder*="Type your legal question"]');
      
      await messageInput.fill('Test message');
      await page.click('button[aria-label="Send message"]');
      
      // Input should be cleared
      await expect(messageInput).toHaveValue('');
    });

    test('should disable send button while processing', async ({ page }) => {
      const messageInput = page.locator('textarea[placeholder*="Type your legal question"]');
      const sendButton = page.locator('button[aria-label="Send message"]');
      
      await messageInput.fill('Test message');
      await sendButton.click();
      
      // Button should be disabled immediately
      await expect(sendButton).toBeDisabled();
      
      // Wait for response to complete
      await page.waitForTimeout(3000);
      
      // Button should be enabled again
      await expect(sendButton).toBeEnabled();
    });
  });

  test.describe('Chat with Tools', () => {
    test('should select and use tools', async ({ page }) => {
      // Click tools button
      await page.click('button[aria-label="Select tools"]');
      
      // Select Page Turn tool
      await page.click('text=Page Turn');
      
      // Verify tool chip appears
      await expect(page.locator('.tool-chip:has-text("Page Turn")')).toBeVisible();
      
      // Send message with tool
      const messageInput = page.locator('textarea[placeholder*="Type your legal question"]');
      await messageInput.fill('Analyze page 5 of the contract');
      await page.click('button[aria-label="Send message"]');
      
      // Verify tool is included in message
      await expect(page.locator('.user-message').last()).toContainText('Page Turn');
    });

    test('should select multiple tools', async ({ page }) => {
      // Click tools button
      await page.click('button[aria-label="Select tools"]');
      
      // Select both tools
      await page.click('text=Page Turn');
      await page.click('text=Analytics');
      
      // Verify both tool chips appear
      await expect(page.locator('.tool-chip:has-text("Page Turn")')).toBeVisible();
      await expect(page.locator('.tool-chip:has-text("Analytics")')).toBeVisible();
      
      // Send message
      const messageInput = page.locator('textarea[placeholder*="Type your legal question"]');
      await messageInput.fill('Analyze trends in contract disputes');
      await page.click('button[aria-label="Send message"]');
      
      // Verify both tools are included
      const lastMessage = page.locator('.user-message').last();
      await expect(lastMessage).toContainText('Page Turn');
      await expect(lastMessage).toContainText('Analytics');
    });

    test('should remove tool selection', async ({ page }) => {
      // Select a tool
      await page.click('button[aria-label="Select tools"]');
      await page.click('text=Analytics');
      
      // Verify chip appears
      await expect(page.locator('.tool-chip:has-text("Analytics")')).toBeVisible();
      
      // Remove tool by clicking X on chip
      await page.click('.tool-chip:has-text("Analytics") button');
      
      // Verify chip is removed
      await expect(page.locator('.tool-chip:has-text("Analytics")')).not.toBeVisible();
    });
  });

  test.describe('Chat History', () => {
    test('should create new chat', async ({ page }) => {
      // Send initial message
      await page.locator('textarea[placeholder*="Type your legal question"]').fill('First message');
      await page.click('button[aria-label="Send message"]');
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      // Click new chat button
      await page.click('button[aria-label="New chat"]');
      
      // Verify chat is cleared
      await expect(page.locator('.user-message')).toHaveCount(0);
      await expect(page.locator('.assistant-message')).toHaveCount(0);
    });

    test('should show chat history in sidebar', async ({ page }) => {
      // Send a message
      await page.locator('textarea[placeholder*="Type your legal question"]').fill('Contract law question');
      await page.click('button[aria-label="Send message"]');
      
      // Wait for chat to be saved
      await page.waitForTimeout(2000);
      
      // Check sidebar for chat entry
      const sidebar = page.locator('.chat-sidebar');
      await expect(sidebar.locator('.chat-item')).toHaveCount({ minimum: 1 });
      
      // Verify chat title contains part of the message
      await expect(sidebar.locator('.chat-item').first()).toContainText(/Contract/i);
    });

    test('should switch between chats', async ({ page }) => {
      // Create first chat
      await page.locator('textarea[placeholder*="Type your legal question"]').fill('First chat message');
      await page.click('button[aria-label="Send message"]');
      await page.waitForTimeout(2000);
      
      // Create second chat
      await page.click('button[aria-label="New chat"]');
      await page.locator('textarea[placeholder*="Type your legal question"]').fill('Second chat message');
      await page.click('button[aria-label="Send message"]');
      await page.waitForTimeout(2000);
      
      // Click on first chat in sidebar
      await page.locator('.chat-item').nth(1).click();
      
      // Verify first chat messages are shown
      await expect(page.locator('text=First chat message')).toBeVisible();
      await expect(page.locator('text=Second chat message')).not.toBeVisible();
    });

    test('should delete chat', async ({ page }) => {
      // Create a chat
      await page.locator('textarea[placeholder*="Type your legal question"]').fill('Chat to delete');
      await page.click('button[aria-label="Send message"]');
      await page.waitForTimeout(2000);
      
      // Hover over chat item to show delete button
      const chatItem = page.locator('.chat-item').first();
      await chatItem.hover();
      
      // Click delete button
      await chatItem.locator('button[aria-label="Delete chat"]').click();
      
      // Confirm deletion
      await page.click('text=Delete');
      
      // Verify chat is removed
      await expect(page.locator('.chat-item:has-text("Chat to delete")')).not.toBeVisible();
    });
  });

  test.describe('Citations', () => {
    test('should show citations panel', async ({ page }) => {
      // Send a message
      await page.locator('textarea[placeholder*="Type your legal question"]').fill('What cases support negligence claims?');
      await page.click('button[aria-label="Send message"]');
      
      // Wait for response with citations
      await page.waitForTimeout(3000);
      
      // Click citations button on assistant message
      const assistantMessage = page.locator('.assistant-message').last();
      await assistantMessage.locator('button:has-text("CITATIONS")').click();
      
      // Verify citations panel opens
      await expect(page.locator('.citation-panel')).toBeVisible();
      await expect(page.locator('.citation-panel h2')).toContainText('Citations');
    });

    test('should close citations panel', async ({ page }) => {
      // Open citations panel
      await page.locator('textarea[placeholder*="Type your legal question"]').fill('Legal question');
      await page.click('button[aria-label="Send message"]');
      await page.waitForTimeout(3000);
      
      const assistantMessage = page.locator('.assistant-message').last();
      await assistantMessage.locator('button:has-text("CITATIONS")').click();
      
      // Close panel
      await page.click('button[aria-label="Close citations"]');
      
      // Verify panel is closed
      await expect(page.locator('.citation-panel')).not.toBeVisible();
    });
  });

  test.describe('Analytics', () => {
    test('should show analytics dropdown', async ({ page }) => {
      // Select analytics tool
      await page.click('button[aria-label="Select tools"]');
      await page.click('text=Analytics');
      
      // Send message
      await page.locator('textarea[placeholder*="Type your legal question"]').fill('Show contract dispute trends');
      await page.click('button[aria-label="Send message"]');
      
      // Wait for response
      await page.waitForTimeout(3000);
      
      // Click analytics dropdown
      const assistantMessage = page.locator('.assistant-message').last();
      await assistantMessage.locator('button:has-text("Analytics")').click();
      
      // Verify analytics content
      await expect(page.locator('.analytics-dropdown')).toBeVisible();
      await expect(page.locator('.analytics-dropdown')).toContainText(/trends|statistics|data/i);
    });
  });
});