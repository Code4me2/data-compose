# Hierarchical Summarization Processing Time Estimate

## Test Folder Analysis
- **Files**: 5 text files
- **Total Size**: 35,953 bytes (~36 KB)
- **Estimated Tokens**: ~9,000 tokens (using 4 chars/token)
- **Average per file**: ~7,200 bytes / ~1,800 tokens

## Current BitNet Performance
- **Prompt Processing**: ~140 tokens/second
- **Generation Speed**: ~30 tokens/second
- **Summary Length**: 50 tokens (configured limit)

## Processing Stages Calculation

### Stage 1: Level 0 → Level 1 (Chunking/Batching)
With batch size of 512 tokens:
- Each file (~1,800 tokens) will need 3-4 chunks
- Total chunks: 5 files × 4 chunks = ~20 chunks
- No AI processing at this stage (just reorganization)

### Stage 2: Level 1 → Level 2 (First Summaries)
20 chunks need summarization:
- **Per chunk processing**:
  - Prompt tokens: ~512 (chunk) + ~100 (prompt template) = ~612 tokens
  - Prompt processing: 612 ÷ 140 = ~4.4 seconds
  - Summary generation: 50 ÷ 30 = ~1.7 seconds
  - Total per chunk: ~6.1 seconds
- **Total for Level 2**: 20 chunks × 6.1 seconds = **122 seconds**

### Stage 3: Level 2 → Level 3 (Consolidation)
20 summaries (50 tokens each) = 1,000 tokens total
With batch size 512, this creates ~2 batches:
- **Per batch**:
  - Prompt tokens: ~512 + ~100 = ~612 tokens
  - Processing time: ~6.1 seconds
- **Total for Level 3**: 2 batches × 6.1 seconds = **12 seconds**

### Stage 4: Level 3 → Level 4 (Final Summary)
2 summaries (50 tokens each) = 100 tokens:
- Prompt tokens: 100 + 100 = 200 tokens
- Prompt processing: 200 ÷ 140 = ~1.4 seconds
- Summary generation: 50 ÷ 30 = ~1.7 seconds
- **Total for Level 4**: ~3 seconds

## Total Processing Time Estimate

| Stage | Operations | Time per Op | Total Time |
|-------|------------|-------------|------------|
| Level 0→1 | Chunking | ~0s | 0s |
| Level 1→2 | 20 summaries | ~6.1s | 122s |
| Level 2→3 | 2 summaries | ~6.1s | 12s |
| Level 3→4 | 1 summary | ~3s | 3s |
| **Database operations** | ~30 queries | ~0.1s | 3s |
| **Overhead** | Node execution | - | ~5s |

### **Expected Total: 145 seconds (2.4 minutes)**

## Factors That Could Increase Time

1. **Token Limit Issues** (+50-100%):
   - If summaries don't condense enough, more levels needed
   - Could require 5-6 levels instead of 4

2. **Larger Batch Size** (-20%):
   - Increasing to 1024 would reduce API calls
   - Fewer chunks = faster processing

3. **Network/Database Latency** (+10%):
   - Docker networking overhead
   - PostgreSQL query time

## Optimistic vs Pessimistic Estimates

- **Best Case** (batch size 1024, 3 levels): ~90 seconds
- **Expected Case** (current settings): ~145 seconds
- **Worst Case** (convergence issues, 6+ levels): ~300 seconds

## Recommendations

1. **Increase batch size to 1024**: Reduce processing time by ~20%
2. **Lower token limit to 30-40**: Better convergence
3. **Optimize prompt**: Request more aggressive summarization
4. **Monitor convergence**: Watch for token count reduction at each level

Based on the current configuration and token generation rates, you should expect the test folder to process in **approximately 2-3 minutes** under normal conditions.