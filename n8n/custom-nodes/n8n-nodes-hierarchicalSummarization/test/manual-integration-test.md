# Manual Integration Test for Hierarchical Summarization Node

## Prerequisites
- n8n running with the Hierarchical Summarization node installed
- PostgreSQL credentials configured in n8n
- An AI Language Model node available (DeepSeek, OpenAI, etc.)
- Test documents in `/test/fixtures/` directory

## Test 1: Basic Document Processing

### Setup
1. Create a new workflow in n8n
2. Add nodes:
   - **Hierarchical Summarization** node
   - **AI Language Model** node (e.g., DeepSeek)

### Configuration
1. Connect the AI model to the Hierarchical Summarization node's Language Model input
2. Configure Hierarchical Summarization:
   - Database Configuration: "Use Credentials" 
   - Select your PostgreSQL credentials
   - Content Source: "Directory Path"
   - Directory Path: `/home/manzanita/coding/data-compose/n8n/custom-nodes/n8n-nodes-hierarchicalSummarization/test/fixtures`
   - Summary Prompt: `summarize the content between the two tokens <c></c> in two or less sentences`
   - Batch Size: 500 (for testing with small files)

### Expected Results
- ✅ Node should process all .txt files in the fixtures directory
- ✅ Database tables should be created automatically
- ✅ Final summary should be returned
- ✅ Check PostgreSQL for hierarchical document structure

### Verification Commands
```bash
# Check if tables were created
docker exec data-compose-db-1 psql -U your_db_user -d your_db_name -c '\dt'

# Check document hierarchy
docker exec data-compose-db-1 psql -U your_db_user -d your_db_name -c 'SELECT id, hierarchy_level, token_count, LEFT(content, 50) as content_preview, LEFT(summary, 50) as summary_preview FROM hierarchical_documents ORDER BY hierarchy_level, id;'

# Check processing status
docker exec data-compose-db-1 psql -U your_db_user -d your_db_name -c 'SELECT * FROM processing_status;'
```

## Test 2: Credential Configuration

### Test Cases
1. **Valid Credentials**: Should connect successfully
2. **Invalid Host**: Change host to "invalid_host" - should fail with connection error
3. **Manual Configuration**: Switch to manual config with same values - should work

## Test 3: Error Handling

### Test Cases
1. **Empty Directory**: Point to empty directory - should show error
2. **Non-existent Directory**: Use path `/tmp/does_not_exist` - should show clear error
3. **No AI Model Connected**: Disconnect AI model - should show error about missing language model

## Test 4: Large Document Processing

### Setup
1. Create a larger test document:
```bash
# Create a 10KB test file
for i in {1..100}; do
  echo "This is paragraph $i. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." >> /tmp/large_test.txt
done
```

2. Configure node with:
   - Directory Path: `/tmp`
   - Batch Size: 1024

### Expected Results
- ✅ Document should be chunked into multiple pieces
- ✅ Multiple hierarchy levels should be created
- ✅ Final summary should consolidate all chunks

## Test 5: Database Persistence

### Test
1. Run workflow with Test 1 configuration
2. Note the `batchId` from the output
3. Create a new workflow with just a PostgreSQL node
4. Query: `SELECT * FROM hierarchical_documents WHERE batch_id = 'YOUR_BATCH_ID';`

### Expected Results
- ✅ All documents from the batch should be retrievable
- ✅ Parent-child relationships should be intact
- ✅ Hierarchy levels should be properly organized

## Automated Test Results

The node includes automated tests that verify:
- ✅ Node structure and properties
- ✅ Token counting logic
- ✅ Sentence splitting functionality
- ✅ Document chunking algorithm

Run automated tests with:
```bash
npm run test:quick  # No database required
npm run test:verify # Full verification (requires database)
```

## Performance Benchmarks

With the test fixtures (3 small documents):
- Expected processing time: < 5 seconds
- Database operations: ~10 queries
- Memory usage: < 50MB

## Troubleshooting

### Common Issues

1. **"password authentication failed"**
   - Ensure .env file matches actual PostgreSQL credentials
   - Use credentials that match your PostgreSQL container

2. **"No language model connected"**
   - Ensure AI model node is properly connected to the second input
   - Check that the AI model node is configured correctly

3. **"Cannot access directory"**
   - Use absolute paths
   - Ensure n8n container has access to the directory
   - For Docker: paths are inside the container, not host paths

4. **Tables not created**
   - Check PostgreSQL logs: `docker logs data-compose-db-1`
   - Ensure user has CREATE TABLE permissions
   - Try manual configuration instead of credentials