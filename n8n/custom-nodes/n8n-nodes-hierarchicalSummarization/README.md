# n8n-nodes-hierarchicalSummarization

This is an n8n community node that provides hierarchical document summarization capabilities. It recursively processes large document collections into a tree structure, ultimately producing a single comprehensive summary.

## Features

- 📚 **Batch Processing**: Handle multiple documents or entire directories
- 🌳 **Hierarchical Summarization**: Creates multi-level summary trees
- 🔄 **Smart Chunking**: Automatically splits large documents while preserving context
- 💾 **PostgreSQL Storage**: Persists document hierarchies for analysis
- 🤖 **AI Model Flexibility**: Works with any n8n-compatible language model
- ⚡ **Transaction Safety**: Atomic operations ensure data consistency

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) for n8n community nodes.

### Docker Installation

If using the Docker setup from data-compose:

1. Place this node in the custom nodes directory
2. Build the node: `npm install && npm run build`
3. Restart n8n: `docker-compose restart n8n`

## Node Reference

### Inputs

1. **Main Input** (Optional) - Document data from previous nodes
2. **AI Language Model** (Required) - Any compatible language model for summarization

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| Summary Prompt | string | `summarize the content between the two tokens <c></c> in two or less sentences` | AI instruction template |
| Context Prompt | string | (empty) | Additional context for the AI |
| Content Source | options | `directory` | Choose between directory or previous node input |
| Directory Path | string | (empty) | Path to .txt files (when using directory source) |
| Batch Size | number | `2048` | Maximum tokens per chunk (100-32768) |
| Database Config | options | `credentials` | Database connection method |

### Database Configuration

Two methods available:

1. **Use Credentials** (Recommended)
   - Configure PostgreSQL credentials in n8n
   - Select from dropdown in node

2. **Manual Configuration**
   - Enter connection details directly:
   - Host, Port, Database, User, Password

### Output

```javascript
{
  batchId: "uuid",           // Unique batch identifier
  finalSummary: "text",      // Combined summary of all documents
  totalDocuments: 5,         // Number of source documents
  hierarchyDepth: 2,         // Levels of summarization performed
  processingComplete: true   // Success indicator
}
```

## Usage Examples

### Example 1: Summarize Directory of Documents

1. Add **Hierarchical Summarization** node
2. Add **AI Language Model** node (e.g., OpenAI)
3. Connect AI model to Language Model input
4. Configure:
   - Content Source: `Directory Path`
   - Directory Path: `/path/to/documents`
   - Database Config: Select your PostgreSQL credentials
5. Execute workflow

### Example 2: Process Documents from Previous Node

1. Add data source node (e.g., Read Binary Files)
2. Add **Hierarchical Summarization** node
3. Add **AI Language Model** node
4. Connect both to Hierarchical Summarization
5. Configure:
   - Content Source: `Previous Node Data`
   - Ensure input has `content` field

### Example 3: Custom Summarization Prompt

```
Summary Prompt: Extract and list the key action items from <c></c>
Context Prompt: Focus on deliverables and deadlines
Batch Size: 4096
```

## Database Schema

The node automatically creates these tables:

```sql
hierarchical_documents (
  id, content, summary, batch_id, 
  hierarchy_level, parent_id, child_ids,
  metadata, token_count, timestamps
)

processing_status (
  id, batch_id, current_level,
  total_documents, processed_documents,
  status, error_message, timestamps
)
```

## How It Works

1. **Document Indexing**: Source documents are stored at hierarchy level 0
2. **Chunking**: Large documents are split into manageable chunks
3. **Summarization**: Each chunk/document is summarized by the AI model
4. **Hierarchical Processing**: Summaries are grouped and summarized again
5. **Convergence**: Process continues until a single summary remains

## Token Management

The node automatically calculates available tokens:
- `Available = BatchSize - PromptTokens - SafetyBuffer(50)`
- Ensures chunks fit within AI model limits
- Prevents token overflow errors

## Error Handling

Common errors and solutions:

| Error | Solution |
|-------|----------|
| "No language model connected" | Connect an AI model node |
| "password authentication failed" | Check PostgreSQL credentials |
| "Batch size too small for prompts" | Increase batch size parameter |
| "No .txt files found" | Verify directory path and file extensions |

## Development

### Testing

```bash
npm run test:quick   # Quick tests without database
npm run test:verify  # Full verification
npm test            # Run all tests
```

### Building

```bash
npm install         # Install dependencies
npm run build       # Compile TypeScript
npm run dev         # Watch mode for development
```

## Requirements

- n8n >= 0.180.0
- PostgreSQL database
- Node.js >= 18.10

## License

[MIT](https://github.com/yourusername/n8n-nodes-hierarchicalsummarization/blob/master/LICENSE.md)

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [PostgreSQL setup for n8n](https://docs.n8n.io/hosting/databases/postgres/)

## Support

For issues and feature requests, please use the [GitHub issue tracker](https://github.com/yourusername/n8n-nodes-hierarchicalsummarization/issues).