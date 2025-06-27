# n8n-nodes-haystack

[![n8n](https://img.shields.io/badge/n8n-compatible-blue.svg)](https://n8n.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An n8n community node for integrating Elasticsearch-based search and retrieval of hierarchical documents. Designed for legal document analysis and knowledge management workflows.

## 🌟 Features

- 🔍 **Hybrid Search**: Combine keyword (BM25) and semantic (vector) search
- 🌳 **Hierarchy Management**: Navigate parent-child document relationships
- 📊 **Batch Operations**: Process multiple documents efficiently
- 🎯 **Smart Field Mapping**: Automatically map fields from PostgreSQL queries
- 📈 **Tree Visualization**: Get complete hierarchical structures
- ⚡ **High Performance**: Direct Elasticsearch integration

## 📦 Installation

### Option 1: Install in n8n

Place this node in your n8n custom nodes directory:

```bash
# Default location
~/.n8n/custom/n8n-nodes-haystack

# Or in your n8n Docker volume
./custom-nodes/n8n-nodes-haystack
```

### Development

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the node:
   ```bash
   npm run build
   ```
4. Link for development:
   ```bash
   npm link
   ```

## ⚙️ Prerequisites

- **Elasticsearch 8.x**: With vector search capabilities
- **Haystack API Service**: FastAPI service (included in this repo)
- **Docker**: For running the services
- **n8n**: Version 1.0.0 or higher

## Technical Details

- **Embedding Model**: BAAI/bge-small-en-v1.5 (384 dimensions)
- **Search Methods**: BM25 (keyword), Vector (semantic), Hybrid (combined)
- **Service Implementation**: Direct Elasticsearch integration for optimal performance
- **Memory Limits**: Batch operations optimized for large document sets

## 🔧 Operations

### Import from Previous Node

Import documents from PostgreSQL query results into Elasticsearch.

**Parameters:**
- `Field Mapping`: Map fields from previous node to document structure
- `Generate Embeddings`: Whether to generate embeddings (default: true)
- `Haystack Service URL`: URL of the Haystack service (default: http://haystack-service:8000)

### Search

Search documents using hybrid, vector, or BM25 search methods.

**Parameters:**
- `Query`: Search query text
- `Search Type`: Hybrid, Vector, or BM25
- `Top K Results`: Number of results to return
- `Include Hierarchy`: Include document relationships in results
- `Filters`: Additional search filters

### Get Hierarchy

Retrieve document hierarchy and relationships.

**Parameters:**
- `Document ID`: ID of the document
- `Include Parents`: Include parent documents
- `Include Children`: Include child documents
- `Max Depth`: Maximum traversal depth

### Health Check

Check service connectivity and status.

## 💡 Example Workflow

```mermaid
graph LR
    A[PostgreSQL Query] --> B[Haystack Import]
    B --> C[Search Documents]
    C --> D[Get Hierarchy]
    D --> E[Navigate Tree]
```

1. Query hierarchical documents from PostgreSQL
2. Import them with automatic field mapping
3. Search using keywords or semantic similarity
4. Navigate the document hierarchy

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build the node
npm run build

# Watch for changes
npm run dev

# Run linter
npm run lint
```

### Project Structure
```
├── nodes/
│   └── HaystackSearch/
│       ├── HaystackSearch.node.ts  # Main node logic
│       └── haystack.svg            # Node icon
├── package.json
└── README.md
```

## License

MIT