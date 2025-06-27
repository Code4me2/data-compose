# Lawyer-Chat Migration Guide

## Overview

This guide covers the migration process for the lawyer-chat application between different environments and configurations, including transitions between local development, Docker deployment, and production environments.

## Recent Migration: Production to Local Development (December 27, 2024)

### What Changed

The lawyer-chat application was originally configured for production deployment at the `/chat` subpath. To enable efficient local development, several configuration changes were implemented:

1. **BasePath Configuration**: Removed hardcoded `/chat` paths throughout the application
2. **Database Access**: Exposed PostgreSQL port for direct local connections
3. **Session Management**: Updated NextAuth configuration for local URLs
4. **Email System**: Made email sending optional with console logging for development

### Migration Steps

#### From Production/Docker to Local Development

1. **Clone and Install Dependencies**
   ```bash
   cd services/lawyer-chat
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with local development values:
   ```env
   # Authentication
   NEXTAUTH_SECRET=your-secret-key-here
   NEXTAUTH_URL=http://localhost:3002
   
   # Database - pointing to Docker PostgreSQL
   DATABASE_URL=postgresql://your_db_user:your_secure_password_here@localhost:5432/lawyerchat
   
   # n8n Webhook
   N8N_WEBHOOK_URL=http://localhost:8080/webhook/c188c31c-1c45-4118-9ece-5b6057ab5177
   
   # Email (optional for development)
   ENABLE_EMAIL=false  # Set to true for real emails
   SMTP_HOST=smtp.office365.com
   SMTP_PORT=587
   SMTP_USER=user@reichmanjorgensen.com
   SMTP_PASS=your-app-password
   ```

3. **Code Modifications**
   
   Comment out basePath in `next.config.ts`:
   ```typescript
   // basePath: '/chat',  // Comment out for local development
   ```
   
   The following files are already configured to work in both environments:
   - `src/utils/api.ts` - basePath is now configurable
   - `src/components/providers.tsx` - SessionProvider uses correct paths
   - `src/store/csrf.ts` - CSRF endpoints are properly configured

4. **Database Setup**
   
   Ensure PostgreSQL is exposed in `docker-compose.yml`:
   ```yaml
   db:
     ports:
       - "5432:5432"  # Already configured
   ```
   
   Run migrations:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed  # Optional: adds test users
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   # Runs on http://localhost:3002
   ```

#### From Local Development to Production/Docker

1. **Revert Code Changes**
   
   Uncomment basePath in `next.config.ts`:
   ```typescript
   basePath: '/chat',  // Uncomment for production
   ```

2. **Update Environment Variables**
   
   Production `.env` values:
   ```env
   # Authentication
   NEXTAUTH_SECRET=<strong-production-secret>
   NEXTAUTH_URL=https://yourdomain.com/chat
   
   # Database - internal Docker network
   DATABASE_URL=postgresql://your_db_user:your_secure_password_here@db:5432/lawyerchat
   
   # Email
   ENABLE_EMAIL=true  # Enable for production
   ```

3. **Build and Deploy**
   ```bash
   docker-compose build lawyer-chat
   docker-compose up -d
   ```

## Feature-Specific Migrations

### Chat History Implementation

The chat history feature was completely reimplemented to fix asynchronous state issues:

**Before**: Chat IDs were not properly captured, causing messages to be orphaned
**After**: Chat creation returns ID immediately for proper message association

No database migration required - the schema already supported the functionality.

### Smart Chat Titles

**Before**: All chats used generic "New Chat" title
**After**: Titles are auto-generated from the first user message

Implementation automatically migrates existing chats when they're accessed.

### Email Verification System

**Development Mode** (`ENABLE_EMAIL=false`):
- Verification links logged to console
- No actual emails sent
- Faster development iteration

**Production Mode** (`ENABLE_EMAIL=true`):
- Real emails sent via SMTP
- Requires valid Office 365 credentials
- App passwords required for 2FA accounts

## Database Migrations

### Schema Status

The current schema supports all features without modification:
- User authentication with email verification
- Chat storage with titles and previews
- Message persistence with references
- Audit logging

### Running Migrations

```bash
# Generate migration from schema changes
npx prisma migrate dev --name descriptive-name

# Apply migrations in production
npx prisma migrate deploy

# Reset database (development only!)
npx prisma migrate reset
```

### Seed Data

Create test users for development:
```bash
npm run seed
# or
npx prisma db seed
```

## Common Migration Scenarios

### Scenario 1: Fresh Local Setup

```bash
# 1. Start Docker services
docker-compose up -d

# 2. Wait for PostgreSQL to be ready
sleep 5

# 3. Create database
docker exec -it data-compose-db-1 psql -U your_db_user -c "CREATE DATABASE lawyerchat;"

# 4. Run migrations
cd services/lawyer-chat
npx prisma migrate deploy

# 5. Start development
npm run dev
```

### Scenario 2: Updating Production

```bash
# 1. Backup database
docker exec data-compose-db-1 pg_dump -U your_db_user lawyerchat > backup.sql

# 2. Pull latest changes
git pull origin main

# 3. Rebuild and restart
docker-compose build lawyer-chat
docker-compose up -d lawyer-chat

# 4. Check logs
docker-compose logs -f lawyer-chat
```

### Scenario 3: Debugging Issues

```bash
# Check service health
curl http://localhost:8080/chat/api/csrf

# View database schema
npx prisma studio

# Test email configuration
node scripts/test-email.js

# Verify chat functionality
node scripts/test-chat-history.js
```

## Environment-Specific Configurations

### Local Development
- Port: 3002 (configurable)
- BasePath: none (root)
- Database: localhost:5432
- Email: Console logging
- CORS: Permissive

### Docker Development
- Port: 3000 internal, 8080/chat external
- BasePath: /chat
- Database: db:5432 (Docker network)
- Email: Optional
- CORS: Restricted

### Production
- Port: 3000 internal, 443/chat external
- BasePath: /chat
- Database: Secure connection required
- Email: Required with TLS
- CORS: Strict origin checking

## Troubleshooting Migration Issues

### "Failed to connect to database"
```bash
# Check PostgreSQL is running
docker-compose ps db

# Verify connection string
psql $DATABASE_URL -c "SELECT 1;"

# Check database exists
docker exec -it data-compose-db-1 psql -U your_db_user -l
```

### "Session not persisting"
```bash
# Verify NEXTAUTH_URL matches access URL
echo $NEXTAUTH_URL

# Check NEXTAUTH_SECRET is set
[[ -z "$NEXTAUTH_SECRET" ]] && echo "Secret not set!"

# Clear browser cookies and retry
```

### "Emails not sending"
```bash
# Test email configuration
ENABLE_EMAIL=true node scripts/test-email.js

# Check app password (not regular password)
# Enable 2FA and generate app-specific password
```

### "Chat history not showing"
```bash
# Check database for chats
npx prisma studio

# Verify API endpoint
curl http://localhost:3002/api/chats \
  -H "Cookie: <session-cookie>"

# Check browser console for errors
```

## Best Practices

1. **Always backup before migrations**
   ```bash
   docker exec data-compose-db-1 pg_dump -U your_db_user lawyerchat > backup_$(date +%Y%m%d).sql
   ```

2. **Test migrations in development first**
   - Use a separate development database
   - Run full test suite after migration
   - Verify all features work as expected

3. **Use environment-specific configs**
   - Never commit production secrets
   - Use .env.example as template
   - Document all required variables

4. **Monitor after deployment**
   - Check application logs
   - Verify database connections
   - Test critical user paths

## Rollback Procedures

### Code Rollback
```bash
# Identify last working commit
git log --oneline

# Revert to previous version
git checkout <commit-hash>

# Rebuild and deploy
docker-compose build lawyer-chat
docker-compose up -d
```

### Database Rollback
```bash
# Restore from backup
docker exec -i data-compose-db-1 psql -U your_db_user lawyerchat < backup.sql

# Or revert specific migration
npx prisma migrate resolve --rolled-back <migration-name>
```

## Future Migration Considerations

### Planned Improvements
1. **Automated migration scripts**: CI/CD pipeline integration
2. **Blue-green deployments**: Zero-downtime migrations
3. **Database versioning**: Track schema versions explicitly
4. **Configuration management**: Centralized config service

### Breaking Changes to Watch
1. **NextAuth v5**: Major API changes coming
2. **Prisma v6**: Potential schema format changes
3. **Node.js 22**: May require dependency updates
4. **React 19**: Possible component lifecycle changes

## Support

For migration assistance:
1. Check the comprehensive project report
2. Review README.md for setup instructions
3. Consult CLAUDE.md for architectural details
4. Open an issue with detailed error logs

Remember: Successful migrations require careful planning, thorough testing, and always having a rollback plan ready.