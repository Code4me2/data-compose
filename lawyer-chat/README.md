# Lawyer Chat - AI-Powered Legal Assistant

*Last Updated: 2025-06-25 - v0.9.5*

## 🚀 Overview

Lawyer Chat is a modern web application that provides an AI-powered chat interface for legal document queries. Built with Next.js 15 and integrated with n8n workflows and DeepSeek AI, it delivers intelligent legal assistance with document citations and advanced analysis tools. The system features enterprise-grade security, complete email verification, and a production-ready UI.

## 🎯 Key Features

- **AI-Powered Chat**: Real-time streaming responses with legal expertise
- **Document Citations**: Automatic source attribution for legal accuracy
- **Multi-Tool Support**: Page Turn and Analytics tools for comprehensive analysis
- **Dark Mode**: Professional theme with legal industry colors
- **Enterprise Security**: Domain-restricted access (@reichmanjorgensen.com)
- **Email Verification**: Full email system with multiple SMTP providers
- **Authentication**: Secure login with account lockout protection
- **Chat History**: Persistent conversations with time-based grouping
- **Responsive Design**: Optimized for desktop and mobile devices (320px to 4K)

## 🛠️ Tech Stack

- **Frontend**: Next.js 15.3.3, React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Authentication**: NextAuth.js with Prisma adapter
- **Database**: PostgreSQL with Prisma ORM
- **State Management**: Zustand with persistence
- **AI Integration**: n8n webhooks → DeepSeek R1 model
- **Email**: Nodemailer with Office 365/Gmail/SendGrid support
- **Security**: Rate limiting, input sanitization, CSRF protection
- **UI Components**: Lucide icons, React Markdown, date-fns

## 📁 Project Structure

```
lawyer-chat/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes
│   │   │   ├── auth/       # NextAuth endpoints
│   │   │   ├── chat/       # Chat streaming endpoint
│   │   │   └── chats/      # Chat management CRUD
│   │   ├── globals.css     # Global styles & themes
│   │   └── page.tsx        # Main chat interface
│   ├── components/         # React components
│   │   ├── TaskBar.tsx     # Universal navigation
│   │   ├── Sidebar.tsx     # Chat history sidebar
│   │   ├── DarkMode.tsx    # Theme switcher
│   │   └── CitationPanel.tsx # Document citations
│   ├── store/              # Zustand state
│   │   ├── sidebar.ts      # Sidebar state
│   │   └── darkMode.ts     # Theme state
│   └── utils/              # Utilities
│       └── mockCitations.ts # Development citations
├── prisma/
│   └── schema.prisma       # Database models
├── public/                 # Static assets
└── package.json           # Dependencies
```

## 🔄 Architecture & Workflow

### Data Flow
```
User Input → Next.js App → API Route → n8n Webhook → DeepSeek AI
     ↑                          ↓                          ↓
     ←── UI Update ←── Response Streaming ←── PostgreSQL ←─┘
```

### n8n Integration Flow

1. **User Message**: Sent to `/api/chat` endpoint
2. **API Processing**: Validates and enriches payload
3. **n8n Webhook**: Processes with AI workflow
4. **Response Streaming**: Real-time character-by-character display
5. **Database Storage**: Saves chat history for authenticated users

### Request Payload Structure
```json
{
  "message": "user query",
  "tools": ["page-turn", "analytics"],
  "sessionId": "user@email or anonymous",
  "timestamp": "ISO 8601",
  "metadata": {
    "userAgent": "browser info",
    "origin": "request origin"
  }
}
```

## 🚦 Project Status

### ✅ Completed (95%)
- Full chat interface with streaming
- Dark mode with professional theme
- Enterprise authentication system
- Email verification with multiple SMTP providers
- Database integration with PostgreSQL
- Security infrastructure (rate limiting, input validation)
- Multi-tool selection UI
- Citation display system
- Responsive design (320px to 4K)
- API structure with full CRUD operations
- Admin user management

### 🔧 In Progress
- n8n webhook activation (ready, just needs to be turned on)
- Tool workflow implementation

### 📋 Pending
- Haystack integration for real citations
- Analytics tool backend
- Full-text search
- Export functionality
- OAuth providers (Google, Microsoft)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (or Docker)
- n8n instance (for AI integration)
- SMTP credentials (optional, for email)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/manesha63/lawyer-chat.git
cd lawyer-chat
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
# Authentication
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key
NEXT_PUBLIC_NEXTAUTH_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/lawyerchat

# n8n Integration
N8N_WEBHOOK_URL=http://localhost:5678/webhook/your-webhook-id

# Email Configuration (Optional)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@reichmanjorgensen.com
SMTP_PASS=your-password
SMTP_FROM=AI Legal <noreply@reichmanjorgensen.com>
```

4. **Set up the database**
```bash
npx prisma generate
npx prisma db push
```

5. **Create an admin user**
```bash
npm run create-admin -- --email admin@reichmanjorgensen.com --password YourSecurePassword123!
```

6. **Run the development server**
```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) to see the application.

## 🐳 Docker Setup

For backend services (PostgreSQL, n8n, Elasticsearch):

```bash
cd ../data-compose
docker-compose up -d
```

Ensure the database port is exposed in `docker-compose.yml`:
```yaml
db:
  ports:
    - "5432:5432"
```

## 🔌 API Endpoints

### Chat Operations
- `POST /api/chat` - Send message to AI (streaming response)
- `GET /api/chat` - Health check

### Chat Management (Requires Auth)
- `GET /api/chats` - List user's chats
- `POST /api/chats` - Create new chat
- `GET /api/chats/[id]` - Get chat with messages
- `DELETE /api/chats/[id]` - Delete chat
- `POST /api/chats/[id]/messages` - Save message

## 🎨 UI Features

### Color Scheme
- **Primary Blue**: #004A84 (Headers, text, buttons)
- **Gold Accent**: #C7A562 (CTAs, primary buttons)
- **Dark Mode**: Custom palette with #1a1b1e background

### Components
- **TaskBar**: Collapsible navigation with chat history
- **Chat Interface**: Real-time streaming with markdown support
- **Citation Panel**: Document references with download options
- **Tool Selection**: Multi-select dropdown for AI tools

## 🧪 Testing

```bash
# Test API endpoint
node test-api.js

# Test n8n webhook integration
node test-webhook.js

# Test email sending
npm run test-email -- --to your-email@reichmanjorgensen.com
```

## 🔐 Security Features

- **Domain Restriction**: Only @reichmanjorgensen.com emails allowed
- **Account Lockout**: After 5 failed login attempts (30-minute lockout)
- **Rate Limiting**: 20 req/min for chat, 5 req/min for auth
- **Input Validation**: All inputs sanitized with DOMPurify
- **Audit Logging**: Complete trail of security events
- **CSRF Protection**: Ready but not activated
- **Security Headers**: X-Frame-Options, CSP, HSTS configured

## 🚧 Known Issues

1. **n8n Workflow**: Not activated (needs manual activation in n8n UI)
2. **Citations**: Using mock data (needs Haystack integration)
3. **Tools**: Backend workflows not implemented
4. **OAuth**: Google/Microsoft OAuth not configured

## 📈 Recent Updates (2025-06-25)

- ✅ Fixed all authentication errors
- ✅ Implemented complete email system with Nodemailer
- ✅ Resolved database connection issues
- ✅ Fixed PostCSS/Tailwind CSS build errors
- ✅ Fixed API fetch credentials issue
- ✅ Added comprehensive security features
- ✅ Created admin user management
- ✅ Updated all documentation

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- AI powered by [DeepSeek](https://deepseek.com/) via n8n
- UI components from [Lucide](https://lucide.dev/)
- Authentication by [NextAuth.js](https://next-auth.js.org/)

---

For more detailed technical documentation, please refer to the project wiki or contact the development team.