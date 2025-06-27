# Haystack Search Integration for n8n

A powerful search and retrieval system for hierarchical documents, designed to work seamlessly with n8n workflows and the Hierarchical Summarization node.

## 🚀 Features

- **Hybrid Search**: Combines keyword (BM25) and semantic (vector) search
- **Hierarchical Navigation**: Navigate parent-child document relationships
- **Batch Operations**: Efficiently process multiple documents
- **Tree Visualization**: View complete document hierarchies
- **Direct Integration**: Works seamlessly with PostgreSQL and n8n workflows

## 📋 Prerequisites

- Docker and Docker Compose
- n8n instance running
- PostgreSQL with hierarchical documents
- 4GB+ RAM recommended for Elasticsearch

## 🛠️ Installation

### 1. Build the Custom Node

```bash
cd n8n/custom-nodes/n8n-nodes-haystack
npm install
npm run build
```

### 2. Start the Services

From the project root directory:

```bash
# Option 1: Quick start script
cd n8n && ./start_haystack_services.sh

# Option 2: Docker Compose
docker-compose -f docker-compose.yml -f n8n/docker-compose.haystack.yml up -d
```

### 3. Verify Installation

```bash
# Check service health
curl http://localhost:8000/health

# View API documentation
open http://localhost:8000/docs
```

## 🔧 Configuration

The integration consists of three main components:

### 1. Custom n8n Node
Located in `custom-nodes/n8n-nodes-haystack/`, provides 8 operations:
- Import from Previous Node
- Search (Hybrid/Vector/BM25)
- Get Hierarchy
- Health Check
- Batch Hierarchy
- Get Final Summary
- Get Complete Tree
- Get Document with Context

### 2. Haystack API Service
FastAPI service at port 8000 that handles:
- Document indexing with embeddings
- Search operations
- Hierarchy navigation
- Tree visualization

### 3. Elasticsearch
Provides the storage and search backend:
- Port 9200
- 2GB heap allocation
- Custom analyzers for legal documents

## 📖 Usage Example

### Basic Workflow

1. **Process documents** with Hierarchical Summarization node
2. **Query PostgreSQL** for processed documents:
   ```sql
   SELECT * FROM hierarchical_documents 
   WHERE batch_id = 'your-batch-id'
   ```
3. **Import to Haystack** using the node's field mapping
4. **Search** across all documents and summaries

### n8n Node Configuration

1. Add a **Haystack Search** node to your workflow
2. Select operation (e.g., "Import from Previous Node")
3. Configure field mappings if needed
4. Connect to your data source

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│ n8n Workflows   │────▶│  PostgreSQL  │────▶│ Haystack Node   │
└─────────────────┘     └──────────────┘     └────────┬────────┘
                                                       │
                                                       ▼
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Elasticsearch   │◀────│ Haystack API │◀────│ Import/Search   │
└─────────────────┘     └──────────────┘     └─────────────────┘
```

## 🐛 Troubleshooting

### Service Won't Start
```bash
# Check if ports are in use
lsof -i :8000  # Haystack service
lsof -i :9200  # Elasticsearch

# View logs
docker-compose logs haystack-service -f
```

### Can't Find Documents
- Ensure documents were imported first
- Verify workflow_id matches your documents
- Check Elasticsearch is running: `curl http://localhost:9200`

### Memory Issues
- Elasticsearch requires ~2GB RAM
- Adjust heap size in `docker-compose.haystack.yml`:
  ```yaml
  environment:
    - ES_JAVA_OPTS=-Xms1g -Xmx1g  # Reduce if needed
  ```

## 📚 Additional Resources

- [Setup Guide](HAYSTACK_SETUP.md) - Detailed installation instructions
- [API Documentation](http://localhost:8000/docs) - Interactive API explorer
- [Custom Node README](custom-nodes/n8n-nodes-haystack/README.md) - Node-specific details
- [Service README](haystack-service/README.md) - Implementation details

## 🤝 Contributing

This integration is part of the Data Compose project. For issues or improvements, please refer to the main project repository.

## 📄 License

Same as the parent Data Compose project.