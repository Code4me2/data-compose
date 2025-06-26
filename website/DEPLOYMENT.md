# Data Compose Deployment Guide

## Architecture Overview

The Data Compose application runs as a Docker-composed stack with three main services:

1. **NGINX** (port 8080) - Serves the web frontend and proxies API requests
2. **n8n** (port 5678) - Workflow automation engine
3. **PostgreSQL** - Database for n8n

## Development vs Production

### Development Mode
- **Vite dev server**: Runs on port 3000
- **Hot Module Replacement**: Instant updates during development
- **Proxy configuration**: Routes API calls to Docker services on port 8080
- **TypeScript source**: Direct compilation from source files

### Production Mode
- **NGINX server**: Serves built files on port 8080
- **Optimized assets**: Minified and bundled JavaScript/CSS
- **Direct routing**: No proxy needed, all services in same Docker network
- **Static files**: Pre-built from TypeScript

## Deployment Options

### Option 1: Production Mode (Current - Fixed)
The existing setup where NGINX serves the original JavaScript/CSS files:

```bash
# Ensure we're using the production HTML file
cd website
./build.sh  # This copies index.production.html to index.html

# Start all services
cd ..
docker-compose up -d

# Access at http://localhost:8080 with full CSS/JS functionality
```

### Option 2: Development with Docker Services
Run TypeScript dev server while using Docker services:

```bash
# Start Docker services (n8n, PostgreSQL, NGINX)
docker-compose up -d

# Run development server
cd website
npm run docker:dev

# Access development version at http://localhost:3000
# Access production version at http://localhost:8080
```

### Option 3: Full Production Build
Build and deploy everything:

```bash
cd website
npm run docker:build

# This command:
# 1. Builds TypeScript → JavaScript
# 2. Creates optimized bundles
# 3. Starts Docker services
# 4. Serves at http://localhost:8080
```

## File Structure After Build

```
website/
├── dist/                    # Built files (git-ignored)
│   ├── index.html          # Entry point
│   ├── assets/             # JS/CSS bundles
│   │   ├── main-[hash].js
│   │   ├── vendor-[hash].js
│   │   └── main-[hash].css
│   └── favicon.ico
├── src/                     # TypeScript source
├── css/                     # Original CSS (still used)
├── js/                      # Original JS (not used in production)
└── index.html              # Original HTML (modified for TypeScript)
```

## Important Notes

1. **No Port Conflicts**: Development (3000) and production (8080) use different ports
2. **API Endpoints Preserved**: All webhook and n8n endpoints work identically
3. **Volume Mapping**: NGINX maps `./website:/usr/share/nginx/html`
4. **Build Output**: Vite builds to `dist/` which needs to be served by NGINX

## Nginx Configuration

The NGINX configuration remains unchanged and correctly:
- Serves static files from `/usr/share/nginx/html`
- Proxies `/webhook/*` to n8n service
- Proxies `/n8n/*` to n8n interface
- Handles WebSocket upgrades for n8n

## Recommended Workflow

### For Development:
1. Start Docker services: `docker-compose up -d`
2. Run TypeScript dev: `cd website && npm run dev`
3. Develop with HMR at http://localhost:3000

### For Testing Production Build:
1. Build TypeScript: `cd website && npm run build`
2. Copy built files: `cp -r dist/* .` (or configure NGINX to serve from dist/)
3. Access at http://localhost:8080

### For Deployment:
1. Build on CI/CD or locally
2. Deploy `dist/` contents to web root
3. Ensure Docker services are running
4. No TypeScript/Node.js needed in production

## Environment Variables

The application respects these environment variables:
- `VITE_WEBHOOK_ID`: Override default webhook ID
- `VITE_API_BASE_URL`: Override API base URL

These are compiled into the build and cannot be changed at runtime.

## Troubleshooting

### "Port 8080 already in use"
- The Docker NGINX service uses port 8080
- Development server uses port 3000
- Stop Docker services if you need port 8080: `docker-compose down`

### "Cannot connect to n8n"
- Ensure Docker services are running: `docker-compose ps`
- Check n8n logs: `docker-compose logs n8n`
- Verify proxy configuration in development

### "TypeScript changes not showing"
- In development: Check that Vite dev server is running
- In production: Rebuild with `npm run build` and redeploy

## Security Considerations

1. **Environment Variables**: Use `.env` file (git-ignored) for secrets
2. **CORS**: n8n configured to accept requests from localhost:8080
3. **Build Artifacts**: Never commit `dist/` folder
4. **API Keys**: Keep webhook IDs secure