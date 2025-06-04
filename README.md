# Data Compose Project


## Current Project Status

This repository contains a **basic working implementation** of an automated n8n workflow, with a modular interface and backend.
Standard procedures for updates to the architecture are outlined below in the **changes** section.
The node-based n8n architecture allows for future custom node development for more advanced functionality.
Current functionality is limited, and future versions will include a more comprehensive stack via the n8n node architecture.

## Project Overview

Data Compose is a simple web application that integrates with n8n (a workflow automation tool) to process and enhance large scale textual data through scripted AI-powered workflows. The application features a Docker-based architecture with a TypeScript web frontend, n8n workflow engine, and PostgreSQL database for data persistence. Future versions will be geared towards a Judicial Access Project, which will prioritize extracting causal context from judicial transcripts.


## Quick Start

**Recommended starting point:** Linux-based terminal/WSL

Ensure **Docker and git** are installed:
- Docker Desktop automatically installs Docker Engine (**recommended**)

In either the macOS terminal, Linux terminal, or WSL run the following to confirm necessary downloads:

```bash
docker version
```

```bash
git version
```

### 1. Clone the Codebase

Navigate to the folder where you want to manage this software, and run:

```bash
git clone https://github.com/Code4me2/data-compose.git
```

### 2. Configure Environment Variables

```bash
cd data_compose
cp .env.example .env
```

### 3. Start Docker Compose

```bash
docker-compose up -d
```

Navigate to http://localhost:8080 in your device’s browser to access the data_compose home webpage UI.

To access the workflows that the UI offers, navigate to http://localhost:5678 and create your n8n account. Navigate to the home window and create a new workflow:

<!-- Add n8n interface screenshot here --> 

## Setup Application Workflow Testing

From the workflow window, select the button with three dots in the top right corner, and choose the option: **Import from file**

Select your workflow from the `workflow_json` folder within data_compose.


## Architecture

The project consists of three main services orchestrated via Docker Compose:

1. **NGINX Web Server** (Port 8080): Serves the web frontend and proxies requests to n8n
2. **n8n Workflow Engine** (Port 5678): Handles automation workflows and webhook processing
3. **PostgreSQL Database**: Stores data for n8n and application state

## Complete Directory Structure

```
data_compose/
├── .env                           # Environment variables (create from .env.example)
├── .env.example                   # Template for environment configuration
├── .claude/                       # Claude Code configuration
│   └── settings.local.json        # Local Claude settings with permissions
├── CLAUDE.md                      # Project documentation
├── README.md                      # This comprehensive documentation
├── docker-compose.yml             # Main Docker configuration
├── docker-compose.swarm.yml       # Docker Swarm configuration (for scaling)
├── error.txt                      # Error log file
├── update.txt                     # Update log file
├── nginx/                         # NGINX configuration
│   └── conf.d/
│       └── default.conf           # Unified NGINX config with proxy settings
├── website/                       # Frontend web assets (Single Page Application)
│   ├── css/
│   │   ├── app.css                # Unified CSS framework with design system
│   │   └── styles.css             # Legacy CSS (preserved for reference)
│   ├── js/                        # JavaScript modules
│   │   ├── app.js                 # Extensible application framework
│   │   └── config.js              # Frontend configuration (webhook URLs)
│   ├── favicon.ico                # Website favicon
│   └── index.html                 # Single entry point with all functionality
└── n8n/                           # n8n configuration and extensions
    ├── custom-nodes/              # Custom nodes for n8n
    │   ├── n8n-nodes-deepseek/    # DeepSeek AI integration node
    │   │   ├── dist/              # Compiled TypeScript output
    │   │   │   ├── nodes/         # Compiled node files
    │   │   │   │   └── Dsr1/      # DeepSeek R1 node
    │   │   │   │       ├── Dsr1.node.js
    │   │   │   │       ├── Dsr1.node.js.map
    │   │   │   │       └── Dsr1.node.d.ts
    │   │   │   ├── package.json   # Compiled package info
    │   │   │   └── tsconfig.tsbuildinfo
    │   │   ├── node_modules/      # Node.js dependencies (extensive)
    │   │   ├── nodes/             # TypeScript source files
    │   │   │   └── Dsr1/
    │   │   │       └── Dsr1.node.ts    # Main DeepSeek node implementation
    │   │   ├── gulpfile.js        # Build configuration for icons/assets
    │   │   ├── index.js           # CommonJS entry point
    │   │   ├── index.ts           # TypeScript entry point
    │   │   ├── package.json       # Node package configuration
    │   │   ├── package-lock.json  # Locked dependencies
    │   │   └── tsconfig.json      # TypeScript compiler configuration
    │   ├── test-file.txt          # Test file for persistence
    │   └── test-persistence.txt   # Persistence test file
    ├── docker-compose.yml         # n8n-specific Docker config
    ├── docker-compose.yml.save    # Backup Docker config
    └── local-files/               # Persistent local files for n8n workflows
```

## Environment Configuration

### Environment Variables (.env)

The project uses environment variables stored in `.env`:

```bash
DB_USER=your_username
DB_PASSWORD=your_secure_password_here
DB_NAME=mydb
N8N_ENCRYPTION_KEY=a_random_secure_encryption_key_here
```

**Setup**: Copy `.env.example` to `.env` and update with your secure credentials.

### Docker Configuration

The `docker-compose.yml` defines three services with health checks:

- **web**: NGINX server with volume mounts for website content and configuration
- **db**: PostgreSQL with environment variable configuration
- **n8n**: n8n with custom nodes, CORS enabled, and file volume mounts

### NGINX Configuration

The NGINX server (`nginx/conf.d/default.conf`) provides:

1. Static content serving from `/usr/share/nginx/html`
2. Reverse proxy to n8n at `/n8n/` with WebSocket support
3. Webhook proxy at `/webhook/` for n8n integrations

## Custom n8n Node: DeepSeek Integration

### Node Features

The `n8n-nodes-deepseek` package provides AI integration with:

- **Two Operations**: 
  - Generate Text: Single prompt processing
  - Chat: Conversational interaction
- **Advanced Options**:
  - Temperature control (0.0-1.0)
  - Max tokens configuration
  - Thinking process visibility toggle
  - Custom endpoint URL configuration
- **Model**: DeepSeek-r1:1.5B via Ollama API

### Node Implementation Details

- **TypeScript Source**: `nodes/Dsr1/Dsr1.node.ts`
- **Build System**: TypeScript compilation + Gulp for asset management
- **Dependencies**: Full ESLint, TypeScript, and n8n workflow packages
- **API Integration**: HTTP fetch to Ollama endpoint (`http://host.docker.internal:11434/api/generate`)
- **Response Processing**: Parses thinking sections between `<think>` tags

### Build Commands

```bash
# Development
npm run dev          # TypeScript watch mode
npm run build       # Full build with icon processing
npm run lint        # ESLint validation
npm run format      # Prettier formatting
```

## Web Frontend

### Single Page Application Architecture

The frontend is built as a unified SPA with seamless navigation between sections:

1. **Home Section**: Welcome page with feature overview and system testing
2. **AI Chat Section**: Real-time chat interface with DeepSeek R1 via webhooks
3. **Workflows Section**: n8n workflow management and monitoring
4. **Extensible Framework**: Easy addition of new sections and features

### JavaScript Architecture

- **app.js**: Complete application framework with:
  - Class-based design (`DataComposeApp`) for state management
  - Section registration system for modular functionality
  - Preserved chat functionality with webhook integration
  - Extensible navigation system with tab-based interface
  - Defensive programming for robust error handling
- **config.js**: Centralized configuration with webhook URL management

### Frontend Configuration

```javascript
const CONFIG = {
  WEBHOOK_ID: "c188c31c-1c45-4118-9ece-5b6057ab5177",  
  WEBHOOK_URL: `${window.location.protocol}//${window.location.host}/webhook/c188c31c-1c45-4118-9ece-5b6057ab5177`
};
```

## Development Tools

### Claude Code Integration

The project includes Claude Code configuration (`.claude/settings.local.json`) with permissions for:
- File operations (`cp`, `mkdir`)
- Directory analysis (`find`, `tree`)

### TypeScript Configuration

The custom node uses strict TypeScript settings:
- Target: ES2019
- Strict mode enabled
- Source maps and declarations
- Incremental compilation

## Getting Started

### Prerequisites

Before running the application, ensure you have:

- **Docker & Docker Compose**: Latest version installed
- **Available Ports**: 8080 (web), 5678 (n8n), 5432 (postgres)
- **Ollama with DeepSeek**: For AI functionality (see DeepSeek Setup below)

### Quick Start Guide

1. **Environment Configuration**:
   ```bash
   # Copy the example template and edit with your secure credentials
   cp .env.example .env
   nano .env
   ```
   
   **Required Variables**:
   ```bash
   DB_USER=vel                                    # PostgreSQL username
   DB_PASSWORD=your_secure_password_here          # Change this to a strong password
   DB_NAME=mydb                                   # Database name
   N8N_ENCRYPTION_KEY=a_random_secure_encryption_key_here  # Generate a secure key
   ```

2. **Start the System**:
   ```bash
   # Start all services in detached mode
   docker-compose up -d
   
   # Verify all services are running
   docker-compose ps
   ```

3. **Verify Service Health**:
   ```bash
   # Check that all services are healthy
   docker-compose ps
   
   # Should show:
   # - web (nginx) - healthy
   # - db (postgres) - healthy  
   # - n8n - healthy
   ```

4. **Access the Application**:
   - **Main Interface**: `http://localhost:8080` (start here)
   - **n8n Admin Panel**: `http://localhost:8080/n8n/` (workflow management)
   - **Chat Interface**: Click on "AI Chat" tab in the main interface
   - **Workflows**: Click on "Workflows" tab in the main interface

### DeepSeek Setup (Required for AI Features)

The custom n8n node requires Ollama with DeepSeek model:

#### 1. Install Ollama (if not already installed)

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh
```

#### 2. Download DeepSeek Model

```bash
ollama pull deepseek-r1:1.5b
```

#### 3. Start Ollama Server

```bash
ollama serve
# Should be accessible at http://localhost:11434
```

#### 4. Test DeepSeek Integration

```bash
# Test that Ollama is working
curl http://localhost:11434/api/tags
```

### First-Time Setup Verification

1. **Test Basic Connectivity**:
   - Visit `http://localhost:8080`
   - Click "Test n8n Connection" - should show success

2. **Verify DeepSeek Node**:
   - Go to `http://localhost:8080/n8n/`
   - Create a new workflow
   - Search for "DeepSeek R1" node - should be available

3. **Test Chat Interface**:
   - Visit `http://localhost:8080`
   - Click on "AI Chat" tab
   - Send a message - should get AI response (requires n8n workflow setup)

### Stopping the System

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (CAUTION: removes data)
docker-compose down -v
```

## Development Workflow

### Custom Node Development

1. **Setup Development Environment**:
   ```bash
   cd n8n/custom-nodes/n8n-nodes-deepseek
   
   # Install dependencies (uses pnpm)
   npm install
   
   # Build the node
   npm run build
   ```

2. **Development Commands**:
   ```bash
   # TypeScript watch mode (recommended for development)
   npm run dev
   
   # Full build (TypeScript + assets)
   npm run build
   
   # Linting and formatting
   npm run lint
   npm run format
   ```

3. **Testing Node Changes**:
   ```bash
   # After making changes, rebuild
   npm run build
   
   # Restart n8n service to pick up changes
   docker-compose restart n8n
   ```

### Frontend Development

- **Live Changes**: Edit files in `website/` directory
- **Immediate Reload**: Changes reflect immediately (volume mounted)
- **Key Files**:
  - `website/js/config.js` - Webhook configuration
  - `website/js/app.js` - Application framework
  - `website/css/app.css` - Main stylesheet
  - `website/index.html` - Single page application

### Configuration Updates

**Environment Variables**:
```bash
# After updating .env, restart services
docker-compose down && docker-compose up -d
```

**Docker Configuration**:
```bash
# Validate configuration
docker-compose config

# Apply configuration changes
docker-compose up -d --force-recreate
```

## Project Features

### Implemented Capabilities

- ✅ **Docker-based Architecture**: Multi-service orchestration
- ✅ **AI Integration**: DeepSeek R1 model via custom n8n node
- ✅ **Web Interface**: Chat, workflows, and testing interfaces
- ✅ **Webhook System**: Real-time communication between frontend and n8n
- ✅ **Build System**: TypeScript compilation with asset management
- ✅ **Environment Security**: Environment variable configuration

### Technical Highlights

- **CORS Configuration**: Properly configured for cross-origin requests
- **WebSocket Support**: Full n8n WebSocket proxy for real-time features
- **Health Checks**: All Docker services include health monitoring
- **TypeScript**: Strict typing throughout custom node development
- **Responsive Design**: Single page application with tab navigation

## Missing/Future Enhancements

1. **Security**:
   - HTTPS/SSL certificate support
   - Authentication system
   - API key management

2. **Monitoring**:
   - Centralized logging
   - Service monitoring dashboard
   - Error tracking

3. **Development**:
   - Automated testing pipeline
   - Development environment separation
   - Hot reload for custom nodes

4. **Documentation**:
   - API documentation
   - Webhook payload specifications
   - Deployment guides

## Troubleshooting

### Common Issues

1. **Port Conflicts**:
   ```bash
   # Check what's using your ports
   lsof -i :8080  # Web interface
   lsof -i :5678  # n8n direct
   lsof -i :5432  # PostgreSQL
   lsof -i :11434 # Ollama
   ```

2. **Environment Variables**:
   ```bash
   # Verify .env file is properly formatted
   cat .env
   
   # Check Docker can read environment variables
   docker-compose config
   ```

3. **Custom Node Issues**:
   ```bash
   # Check if DeepSeek node is properly built
   ls -la n8n/custom-nodes/n8n-nodes-deepseek/dist/nodes/Dsr1/
   
   # Rebuild if missing files
   cd n8n/custom-nodes/n8n-nodes-deepseek && npm run build
   ```

4. **Ollama Connection**:
   ```bash
   # Test Ollama is accessible from Docker
   curl http://host.docker.internal:11434/api/tags
   
   # Check DeepSeek model is available
   ollama list
   ```

5. **Service Health Issues**:
   ```bash
   # Check service logs
   docker-compose logs web
   docker-compose logs n8n
   docker-compose logs db
   
   # Restart specific service
   docker-compose restart n8n
   ```

### Health Checks

Monitor service health:
```bash
# Quick health check
docker-compose ps

# Detailed service status
docker-compose logs --tail=20 n8n

# Test endpoints manually
curl http://localhost:8080                    # Web interface
curl http://localhost:8080/n8n/healthz       # n8n health
```

### Reset and Clean Start

If issues persist:
```bash
# Complete reset (CAUTION: loses data)
docker-compose down -v
docker-compose up -d

# Rebuild custom node
cd n8n/custom-nodes/n8n-nodes-deepseek
npm run build
docker-compose restart n8n
```