import { POST as RegisterPOST } from '../../auth/register/route';
import { POST as ForgotPasswordPOST } from '../../auth/forgot-password/route';
import { POST as ResetPasswordPOST } from '../../auth/reset-password/route';
import { 
  createMockRequest, 
  parseJsonResponse, 
  mockPrismaClient,
  resetAllMocks
} from './test-helpers';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: mockPrismaClient,
}));

jest.mock('@/utils/email', () => ({
  sendRegistrationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('Auth API Routes', () => {
  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();
  });

  describe('/api/auth/register', () => {
    it('should register a new user', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      mockPrismaClient.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'newuser@reichmanjorgensen.com',
        name: 'New User',
        registrationToken: 'token',
        registrationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const request = createMockRequest('/api/auth/register', {
        method: 'POST',
        body: {
          email: 'newuser@reichmanjorgensen.com',
          name: 'New User',
          password: 'SecurePassword123!',
        },
      });

      const response = await RegisterPOST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(201);
      expect(data.message).toContain('Registration email sent');
      expect(mockPrismaClient.user.create).toHaveBeenCalled();
    });

    it('should reject non-company email domains', async () => {
      const request = createMockRequest('/api/auth/register', {
        method: 'POST',
        body: {
          email: 'user@gmail.com',
          name: 'External User',
          password: 'SecurePassword123!',
        },
      });

      const response = await RegisterPOST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('company email');
    });

    it('should reject if user already exists', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'existing@reichmanjorgensen.com',
      });

      const request = createMockRequest('/api/auth/register', {
        method: 'POST',
        body: {
          email: 'existing@reichmanjorgensen.com',
          name: 'Existing User',
          password: 'SecurePassword123!',
        },
      });

      const response = await RegisterPOST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('User already exists');
    });
  });

  describe('/api/auth/forgot-password', () => {
    it('should send password reset email', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'user@reichmanjorgensen.com',
        name: 'Test User',
      });

      mockPrismaClient.user.update.mockResolvedValue({
        id: 'user-id',
        email: 'user@reichmanjorgensen.com',
        passwordResetToken: 'reset-token',
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
      });

      const request = createMockRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: {
          email: 'user@reichmanjorgensen.com',
        },
      });

      const response = await ForgotPasswordPOST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(200);
      expect(data.message).toContain('password reset instructions');
      expect(mockPrismaClient.user.update).toHaveBeenCalled();
    });

    it('should return success even for non-existent users (security)', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const request = createMockRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: {
          email: 'nonexistent@reichmanjorgensen.com',
        },
      });

      const response = await ForgotPasswordPOST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(200);
      expect(data.message).toContain('password reset instructions');
      expect(mockPrismaClient.user.update).not.toHaveBeenCalled();
    });
  });

  describe('/api/auth/reset-password', () => {
    const validToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(validToken).digest('hex');

    it('should reset password with valid token', async () => {
      mockPrismaClient.user.findFirst.mockResolvedValue({
        id: 'user-id',
        email: 'user@reichmanjorgensen.com',
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000), // 30 min future
      });

      mockPrismaClient.user.update.mockResolvedValue({
        id: 'user-id',
        email: 'user@reichmanjorgensen.com',
      });

      const request = createMockRequest('/api/auth/reset-password', {
        method: 'POST',
        body: {
          token: validToken,
          password: 'NewSecurePassword123!',
        },
      });

      const response = await ResetPasswordPOST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(200);
      expect(data.message).toBe('Password reset successful');
      expect(bcrypt.hash).toHaveBeenCalledWith('NewSecurePassword123!', 10);
    });

    it('should reject expired tokens', async () => {
      mockPrismaClient.user.findFirst.mockResolvedValue({
        id: 'user-id',
        email: 'user@reichmanjorgensen.com',
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() - 60 * 1000), // 1 min past
      });

      const request = createMockRequest('/api/auth/reset-password', {
        method: 'POST',
        body: {
          token: validToken,
          password: 'NewSecurePassword123!',
        },
      });

      const response = await ResetPasswordPOST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid or expired reset token');
    });

    it('should reject invalid tokens', async () => {
      mockPrismaClient.user.findFirst.mockResolvedValue(null);

      const request = createMockRequest('/api/auth/reset-password', {
        method: 'POST',
        body: {
          token: 'invalid-token',
          password: 'NewSecurePassword123!',
        },
      });

      const response = await ResetPasswordPOST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid or expired reset token');
    });
  });
});