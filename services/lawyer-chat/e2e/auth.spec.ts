import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from './config';

test.describe('Authentication', () => {
  test.describe('Sign In', () => {
    test('should sign in with valid credentials', async ({ page }) => {
      await page.goto('/auth/signin');
      
      // Fill in credentials
      await page.fill('input[name="email"]', TEST_CREDENTIALS.admin.email);
      await page.fill('input[name="password"]', TEST_CREDENTIALS.admin.password);
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Wait for redirect to home page
      await page.waitForURL('/');
      
      // Verify we're on the chat page
      await expect(page.locator('h1')).toContainText('AI Legal Assistant');
      
      // Verify user is logged in (check for sign out button or user menu)
      await expect(page.locator('text=Sign out')).toBeVisible({ timeout: 10000 });
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/auth/signin');
      
      // Fill in invalid credentials
      await page.fill('input[name="email"]', 'wrong@reichmanjorgensen.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Verify error message
      await expect(page.locator('.text-red-600')).toContainText('Invalid email or password');
      
      // Verify we're still on signin page
      await expect(page).toHaveURL('/auth/signin');
    });

    test('should allow guest access', async ({ page }) => {
      await page.goto('/auth/signin');
      
      // Click guest access button
      await page.click('text=Continue Without Signing In');
      
      // Verify redirect to home page
      await page.waitForURL('/');
      
      // Verify guest mode indicators
      await expect(page.locator('text=Sign in for full access')).toBeVisible();
    });

    test('should validate email domain', async ({ page }) => {
      await page.goto('/auth/signin');
      
      // Fill in email with wrong domain
      await page.fill('input[name="email"]', 'test@gmail.com');
      await page.fill('input[name="password"]', 'Password123!');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Verify domain error
      await expect(page.locator('.text-red-600')).toContainText('Only @reichmanjorgensen.com email addresses are allowed');
    });
  });

  test.describe('Registration', () => {
    test('should show registration form', async ({ page }) => {
      await page.goto('/auth/register');
      
      // Verify form elements
      await expect(page.locator('input[name="name"]')).toBeVisible();
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    });

    test('should validate password requirements', async ({ page }) => {
      await page.goto('/auth/register');
      
      // Fill in weak password
      await page.fill('input[name="password"]', 'weak');
      await page.fill('input[name="confirmPassword"]', 'weak');
      
      // Check password requirements
      await expect(page.locator('text=At least 8 characters')).toHaveClass(/text-red-500/);
      await expect(page.locator('text=One uppercase letter')).toHaveClass(/text-red-500/);
      await expect(page.locator('text=One lowercase letter')).toHaveClass(/text-red-500/);
      await expect(page.locator('text=One number')).toHaveClass(/text-red-500/);
      await expect(page.locator('text=One special character')).toHaveClass(/text-red-500/);
      
      // Fill in strong password
      await page.fill('input[name="password"]', 'StrongPass123!');
      await page.fill('input[name="confirmPassword"]', 'StrongPass123!');
      
      // Check all requirements are met
      await expect(page.locator('text=At least 8 characters')).toHaveClass(/text-green-500/);
      await expect(page.locator('text=One uppercase letter')).toHaveClass(/text-green-500/);
      await expect(page.locator('text=One lowercase letter')).toHaveClass(/text-green-500/);
      await expect(page.locator('text=One number')).toHaveClass(/text-green-500/);
      await expect(page.locator('text=One special character')).toHaveClass(/text-green-500/);
    });

    test('should validate password match', async ({ page }) => {
      await page.goto('/auth/register');
      
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', 'newuser@reichmanjorgensen.com');
      await page.fill('input[name="password"]', 'StrongPass123!');
      await page.fill('input[name="confirmPassword"]', 'DifferentPass123!');
      
      await page.click('button[type="submit"]');
      
      // Verify password mismatch error
      await expect(page.locator('.text-red-600')).toContainText('Passwords do not match');
    });

    test('should validate email domain on registration', async ({ page }) => {
      await page.goto('/auth/register');
      
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', 'test@gmail.com');
      await page.fill('input[name="password"]', 'StrongPass123!');
      await page.fill('input[name="confirmPassword"]', 'StrongPass123!');
      
      await page.click('button[type="submit"]');
      
      // Verify domain error
      await expect(page.locator('.text-red-600')).toContainText('Only @reichmanjorgensen.com email addresses are allowed');
    });
  });

  test.describe('Password Reset', () => {
    test('should navigate to forgot password page', async ({ page }) => {
      await page.goto('/auth/signin');
      
      // Click forgot password link
      await page.click('text=Forgot your password?');
      
      // Verify navigation
      await expect(page).toHaveURL('/auth/forgot-password');
      await expect(page.locator('h1')).toContainText('Reset your password');
    });

    test('should submit password reset request', async ({ page }) => {
      await page.goto('/auth/forgot-password');
      
      // Fill in email
      await page.fill('input[name="email"]', TEST_CREDENTIALS.admin.email);
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Verify success message
      await expect(page.locator('.text-green-600')).toContainText('If an account exists with that email, you will receive password reset instructions');
    });

    test('should validate email on password reset', async ({ page }) => {
      await page.goto('/auth/forgot-password');
      
      // Fill in invalid email
      await page.fill('input[name="email"]', 'invalid-email');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Verify error
      await expect(page.locator('.text-red-600')).toContainText('Please enter a valid email address');
    });
  });

  test.describe('Session Management', () => {
    test('should sign out successfully', async ({ page }) => {
      // First sign in
      await page.goto('/auth/signin');
      await page.fill('input[name="email"]', TEST_CREDENTIALS.admin.email);
      await page.fill('input[name="password"]', TEST_CREDENTIALS.admin.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
      
      // Sign out
      await page.click('text=Sign out');
      
      // Verify redirect to signin page
      await expect(page).toHaveURL('/auth/signin');
      
      // Try to access protected page
      await page.goto('/');
      
      // Should redirect to signin
      await expect(page).toHaveURL('/auth/signin');
    });

    test('should persist session on page reload', async ({ page }) => {
      // Sign in
      await page.goto('/auth/signin');
      await page.fill('input[name="email"]', TEST_CREDENTIALS.admin.email);
      await page.fill('input[name="password"]', TEST_CREDENTIALS.admin.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
      
      // Reload page
      await page.reload();
      
      // Should still be logged in
      await expect(page.locator('text=Sign out')).toBeVisible();
      await expect(page).toHaveURL('/');
    });
  });
});