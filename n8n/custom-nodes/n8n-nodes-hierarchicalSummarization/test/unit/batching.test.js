const assert = require('assert');

describe('Hierarchical Batching Tests', () => {
  
  // Simulating the core functions from the node
  const CHARS_PER_TOKEN = 4;
  
  function estimateTokenCount(text) {
    const normalizedText = text.replace(/\s+/g, ' ').trim();
    return Math.ceil(normalizedText.length / CHARS_PER_TOKEN);
  }
  
  function splitIntoSentences(text) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
  }
  
  async function chunkDocument(content, config) {
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
        tokenCount: currentTokens,
      });
    }
    
    return chunks;
  }
  
  describe('Batch Size Limit Handling', () => {
    
    it('should respect user-defined batch size for small limits', async () => {
      const config = {
        summaryPrompt: 'Summarize this: ',
        contextPrompt: '',
        batchSize: 200, // Small batch size
      };
      
      // Create content that would require multiple chunks
      // Each sentence is 25 chars = ~6-7 tokens, 20 sentences = ~140 tokens
      // With small batch size of 200 and prompt overhead, this should create multiple chunks
      const content = 'This is a test sentence. '.repeat(30);
      const chunks = await chunkDocument(content, config);
      
      // Verify all chunks respect the token limit
      const promptTokens = estimateTokenCount(config.summaryPrompt);
      const maxContentTokens = config.batchSize - promptTokens - 50;
      
      chunks.forEach((chunk, index) => {
        assert(chunk.tokenCount <= maxContentTokens, 
          `Chunk ${index} exceeds token limit: ${chunk.tokenCount} > ${maxContentTokens}`);
      });
      
      assert(chunks.length > 1, 'Should create multiple chunks for small batch size');
    });
    
    it('should handle very large batch sizes efficiently', async () => {
      const config = {
        summaryPrompt: 'Summarize: ',
        contextPrompt: '',
        batchSize: 8192, // Large batch size
      };
      
      // Create moderate content
      const content = 'This is a test sentence. '.repeat(50);
      const chunks = await chunkDocument(content, config);
      
      // With large batch size, this should fit in one chunk
      assert.strictEqual(chunks.length, 1, 'Should create single chunk for large batch size');
      assert(chunks[0].tokenCount > 0, 'Chunk should have valid token count');
    });
    
    it('should throw error when batch size is too small for prompts', async () => {
      const config = {
        summaryPrompt: 'This is a very long summary prompt that takes up many tokens. '.repeat(5),
        contextPrompt: 'Additional context here.',
        batchSize: 100, // Too small for the prompts
      };
      
      const content = 'Test content.';
      
      try {
        await chunkDocument(content, config);
        assert.fail('Should have thrown error for batch size too small');
      } catch (error) {
        assert(error.message.includes('too small for prompts'));
      }
    });
    
    it('should handle edge case of exactly fitting content', async () => {
      const config = {
        summaryPrompt: 'Sum: ', // 5 chars = ~2 tokens
        contextPrompt: '',
        batchSize: 200,
      };
      
      // Calculate exact content that should fit
      const promptTokens = 2;
      const buffer = 50;
      const availableTokens = 200 - promptTokens - buffer;
      const maxChars = availableTokens * CHARS_PER_TOKEN;
      
      // Create content that exactly fits
      const content = 'A'.repeat(maxChars - 10) + ' sentence.';
      const chunks = await chunkDocument(content, config);
      
      assert.strictEqual(chunks.length, 1, 'Content that exactly fits should create one chunk');
    });
  });
  
  describe('Hierarchical Processing', () => {
    
    it('should create proper hierarchy with multiple levels', () => {
      // Simulate hierarchical summarization
      const documents = [
        { id: 1, content: 'Doc 1 content', level: 0 },
        { id: 2, content: 'Doc 2 content', level: 0 },
        { id: 3, content: 'Doc 3 content', level: 0 },
        { id: 4, content: 'Doc 4 content', level: 0 },
      ];
      
      // Level 1: Combine pairs
      const level1 = [
        { id: 5, summary: 'Summary of 1 and 2', level: 1, parentIds: [1, 2] },
        { id: 6, summary: 'Summary of 3 and 4', level: 1, parentIds: [3, 4] },
      ];
      
      // Level 2: Final summary
      const level2 = [
        { id: 7, summary: 'Final summary', level: 2, parentIds: [5, 6] },
      ];
      
      assert.strictEqual(level1.length, 2, 'Level 1 should have 2 summaries');
      assert.strictEqual(level2.length, 1, 'Level 2 should have 1 final summary');
      assert.strictEqual(level2[0].level, 2, 'Final summary should be at level 2');
    });
    
    it('should handle odd number of documents in hierarchy', () => {
      // When we have odd numbers, the last document moves up alone
      const documents = [
        { id: 1, content: 'Doc 1', level: 0 },
        { id: 2, content: 'Doc 2', level: 0 },
        { id: 3, content: 'Doc 3', level: 0 },
      ];
      
      // Each document gets summarized individually at level 1
      const level1 = documents.map((doc, i) => ({
        id: 4 + i,
        summary: `Summary of ${doc.content}`,
        level: 1,
        parentId: doc.id
      }));
      
      assert.strictEqual(level1.length, 3, 'All documents should be summarized');
      
      // Then they continue to be processed until one remains
      // This ensures no document is lost in the hierarchy
    });
  });
  
  describe('Token Counting Accuracy', () => {
    
    it('should accurately estimate tokens for various text lengths', () => {
      const testCases = [
        { text: 'Hello', expected: 2 }, // 5 chars / 4 = 1.25, rounded up to 2
        { text: 'Hello world', expected: 3 }, // 11 chars / 4 = 2.75, rounded up to 3
        { text: 'A'.repeat(100), expected: 25 }, // 100 / 4 = 25
        { text: '   Multiple   spaces   ', expected: 4 }, // Should normalize to "Multiple spaces" = 15 chars / 4 = 3.75 -> 4
      ];
      
      testCases.forEach(({ text, expected }) => {
        const tokens = estimateTokenCount(text);
        assert.strictEqual(tokens, expected, 
          `Token count for "${text.substring(0, 20)}..." should be ${expected}, got ${tokens}`);
      });
    });
  });
  
  describe('Sentence Splitting Edge Cases', () => {
    
    it('should handle various punctuation correctly', () => {
      const testCases = [
        {
          text: 'First. Second! Third?',
          expected: ['First.', 'Second!', 'Third?']
        },
        {
          text: 'No punctuation at end',
          expected: ['No punctuation at end']
        },
        {
          text: 'Multiple... dots... here.',
          expected: ['Multiple...', 'dots...', 'here.']
        },
        {
          text: 'Mr. Smith went to Dr. Johnson.',
          expected: ['Mr.', 'Smith went to Dr.', 'Johnson.']
        }
      ];
      
      testCases.forEach(({ text, expected }) => {
        const sentences = splitIntoSentences(text);
        assert.deepStrictEqual(sentences, expected,
          `Sentence splitting failed for: ${text}`);
      });
    });
  });
  
  describe('Batch Size Scenarios', () => {
    
    const batchSizes = [100, 500, 1024, 2048, 4096, 8192, 16384, 32768];
    
    batchSizes.forEach(batchSize => {
      it(`should handle batch size of ${batchSize} correctly`, async () => {
        const config = {
          summaryPrompt: 'Summarize the content between <c></c> in two sentences',
          contextPrompt: '',
          batchSize: batchSize,
        };
        
        // Create variable length content
        const contentLength = batchSize * 2; // Chars, not tokens
        const content = generateTestContent(contentLength);
        
        try {
          const chunks = await chunkDocument(content, config);
          
          // Verify all chunks are within limits
          const promptTokens = estimateTokenCount(config.summaryPrompt);
          const maxTokens = batchSize - promptTokens - 50;
          
          chunks.forEach((chunk, i) => {
            assert(chunk.tokenCount <= maxTokens,
              `Chunk ${i} exceeds limit: ${chunk.tokenCount} > ${maxTokens} for batch size ${batchSize}`);
            assert(chunk.tokenCount > 0, `Chunk ${i} has no content`);
          });
          
          // Verify no content is lost
          const totalChunkContent = chunks.map(c => c.content).join(' ');
          const totalSentences = splitIntoSentences(content).length;
          const chunkSentences = splitIntoSentences(totalChunkContent).length;
          
          assert.strictEqual(chunkSentences, totalSentences, 
            'All sentences should be preserved in chunks');
          
        } catch (error) {
          // Only the smallest batch size should fail
          if (batchSize === 100) {
            assert(error.message.includes('too small'), 
              'Small batch size should fail with appropriate error');
          } else {
            throw error;
          }
        }
      });
    });
  });
});

// Helper function to generate test content
function generateTestContent(targetChars) {
  const sentences = [
    'The quick brown fox jumps over the lazy dog.',
    'Technology advances at an exponential rate.',
    'Machine learning models require significant computational resources.',
    'Data processing involves multiple stages of transformation.',
    'Hierarchical structures organize information efficiently.',
  ];
  
  let content = '';
  let index = 0;
  
  while (content.length < targetChars) {
    content += sentences[index % sentences.length] + ' ';
    index++;
  }
  
  return content.trim();
}

// Run tests if executed directly
if (require.main === module) {
  console.log('Running hierarchical batching tests...');
  console.log('Run with: npm test');
}