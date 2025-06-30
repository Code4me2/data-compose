import { Page } from '@playwright/test';

export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/auth/signin');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  
  // Wait for redirect to home page
  await page.waitForURL('/');
}

export async function signOut(page: Page) {
  // Click user menu if it exists
  const userMenu = page.locator('[data-testid="user-menu"]');
  if (await userMenu.isVisible()) {
    await userMenu.click();
    await page.click('text=Sign out');
  }
}

export async function createTestUser(email: string, password: string) {
  // This would typically call your API or database directly
  // For now, we'll assume the user exists in the test database
  return {
    email,
    password,
  };
}