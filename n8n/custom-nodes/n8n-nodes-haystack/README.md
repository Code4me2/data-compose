# n8n-nodes-haystack

This is an n8n community node for integrating Haystack and Elasticsearch to enable advanced document search, hierarchical document management, and AI-powered legal document analysis workflows.

## Features

- **Document Ingestion**: Batch process documents with hierarchy metadata
- **Hybrid Search**: Combine keyword (BM25) and semantic (vector) search
- **Hierarchy Management**: Track parent-child document relationships
- **Legal Document Optimization**: Specialized for legal document analysis

## Installation

### In n8n

This node is automatically loaded when placed in the custom nodes directory:

```
~/.n8n/custom/n8n-nodes-haystack
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

## Prerequisites

This node requires:

1. **Elasticsearch**: Version 8.x with vector search capabilities
2. **Haystack Service**: FastAPI service running the Haystack framework
3. **Docker**: For running the complete stack

## Operations

### Ingest Documents

Ingest documents with hierarchy metadata into Elasticsearch.

**Parameters:**
- `Documents`: JSON array of documents to ingest
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

## Example Workflow

1. **Ingest Legal Documents**: Upload PDFs, transcripts, and briefs
2. **Create Summaries**: Generate AI summaries linked to source documents
3. **Search**: Find relevant cases using hybrid search
4. **Explore Hierarchy**: Navigate document relationships

## Development

To modify this node:

1. Edit TypeScript files in `nodes/`
2. Run `npm run build` to compile
3. Restart n8n to load changes

## License

MIT