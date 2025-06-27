# AI Legal Assistant - Developer Guide

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Development Environment Setup](#development-environment-setup)
3. [Project Structure](#project-structure)
4. [Core Technologies](#core-technologies)
5. [Backend Services](#backend-services)
6. [Frontend Development](#frontend-development)
7. [API Development](#api-development)
8. [Database Management](#database-management)
9. [Authentication & Security](#authentication--security)
10. [Testing Strategy](#testing-strategy)
11. [Deployment Process](#deployment-process)
12. [Performance Optimization](#performance-optimization)
13. [Monitoring & Debugging](#monitoring--debugging)
14. [Contributing Guidelines](#contributing-guidelines)
15. [Common Tasks](#common-tasks)

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Load Balancer (NGINX)                    │
├─────────────────────────────────────────────────────────────────┤
│                              ↓                                   │
├─────────────────────────────┬─────────────────────────────────┤
│   Lawyer-Chat Frontend      │      Backend Services            │
│   (Next.js + React)         │                                  │
│   - SSR/SSG                 │   ┌─────────────────────┐       │
│   - API Routes              │   │   n8n Workflows     │       │
│   - WebSocket               │   └──────────┬──────────┘       │
│                             │              ↓                    │
│                             │   ┌─────────────────────┐       │
│                             │   │  PostgreSQL DB      │       │
│                             │   └─────────────────────┘       │
│                             │              ↓                    │
│                             │   ┌─────────────────────┐       │
│                             │   │  Elasticsearch      │       │
│                             │   └─────────────────────┘       │
└─────────────────────────────┴─────────────────────────────────┘
```

### Service Communication

```mermaid
graph LR
    A[Browser] -->|HTTPS| B[NGINX]
    B -->|/chat/*| C[Lawyer-Chat]
    B -->|/webhook/*| D[n8n]
    C -->|API Calls| D
    D -->|Workflow| E[DeepSeek AI]
    D -->|Search| F[Haystack]
    F -->|Query| G[Elasticsearch]
    C -->|ORM| H[PostgreSQL]
```

---

## Development Environment Setup

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Docker**: v24.0.0 or higher
- **Docker Compose**: v2.20.0 or higher
- **Git**: v2.30.0 or higher
- **PostgreSQL**: v15 (via Docker)

### Initial Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd data-compose

# 2. Set up environment variables
cp .env.example .env
cd services/lawyer-chat
cp .env.example .env

# 3. Install dependencies
npm install

# 4. Start backend services
cd ../..
docker-compose up -d db n8n elasticsearch

# 5. Initialize database
cd services/lawyer-chat
npx prisma migrate dev
npx prisma db seed

# 6. Start development server
npm run dev
```

### Environment Variables

#### Essential Variables (.env)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/lawyerchat"

# Authentication
NEXTAUTH_SECRET="<generate-with-openssl-rand-base64-32>"
NEXTAUTH_URL="http://localhost:3002"

# Email (Development)
ENABLE_EMAIL=false
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=<ethereal-user>
SMTP_PASS=<ethereal-pass>

# n8n Integration
N8N_WEBHOOK_URL="http://localhost:5678/webhook/c188c31c-1c45-4118-9ece-5b6057ab5177"

# Development
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug
```

### VS Code Configuration

`.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

`.vscode/extensions.json`:
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "prisma.prisma",
    "bradlc.vscode-tailwindcss",
    "christian-kohler.npm-intellisense"
  ]
}
```

---

## Project Structure

### Root Directory Structure

```
data-compose/
├── docker-compose.yml          # Main Docker configuration
├── docker-compose.haystack.yml # Haystack services
├── .env                        # Environment variables
├── nginx/                      # NGINX configuration
│   └── conf.d/
│       └── default.conf        # Routing rules
├── services/
│   └── lawyer-chat/           # Main application
├── n8n/                       # Workflow engine
│   ├── custom-nodes/          # Custom integrations
│   └── workflows/             # Exported workflows
└── website/                   # Legacy static site
```

### Lawyer-Chat Structure

```
services/lawyer-chat/
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/              # API routes
│   │   │   ├── auth/        # Authentication endpoints
│   │   │   ├── chat/        # Chat streaming
│   │   │   └── chats/       # CRUD operations
│   │   ├── auth/            # Auth pages
│   │   ├── globals.css      # Global styles
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Main chat page
│   ├── components/          # React components
│   │   ├── ui/             # Base UI components
│   │   ├── chat/           # Chat-specific components
│   │   └── auth/           # Auth components
│   ├── lib/                # Core libraries
│   │   ├── auth.ts         # NextAuth config
│   │   ├── prisma.ts       # Database client
│   │   └── utils.ts        # Utilities
│   ├── store/              # Zustand stores
│   ├── types/              # TypeScript types
│   └── utils/              # Helper functions
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Migration files
├── public/                 # Static assets
├── scripts/                # Utility scripts
└── tests/                  # Test files
```

---

## Core Technologies

### Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.3.3 | React framework with SSR/SSG |
| **React** | 19.0.0 | UI library |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 4.0.0-beta | Styling |
| **Zustand** | 5.0.5 | State management |
| **NextAuth.js** | 4.24.11 | Authentication |
| **Prisma** | 6.9.0 | Database ORM |
| **React Query** | 5.65.1 | Data fetching (optional) |

### Backend Stack

| Technology | Purpose |
|------------|---------|
| **PostgreSQL** | Primary database |
| **n8n** | Workflow automation |
| **Elasticsearch** | Document search |
| **Redis** | Caching (future) |
| **Docker** | Containerization |
| **NGINX** | Reverse proxy |

### Development Tools

| Tool | Purpose |
|------|---------|
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **Jest** | Unit testing |
| **Playwright** | E2E testing |
| **Prisma Studio** | Database GUI |
| **Docker Compose** | Service orchestration |

---

## Backend Services

### PostgreSQL Database

#### Connection
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

#### Schema Management
```bash
# Create migration
npx prisma migrate dev --name add_feature

# Apply migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset

# Generate client
npx prisma generate
```

### n8n Workflow Engine

#### Webhook Integration
```typescript
// utils/webhook.ts
export async function sendToWebhook(data: WebhookPayload) {
  const response = await fetch(process.env.N8N_WEBHOOK_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.N8N_API_KEY || '',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.statusText}`)
  }
  
  return response
}
```

#### Custom Nodes
Located in `n8n/custom-nodes/`:
- **n8n-nodes-deepseek**: AI integration
- **n8n-nodes-haystack**: Search integration
- **n8n-nodes-hierarchicalSummarization**: Document processing

### Elasticsearch/Haystack

#### Search Integration
```typescript
// services/search.ts
export class SearchService {
  private apiUrl = process.env.HAYSTACK_API_URL || 'http://localhost:8000'
  
  async search(query: string, options: SearchOptions) {
    const response = await fetch(`${this.apiUrl}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, ...options }),
    })
    
    return response.json()
  }
}
```

---

## Frontend Development

### Component Architecture

#### Component Structure
```typescript
// components/chat/MessageList.tsx
import { memo } from 'react'
import { Message } from '@/types'
import MessageItem from './MessageItem'

interface MessageListProps {
  messages: Message[]
  isLoading?: boolean
}

export const MessageList = memo(({ messages, isLoading }: MessageListProps) => {
  return (
    <div className="flex flex-col gap-4">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      {isLoading && <LoadingIndicator />}
    </div>
  )
})

MessageList.displayName = 'MessageList'
```

### State Management

#### Zustand Store
```typescript
// store/chat.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ChatStore {
  messages: Message[]
  addMessage: (message: Message) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      messages: [],
      addMessage: (message) => 
        set((state) => ({ messages: [...state.messages, message] })),
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'chat-store',
    }
  )
)
```

### Styling with Tailwind

#### Custom Components
```css
/* globals.css */
@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-blue-600 text-white rounded-lg 
           hover:bg-blue-700 active:bg-blue-800 
           transition-colors duration-200;
  }
  
  .card {
    @apply bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6;
  }
}
```

### Dark Mode Implementation

```typescript
// components/DarkModeToggle.tsx
export function DarkModeToggle() {
  const { isDarkMode, toggleDarkMode } = useSidebarStore()
  
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode)
  }, [isDarkMode])
  
  return (
    <button onClick={toggleDarkMode}>
      {isDarkMode ? <Sun /> : <Moon />}
    </button>
  )
}
```

---

## API Development

### API Route Structure

#### Basic API Route
```typescript
// app/api/chats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const chats = await prisma.chat.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { messages: true } }
    }
  })
  
  return NextResponse.json(chats)
}
```

### Server-Sent Events (SSE)

```typescript
// app/api/chat/route.ts
export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      // Send data
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'text', text: 'Hello' })}\n\n`)
      )
      
      // Close stream
      controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'))
      controller.close()
    },
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

### Error Handling

```typescript
// lib/api-error.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message)
  }
}

// Usage in API route
try {
  // ... operation
} catch (error) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    )
  }
  
  logger.error('Unexpected error', error)
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
```

---

## Database Management

### Prisma Schema

```prisma
// prisma/schema.prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String?
  name          String?
  emailVerified DateTime?
  image         String?
  role          String    @default("user")
  locked        Boolean   @default(false)
  loginAttempts Int       @default(0)
  lastLoginAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  chats         Chat[]
  sessions      Session[]
  auditLogs     AuditLog[]
}

model Chat {
  id        String    @id @default(cuid())
  userId    String?
  title     String?
  preview   String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  user      User?     @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages  Message[]
  
  @@index([userId, updatedAt])
}
```

### Database Queries

#### Optimized Queries
```typescript
// Avoid N+1 queries
const chatsWithMessages = await prisma.chat.findMany({
  where: { userId },
  include: {
    messages: {
      orderBy: { createdAt: 'asc' },
      include: { citations: true }
    }
  }
})

// Use select for performance
const chatTitles = await prisma.chat.findMany({
  where: { userId },
  select: {
    id: true,
    title: true,
    updatedAt: true
  }
})
```

### Migration Best Practices

```bash
# Always review migrations before applying
npx prisma migrate dev --create-only

# Test rollback locally
npx prisma migrate reset

# Use transactions for data migrations
npx prisma migrate dev --name complex_migration
```

---

## Authentication & Security

### NextAuth Configuration

```typescript
// lib/auth.ts
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })
        
        if (!user || !user.password) {
          throw new Error('User not found')
        }
        
        const isValid = await bcrypt.compare(
          credentials.password, 
          user.password
        )
        
        if (!isValid) {
          throw new Error('Invalid password')
        }
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    }
  }
}
```

### Security Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyCSRFToken } from './lib/csrf'

export async function middleware(request: NextRequest) {
  // Rate limiting
  const ip = request.ip || 'unknown'
  const identifier = `${ip}:${request.nextUrl.pathname}`
  
  if (isRateLimited(identifier)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }
  
  // CSRF protection
  if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
    const token = request.headers.get('x-csrf-token')
    const isValid = await verifyCSRFToken(token)
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      )
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*'
}
```

### Input Validation

```typescript
// utils/validation.ts
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

export const messageSchema = z.object({
  content: z.string()
    .min(1, 'Message cannot be empty')
    .max(10000, 'Message too long')
    .transform(val => DOMPurify.sanitize(val)),
  tools: z.array(z.string()).optional(),
  references: z.array(z.string()).optional()
})

// Usage
const result = messageSchema.safeParse(requestBody)
if (!result.success) {
  return NextResponse.json(
    { error: result.error.issues },
    { status: 400 }
  )
}
```

---

## Testing Strategy

### Unit Testing

```typescript
// __tests__/utils/chatTitle.test.ts
import { generateChatTitle } from '@/utils/chatTitle'

describe('generateChatTitle', () => {
  it('removes greeting from message', () => {
    const result = generateChatTitle('Hi, what is contract law?')
    expect(result).toBe('What is contract law')
  })
  
  it('truncates long messages', () => {
    const longMessage = 'a'.repeat(100)
    const result = generateChatTitle(longMessage)
    expect(result.length).toBeLessThanOrEqual(53) // 50 + '...'
  })
})
```

### Integration Testing

```typescript
// __tests__/api/chats.test.ts
import { createMocks } from 'node-mocks-http'
import { GET } from '@/app/api/chats/route'

describe('/api/chats', () => {
  it('returns 401 when not authenticated', async () => {
    const { req } = createMocks({ method: 'GET' })
    const response = await GET(req)
    
    expect(response.status).toBe(401)
  })
})
```

### E2E Testing

```typescript
// e2e/chat.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Chat functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat')
    await loginUser(page)
  })
  
  test('sends and receives messages', async ({ page }) => {
    await page.fill('[data-testid="chat-input"]', 'Test message')
    await page.press('[data-testid="chat-input"]', 'Enter')
    
    await expect(page.locator('[data-testid="message"]')).toContainText('Test message')
    await expect(page.locator('[data-testid="ai-response"]')).toBeVisible()
  })
})
```

### Test Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
}
```

---

## Deployment Process

### Docker Build

```dockerfile
# Dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=deps /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm test
      - run: npm run lint
      
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -t lawyer-chat .
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push lawyer-chat
```

### Production Configuration

```nginx
# nginx/conf.d/production.conf
server {
    listen 443 ssl http2;
    server_name legal.example.com;
    
    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    location /chat {
        proxy_pass http://lawyer-chat:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Performance Optimization

### Frontend Optimization

#### Code Splitting
```typescript
// Dynamic imports
const CitationPanel = dynamic(() => import('@/components/CitationPanel'), {
  loading: () => <Skeleton />,
  ssr: false
})
```

#### Image Optimization
```typescript
import Image from 'next/image'

<Image
  src="/logo.png"
  alt="Logo"
  width={120}
  height={120}
  priority
  placeholder="blur"
  blurDataURL={logoBlurData}
/>
```

#### Bundle Analysis
```bash
# Analyze bundle size
npm run build
npm run analyze
```

### Backend Optimization

#### Database Indexes
```sql
-- Add indexes for frequent queries
CREATE INDEX idx_chats_user_updated ON chats(user_id, updated_at DESC);
CREATE INDEX idx_messages_chat_created ON messages(chat_id, created_at);
```

#### Caching Strategy
```typescript
// Redis caching (future)
import { createClient } from 'redis'

const redis = createClient({ url: process.env.REDIS_URL })

export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 3600
): Promise<T> {
  const cached = await redis.get(key)
  
  if (cached) {
    return JSON.parse(cached)
  }
  
  const data = await fetcher()
  await redis.setex(key, ttl, JSON.stringify(data))
  
  return data
}
```

---

## Monitoring & Debugging

### Logging

```typescript
// utils/logger.ts
import winston from 'winston'

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }))
}
```

### Error Monitoring

```typescript
// lib/errorMonitoring.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  beforeSend(event) {
    // Sanitize sensitive data
    if (event.request?.cookies) {
      delete event.request.cookies
    }
    return event
  }
})
```

### Performance Monitoring

```typescript
// pages/_app.tsx
import { useReportWebVitals } from 'next/web-vitals'

export function reportWebVitals(metric: NextWebVitalsMetric) {
  // Send to analytics
  analytics.track('Web Vitals', {
    name: metric.name,
    value: metric.value,
    label: metric.id
  })
}
```

### Debug Mode

```typescript
// Enable debug logging
if (process.env.DEBUG === 'true') {
  localStorage.debug = 'app:*'
  
  // Log all API calls
  window.fetch = new Proxy(window.fetch, {
    apply: (target, thisArg, args) => {
      console.log('Fetch:', args[0], args[1])
      return target.apply(thisArg, args)
    }
  })
}
```

---

## Contributing Guidelines

### Code Style

#### TypeScript
```typescript
// ✅ Good
interface UserProps {
  user: User
  onUpdate: (user: User) => void
}

// ❌ Bad
interface UserProps {
  user: any
  onUpdate: Function
}
```

#### React Components
```typescript
// ✅ Good - Functional component with proper types
export const UserCard: FC<UserProps> = ({ user, onUpdate }) => {
  return <div>{user.name}</div>
}

// ❌ Bad - Class component without types
class UserCard extends Component {
  render() {
    return <div>{this.props.user.name}</div>
  }
}
```

### Git Workflow

```bash
# Feature branch
git checkout -b feature/add-user-profile

# Commit with conventional commits
git commit -m "feat: add user profile page"
git commit -m "fix: resolve profile image upload issue"
git commit -m "docs: update user profile documentation"

# Push and create PR
git push origin feature/add-user-profile
```

### Pull Request Process

1. **Create feature branch** from `develop`
2. **Write tests** for new features
3. **Update documentation** if needed
4. **Run all checks** locally:
   ```bash
   npm run lint
   npm run test
   npm run build
   ```
5. **Create PR** with description
6. **Address review comments**
7. **Merge** after approval

### Code Review Checklist

- [ ] Tests included and passing
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] Error handling implemented
- [ ] Security considerations addressed
- [ ] Performance impact considered
- [ ] Accessibility maintained

---

## Common Tasks

### Adding a New API Endpoint

1. Create route file:
```typescript
// app/api/users/[id]/route.ts
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Implementation
}
```

2. Add validation:
```typescript
const schema = z.object({
  id: z.string().cuid()
})
```

3. Add tests:
```typescript
// __tests__/api/users/[id].test.ts
```

### Adding a New Component

1. Create component:
```typescript
// components/UserProfile.tsx
export function UserProfile({ user }: UserProfileProps) {
  // Implementation
}
```

2. Add stories (optional):
```typescript
// components/UserProfile.stories.tsx
export default {
  title: 'Components/UserProfile',
  component: UserProfile,
}
```

3. Add tests:
```typescript
// components/__tests__/UserProfile.test.tsx
```

### Database Schema Changes

1. Update schema:
```prisma
model User {
  // ... existing fields
  bio String? // New field
}
```

2. Create migration:
```bash
npx prisma migrate dev --name add_user_bio
```

3. Update types and API:
```typescript
// Update relevant TypeScript interfaces
// Update API endpoints if needed
```

### Debugging Production Issues

1. **Check logs**:
```bash
docker-compose logs -f lawyer-chat
```

2. **Check database**:
```bash
npx prisma studio
```

3. **Check n8n workflows**:
- Access n8n UI at http://localhost:5678
- Check execution history

4. **Use debug endpoint**:
```typescript
// app/api/debug/route.ts (dev only)
export async function GET() {
  return NextResponse.json({
    env: process.env.NODE_ENV,
    database: await prisma.$queryRaw`SELECT 1`,
    // Other debug info
  })
}
```

---

## Conclusion

This guide covers the essential aspects of developing for AI Legal Assistant. As the project evolves, keep this documentation updated and refer to the codebase for the most current implementations.

For questions or clarifications:
- Check existing code for patterns
- Review test files for examples
- Consult team members
- Update documentation when you learn something new

Happy coding! 🚀