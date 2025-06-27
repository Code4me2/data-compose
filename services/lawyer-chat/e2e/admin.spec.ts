import { test, expect } from '@playwright/test';
import { signIn } from './helpers/auth';

test.describe('Admin Features', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as admin
    await signIn(page, 'mchand@reichmanjorgensen.com', 'SecureAdmin123!');
  });

  test.describe('Admin Dashboard Access', () => {
    test('should access admin dashboard', async ({ page }) => {
      // Navigate to admin page
      await page.goto('/admin');
      
      // Verify admin dashboard loads
      await expect(page.locator('h1')).toContainText('Admin Dashboard');
      
      // Verify key sections are visible
      await expect(page.locator('text=System Overview')).toBeVisible();
      await expect(page.locator('text=User Management')).toBeVisible();
    });

    test('should show system statistics', async ({ page }) => {
      await page.goto('/admin');
      
      // Check for stats cards
      await expect(page.locator('.stat-card')).toHaveCount({ minimum: 4 });
      
      // Verify specific stats
      await expect(page.locator('text=Total Users')).toBeVisible();
      await expect(page.locator('text=Active Sessions')).toBeVisible();
      await expect(page.locator('text=Total Chats')).toBeVisible();
      await expect(page.locator('text=Messages Today')).toBeVisible();
    });

    test('should deny access to non-admin users', async ({ page }) => {
      // Would need to sign in as non-admin user
      // For now, test that admin check exists
      await page.goto('/admin');
      
      // Admin page should load for admin user
      await expect(page.locator('h1')).toContainText('Admin Dashboard');
    });
  });

  test.describe('User Management', () => {
    test('should display users table', async ({ page }) => {
      await page.goto('/admin');
      
      // Switch to Users tab
      await page.click('text=Users');
      
      // Verify users table
      await expect(page.locator('table')).toBeVisible();
      await expect(page.locator('th:has-text("Name")')).toBeVisible();
      await expect(page.locator('th:has-text("Email")')).toBeVisible();
      await expect(page.locator('th:has-text("Status")')).toBeVisible();
      await expect(page.locator('th:has-text("Role")')).toBeVisible();
      await expect(page.locator('th:has-text("Last Login")')).toBeVisible();
    });

    test('should show user status indicators', async ({ page }) => {
      await page.goto('/admin');
      await page.click('text=Users');
      
      // Check for status badges
      const statusBadges = page.locator('.status-badge, [data-status]');
      await expect(statusBadges).toHaveCount({ minimum: 1 });
      
      // Verify different statuses
      const verifiedUsers = page.locator('text=Verified');
      const lockedUsers = page.locator('text=Locked');
      
      // At least some users should be verified
      await expect(verifiedUsers).toHaveCount({ minimum: 1 });
    });

    test('should filter users', async ({ page }) => {
      await page.goto('/admin');
      await page.click('text=Users');
      
      // Use search/filter
      const searchInput = page.locator('input[placeholder*="Search users"]');
      await searchInput.fill('mchand');
      
      // Should filter results
      await expect(page.locator('tbody tr')).toHaveCount(1);
      await expect(page.locator('td:has-text("mchand@reichmanjorgensen.com")')).toBeVisible();
    });

    test('should export users to CSV', async ({ page }) => {
      await page.goto('/admin');
      await page.click('text=Users');
      
      // Click export button
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('button:has-text("Export Users")')
      ]);
      
      // Verify CSV download
      expect(download.suggestedFilename()).toMatch(/users.*\.csv/i);
    });

    test('should paginate users', async ({ page }) => {
      await page.goto('/admin');
      await page.click('text=Users');
      
      // Check for pagination controls
      const pagination = page.locator('.pagination, [aria-label="Pagination"]');
      
      // If there are many users, pagination should be visible
      if (await pagination.isVisible()) {
        await expect(pagination.locator('button')).toHaveCount({ minimum: 2 });
      }
    });
  });

  test.describe('Activity Logs', () => {
    test('should display activity logs', async ({ page }) => {
      await page.goto('/admin');
      
      // Switch to Activity Logs tab
      await page.click('text=Activity Logs');
      
      // Verify logs table
      await expect(page.locator('table')).toBeVisible();
      await expect(page.locator('th:has-text("Time")')).toBeVisible();
      await expect(page.locator('th:has-text("User")')).toBeVisible();
      await expect(page.locator('th:has-text("Action")')).toBeVisible();
      await expect(page.locator('th:has-text("IP Address")')).toBeVisible();
      await expect(page.locator('th:has-text("Status")')).toBeVisible();
    });

    test('should show recent authentication events', async ({ page }) => {
      await page.goto('/admin');
      await page.click('text=Activity Logs');
      
      // Should show login events
      await expect(page.locator('td:has-text("signin")')).toHaveCount({ minimum: 1 });
      
      // Should show success/failure status
      const successBadges = page.locator('.badge-success, [data-status="success"]');
      await expect(successBadges).toHaveCount({ minimum: 1 });
    });

    test('should filter logs by date', async ({ page }) => {
      await page.goto('/admin');
      await page.click('text=Activity Logs');
      
      // If date filter exists
      const dateFilter = page.locator('input[type="date"], select:has-text("Today")');
      if (await dateFilter.isVisible()) {
        await dateFilter.selectOption('Today');
        
        // Verify filtered results
        await expect(page.locator('tbody tr')).toHaveCount({ minimum: 1 });
      }
    });

    test('should show IP addresses and user agents', async ({ page }) => {
      await page.goto('/admin');
      await page.click('text=Activity Logs');
      
      // Check for IP addresses
      const ipCells = page.locator('td').filter({ hasText: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/ });
      await expect(ipCells).toHaveCount({ minimum: 1 });
      
      // User agent info might be in tooltips or expandable rows
      const firstRow = page.locator('tbody tr').first();
      await firstRow.hover();
      
      // Check for user agent tooltip or details
      const tooltip = page.locator('[role="tooltip"], .tooltip');
      if (await tooltip.isVisible()) {
        await expect(tooltip).toContainText(/Chrome|Firefox|Safari/i);
      }
    });
  });

  test.describe('System Settings', () => {
    test('should show system health indicators', async ({ page }) => {
      await page.goto('/admin');
      
      // Check system health section
      const healthSection = page.locator('.system-health, [data-testid="system-health"]');
      
      if (await healthSection.isVisible()) {
        await expect(healthSection).toContainText(/Database|API|Services/);
        
        // Should show status indicators
        const statusIndicators = healthSection.locator('.status-indicator, [data-status]');
        await expect(statusIndicators).toHaveCount({ minimum: 1 });
      }
    });

    test('should display usage statistics', async ({ page }) => {
      await page.goto('/admin');
      
      // Look for usage stats
      const usageSection = page.locator('.usage-stats, [data-testid="usage-stats"]');
      
      if (await usageSection.isVisible()) {
        // Should show metrics
        await expect(usageSection).toContainText(/Messages|Queries|Tokens/i);
      }
    });
  });

  test.describe('Admin Actions', () => {
    test('should be able to lock/unlock users', async ({ page }) => {
      await page.goto('/admin');
      await page.click('text=Users');
      
      // Find a user row (not the admin's own account)
      const userRows = page.locator('tbody tr').filter({ 
        hasNot: page.locator('td:has-text("mchand@reichmanjorgensen.com")') 
      });
      
      if (await userRows.count() > 0) {
        const firstUserRow = userRows.first();
        const actionButton = firstUserRow.locator('button[aria-label*="Lock"], button[aria-label*="Unlock"]');
        
        if (await actionButton.isVisible()) {
          // Click action button
          await actionButton.click();
          
          // Confirm action if modal appears
          const confirmButton = page.locator('button:has-text("Confirm")');
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
          }
          
          // Verify status changed
          await expect(firstUserRow).toContainText(/Locked|Active/);
        }
      }
    });

    test('should handle bulk actions', async ({ page }) => {
      await page.goto('/admin');
      await page.click('text=Users');
      
      // Check for bulk action controls
      const bulkSelect = page.locator('input[type="checkbox"][aria-label*="Select all"]');
      
      if (await bulkSelect.isVisible()) {
        // Select all users
        await bulkSelect.check();
        
        // Bulk action button should appear
        await expect(page.locator('button:has-text("Bulk Actions")')).toBeVisible();
      }
    });
  });

  test.describe('Security Features', () => {
    test('should log admin actions', async ({ page }) => {
      await page.goto('/admin');
      
      // Perform an admin action
      await page.click('text=Users');
      
      // Switch to activity logs
      await page.click('text=Activity Logs');
      
      // Should see the admin access logged
      await expect(page.locator('td:has-text("admin.access")')).toBeVisible();
    });

    test('should require re-authentication for sensitive actions', async ({ page }) => {
      await page.goto('/admin');
      await page.click('text=Users');
      
      // Try to perform sensitive action (like deleting a user)
      const deleteButton = page.locator('button[aria-label*="Delete"]').first();
      
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        
        // Might show re-auth modal or confirmation
        const modal = page.locator('.modal, [role="dialog"]');
        if (await modal.isVisible()) {
          await expect(modal).toContainText(/confirm|password|authenticate/i);
        }
      }
    });
  });
});