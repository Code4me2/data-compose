# Hierarchical Summarization Processing Flow

## Visual Example of Document Processing

### Input: 8 Legal Documents

```
Level 0 (Source Documents):
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   Doc 1     │ │   Doc 2     │ │   Doc 3     │ │   Doc 4     │
│ Contract A  │ │ Contract B  │ │ Contract C  │ │ Contract D  │
│ (2000 chars)│ │ (1800 chars)│ │ (2200 chars)│ │ (1900 chars)│
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘

┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   Doc 5     │ │   Doc 6     │ │   Doc 7     │ │   Doc 8     │
│ Contract E  │ │ Contract F  │ │ Contract G  │ │ Contract H  │
│ (2100 chars)│ │ (1950 chars)│ │ (2050 chars)│ │ (1850 chars)│
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

### With Batch Size: 1024 tokens

```
Level 1 (First Summaries):
┌─────────────────────────┐ ┌─────────────────────────┐
│      Summary 1          │ │      Summary 2          │
│   (Docs 1 & 2)         │ │   (Docs 3 & 4)         │
│ "Contracts A&B define   │ │ "Contracts C&D establish│
│  vendor relationships"  │ │  payment schedules"     │
└─────────────────────────┘ └─────────────────────────┘

┌─────────────────────────┐ ┌─────────────────────────┐
│      Summary 3          │ │      Summary 4          │
│   (Docs 5 & 6)         │ │   (Docs 7 & 8)         │
│ "Contracts E&F cover    │ │ "Contracts G&H detail   │
│  liability terms"       │ │  termination clauses"   │
└─────────────────────────┘ └─────────────────────────┘
```

```
Level 2 (Combined Summaries):
┌─────────────────────────────────────┐ ┌─────────────────────────────────────┐
│           Summary 5                 │ │           Summary 6                 │
│      (Summaries 1 & 2)             │ │      (Summaries 3 & 4)             │
│ "Vendor relationships with defined  │ │ "Comprehensive liability framework  │
│  payment schedules and milestones"  │ │  with clear termination procedures" │
└─────────────────────────────────────┘ └─────────────────────────────────────┘
```

```
Level 3 (Final Summary):
┌─────────────────────────────────────────────────────────────────┐
│                        Final Summary                            │
│                    (Summaries 5 & 6)                           │
│ "The contract suite establishes vendor relationships with       │
│  structured payments, comprehensive liability protections,      │
│  and defined termination procedures across all agreements."     │
└─────────────────────────────────────────────────────────────────┘
```

## Example with Chunking (Large Document)

### Input: Single 10,000 character document with batch_size: 512

```
Original Document:
┌─────────────────────────────────────────┐
│          Large Legal Document           │
│         (10,000 characters)             │
│          (~2,500 tokens)                │
└─────────────────────────────────────────┘
                    ↓
            Chunking Process
                    ↓
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Chunk 1  │ │ Chunk 2  │ │ Chunk 3  │ │ Chunk 4  │ │ Chunk 5  │
│ ~450 tok │ │ ~450 tok │ │ ~450 tok │ │ ~450 tok │ │ ~450 tok │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘

Each chunk summarized with context from previous chunk:
┌─────────────────────────────────────────┐
│          Document Summary               │
│   (Combined from 5 chunk summaries)     │
│         "Comprehensive legal..."        │
└─────────────────────────────────────────┘
```

## Database State During Processing

```sql
-- Level 0: Original documents
SELECT id, hierarchy_level, parent_id, token_count, child_ids 
FROM hierarchical_documents 
WHERE batch_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY hierarchy_level, id;

id | hierarchy_level | parent_id | token_count | child_ids
---|-----------------|-----------|-------------|----------
1  | 0              | NULL      | 500         | {9}
2  | 0              | NULL      | 450         | {9}
3  | 0              | NULL      | 550         | {10}
4  | 0              | NULL      | 475         | {10}
5  | 0              | NULL      | 525         | {11}
6  | 0              | NULL      | 488         | {11}
7  | 0              | NULL      | 513         | {12}
8  | 0              | NULL      | 463         | {12}
9  | 1              | NULL      | 124         | {13}
10 | 1              | NULL      | 132         | {13}
11 | 1              | NULL      | 128         | {14}
12 | 1              | NULL      | 119         | {14}
13 | 2              | NULL      | 156         | {15}
14 | 2              | NULL      | 148         | {15}
15 | 3              | NULL      | 178         | {}

-- Processing status
SELECT * FROM processing_status 
WHERE batch_id = '550e8400-e29b-41d4-a716-446655440000';

batch_id | current_level | total_documents | status    | completed_at
---------|---------------|-----------------|-----------|-------------
550e8... | 3             | 8               | completed | 2024-01-20...
```

## Input/Output Data Flow in n8n

### Workflow Example:

```
┌─────────────────┐     ┌────────────────────────┐     ┌─────────────────┐
│                 │     │                        │     │                 │
│  Read Files     │────▶│ Hierarchical          │────▶│  Write Result   │
│  (or Webhook)   │     │ Summarization         │     │  (or Response)  │
│                 │     │                        │     │                 │
└─────────────────┘     └────────────────────────┘     └─────────────────┘
                               │            │
                               │            │
                        ┌──────▼──┐    ┌────▼────┐
                        │         │    │         │
                        │   AI    │    │   DB    │
                        │  Model  │    │  Store  │
                        │         │    │         │
                        └─────────┘    └─────────┘
```

### Connection Points:
- **Main Input**: Documents (from files, API, or previous nodes)
- **AI Model**: Connected language model for summarization
- **Database**: Connected database for storing hierarchy
- **Main Output**: Final summary and metadata

## Token Budget Calculation Example

With `batchSize: 1024`:

```
Total Token Budget:         1024 tokens
- Summary Prompt:           -20 tokens  ("summarize the content...")
- Context Prompt:           -15 tokens  ("Focus on legal aspects")
- Safety Buffer:            -50 tokens
─────────────────────────────────────────
Available for Content:      939 tokens

At 4 chars/token:          3,756 characters per chunk
```

## Error Handling Examples

### 1. Batch Size Too Small
```json
{
  "error": "NodeOperationError",
  "message": "Batch size 100 too small for prompts",
  "details": "Minimum batch size needed: 170 tokens"
}
```

### 2. Missing AI Model Connection
```json
{
  "error": "NodeOperationError", 
  "message": "No language model connected. Please connect an AI language model to this node."
}
```

### 3. Database Connection Failed
```json
{
  "error": "NodeOperationError",
  "message": "Failed to get connected database. Please ensure a database node is connected."
}
```