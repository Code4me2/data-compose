# Legal Chat Integration Guide

This guide explains how to set up and test the Legal Chat integration with the data-compose project.

## Architecture Overview

The integration allows both the existing data-compose frontend and the legal-chat frontend to coexist and use separate n8n workflows:

- **Existing Frontend**: Accessible at `http://localhost:8080/` → Uses existing n8n workflows
- **Legal Chat Frontend**: Accessible at `http://localhost:8080/legal-chat/` → Uses dedicated legal-chat webhook

## Setup Steps

### 1. Configure Environment Variables

First, update your `.env` file with the required Legal Chat configuration:

```bash
# Add to your existing .env file
LEGAL_CHAT_NEXTAUTH_SECRET="your-secret-key-here"
```

### 2. Build and Start Services

```bash
# From the data-compose directory
docker-compose up -d --build
```

This will:
- Build the legal-chat Docker image
- Start all services including the new legal-chat service
- Configure nginx to route `/legal-chat/*` to the legal-chat service

### 3. Initialize Legal Chat Database

The legal-chat service needs its database initialized:

```bash
# Run database migrations
docker-compose exec legal-chat npx prisma migrate deploy

# (Optional) Create an admin user
docker-compose exec legal-chat npm run create-admin
```

### 4. Import the Legal Chat n8n Workflow

1. Access n8n at `http://localhost:8080/n8n/`
2. Click the menu (three dots) → Import from file
3. Select `workflow_json/legal_chat_webhook.json`
4. Activate the workflow

### 5. Test the Integration

1. **Access Legal Chat**: Navigate to `http://localhost:8080/legal-chat/`
2. **Register/Sign In**: Create a new account or sign in
3. **Test Chat**: Send a message to verify the webhook integration works

## Architecture Details

### Service Configuration

**Legal Chat Service** (in docker-compose.yml):
- Runs on internal port 3001
- Uses PostgreSQL database (separate schema: `legal_chat`)
- Configured with base path `/legal-chat` for nginx routing
- Webhook URL: `http://n8n:5678/webhook/legal-chat`

### Nginx Routing

The nginx configuration routes:
- `/legal-chat/*` → legal-chat:3001 (Legal Chat frontend)
- `/webhook/*` → n8n:5678 (All webhooks including legal-chat)
- `/` → Static files (existing data-compose frontend)

### Database Separation

- **Existing data-compose**: Uses default database schema
- **Legal Chat**: Uses `legal_chat` database/schema
- Both share the same PostgreSQL instance but have separate data

## Troubleshooting

### Legal Chat Not Loading

1. Check if the service is running:
   ```bash
   docker-compose ps legal-chat
   ```

2. Check logs:
   ```bash
   docker-compose logs legal-chat
   ```

### Webhook Not Working

1. Verify the n8n workflow is active
2. Check n8n logs:
   ```bash
   docker-compose logs n8n
   ```
3. Ensure the webhook path matches: `/webhook/legal-chat`

### Database Connection Issues

1. Verify PostgreSQL is running:
   ```bash
   docker-compose ps db
   ```

2. Check if legal_chat database exists:
   ```bash
   docker-compose exec db psql -U ${DB_USER} -c "\l"
   ```

### Authentication Issues

1. Ensure `LEGAL_CHAT_NEXTAUTH_SECRET` is set in `.env`
2. Clear browser cookies for the domain
3. Check legal-chat logs for authentication errors

## Development Notes

### Making Changes to Legal Chat

1. Edit files in `lawyer-chat/` directory
2. Rebuild the container:
   ```bash
   docker-compose up -d --build legal-chat
   ```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f legal-chat
```

### Accessing Services Directly

- Legal Chat (bypassing nginx): `http://localhost:3001`
- n8n interface: `http://localhost:5678`
- Main site: `http://localhost:8080`

## Security Considerations

1. **NextAuth Secret**: Always use a strong, unique secret for `LEGAL_CHAT_NEXTAUTH_SECRET`
2. **Database Isolation**: Legal Chat uses a separate database schema
3. **CORS**: The n8n service is configured to accept requests from the nginx proxy
4. **SSL/TLS**: For production, configure nginx with SSL certificates

## Next Steps

1. Configure email settings for authentication (optional)
2. Customize the legal-chat workflow in n8n for your specific use case
3. Set up monitoring and logging for production use
4. Consider adding rate limiting and additional security measures