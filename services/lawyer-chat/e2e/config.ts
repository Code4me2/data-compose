import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, 'test.env') });

// Test credentials from environment with safe defaults
export const TEST_CREDENTIALS = {
  user: {
    email: process.env.TEST_USER_EMAIL || 'testuser@example.com',
    password: process.env.TEST_USER_PASSWORD || 'TestPassword123!'
  },
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'testadmin@example.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'TestAdminPassword123!'
  }
};

// Test configuration
export const TEST_CONFIG = {
  baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000/chat',
  timeout: parseInt(process.env.TEST_TIMEOUT || '30000'),
  retries: parseInt(process.env.TEST_RETRIES || '2')
};