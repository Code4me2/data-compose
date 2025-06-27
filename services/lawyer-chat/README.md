# Lawyer-Chat Service

This is the lawyer-chat application integrated into data-compose. The application provides an AI-powered legal assistant interface with n8n webhook integration.

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

## Known Issues
- **P3005 Database Warning**: On first startup, you may see "The database schema is not empty" warning. This is expected when connecting to an existing database and doesn't affect functionality. The application handles this gracefully.