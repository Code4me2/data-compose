# Lawyer Chat Integration into Data Compose

## Overview
This document describes the integration of the lawyer-chat application into the data-compose project as an additional interface option alongside the existing website interface.

## Integration Summary

### What Was Done

1. **Copied lawyer-chat directory** into data-compose
   - No build artifacts found (clean copy)
   - All source files preserved

2. **Updated Dockerfile** for base path support
   - Added `BASE_PATH="/legal-chat"` environment variable
   - Created `docker-entrypoint.sh` for database migrations
   - Added netcat for database health checks

3. **Database Configuration**
   - Created `scripts/init-databases.sh` to initialize legal_chat database
   - Uses same PostgreSQL instance but separate database
   - Automatic migration on container startup

4. **Docker Compose Configuration**
   - Service already existed in docker-compose.yml (good foresight!)
   - Updated health check to use wget instead of curl
   - Added database initialization script mounting

5. **NGINX Configuration**
   - Already configured at `/legal-chat/` path
   - WebSocket support enabled
   - Proper proxy headers set

## Key Configuration Points

### Environment Variables
The following environment variables are used (add to `.env`):

```bash
# Lawyer Chat specific
LEGAL_CHAT_DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/legal_chat
LEGAL_CHAT_NEXTAUTH_URL=http://localhost:8080/legal-chat
LEGAL_CHAT_NEXTAUTH_SECRET=your_nextauth_secret_here
LEGAL_CHAT_EMAIL_SERVER=smtp://user:pass@smtp.example.com:587
LEGAL_CHAT_EMAIL_FROM=noreply@legal-chat.local
```

### Ports and Paths
- **Port**: 3001 (internal), proxied through NGINX on 8080
- **Base Path**: `/legal-chat/`
- **Health Check**: `/api/health`
- **Database**: `legal_chat` (separate from main data-compose DB)

### Prisma Configuration
- **Schema Location**: `prisma/schema.prisma`
- **Client Output**: `src/generated/prisma`
- **Migrations**: Run automatically on startup via entrypoint
- **Models**: User, Chat, Message, AuditLog, Session, Account

## Resource Sharing

### Currently Shared
1. **PostgreSQL Server** - Same instance, different databases
2. **NGINX Proxy** - Unified entry point
3. **Docker Networks** - frontend and backend networks
4. **Docker Compose** - Single orchestration file

### Future Optimization Opportunities
1. **Authentication Integration** - Unify with n8n user system
2. **Chat Backend** - Route through n8n workflows
3. **Shared UI Components** - Extract common elements
4. **Centralized Logging** - Unified log aggregation
5. **Session Management** - Cross-application SSO

## Starting the Application

```bash
# From data-compose directory
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs legal-chat

# Access the application
# http://localhost:8080/legal-chat/
```

## Troubleshooting

### Database Issues
If migrations fail:
```bash
# Manually create database
docker-compose exec db psql -U ${DB_USER} -c "CREATE DATABASE legal_chat;"

# Run migrations manually
docker-compose exec legal-chat npx prisma migrate deploy
```

### Build Issues
If Next.js doesn't respect base path:
```bash
# Rebuild with proper environment
docker-compose build --no-cache legal-chat
```

### Health Check Failures
Check that the health endpoint is accessible:
```bash
docker-compose exec legal-chat wget -O- http://localhost:3001/api/health
```

## Development Workflow

For local development with hot reload:
```bash
# Add volume mount to docker-compose.yml (temporarily)
volumes:
  - ./lawyer-chat:/app
  - /app/node_modules
  - /app/.next

# Start in development mode
docker-compose up legal-chat
```

## Security Notes

1. **NEXTAUTH_SECRET** must be set to a secure random string
2. **Database credentials** should be strong and unique
3. **Email configuration** needed for user registration
4. **CORS headers** already configured in Next.js config
5. **Rate limiting** implemented in middleware

## Resolved Issues

### Logo Not Rendering
- **Issue**: Logo referenced as `/logo.png` without base path
- **Fix**: Updated to `/legal-chat/logo.png` in `src/app/page.tsx`
- **File**: Static assets must include base path when served through proxy

### Login Link 404 Error
- **Issue**: NextAuth `signIn()` function not aware of base path
- **Fix**: Updated to include callback URL: `signIn(undefined, { callbackUrl: '/legal-chat' })`
- **Files Modified**: `src/components/TaskBar.tsx` (two locations)

### Environment Variable Quotes
- **Issue**: Docker Compose passing quotes literally in environment variables
- **Fix**: Removed quotes from environment values in `docker-compose.yml`
- **Example**: Changed `DATABASE_URL="${VAR}"` to `DATABASE_URL=${VAR}`

## Current Working State

All interfaces are fully functional:
- **Main Interface**: http://localhost:8080
- **Lawyer Chat**: http://localhost:8080/legal-chat
- **Sign In**: Works correctly with base path
- **Logo**: Displays properly

## Next Steps

1. Configure email server for authentication
2. Set up proper NEXTAUTH_SECRET for production
3. Test user registration flow
4. Consider implementing SSO with n8n
5. Add monitoring and alerting
6. Consider migrating to Next.js Image component when base path issues are resolved

## File Structure
```
data-compose/
├── lawyer-chat/              # Complete Next.js application
│   ├── Dockerfile           # Multi-stage build with migrations
│   ├── docker-entrypoint.sh # Database migration script
│   ├── src/                 # Application source
│   ├── prisma/              # Database schema
│   └── ...
├── scripts/
│   └── init-databases.sh    # PostgreSQL initialization
├── docker-compose.yml       # Updated with legal-chat service
└── nginx/conf.d/default.conf # Already configured for /legal-chat/
```