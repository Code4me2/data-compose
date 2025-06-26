# n8n-nodes-hierarchicalSummarization

This is an n8n community node that provides hierarchical document summarization capabilities. It recursively processes large document collections into a tree structure, ultimately producing a single comprehensive summary.

## Features

- 📚 **Batch Processing**: Handle multiple documents or entire directories
- 🌳 **Hierarchical Summarization**: Creates multi-level summary trees
- 🔄 **Smart Chunking**: Automatically splits large documents while preserving context
- 💾 **PostgreSQL Storage**: Persists document hierarchies for analysis
- 🤖 **AI Model Flexibility**: Works with both custom AI nodes (BitNet) and default n8n AI nodes (OpenAI, Anthropic, etc.)
- ⚡ **Transaction Safety**: Atomic operations ensure data consistency
- 🛡️ **Production-Ready Resilience**: Handles AI server failures gracefully
- 🔁 **Automatic Retry Logic**: Exponential backoff with jitter
- 🚦 **Circuit Breaker**: Prevents cascading failures
- 📊 **Rate Limiting**: Protects AI servers from overload
- 🎯 **Fallback Summaries**: Generates basic summaries when AI unavailable

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
2. **AI Language Model** (Required) - Connect any AI model node:
   - **Custom nodes**: BitNet, local AI models
   - **Default n8n nodes**: OpenAI Chat Model, Anthropic Chat Model, Google Gemini Chat Model, etc.
   - Automatically detects and adapts to the connected AI node's format

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| Summary Prompt | string | `summarize the content between the two tokens <c></c> in two or less sentences` | AI instruction template |
| Context Prompt | string | (empty) | Additional context for the AI |
| Content Source | options | `directory` | Choose between directory or previous node input |
| Directory Path | string | (empty) | Path to .txt files (when using directory source) |
| Batch Size | number | `2048` | Maximum tokens per chunk (100-32768) |
| Database Config | options | `credentials` | Database connection method |
| **Resilience Options** | collection | See below | Configure retry, circuit breaker, and rate limiting |

#### Resilience Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| Enable Retry Logic | boolean | `true` | Retry failed AI requests with exponential backoff |
| Max Retries | number | `3` | Maximum retry attempts before giving up |
| Request Timeout | number | `60000` | Timeout per AI request in milliseconds |
| Enable Fallback Summaries | boolean | `true` | Generate extractive summaries when AI fails |
| Rate Limit | number | `30` | Maximum requests per minute to AI server |
| Enable Circuit Breaker | boolean | `true` | Stop attempting requests when server is down |
| Circuit Breaker Threshold | number | `5` | Consecutive failures before opening circuit |
| Circuit Breaker Reset Time | number | `60000` | Time to wait before testing server recovery |

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

### Example 1: Summarize Directory with Default n8n AI Node

1. Add **Hierarchical Summarization** node
2. Add **OpenAI Chat Model** node (or Anthropic, Google Gemini, etc.)
3. Connect AI model to Language Model input
4. Configure:
   - Content Source: `Directory Path`
   - Directory Path: `/path/to/documents`
   - Database Config: Select your PostgreSQL credentials
5. Execute workflow

### Example 2: Summarize with BitNet Custom Node

1. Add **Hierarchical Summarization** node
2. Add **BitNet** node
3. Connect BitNet to Language Model input
4. Configure BitNet with your model settings
5. Configure Hierarchical Summarization as needed
6. Execute workflow

### Example 3: Process Documents from Previous Node

1. Add data source node (e.g., Read Binary Files)
2. Add **Hierarchical Summarization** node
3. Add **AI Language Model** node
4. Connect both to Hierarchical Summarization
5. Configure:
   - Content Source: `Previous Node Data`
   - Ensure input has `content` field

### Example 4: Custom Summarization Prompt

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
  metadata, token_count, timestamps,
  document_type,        -- 'source', 'chunk', 'batch', 'summary'
  chunk_index,          -- Order within parent document
  source_document_ids   -- Array of original document IDs
)

processing_status (
  id, batch_id, current_level,
  total_documents, processed_documents,
  status, error_message, timestamps
)
```

See `schema.sql` for complete database structure and migration scripts.

## How It Works

The node creates a 4-level hierarchy structure:

1. **Level 0 - Source Documents**: Original documents are indexed and stored
2. **Level 1 - Batches/Chunks**: Documents are grouped into batches based on token limits
   - These preserve the exact content that will be summarized
   - Provides full traceability from summaries back to sources
3. **Level 2 - First Summaries**: Each batch from Level 1 is summarized by the AI
4. **Level 3+ - Higher Summaries**: Summaries are progressively condensed
5. **Convergence**: Process continues until a single final summary remains

This architecture ensures complete traceability - you can trace any summary back through the batches to the original source documents.

## Token Management

The node automatically calculates available tokens:
- `Available = BatchSize - PromptTokens - SafetyBuffer(100)`
- Ensures chunks fit within AI model limits
- Prevents token overflow errors
- Tracks token reduction between levels for convergence

## Performance Optimizations

- **Fixed chunking prompt growth**: Each chunk is now independent
- **Streaming for large files**: Files >50MB are streamed
- **Intelligent batching**: Maximizes token utilization
- **Summary validation**: Ensures AI is actually condensing content

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
- PostgreSQL database with permissions for CREATE TABLE, INSERT, UPDATE, SELECT
- Node.js >= 18.10
- Connected AI Language Model node (BitNet, OpenAI, etc.)

## Recent Improvements

- **Level 1 Batch Documents**: Now preserves exact batched content for full traceability
- **Fixed Infinite Recursion**: Summaries are no longer re-chunked at higher levels
- **Enhanced Convergence Detection**: Better handling of edge cases and small documents
- **Improved Error Messages**: More actionable troubleshooting guidance
- **Production-Ready Resilience**: Complete protection against AI server failures
- **Automatic Schema Migration**: Handles database updates seamlessly

## Resilience Features

### Retry Logic with Exponential Backoff
When AI requests fail, the node automatically retries with increasing delays:
- 1st retry: ~1 second delay
- 2nd retry: ~2 seconds delay  
- 3rd retry: ~4 seconds delay
- Includes random jitter to prevent thundering herd

### Circuit Breaker Pattern
Protects against cascading failures:
- **Closed State**: Normal operation
- **Open State**: After 5 consecutive failures, stops attempting requests
- **Half-Open State**: After 60 seconds, tests with limited requests
- Automatically recovers when server is back online

### Rate Limiting
Prevents overwhelming the AI server:
- Default: 30 requests per minute
- Queues excess requests automatically
- Maintains consistent request spacing
- Shows queue status in logs

### Fallback Summaries
When AI is completely unavailable:
- Generates extractive summaries using key sentences
- Clearly marks summaries as AI-generated vs fallback
- Ensures workflow continues despite AI failures

### Example Resilience Logs
```
[HS 0] Circuit breaker initialized
[HS 0] Rate limiter initialized: 30 requests/minute
[HS 0] [Retry] Attempt 1 failed: Connection refused. Retrying in 1047ms...
[HS 0] [Retry] Attempt 2 failed: Connection refused. Retrying in 2089ms...
[HS 0] Error: Connection refused
[HS 0] Using fallback summary generation
[CircuitBreaker] Opening circuit after 5 consecutive failures
[HS 1] Error: Circuit breaker is OPEN - BitNet server is unavailable. Will retry in 45 seconds
[HS 1] Using fallback summary generation
```

## License

[MIT](https://github.com/yourusername/n8n-nodes-hierarchicalsummarization/blob/master/LICENSE.md)

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [PostgreSQL setup for n8n](https://docs.n8n.io/hosting/databases/postgres/)

## Future Development: Integration Testing

### Planned Integration Test Suite

The node's new architecture and resilience features require comprehensive integration testing. Here's the planned testing strategy:

#### 1. Hierarchical Architecture Tests
- **Level Transition Verification**: Test the complete flow from Level 0 (sources) → Level 1 (batches) → Level 2 (summaries) → Level 3+ (higher summaries)
- **Document Traceability**: Verify source_document_ids tracking through all levels
- **Batch Creation**: Test various document sizes and token counts to ensure proper batching
- **Convergence Testing**: Validate that hierarchies always converge to a single summary

#### 2. Resilience Feature Tests
- **BitNet Failure Simulation**: 
  - Complete server unavailability
  - Intermittent connection issues
  - Slow response times
  - Rate limit violations
- **Circuit Breaker Behavior**:
  - Opening after threshold failures
  - Half-open state recovery
  - Automatic closing when service recovers
- **Rate Limiter Verification**:
  - Queue management under high load
  - Request spacing validation
  - Concurrent request handling

#### 3. Database Migration Tests
- **Schema Evolution**: Test migration from old schema to new with existing data
- **Column Addition**: Verify automatic addition of missing columns
- **Data Integrity**: Ensure no data loss during migration
- **Rollback Scenarios**: Test behavior with partial migrations

#### 4. End-to-End Workflow Tests
- **Large Document Processing**: Test with 100+ documents of varying sizes
- **Mixed Content Types**: Legal documents, technical documentation, narrative text
- **Error Recovery**: Verify workflow continues after various failure points
- **Performance Benchmarks**: Establish baseline processing times

#### 5. Test Implementation Approach
```javascript
// Example test structure
describe('Hierarchical Summarization Integration', () => {
  it('should process documents through all hierarchy levels', async () => {
    // Setup test documents
    // Execute workflow
    // Verify Level 1 batches created
    // Verify Level 2 summaries generated
    // Verify final summary convergence
  });

  it('should handle BitNet server failures gracefully', async () => {
    // Mock BitNet server with failure modes
    // Execute workflow
    // Verify retry attempts
    // Verify fallback summaries generated
    // Verify workflow completion
  });
});
```

#### 6. Test Infrastructure Requirements
- **Mock BitNet Server**: Configurable failure modes for resilience testing
- **Test Database**: Isolated PostgreSQL instance for migration testing
- **Performance Monitoring**: Metrics collection for benchmarking
- **CI/CD Integration**: Automated test execution on code changes

#### 7. Testing Timeline
1. **Phase 1**: Unit tests for individual components (existing)
2. **Phase 2**: Integration tests for core functionality
3. **Phase 3**: Resilience and failure scenario tests
4. **Phase 4**: Performance and scale testing
5. **Phase 5**: Deployment readiness validation

This comprehensive testing approach will ensure the node is production-ready and can handle real-world scenarios reliably.

## Support

For issues and feature requests, please use the [GitHub issue tracker](https://github.com/yourusername/n8n-nodes-hierarchicalsummarization/issues).