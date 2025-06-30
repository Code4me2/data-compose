import { GET, POST } from '../../chats/route';
import { 
  createMockRequest, 
  parseJsonResponse, 
  createMockSession,
  mockAuth,
  mockPrismaClient,
  resetAllMocks
} from './test-helpers';

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: mockPrismaClient,
}));

// Mock auth
jest.mock('next-auth', () => ({
  auth: jest.fn(),
}));

describe('/api/chats', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('GET', () => {
    it('should return 401 for unauthenticated users', async () => {
      mockAuth(null);
      
      const request = createMockRequest('/api/chats');
      const response = await GET(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return user chats for authenticated users', async () => {
      const session = createMockSession();
      mockAuth(session);
      
      const mockChats = [
        {
          id: 'chat-1',
          userId: session.user!.id,
          title: 'Test Chat 1',
          preview: 'Preview 1',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          _count: { messages: 5 },
        },
        {
          id: 'chat-2',
          userId: session.user!.id,
          title: 'Test Chat 2',
          preview: 'Preview 2',
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
          _count: { messages: 3 },
        },
      ];

      mockPrismaClient.chat.findMany.mockResolvedValue(mockChats);

      const request = createMockRequest('/api/chats');
      const response = await GET(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].title).toBe('Test Chat 1');
      expect(mockPrismaClient.chat.findMany).toHaveBeenCalledWith({
        where: { userId: session.user!.id },
        include: { _count: { select: { messages: true } } },
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('should handle database errors gracefully', async () => {
      const session = createMockSession();
      mockAuth(session);
      
      mockPrismaClient.chat.findMany.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('/api/chats');
      const response = await GET(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch chats');
    });
  });

  describe('POST', () => {
    it('should return 401 for unauthenticated users', async () => {
      mockAuth(null);
      
      const request = createMockRequest('/api/chats', {
        method: 'POST',
        body: { title: 'New Chat' },
      });
      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should create a new chat', async () => {
      const session = createMockSession();
      mockAuth(session);
      
      const newChat = {
        id: 'new-chat-id',
        userId: session.user!.id,
        title: 'New Chat',
        preview: 'This is a new chat',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.chat.create.mockResolvedValue(newChat);

      const request = createMockRequest('/api/chats', {
        method: 'POST',
        body: {
          title: 'New Chat',
          preview: 'This is a new chat',
        },
      });
      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(201);
      expect(data.id).toBe('new-chat-id');
      expect(data.title).toBe('New Chat');
      expect(mockPrismaClient.chat.create).toHaveBeenCalledWith({
        data: {
          userId: session.user!.id,
          title: 'New Chat',
          preview: 'This is a new chat',
        },
      });
    });

    it('should use default values when title is not provided', async () => {
      const session = createMockSession();
      mockAuth(session);
      
      mockPrismaClient.chat.create.mockResolvedValue({
        id: 'new-chat-id',
        userId: session.user!.id,
        title: 'New Conversation',
        preview: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = createMockRequest('/api/chats', {
        method: 'POST',
        body: {},
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockPrismaClient.chat.create).toHaveBeenCalledWith({
        data: {
          userId: session.user!.id,
          title: 'New Conversation',
          preview: '',
        },
      });
    });

    it('should handle validation errors', async () => {
      const session = createMockSession();
      mockAuth(session);
      
      const request = createMockRequest('/api/chats', {
        method: 'POST',
        body: { title: 'A'.repeat(256) }, // Too long
      });
      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });
});