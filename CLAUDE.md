# Data Compose Project

## Project Overview

Data Compose is a web application that integrates with n8n (a workflow automation tool) to process and transform data. The application consists of a web frontend that communicates with n8n via webhooks, along with a PostgreSQL database for data storage.

## Architecture

The project is structured as a Docker-based application with three main services:

1. **NGINX Web Server**: Serves the web frontend and proxies requests to the n8n service
2. **n8n Workflow Engine**: Handles automation workflows and webhook processing
3. **PostgreSQL Database**: Stores data for n8n and application state

## Directory Structure

```
data_compose/
├── CLAUDE.md                  # Project documentation
├── docker-compose.yml         # Main Docker configuration
├── docker-compose.swarm.yml   # Docker Swarm configuration (for scaling)
├── error.txt                  # Error log file
├── update.txt                 # Update log file
├── nginx/
│   └── conf.d/                # NGINX configuration
│       └── default.conf       # Unified NGINX config
├── website/                   # Frontend web assets
│   ├── css/                   # CSS styles
│   │   └── styles.css         # Shared styles
│   ├── js/                    # JavaScript files
│   │   ├── chat.js            # Chat functionality
│   │   ├── config.js          # Frontend configuration
│   │   └── debug.js           # Debugging utilities
│   ├── views/                 # View templates
│   │   ├── chat.html          # Chat interface
│   │   └── workflows.html     # Workflows interface
│   ├── favicon.ico            # Website favicon
│   ├── index.html             # Main entry point
│   └── test.html              # Test page
└── n8n/                       # n8n configuration and extensions
    ├── custom-nodes/          # Custom nodes for n8n
    │   ├── n8n-nodes-deepseek/  # Deepseek integration node
    │   │   ├── dist/            # Compiled node files
    │   │   ├── nodes/           # Node source files
    │   │   │   └── Dsr1/        # Deepseek node
    │   │   │       └── Dsr1.node.ts  # Node implementation
    │   │   ├── gulpfile.js      # Build configuration
    │   │   ├── index.js         # Module entry point
    │   │   ├── index.ts         # TypeScript entry point
    │   │   ├── package.json     # Node dependencies
    │   │   ├── package-lock.json # Locked dependencies
    │   │   └── tsconfig.json    # TypeScript configuration
    │   ├── test-file.txt        # Test file
    │   └── test-persistence.txt # Persistence test file
    ├── docker-compose.yml     # n8n-specific Docker config
    ├── docker-compose.yml.save # Backup Docker config
    └── local-files/           # Persistent local files for n8n
```

## Configuration

### Docker Configuration

The application uses Docker Compose for container orchestration:

- `docker-compose.yml`: Main configuration file that defines three services:
  - `web`: NGINX web server (port 8080)
  - `db`: PostgreSQL database
  - `n8n`: n8n workflow automation (port 5678)

### Environment Variables

Sensitive configuration is stored in the `.env` file:

```
DB_USER=vel
DB_PASSWORD=your_secure_password_here
DB_NAME=mydb
N8N_ENCRYPTION_KEY=a_random_secure_encryption_key_here
```

### NGINX Configuration

The NGINX server (`nginx/conf.d/default.conf`) is configured to:

1. Serve static web content from `/usr/share/nginx/html`
2. Proxy requests to n8n at `/n8n/`
3. Proxy webhook requests to n8n at `/webhook/`

## Web Frontend

The web frontend provides three main interfaces:

1. **Home Page (index.html)**: Tests the connection to n8n
2. **Chat Interface (views/chat.html)**: Provides a chat interface that communicates with n8n via webhooks
3. **Workflows Interface (views/workflows.html)**: Displays n8n workflows and links to the n8n admin interface

### Frontend Configuration

Frontend configuration is managed in `website/js/config.js` which defines:

```javascript
const CONFIG = {
  WEBHOOK_ID: "c188c31c-1c45-4118-9ece-5b6057ab5177",  
  WEBHOOK_URL: `${window.location.protocol}//${window.location.host}/webhook/c188c31c-1c45-4118-9ece-5b6057ab5177`
};
```

## n8n Integration

The project uses n8n for workflow automation. Key integration points:

1. **Webhook Endpoints**: The application communicates with n8n via webhooks
2. **Custom Nodes**: The project includes a custom n8n node for Deepseek integration
3. **Workflow Storage**: Workflows are stored in the n8n data volume

## Recent Changes

The following changes have been made to improve the project:

1. **Security Enhancements**:
   - Moved sensitive data to environment variables (.env file)
   - Removed hardcoded credentials and encryption keys
   - Improved NGINX proxy configuration

2. **Code Organization**:
   - Consolidated duplicate web files
   - Created proper directory structure (css, js, views)
   - Standardized naming conventions

3. **Configuration Improvements**:
   - Added health checks for all services
   - Fixed CORS configuration
   - Improved docker-compose configuration

4. **Interface Improvements**:
   - Added navigation menu to web pages
   - Standardized styling with shared CSS
   - Improved error handling and response display

## Future Considerations

Areas for future improvement:

1. **Security**:
   - Add HTTPS support with SSL certificates
   - Implement proper authentication

2. **Monitoring**:
   - Add logging infrastructure
   - Set up service monitoring

3. **Development**:
   - Add development environment configuration
   - Create build and testing pipelines

4. **UI Enhancement**:
   - Complete organization of views in the views directory
   - Add responsive design for mobile compatibility

## Running the Application

To run the application:

1. Set up the environment file:
   ```
   cp .env.example .env
   # Edit .env with your secure credentials
   ```

2. Start the services:
   ```
   docker-compose up -d
   ```

3. Access the web interface at `http://localhost:8080`
4. Access the n8n interface at `http://localhost:8080/n8n/`