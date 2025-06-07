# Data Compose

A basic web application that integrates workflow automation (n8n) with AI capabilities for processing and analyzing large-scale textual data, with a focus on judicial and legal document processing. n8n works as a backend and developer interface for testing workflows and custom nodes. 
## Quick Start

### Prerequisites
- Docker & Docker Compose
- 4GB+ available RAM
- Modern web browser
- (Optional) Ollama with DeepSeek model for AI features

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/data_compose.git
cd data_compose
```

### 2. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your secure credentials
```

### 3. Start Docker Compose
```bash
docker-compose up -d
```

### 4. Access the application
- **Web Interface**: http://localhost:8080
- **n8n Workflows**: http://localhost:8080/n8n/

### 5. Import the basic workflow
1. Access n8n at http://localhost:8080/n8n/
2. Create your account if first time
3. Click menu (⋮) → Import from file
4. Select `workflow_json/web_UI_basic`
5. Activate the workflow

### 6. Test the AI Chat
Navigate to the "AI Chat" tab in the web interface and start chatting!

## Overview

Data Compose combines multiple technologies to create a powerful document processing platform:
- **n8n** workflow automation engine with custom AI nodes
- **DeepSeek R1** AI model integration via Ollama (not supported via WSL yet!)
- **Elasticsearch** and **Haystack** for advanced document search and analysis
- Modern **Single Page Application** frontend
- **Docker-based** microservices architecture

## Key Features

### 🤖 AI-Powered Chat Interface
- Real-time chat with DeepSeek R1 1.5B model
- Webhook-based communication
- Thinking process visibility
- Context-aware responses

### 📄 Document Processing (Haystack Integration)
- 4-level document hierarchy system
- Hybrid search (BM25 + Vector embeddings)
- Legal document optimization
- Batch processing capabilities

### 🔄 Workflow Automation
- Visual workflow creation with n8n
- Custom nodes for AI and document processing
- Pre-configured workflows included
- Webhook integration

### 🎨 Modern Web Interface
- Single Page Application (SPA)
- Responsive design
- Tab-based navigation
- Real-time updates

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Frontend  │────▶│      NGINX      │────▶│       n8n       │
│   (SPA, Port    │     │   (Port 8080)   │     │   (Port 5678)   │
│    8080)        │     │  Reverse Proxy  │     │    Workflows    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                          │
                              ┌───────────────────────────┴───────────────┐
                              │                                           │
                    ┌─────────▼─────────┐                    ┌───────────▼──────────┐
                    │    PostgreSQL     │                    │   Custom Nodes       │
                    │   Database        │                    │ - DeepSeek (Ollama)  │
                    │                   │                    │ - Haystack Search    │
                    └───────────────────┘                    └──────────────────────┘
                              
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          Optional Haystack Integration                           │
├─────────────────────────┬───────────────────────────────────────────────────────┤
│   Elasticsearch         │              Haystack API                              │
│   (Port 9200)          │              (Port 8000)                               │
│   Document Storage      │              FastAPI REST Service                      │
└─────────────────────────┴───────────────────────────────────────────────────────┘
```

## Project Structure

```
data_compose/
├── docker-compose.yml         # Main Docker configuration
├── docker-compose.swarm.yml   # Docker Swarm configuration (scaling)
├── .env.example              # Environment template
├── nginx/
│   └── conf.d/
│       └── default.conf      # NGINX reverse proxy config
├── website/                  # Frontend Single Page Application
│   ├── index.html           # Main entry point
│   ├── css/
│   │   └── app.css         # Unified design system
│   ├── js/
│   │   ├── app.js          # Application framework
│   │   └── config.js       # Webhook configuration
│   └── favicon.ico
├── workflow_json/           # n8n workflow exports
│   └── web_UI_basic        # Basic AI chat workflow
└── n8n/                    # n8n extensions and configuration
    ├── custom-nodes/       # Custom node implementations
    │   ├── n8n-nodes-deepseek/    # DeepSeek AI integration
    │   └── n8n-nodes-haystack/    # Document search integration
    ├── docker-compose.haystack.yml # Haystack services config
    ├── haystack-service/          # Haystack API implementation
    └── local-files/              # Persistent storage
```

## Development

### Creating Custom n8n Nodes

The DeepSeek node serves as an excellent template for creating new custom nodes. Here's how to create your own:

#### 1. **Node Structure Setup**

Create a new folder in `n8n/custom-nodes/` following this structure:
```
n8n-nodes-yournode/
├── nodes/
│   └── YourNode/
│       └── YourNode.node.ts    # Main node implementation
├── credentials/                 # Optional: for authenticated services
│   └── YourNodeApi.credentials.ts
├── package.json                # Node dependencies and metadata
├── tsconfig.json              # TypeScript configuration
├── gulpfile.js                # Build configuration
└── index.ts                   # Module entry point
```

#### 2. **Node Implementation Template**

Based on the DeepSeek implementation, here's a template for `YourNode.node.ts`:

```typescript
import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
} from 'n8n-workflow';

export class YourNode implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Your Node Name',
        name: 'yourNode',
        icon: 'file:youricon.svg',  // Add icon to nodes/YourNode/
        group: ['transform'],
        version: 1,
        description: 'Description of what your node does',
        defaults: {
            name: 'Your Node',
        },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
            // Node properties (fields shown in UI)
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                options: [
                    {
                        name: 'Process',
                        value: 'process',
                        description: 'Process data',
                    },
                ],
                default: 'process',
                noDataExpression: true,
            },
            // Add more properties as needed
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                // Get parameters from UI
                const operation = this.getNodeParameter('operation', i) as string;
                
                // Process your data here
                const result = await this.processData(items[i].json, operation);
                
                returnData.push({
                    json: result,
                    pairedItem: { item: i },
                });
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: error.message },
                        pairedItem: { item: i },
                    });
                    continue;
                }
                throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
            }
        }

        return [returnData];
    }

    // Helper methods
    private async processData(input: any, operation: string): Promise<any> {
        // Your processing logic here
        return { processed: input, operation };
    }
}
```

#### 3. **Package Configuration**

Create `package.json`:
```json
{
  "name": "n8n-nodes-yournode",
  "version": "0.1.0",
  "description": "Your node description",
  "keywords": ["n8n-community-node-package"],
  "license": "MIT",
  "homepage": "",
  "author": {
    "name": "Your Name",
    "email": "your@email.com"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/yourusername/n8n-nodes-yournode.git"
  },
  "main": "index.js",
  "scripts": {
    "build": "tsc && gulp build:icons",
    "dev": "tsc --watch",
    "format": "prettier nodes credentials --write",
    "lint": "eslint nodes credentials package.json",
    "lintfix": "eslint nodes credentials package.json --fix"
  },
  "files": [
    "dist"
  ],
  "n8n": {
    "n8nNodesApiVersion": 1,
    "nodes": [
      "dist/nodes/YourNode/YourNode.node.js"
    ]
  },
  "devDependencies": {
    "@types/node": "^16.11.26",
    "@typescript-eslint/parser": "^5.29.0",
    "eslint": "^8.17.0",
    "eslint-plugin-n8n-nodes-base": "^1.11.0",
    "gulp": "^4.0.2",
    "n8n-workflow": "^1.0.0",
    "prettier": "^2.7.1",
    "typescript": "^4.9.5"
  }
}
```

#### 4. **Building and Testing**

```bash
# Navigate to your node directory
cd n8n/custom-nodes/n8n-nodes-yournode

# Install dependencies
npm install

# Build the node
npm run build

# For development (watch mode)
npm run dev

# Link to n8n for testing
npm link
cd ~/.n8n/custom
npm link n8n-nodes-yournode

# Restart n8n to load your node
docker-compose restart n8n
```

#### 5. **Best Practices from DeepSeek Node**

1. **Error Handling**: Always wrap API calls in try-catch blocks
2. **Logging**: Use console.log for debugging during development
3. **Input Validation**: Validate user inputs before processing
4. **Response Parsing**: Handle different response formats gracefully
5. **Type Safety**: Use TypeScript interfaces for data structures
6. **UI Properties**: Provide sensible defaults and clear descriptions
7. **Advanced Options**: Hide complex settings under "Additional Fields"

### Frontend Development

The frontend uses a modular architecture for easy extension:

```javascript
// Add new sections to the SPA
window.app.addSection('newsection', 'New Feature', 'icon-class', 
    '<h2>Content</h2>', 
    { onShow: () => initialize() }
);
```

## Configuration

### Environment Variables

```bash
# Database
DB_USER=your_username
DB_PASSWORD=your_secure_password
DB_NAME=your_database_name

# n8n
N8N_ENCRYPTION_KEY=your_encryption_key
```

### Webhook Configuration

Update `website/js/config.js` with your webhook ID:
```javascript
const CONFIG = {
  WEBHOOK_ID: "your-webhook-id",
  WEBHOOK_URL: `${window.location.protocol}//${window.location.host}/webhook/your-webhook-id`
};
```

## Advanced Features

### Haystack Integration (Optional)

Enable advanced document processing:

```bash
# Start with Haystack services
docker-compose -f docker-compose.yml -f n8n/docker-compose.haystack.yml up -d

# Or use the convenience script
cd n8n && ./start_haystack_services.sh
```

Access Haystack API documentation at http://localhost:8000/docs

### Document Processing API

Example usage:
```bash
# Ingest documents
curl -X POST http://localhost:8000/ingest \
  -H "Content-Type: application/json" \
  -d '[{"content": "Legal document text", "metadata": {"source": "case.pdf"}}]'

# Search documents
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{"query": "legal precedent", "use_hybrid": true}'
```

## Troubleshooting

### Common Issues

1. **n8n not starting**: Check logs with `docker-compose logs n8n`
2. **Chat not working**: Ensure workflow is activated in n8n
3. **Ollama connection**: Verify Ollama is running and accessible
4. **Port conflicts**: Ensure ports 8080, 5678, 9200, 8000 are free

### Useful Commands

```bash
# View logs
docker-compose logs -f [service_name]

# Restart services
docker-compose restart

# Clean restart
docker-compose down && docker-compose up -d

# Check service health
curl http://localhost:8080/n8n/healthz
curl http://localhost:8000/health
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [n8n](https://n8n.io/) - Workflow automation platform
- [DeepSeek](https://www.deepseek.com/) - AI model provider
- [Haystack](https://haystack.deepset.ai/) - Document processing framework
- [Ollama](https://ollama.ai/) - Local AI model hosting
