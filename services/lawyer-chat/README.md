# AI Legal Assistant - Lawyer Chat

<div align="center">
  <img src="/chat/logo.png" alt="AI Legal Logo" width="120" height="120">
  
  **Enterprise Legal AI Platform**
  
  [![Security](https://img.shields.io/badge/Security-A--Grade-green)](docs/SECURITY.md)
  [![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)
  [![License](https://img.shields.io/badge/License-Proprietary-red)](LICENSE)
  [![Docker](https://img.shields.io/badge/Docker-Ready-blue)](docker-compose.yml)
</div>

## 🎯 Overview

AI Legal Assistant (Lawyer Chat) is an enterprise-grade legal AI platform that empowers legal professionals with intelligent document analysis, case law research, and AI-powered legal insights. Built specifically for Reichman Jorgensen LLP, it combines cutting-edge AI technology with robust security and compliance features.

### Key Features

- 🤖 **AI-Powered Legal Research** - Get precise, citation-backed answers to complex legal queries
- 📚 **Smart Document Analysis** - Upload and analyze legal documents with AI insights
- 💬 **Intelligent Chat Interface** - Natural conversation with context-aware responses
- 🔒 **Enterprise Security** - Bank-grade encryption, audit trails, and access controls
- 📊 **Advanced Analytics** - Visualize trends and patterns in legal data
- 🌙 **Professional UI/UX** - Dark mode, responsive design, and intuitive navigation
- 📥 **Export Capabilities** - Generate professional reports in PDF/TXT formats

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL 15+
- 8GB+ RAM recommended

### Production Deployment (5 minutes)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/data-compose.git
cd data-compose

# 2. Configure environment
cp .env.example .env
# Edit .env with your production values

# 3. Start all services
docker-compose up -d

# 4. Access the application
# Main interface: http://localhost:8080/chat
# Admin panel: http://localhost:8080/chat/admin
```

### Local Development

```bash
# 1. Start backend services
docker-compose up -d db n8n

# 2. Configure lawyer-chat
cd services/lawyer-chat
cp .env.example .env
npm install

# 3. Initialize database
npx prisma migrate deploy
npx prisma db seed

# 4. Start development server
npm run dev

# Access at: http://localhost:3002
```

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────┐         ┌────────────────────────────────────┐
│    Lawyer Chat Frontend     │         │      Data-Compose Backend          │
│      (Next.js/React)        │         │                                    │
├─────────────────────────────┤         ├────────────────────────────────────┤
│ • TypeScript + React 19     │  HTTPS  │ • NGINX Proxy (Load Balancer)      │
│ • Tailwind CSS v4           │────────▶│ • n8n Workflows (Automation)       │
│ • NextAuth.js (Auth)        │         │ • PostgreSQL 15 (Database)         │
│ • Zustand (State)           │         │ • Elasticsearch (Search)           │
│ • SSE (Real-time)           │         │ • DeepSeek AI (via Ollama)        │
└─────────────────────────────┘         └────────────────────────────────────┘
```

### Service Components

| Service | Purpose | Port | Technology |
|---------|---------|------|------------|
| **lawyer-chat** | Frontend UI | 3000 | Next.js 15, React 19 |
| **nginx** | Reverse Proxy | 8080 | NGINX |
| **n8n** | Workflow Engine | 5678 | n8n |
| **postgres** | Database | 5432 | PostgreSQL 15 |
| **elasticsearch** | Search Engine | 9200 | Elasticsearch 8 |
| **haystack** | Document API | 8000 | FastAPI |

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following configuration:

```env
# Authentication
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
NEXTAUTH_URL=https://yourdomain.com/chat

# Database
DATABASE_URL=postgresql://user:password@db:5432/lawyerchat

# Email Configuration
ENABLE_EMAIL=true
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=notifications@reichmanjorgensen.com
SMTP_PASS=<app-password>

# n8n Integration
N8N_WEBHOOK_URL=http://n8n:5678/webhook/<webhook-id>

# Security
ALLOWED_EMAIL_DOMAIN=reichmanjorgensen.com
SESSION_TIMEOUT_HOURS=8
MAX_LOGIN_ATTEMPTS=5
```

### Security Configuration

The application includes comprehensive security features:

- **Authentication**: Domain-restricted access, email verification, secure password reset
- **Authorization**: Role-based access control (Admin, User roles)
- **Protection**: CSRF tokens, rate limiting, XSS prevention, SQL injection protection
- **Monitoring**: Audit logs, security events, error tracking

See [Security Documentation](docs/SECURITY.md) for detailed configuration.

## 📋 Features

### For Legal Professionals

#### 1. **Intelligent Chat Interface**
- Natural language queries about legal topics
- Context-aware responses with legal citations
- Multi-turn conversations with memory
- Real-time streaming responses

#### 2. **Document Analysis Tools**
- **Page Turn**: Analyze documents page by page
- **Analytics**: Extract trends and insights
- **Citations**: Access full legal documents
- **Export**: Download research in professional formats

#### 3. **Smart Organization**
- Auto-generated chat titles
- Searchable chat history
- Time-based grouping
- Quick access to past research

#### 4. **Professional Features**
- Dark/light mode toggle
- Responsive design (mobile to 4K)
- Keyboard shortcuts
- Offline capability (PWA)

### For Administrators

#### 1. **User Management**
- Create/edit/delete users
- Role assignment
- Activity monitoring
- Access control

#### 2. **System Monitoring**
- Real-time usage statistics
- Performance metrics
- Error tracking
- Audit logs

#### 3. **Configuration**
- Email templates
- Security policies
- Integration settings
- Backup management

## 🛠️ Development

### Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── chat/         # Chat streaming endpoint
│   │   └── chats/        # Chat CRUD operations
│   ├── auth/             # Auth pages (login, register, etc.)
│   └── page.tsx          # Main chat interface
├── components/            # Reusable React components
│   ├── TaskBar.tsx       # Navigation sidebar
│   ├── CitationPanel.tsx # Document viewer
│   └── SafeMarkdown.tsx  # Secure markdown renderer
├── lib/                   # Core libraries
│   ├── auth.ts           # NextAuth configuration
│   ├── prisma.ts         # Database client
│   └── errorMonitoring.ts # Error tracking
├── store/                 # Zustand stores
│   ├── sidebar.ts        # UI state
│   └── csrf.ts           # Security tokens
└── utils/                 # Utilities
    ├── api.ts            # API client
    ├── validation.ts     # Input validation
    └── logger.ts         # Logging utility
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run tests
npm run test:e2e     # Run E2E tests
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed test data
```

### Testing

The application includes comprehensive test coverage:

- **Unit Tests**: Jest + React Testing Library
- **Integration Tests**: API route testing
- **E2E Tests**: Playwright
- **Security Tests**: OWASP compliance

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## 🔌 API Reference

### Authentication Endpoints

```http
POST   /api/auth/register       # User registration
POST   /api/auth/signin         # User login
POST   /api/auth/signout        # User logout
GET    /api/auth/session        # Get session
POST   /api/auth/forgot-password # Password reset request
POST   /api/auth/reset-password  # Reset password
GET    /api/auth/verify         # Email verification
```

### Chat Endpoints

```http
GET    /api/chats              # List user's chats
POST   /api/chats              # Create new chat
GET    /api/chats/:id          # Get chat details
DELETE /api/chats/:id          # Delete chat
POST   /api/chats/:id/messages # Add message
POST   /api/chat               # Stream chat response (SSE)
```

### Admin Endpoints

```http
GET    /api/admin/users        # List all users
POST   /api/admin/users        # Create user
PUT    /api/admin/users/:id    # Update user
DELETE /api/admin/users/:id    # Delete user
GET    /api/admin/stats        # System statistics
GET    /api/admin/audit-logs   # Audit logs
```

## 📊 Monitoring & Logging

### Logging

The application uses structured logging with different levels:

```javascript
logger.info('User logged in', { userId, ip });
logger.warn('Rate limit exceeded', { endpoint, ip });
logger.error('Database connection failed', { error });
```

### Metrics

Key metrics tracked:
- Response times
- Error rates
- User activity
- Resource usage
- Security events

### Health Checks

```bash
# Application health
curl http://localhost:8080/chat/api/health

# Database health
curl http://localhost:8080/chat/api/health/db

# All services
curl http://localhost:8080/chat/api/health/all
```

## 🚨 Troubleshooting

### Common Issues

#### Chat History Not Loading
```bash
# Check database connection
docker-compose logs db

# Verify session
curl http://localhost:8080/chat/api/auth/session
```

#### AI Responses Timing Out
```bash
# Check n8n workflow
docker-compose logs n8n

# Verify webhook
curl -X POST http://localhost:5678/webhook/<id> \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

#### Email Not Sending
```bash
# Test email configuration
cd services/lawyer-chat
node scripts/test-email.js
```

See [Troubleshooting Guide](docs/TROUBLESHOOTING.md) for more solutions.

## 🔐 Security

### Security Features

- **Authentication**: Multi-factor authentication ready
- **Encryption**: TLS 1.3, AES-256 for data at rest
- **Access Control**: Role-based permissions
- **Audit Trail**: Complete activity logging
- **Compliance**: GDPR, CCPA ready

### Security Best Practices

1. Always use HTTPS in production
2. Rotate secrets regularly
3. Enable 2FA for admin accounts
4. Review audit logs weekly
5. Keep dependencies updated

See [Security Policy](SECURITY.md) for vulnerability reporting.

## 📈 Performance

### Optimization Features

- Server-side rendering (SSR)
- Image optimization
- Code splitting
- Lazy loading
- CDN ready

### Benchmarks

- **First Contentful Paint**: < 1.2s
- **Time to Interactive**: < 2.5s
- **API Response Time**: < 200ms
- **Concurrent Users**: 1000+

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is proprietary software. All rights reserved by Reichman Jorgensen LLP.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Powered by [DeepSeek AI](https://deepseek.ai/)
- Workflow automation by [n8n](https://n8n.io/)
- Search by [Elasticsearch](https://elastic.co/)

## 📞 Support

For support, please contact:
- **Email**: support@reichmanjorgensen.com
- **Internal**: IT Help Desk x4567
- **Emergency**: On-call rotation

---

<div align="center">
  Made with ❤️ by Reichman Jorgensen LLP
  
  [Documentation](docs/) • [API Reference](docs/API.md) • [Security](docs/SECURITY.md)
</div>