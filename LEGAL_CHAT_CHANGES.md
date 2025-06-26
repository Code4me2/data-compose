# Legal Chat Integration - Change Documentation

This document lists all files created or modified to integrate the legal-chat application into the data-compose project.

## Files Modified

### 1. `/data-compose/docker-compose.yml`
**Changes:** Added legal-chat service configuration

```yaml
  legal-chat:
    build: ./lawyer-chat
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL="${LEGAL_CHAT_DATABASE_URL:-postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/legal_chat}"
      - NEXTAUTH_URL="${LEGAL_CHAT_NEXTAUTH_URL:-http://localhost:8080/legal-chat}"
      - NEXTAUTH_SECRET="${LEGAL_CHAT_NEXTAUTH_SECRET}"
      - EMAIL_SERVER="${LEGAL_CHAT_EMAIL_SERVER}"
      - EMAIL_FROM="${LEGAL_CHAT_EMAIL_FROM:-noreply@legal-chat.local}"
      - N8N_WEBHOOK_URL="http://n8n:5678/webhook/legal-chat"
      - BASE_PATH="/legal-chat"
      - NODE_ENV=production
    depends_on:
      - db
      - n8n
    networks:
      - backend
      - frontend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/legal-chat/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 2. `/data-compose/nginx/conf.d/default.conf`
**Changes:** Added routing configuration for legal-chat

```nginx
    # Legal Chat frontend
    location /legal-chat/ {
        proxy_pass http://legal-chat:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Prefix /legal-chat;
        
        # WebSocket support for Next.js hot reload (development)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # SSE support for streaming responses
        proxy_buffering off;
        proxy_cache off;
        
        # Timeout settings
        proxy_read_timeout 600s;
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        send_timeout 600s;
    }
```

### 3. `/data-compose/.env.example`
**Changes:** Added legal-chat environment variable examples

```bash
# Legal Chat Configuration
LEGAL_CHAT_NEXTAUTH_SECRET="your_nextauth_secret_here"
# Optional: Override default database URL
# LEGAL_CHAT_DATABASE_URL="postgresql://user:pass@db:5432/legal_chat"
# Optional: Email configuration for NextAuth
# LEGAL_CHAT_EMAIL_SERVER="smtp://user:pass@smtp.example.com:587"
# LEGAL_CHAT_EMAIL_FROM="noreply@legal-chat.local"
# Optional: Override NextAuth URL
# LEGAL_CHAT_NEXTAUTH_URL="http://localhost:8080/legal-chat"
```

### 4. `/lawyer-chat/next.config.ts`
**Changes:** Added base path configuration

```typescript
const nextConfig: NextConfig = {
  // Handle running behind a reverse proxy with a base path
  basePath: process.env.BASE_PATH || '',
  
  async headers() {
```

## Files Created

### 1. `/lawyer-chat/Dockerfile`
**Purpose:** Docker containerization for the legal-chat application
**Content:** Multi-stage build with:
- Build stage using Node.js 20 Alpine
- Runtime stage with non-root user
- Prisma client generation
- Health check configuration
- Port 3001 exposure

### 2. `/lawyer-chat/src/app/api/health/route.ts`
**Purpose:** Health check endpoint for Docker container monitoring
**Content:** Simple API route returning JSON with health status

### 3. `/data-compose/workflow_json/legal_chat_webhook.json`
**Purpose:** n8n workflow template for legal-chat webhook
**Content:** Workflow with 4 nodes:
- Webhook node (path: "legal-chat")
- DeepSeek R1 AI node
- Format SSE Response (code node)
- Send SSE Response node

### 4. `/data-compose/LEGAL_CHAT_INTEGRATION.md`
**Purpose:** Setup and usage guide for the legal-chat integration
**Content:** Comprehensive guide including:
- Architecture overview
- Setup steps
- Configuration details
- Troubleshooting guide
- Development notes

### 5. `/data-compose/LEGAL_CHAT_CHANGES.md` (this file)
**Purpose:** Documentation of all changes made for the integration

## Key Integration Points

### 1. **Networking**
- Legal-chat service added to both `frontend` and `backend` Docker networks
- Enables communication with n8n (backend) and nginx (frontend)

### 2. **Database**
- Uses separate database schema: `legal_chat`
- Shares PostgreSQL instance with data-compose
- Connection string: `postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/legal_chat`

### 3. **Webhook Integration**
- Internal webhook URL: `http://n8n:5678/webhook/legal-chat`
- Accessible externally via: `http://localhost:8080/webhook/legal-chat`
- Supports Server-Sent Events (SSE) for streaming

### 4. **Routing Architecture**
- Main app: `http://localhost:8080/`
- Legal chat: `http://localhost:8080/legal-chat/`
- n8n interface: `http://localhost:8080/n8n/`
- Webhooks: `http://localhost:8080/webhook/*`

### 5. **Authentication**
- NextAuth.js configured with base path support
- Requires `LEGAL_CHAT_NEXTAUTH_SECRET` environment variable
- Session management isolated from main application

## Configuration Requirements

### Required Environment Variables
- `LEGAL_CHAT_NEXTAUTH_SECRET`: Secret key for NextAuth.js

### Optional Environment Variables
- `LEGAL_CHAT_DATABASE_URL`: Override default database connection
- `LEGAL_CHAT_EMAIL_SERVER`: SMTP server for email authentication
- `LEGAL_CHAT_EMAIL_FROM`: From address for emails
- `LEGAL_CHAT_NEXTAUTH_URL`: Override NextAuth URL

## Docker Compose Service Dependencies
```
legal-chat → depends on → db, n8n
nginx → depends on → n8n, legal-chat (implicitly via network)
```

## Port Mappings
- nginx: 8080 (external) → 80 (internal)
- n8n: 5678 (external) → 5678 (internal)
- legal-chat: 3001 (external) → 3001 (internal)

## Notes

1. The integration maintains complete separation between the two frontends
2. Each frontend can use different n8n workflows
3. The legal-chat application runs with a base path of `/legal-chat`
4. All services share the same Docker networks for internal communication
5. The nginx reverse proxy handles all external routing
6. SSE support is enabled for real-time streaming responses