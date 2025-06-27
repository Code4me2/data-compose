# Lawyer-Chat Service

This is the lawyer-chat application integrated into data-compose. The application provides an AI-powered legal assistant interface with n8n webhook integration, designed specifically for Reichman Jorgensen LLP employees.

## Recent Updates (December 27, 2024)

### ✅ Major Features Completed
1. **Smart Chat History** - Conversations automatically saved with intelligent titles
2. **Email Verification** - Full Office 365 integration for user verification
3. **Local Development** - Streamlined setup for development environment
4. **Security Enhancements** - Fixed authentication and session management

### 🚀 Quick Start

#### Production Deployment (Docker)
```bash
docker-compose up -d
# Access at: http://localhost:8080/chat
```

#### Local Development
```bash
cd services/lawyer-chat
npm install
cp .env.example .env
# Edit .env with your settings
npm run dev
# Access at: http://localhost:3002
```

## Configuration

### Environment Variables
All environment variables are configured in the main docker-compose.yml file:
- `NEXTAUTH_URL`: Set to http://localhost:8080/chat
- `N8N_WEBHOOK_URL`: Internal Docker URL for n8n webhook
- Database connection via shared PostgreSQL instance

### BasePath Deployment
The application is configured to run at the `/chat` subpath:
- All routes are prefixed with `/chat`
- Static assets served from `/chat/*`
- API endpoints at `/chat/api/*`

### Key Files Modified for Integration
1. `next.config.ts` - Added basePath: '/chat'
2. `src/utils/api.ts` - Updated to prepend basePath to API calls
3. `src/store/csrf.ts` - Fixed CSRF token fetch path
4. `src/components/providers.tsx` - Fixed NextAuth basePath
5. All components with logo references - Updated to use `/chat/logo.png`

### Building
The service uses a multi-stage Docker build:
1. Dependencies stage - Installs npm packages
2. Builder stage - Builds Next.js application
3. Runner stage - Minimal production image

### Health Check
The container health is checked via the CSRF endpoint: `http://localhost:3000/chat/api/csrf`

## Development
To make changes:
1. Edit files in this directory
2. Rebuild: `docker compose build lawyer-chat`
3. Restart: `docker compose restart lawyer-chat`

## Webhook Integration
The application sends chat messages to n8n webhook:
- Webhook ID: `c188c31c-1c45-4118-9ece-5b6057ab5177`
- Ensure the corresponding workflow is active in n8n

## Features

### Core Functionality
- **AI-Powered Chat**: Integrated with n8n workflows for intelligent legal assistance
- **Smart Chat History**: 
  - Automatic conversation saving
  - Intelligent title generation from first message
  - Searchable history with time-based grouping
  - Full conversation replay
- **Secure Authentication**:
  - Restricted to @reichmanjorgensen.com emails
  - Email verification with Office 365
  - Password reset functionality
  - Session management with NextAuth
- **Professional UI/UX**:
  - Dark/light mode toggle
  - Responsive design (mobile to 4K)
  - Real-time message streaming
  - Citation panel for legal references
  - Analytics dashboard

### Security Features
- CSRF protection on all endpoints
- Rate limiting (20 messages/minute)
- Audit logging for all actions
- Secure password hashing (bcrypt)
- Input sanitization

## Database Schema

The application uses PostgreSQL with Prisma ORM:

```prisma
model User {
  id                String    @id @default(cuid())
  email             String    @unique
  emailVerified     DateTime?
  password          String?
  role              String    @default("user")
  chats             Chat[]
  auditLogs         AuditLog[]
}

model Chat {
  id        String    @id @default(cuid())
  userId    String?
  title     String?   // Auto-generated from first message
  preview   String?
  messages  Message[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Message {
  id         String   @id @default(cuid())
  chatId     String
  role       String   // 'user' or 'assistant'
  content    String
  references String[] // Legal document references
  createdAt  DateTime @default(now())
}
```

## Local Development Guide

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (via Docker)

### Setup Steps

1. **Database Setup**:
   ```bash
   # Ensure PostgreSQL is exposed in docker-compose.yml
   ports:
     - "5432:5432"
   ```

2. **Environment Configuration**:
   ```env
   # .env file
   NEXTAUTH_SECRET=your-secret-here
   NEXTAUTH_URL=http://localhost:3002
   DATABASE_URL=postgresql://your_db_user:your_secure_password_here@localhost:5432/lawyerchat
   
   # Email (optional for local dev)
   ENABLE_EMAIL=false  # Set to true for real emails
   SMTP_HOST=smtp.office365.com
   SMTP_PORT=587
   SMTP_USER=your-email@reichmanjorgensen.com
   SMTP_PASS=your-app-password
   ```

3. **Code Modifications for Local Dev**:
   - Comment out `basePath: '/chat'` in `next.config.ts`
   - Update `src/utils/api.ts` to remove basePath
   - Update `src/components/providers.tsx` SessionProvider

4. **Run Migrations**:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed  # Optional: adds test data
   ```

5. **Start Development**:
   ```bash
   npm run dev
   ```

### Creating Users

#### Via Registration Page
1. Navigate to http://localhost:3002/auth/register
2. Use a @reichmanjorgensen.com email
3. Check console for verification link (if ENABLE_EMAIL=false)

#### Via Script
```bash
npm run create-admin
# Or
node scripts/create-user.js
```

## Production Deployment

### Pre-Deployment Checklist
1. ✅ Uncomment `basePath: '/chat'` in `next.config.ts`
2. ✅ Set production environment variables
3. ✅ Enable email sending (ENABLE_EMAIL=true)
4. ✅ Configure n8n webhook
5. ✅ Set up SSL certificates
6. ✅ Configure backup strategy

### Docker Build
```bash
docker-compose build lawyer-chat
docker-compose up -d
```

### Health Monitoring
- Health check endpoint: `/chat/api/csrf`
- Monitor logs: `docker-compose logs -f lawyer-chat`

## Testing

### Unit Tests
```bash
npm test
npm test:coverage  # Generate coverage report
```

### E2E Tests
```bash
npm run test:e2e  # Playwright tests
```

### Manual Test Scripts
```bash
node scripts/test-email.js        # Test email configuration
node scripts/test-chat-titles.js  # Test title generation
node scripts/test-chat-history.js # Test full chat flow
```

## Troubleshooting

### Common Issues

1. **"Failed to fetch chat history"**
   - Ensure you're logged in
   - Check browser console for session errors
   - Verify DATABASE_URL is correct

2. **"Email not sending"**
   - Set ENABLE_EMAIL=true
   - Verify SMTP credentials
   - Check Office 365 app password

3. **"Session lost on code changes"**
   - Normal behavior in development
   - Sign in again after server restart

4. **"Database connection failed"**
   - Ensure PostgreSQL port 5432 is exposed
   - Check DATABASE_URL format
   - Verify database exists: `createdb lawyerchat`

### Debug Mode
Add to .env for verbose logging:
```env
DEBUG=prisma:*
NODE_ENV=development
```

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/callback/credentials` - Login
- `GET /api/auth/session` - Get current session
- `POST /api/auth/signout` - Logout
- `GET /api/auth/verify` - Email verification
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

### Chat Endpoints
- `GET /api/chats` - List user's chats
- `POST /api/chats` - Create new chat
- `GET /api/chats/[id]` - Get chat with messages
- `POST /api/chats/[id]/messages` - Add message to chat
- `DELETE /api/chats/[id]` - Delete chat

### Webhook Integration
- Endpoint: `/api/chat`
- Sends to: n8n webhook
- Payload format:
  ```json
  {
    "message": "user message",
    "tools": ["default", "analytics"],
    "sessionId": "user@email.com",
    "timestamp": "ISO 8601"
  }
  ```

## Contributing

1. Create feature branch
2. Make changes
3. Run tests: `npm test`
4. Check linting: `npm run lint`
5. Submit PR with description

## Known Issues
- **P3005 Database Warning**: On first startup, you may see "The database schema is not empty" warning. This is expected when connecting to an existing database and doesn't affect functionality.
- **Test Coverage**: Currently at 18.84% - needs improvement
- **n8n Workflow**: Must be manually activated in n8n interface