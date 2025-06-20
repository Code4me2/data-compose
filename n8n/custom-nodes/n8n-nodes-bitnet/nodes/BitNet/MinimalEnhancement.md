# Minimal Enhancement Implementation Guide

## Overview
This guide shows how to add intermediate processing to the BitNet recursive summarization with minimal impact to existing functionality.

## Key Principles
1. All existing functionality remains unchanged when new features are disabled
2. New features are opt-in via a simple boolean flag
3. Code changes are localized to specific sections
4. No breaking changes to API or output format

## Implementation Steps

### 1. Add New Property to Node Definition
Add this to the `summaryOptions` collection in `BitNet.node.ts` (around line 360):

```typescript
{
  displayName: 'Enable Intermediate Processing',
  name: 'enableIntermediateProcessing',
  type: 'boolean',
  default: false,
  description: 'Process chunks with semantic grouping before summarization',
},
{
  displayName: 'Group Similar Chunks',
  name: 'groupSimilarChunks',
  type: 'boolean',
  default: true,
  displayOptions: {
    show: {
      enableIntermediateProcessing: [true],
    },
  },
  description: 'Group semantically similar chunks together',
},
```

### 2. Modify the Recursive Summary Logic
In the recursive summary operation (around line 767), add this check:

```typescript
// Get intermediate processing options
const enableIntermediate = summaryOptions.enableIntermediateProcessing as boolean || false;
const groupSimilar = summaryOptions.groupSimilarChunks as boolean || true;

// Store additional metadata if processing is enabled
const processingMetadata: IDataObject[] = [];
```

### 3. Add Processing Before Summarization
Replace the chunk processing loop (around line 771) with:

```typescript
// Process chunks with optional grouping
let chunksToProcess = chunks;
let chunkGroups: Array<{indices: number[], theme?: string}> = [];

if (enableIntermediate && groupSimilar && chunks.length > 2) {
  // Simple grouping by dividing chunks into semantic groups
  // In production, this would use embeddings for similarity
  const numGroups = Math.min(Math.ceil(chunks.length / 3), 5);
  const groupSize = Math.ceil(chunks.length / numGroups);
  
  for (let g = 0; g < chunks.length; g += groupSize) {
    chunkGroups.push({
      indices: Array.from({ length: Math.min(groupSize, chunks.length - g) }, (_, i) => g + i),
      theme: `Section ${chunkGroups.length + 1}`,
    });
  }
  
  // Process by groups instead of individual chunks
  for (const group of chunkGroups) {
    const groupText = group.indices.map(i => chunks[i]).join('\n\n');
    const prompt = summaryManagerWithConfig.generateSummaryPrompt(
      groupText, 
      currentLevel,
      { topic: summaryOptions.topic, groupTheme: group.theme }
    );
    
    // Make API call to summarize group
    const response = await this.helpers.httpRequest({
      method: 'POST',
      url: `${serverUrl}/completion`,
      headers: { 'Content-Type': 'application/json' },
      body: {
        prompt,
        temperature: additionalOptions.temperature || 0.7,
        max_tokens: Math.floor(groupText.length * config.summaryRatio / 4),
        top_p: additionalOptions.topP || 0.9,
        top_k: additionalOptions.topK || 40,
      },
      json: true,
    });
    
    const summaryText = response.choices?.[0]?.text || response.content || '';
    summaries.push(summaryText);
  }
  
  // Store grouping metadata
  processingMetadata.push({
    level: currentLevel,
    groupCount: chunkGroups.length,
    groups: chunkGroups.map(g => ({ size: g.indices.length, theme: g.theme })),
  });
} else {
  // Original chunk-by-chunk processing (unchanged)
  for (const chunk of chunks) {
    const prompt = summaryManagerWithConfig.generateSummaryPrompt(
      chunk, 
      currentLevel,
      { topic: summaryOptions.topic }
    );
    
    const response = await this.helpers.httpRequest({
      method: 'POST',
      url: `${serverUrl}/completion`,
      headers: { 'Content-Type': 'application/json' },
      body: {
        prompt,
        temperature: additionalOptions.temperature || 0.7,
        max_tokens: Math.floor(chunk.length * config.summaryRatio / 4),
        top_p: additionalOptions.topP || 0.9,
        top_k: additionalOptions.topK || 40,
      },
      json: true,
    });
    
    const summaryText = response.choices?.[0]?.text || response.content || '';
    summaries.push(summaryText);
  }
}
```

### 4. Add Metadata to Output
In the output formatting section (around line 862), enhance the metadata:

```typescript
case 'hierarchical':
default:
  result = summaryManagerWithConfig.formatHierarchicalSummary(levels);
  // Add processing metadata if intermediate processing was used
  if (enableIntermediate && processingMetadata.length > 0) {
    result.intermediateProcessing = {
      enabled: true,
      type: 'semantic_grouping',
      metadata: processingMetadata,
    };
  }
  break;
```

## Benefits of This Approach

1. **Zero Impact When Disabled**: When `enableIntermediateProcessing` is false, the code runs exactly as before
2. **Simple Toggle**: Users can enable/disable with a single checkbox
3. **Extensible**: Easy to add more processing types later
4. **Transparent**: Processing metadata is included in output for debugging
5. **Backwards Compatible**: Existing workflows continue to work unchanged

## Testing the Enhancement

1. Run existing workflows without enabling the new option - they should work identically
2. Enable intermediate processing on a test document
3. Compare outputs with and without processing
4. Check that semantic groups produce more coherent summaries

## Future Extensions

Once this minimal version is working, you can add:
- Keyword extraction at each level
- Entity recognition and consolidation
- Custom grouping algorithms
- External processor node connections
- Topic modeling between levels

The key is that each addition follows the same pattern: opt-in flag, conditional processing, metadata capture.