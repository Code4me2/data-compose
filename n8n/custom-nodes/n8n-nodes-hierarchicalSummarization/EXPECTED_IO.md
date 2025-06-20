# Expected Input and Output Documentation

## Node Overview

The Hierarchical Summarization node processes documents through recursive summarization, creating a hierarchical tree structure that condenses large document collections into a single comprehensive summary.

## Input Formats

### 1. Single Document Input

```javascript
// Input from previous node
{
  json: {
    content: "Your document content here...",
    // Optional metadata
    metadata: { source: "document.txt", date: "2024-01-20" }
  }
}
```

### 2. Multiple Documents Input

```javascript
// Array of documents from previous node
[
  {
    json: {
      content: "First document content...",
      metadata: { source: "doc1.txt" }
    }
  },
  {
    json: {
      content: "Second document content...",
      metadata: { source: "doc2.txt" }
    }
  }
]
```

### 3. Directory Input

```javascript
// Node parameters for directory processing
{
  contentSource: "directory",
  directoryPath: "/path/to/documents/",
  summaryPrompt: "summarize the content between <c></c> in two sentences",
  batchSize: 2048
}
```

## Node Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `summaryPrompt` | string | "summarize the content between the two tokens <c></c> in two or less sentences" | AI prompt template |
| `contextPrompt` | string | "" | Additional context for AI |
| `contentSource` | options | "directory" | "directory" or "previousNode" |
| `directoryPath` | string | "" | Path when using directory source |
| `batchSize` | number | 2048 | Max tokens per chunk (100-32768) |
| `databaseConfig` | options | "credentials" | "credentials" or "manual" |

## Output Format

The node always returns a single output item with this structure:

```javascript
{
  json: {
    batchId: "550e8400-e29b-41d4-a716-446655440000",
    finalSummary: "The comprehensive summary text combining all processed documents...",
    totalDocuments: 5,
    hierarchyDepth: 2,
    processingComplete: true
  }
}
```

### Output Fields

- **`batchId`**: Unique UUID for this processing batch
- **`finalSummary`**: The final consolidated summary text
- **`totalDocuments`**: Number of source documents processed
- **`hierarchyDepth`**: Number of summarization levels (0 = no hierarchy needed)
- **`processingComplete`**: Always `true` on successful completion

## Processing Examples

### Example 1: Small Document (No Chunking)

**Input:**
```javascript
{
  json: {
    content: "PRIVACY NOTICE: We collect your email and name when you register. Your data is encrypted and never sold to third parties. You can delete your account anytime by contacting support@company.com."
  }
}
```

**Processing:**
- Document: 38 tokens (fits in single chunk)
- No chunking required
- Single AI summarization call
- No hierarchy needed (hierarchyDepth: 0)

**Output:**
```javascript
{
  json: {
    batchId: "123e4567-e89b-12d3-a456-426614174000",
    finalSummary: "Privacy notice establishes data collection of email/name with encryption protection and user deletion rights via support contact.",
    totalDocuments: 1,
    hierarchyDepth: 0,
    processingComplete: true
  }
}
```

### Example 2: Multiple Documents (Hierarchy)

**Input:**
```javascript
[
  { json: { content: "Contract A defines vendor payment terms..." } },
  { json: { content: "Contract B outlines delivery schedules..." } },
  { json: { content: "Contract C establishes liability limits..." } },
  { json: { content: "Contract D details termination procedures..." } }
]
```

**Processing:**
- 4 documents → Level 1: 4 summaries
- Level 1: 4 summaries → Level 2: 2 combined summaries  
- Level 2: 2 summaries → Level 3: 1 final summary
- hierarchyDepth: 2

**Output:**
```javascript
{
  json: {
    batchId: "123e4567-e89b-12d3-a456-426614174001",
    finalSummary: "Contract suite establishes comprehensive vendor management framework covering payment terms, delivery schedules, liability protections, and termination procedures across all agreements.",
    totalDocuments: 4,
    hierarchyDepth: 2,
    processingComplete: true
  }
}
```

### Example 3: Large Document (Chunking)

**Input:**
```javascript
{
  json: {
    content: "MASTER SERVICE AGREEMENT\n\nARTICLE 1: DEFINITIONS...\n[10,000+ characters of legal text]"
  }
}
```

**Parameters:**
```javascript
{
  batchSize: 512,  // Small batch size forces chunking
  summaryPrompt: "summarize the content between <c></c> focusing on key obligations"
}
```

**Processing:**
- Large document (2,500 tokens) → Split into 5 chunks
- Each chunk summarized individually
- Chunk summaries combined with context chaining
- hierarchyDepth: 0 (single document)

**Output:**
```javascript
{
  json: {
    batchId: "123e4567-e89b-12d3-a456-426614174002",
    finalSummary: "Master service agreement establishes comprehensive legal framework covering definitions, service scope, payment terms, intellectual property rights, confidentiality obligations, liability limitations, and termination procedures with 30-day notice requirements.",
    totalDocuments: 1,
    hierarchyDepth: 0,
    processingComplete: true
  }
}
```

## Connection Requirements

The node requires these connections:

### AI Language Model (Required)
- Connect any compatible language model node
- OpenAI GPT, Anthropic Claude, etc.
- Used for generating summaries

### Input (Optional)
- Main data input from previous nodes
- Can process single items or arrays
- Not required if using directory input

### Database Configuration
- Configure via node parameters (not a connection)
- Use PostgreSQL credentials or manual configuration
- Stores hierarchical document relationships
- Tracks processing status

## Error Cases

### 1. Batch Size Too Small
```javascript
{
  "error": "NodeOperationError",
  "message": "Batch size 100 too small for prompts"
}
```

### 2. Missing AI Model
```javascript
{
  "error": "NodeOperationError", 
  "message": "No language model connected. Please connect an AI language model to this node."
}
```

### 3. Invalid Directory
```javascript
{
  "error": "NodeOperationError",
  "message": "Cannot access directory: ENOENT: no such file or directory, scandir '/invalid/path'"
}
```

### 4. No Content Found
```javascript
{
  "error": "NodeOperationError",
  "message": "No content field found in input data"
}
```

## Token Budget Calculation

The node calculates available tokens per chunk:

```
Available Tokens = batchSize - promptTokens - safetyBuffer(50)
```

**Example with batchSize: 1024:**
- Summary prompt: ~20 tokens
- Context prompt: ~15 tokens  
- Safety buffer: 50 tokens
- **Available for content: 939 tokens**

## Database Schema

When using credentials or manual database config, the node creates:

```sql
-- Document hierarchy table
hierarchical_documents (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  summary TEXT,
  batch_id VARCHAR(255) NOT NULL,
  hierarchy_level INTEGER NOT NULL,
  parent_id INTEGER REFERENCES hierarchical_documents(id),
  child_ids INTEGER[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  token_count INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Processing status tracking
processing_status (
  id SERIAL PRIMARY KEY,
  batch_id VARCHAR(255) UNIQUE NOT NULL,
  current_level INTEGER NOT NULL DEFAULT 0,
  total_documents INTEGER,
  processed_documents INTEGER DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'processing',
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);
```

## Performance Characteristics

- **Memory Usage**: Processes documents in chunks, not entire collection in memory
- **Token Efficiency**: Respects batch size limits to optimize AI model calls
- **Scalability**: Can handle hundreds of documents through hierarchical processing
- **Error Recovery**: Database transactions ensure consistent state