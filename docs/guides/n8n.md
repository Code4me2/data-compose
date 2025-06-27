# n8n Configuration and Custom Nodes

This directory contains the n8n-specific configuration and custom nodes for the Data Compose project.

## Directory Structure

```
n8n/
├── custom-nodes/               # Custom n8n nodes
│   ├── n8n-nodes-bitnet/      # BitNet LLM integration
│   ├── n8n-nodes-deepseek/    # DeepSeek AI integration  
│   ├── n8n-nodes-haystack/    # Haystack search integration
│   └── n8n-nodes-hierarchicalSummarization/  # Document processing
├── haystack-service/          # Haystack API service
├── local-files/               # Persistent storage for n8n
├── docker-compose.haystack.yml # Haystack services configuration
└── docker-compose.bitnet.yml   # BitNet services configuration
```

## Custom Nodes

### 1. DeepSeek Node
- Integrates with Ollama-hosted DeepSeek R1 model
- Provides chat and text generation capabilities
- OpenAI-compatible API interface

### 2. Haystack Search Node
- Document search and management via Elasticsearch
- 8 operations defined (7 functional):
  - Import from Previous Node
  - Search (BM25/Vector/Hybrid)
  - Get Hierarchy
  - Health Check
  - Get Final Summary
  - Get Complete Tree
  - Get Document with Context
  - Batch Hierarchy (⚠️ Not implemented in service)

### 3. Hierarchical Summarization Node
- Processes documents in hierarchical batches
- Integrates with PostgreSQL for state management
- Works with AI models for summarization

### 4. BitNet Node
- Experimental 1.58-bit LLM integration
- Provides efficient inference for chat applications
- AI Agent compatible (with manual connection)

## Services

### Haystack Service
- **API**: FastAPI service running on port 8000
- **Endpoints**: 7 REST endpoints for document operations
- **Storage**: Elasticsearch for document and embeddings storage
- **Embeddings**: BAAI/bge-small-en-v1.5 (384 dimensions)
- **Note**: Running in development mode with `--reload`

To start Haystack services:
```bash
docker-compose -f docker-compose.yml -f n8n/docker-compose.haystack.yml up -d
# Or use the convenience script
cd n8n && ./start_haystack_services.sh
```

### BitNet Service (Experimental)
- Mock server for development/testing
- Real BitNet integration requires separate BitNet server

## Development

### Building Custom Nodes
```bash
cd custom-nodes/n8n-nodes-yournode
npm install
npm run build
```

### Testing Nodes
1. Nodes are automatically loaded from `custom-nodes/` directory
2. Restart n8n to load new or updated nodes:
   ```bash
   docker-compose restart n8n
   ```
3. Check n8n UI for your custom nodes

## Known Issues

1. **Haystack Batch Hierarchy**: The n8n node defines this operation but the service doesn't implement it
2. **BitNet AI Agent**: Doesn't appear in AI Agent dropdown but can be manually connected
3. **Development Mode**: Haystack service runs with `--reload` flag (not production-ready)

## Documentation

- Main project documentation: `../README.md`
- Haystack setup guide: `HAYSTACK_SETUP.md`
- BitNet integration status: `BITNET_AI_AGENT_STATUS.md`
- Individual node documentation in respective directories

## Troubleshooting

### Node Not Appearing
1. Check build output: `npm run build`
2. Verify node appears in `dist/` directory
3. Restart n8n container
4. Check n8n logs: `docker-compose logs n8n`

### Service Connection Issues
1. Verify services are running: `docker-compose ps`
2. Check service health:
   - Haystack: `curl http://localhost:8000/health`
   - Elasticsearch: `curl http://localhost:9200`
3. Review service logs: `docker-compose logs [service-name]`

### Database Connection
- PostgreSQL host from within containers: `db`
- Use manual configuration or n8n credentials
- See `hierarchical_summarization_connection_guide.md` for details