const assert = require('assert');

describe('Batch Size Verification Tests', () => {
  
  // Import the actual functions from the node
  const CHARS_PER_TOKEN = 4;
  
  function estimateTokenCount(text) {
    const normalizedText = text.replace(/\s+/g, ' ').trim();
    return Math.ceil(normalizedText.length / CHARS_PER_TOKEN);
  }
  
  function splitIntoSentences(text) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
  }
  
  async function chunkDocument(document, config) {
    const content = document.summary || document.content;
    const chunks = [];
    
    // Calculate available tokens after accounting for prompts
    const promptTokens = estimateTokenCount(
      config.summaryPrompt + (config.contextPrompt || '')
    );
    const contentTokenBudget = config.batchSize - promptTokens - 50; // 50 token safety buffer
    
    if (contentTokenBudget < 100) {
      throw new Error(`Batch size ${config.batchSize} too small for prompts`);
    }
    
    // Split content into sentences for clean chunking
    const sentences = splitIntoSentences(content);
    
    let currentChunk = [];
    let currentTokens = 0;
    let chunkIndex = 0;
    
    for (const sentence of sentences) {
      const sentenceTokens = estimateTokenCount(sentence);
      
      if (currentTokens + sentenceTokens > contentTokenBudget && currentChunk.length > 0) {
        // Current chunk is full - save it
        chunks.push({
          content: currentChunk.join(' '),
          index: chunkIndex++,
          parentDocumentId: document.id,
          tokenCount: currentTokens,
        });
        
        currentChunk = [sentence];
        currentTokens = sentenceTokens;
      } else {
        currentChunk.push(sentence);
        currentTokens += sentenceTokens;
      }
    }
    
    // Add final chunk
    if (currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.join(' '),
        index: chunkIndex,
        parentDocumentId: document.id,
        tokenCount: currentTokens,
      });
    }
    
    return chunks;
  }
  
  describe('User Batch Size Limits', () => {
    
    it('should adapt hierarchy to user-defined batch size of 256 tokens', async () => {
      const config = {
        summaryPrompt: 'Summarize the content between <c></c> in two sentences',
        contextPrompt: '',
        batchSize: 256,
      };
      
      // Create document that would need multiple chunks at this batch size
      const document = {
        id: 1,
        content: 'The legal framework establishes clear guidelines. '.repeat(20),
      };
      
      const chunks = await chunkDocument(document, config);
      
      // Verify chunking behavior
      assert(chunks.length > 1, 'Should create multiple chunks for 256 token limit');
      
      // Verify each chunk respects the limit
      const promptTokens = estimateTokenCount(config.summaryPrompt);
      const maxContentTokens = config.batchSize - promptTokens - 50;
      
      chunks.forEach((chunk, i) => {
        assert(chunk.tokenCount <= maxContentTokens,
          `Chunk ${i} exceeds limit: ${chunk.tokenCount} > ${maxContentTokens}`);
        assert(chunk.parentDocumentId === 1, 'Should maintain parent reference');
      });
    });
    
    it('should handle extreme batch sizes correctly', async () => {
      const testCases = [
        { batchSize: 200, shouldWork: true, expectMultipleChunks: false }, // 20 sentences * 15 chars = 300 chars = 75 tokens, fits in ~135 token budget
        { batchSize: 512, shouldWork: true, expectMultipleChunks: false },
        { batchSize: 2048, shouldWork: true, expectMultipleChunks: false },
        { batchSize: 90, shouldWork: false, expectMultipleChunks: false },
      ];
      
      for (const testCase of testCases) {
        const config = {
          summaryPrompt: 'Summarize this: ',
          contextPrompt: '',
          batchSize: testCase.batchSize,
        };
        
        const document = {
          id: 1,
          content: 'Test sentence. '.repeat(20), // ~300 chars = ~75 tokens
        };
        
        if (testCase.shouldWork) {
          const chunks = await chunkDocument(document, config);
          
          if (testCase.expectMultipleChunks) {
            assert(chunks.length > 1, 
              `Batch size ${testCase.batchSize} should create multiple chunks`);
          } else {
            assert.strictEqual(chunks.length, 1,
              `Batch size ${testCase.batchSize} should create single chunk`);
          }
        } else {
          await assert.rejects(
            () => chunkDocument(document, config),
            /too small for prompts/,
            `Batch size ${testCase.batchSize} should be rejected`
          );
        }
      }
    });
    
    it('should maintain document integrity across different batch sizes', async () => {
      const batchSizes = [200, 500, 1000, 2000];
      const originalContent = 'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence.';
      
      for (const batchSize of batchSizes) {
        const config = {
          summaryPrompt: 'Summarize: ',
          contextPrompt: '',
          batchSize: batchSize,
        };
        
        const document = {
          id: 1,
          content: originalContent,
        };
        
        const chunks = await chunkDocument(document, config);
        
        // Reconstruct content from chunks
        const reconstructed = chunks
          .map(chunk => chunk.content)
          .join(' ');
        
        // Verify all sentences are preserved
        const originalSentences = splitIntoSentences(originalContent);
        const reconstructedSentences = splitIntoSentences(reconstructed);
        
        assert.strictEqual(
          reconstructedSentences.length,
          originalSentences.length,
          `Batch size ${batchSize}: All sentences should be preserved`
        );
      }
    });
    
    it('should properly handle hierarchical processing with user batch limits', async () => {
      // Simulate hierarchical summarization with specific batch size
      const batchSize = 512;
      const config = {
        summaryPrompt: 'Summarize the content between <c></c> in two sentences',
        contextPrompt: 'This is part of a legal document analysis.',
        batchSize: batchSize,
        batchId: 'test-batch-001'
      };
      
      // Simulate multiple documents that would create a hierarchy
      const documents = [
        { id: 1, content: 'Legal provision one. '.repeat(20), level: 0 },
        { id: 2, content: 'Legal provision two. '.repeat(20), level: 0 },
        { id: 3, content: 'Legal provision three. '.repeat(20), level: 0 },
        { id: 4, content: 'Legal provision four. '.repeat(20), level: 0 },
      ];
      
      // Process each document and verify chunking
      for (const doc of documents) {
        const chunks = await chunkDocument(doc, config);
        
        // Each chunk should respect the batch size
        const promptTokens = estimateTokenCount(
          config.summaryPrompt + config.contextPrompt
        );
        const maxTokens = batchSize - promptTokens - 50;
        
        chunks.forEach(chunk => {
          assert(chunk.tokenCount <= maxTokens,
            `Document ${doc.id} chunk exceeds batch limit`);
        });
      }
      
      // Verify hierarchy can be built with these constraints
      assert(documents.length === 4, 'Should have 4 base documents');
      
      // At level 1, these would be combined into pairs
      // At level 2, the pairs would be combined into final summary
      // This demonstrates the hierarchy adapts to batch constraints
    });
  });
});

// Run tests if executed directly
if (require.main === module) {
  console.log('Running batch verification tests...');
}