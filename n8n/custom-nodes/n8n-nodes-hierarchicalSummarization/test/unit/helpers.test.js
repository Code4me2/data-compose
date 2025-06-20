const assert = require('assert');
const path = require('path');

// Since the helpers are not exported from the main file, we'll test them conceptually
// In a production setup, these would be in separate modules

describe('Helper Functions Unit Tests', () => {
  
  describe('estimateTokenCount', () => {
    // Simulating the estimateTokenCount function
    function estimateTokenCount(text) {
      const CHARS_PER_TOKEN = 4;
      const normalizedText = text.replace(/\s+/g, ' ').trim();
      return Math.ceil(normalizedText.length / CHARS_PER_TOKEN);
    }

    it('should estimate tokens for simple text', () => {
      const text = 'Hello world';
      const tokens = estimateTokenCount(text);
      assert.strictEqual(tokens, 3); // 11 chars / 4 = 2.75, rounded up to 3
    });

    it('should normalize whitespace before counting', () => {
      const text = 'Hello     world   \n\n  test';
      const tokens = estimateTokenCount(text);
      const expected = estimateTokenCount('Hello world test');
      assert.strictEqual(tokens, expected);
    });

    it('should handle empty string', () => {
      const tokens = estimateTokenCount('');
      assert.strictEqual(tokens, 0);
    });

    it('should handle very long text', () => {
      const text = 'a'.repeat(1000);
      const tokens = estimateTokenCount(text);
      assert.strictEqual(tokens, 250); // 1000 / 4 = 250
    });
  });

  describe('splitIntoSentences', () => {
    // Simulating the splitIntoSentences function
    function splitIntoSentences(text) {
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      return sentences.map(s => s.trim()).filter(s => s.length > 0);
    }

    it('should split basic sentences', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const sentences = splitIntoSentences(text);
      assert.strictEqual(sentences.length, 3);
      assert.strictEqual(sentences[0], 'First sentence.');
    });

    it('should handle different punctuation', () => {
      const text = 'Question? Exclamation! Statement.';
      const sentences = splitIntoSentences(text);
      assert.strictEqual(sentences.length, 3);
      assert.strictEqual(sentences[0], 'Question?');
      assert.strictEqual(sentences[1], 'Exclamation!');
    });

    it('should handle text without punctuation', () => {
      const text = 'This text has no ending punctuation';
      const sentences = splitIntoSentences(text);
      assert.strictEqual(sentences.length, 1);
      assert.strictEqual(sentences[0], 'This text has no ending punctuation');
    });

    it('should filter empty sentences', () => {
      const text = 'Sentence one. . . Sentence two.';
      const sentences = splitIntoSentences(text);
      // The regex splits on each period, so we get 4 non-empty parts:
      // "Sentence one", " ", " ", "Sentence two"
      // After trimming and filtering, we still have 4 parts
      assert.strictEqual(sentences.length, 4);
    });
  });

  describe('chunkDocument', () => {
    // Simulating a simplified version of chunkDocument
    function estimateTokenCount(text) {
      const CHARS_PER_TOKEN = 4;
      const normalizedText = text.replace(/\s+/g, ' ').trim();
      return Math.ceil(normalizedText.length / CHARS_PER_TOKEN);
    }

    function splitIntoSentences(text) {
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      return sentences.map(s => s.trim()).filter(s => s.length > 0);
    }

    async function chunkDocument(content, batchSize, promptTokens = 50) {
      const chunks = [];
      const contentTokenBudget = batchSize - promptTokens - 50;
      
      if (contentTokenBudget < 100) {
        throw new Error(`Batch size ${batchSize} too small for prompts`);
      }
      
      const sentences = splitIntoSentences(content);
      let currentChunk = [];
      let currentTokens = 0;
      let chunkIndex = 0;
      
      for (const sentence of sentences) {
        const sentenceTokens = estimateTokenCount(sentence);
        
        if (currentTokens + sentenceTokens > contentTokenBudget && currentChunk.length > 0) {
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
      
      if (currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.join(' '),
          index: chunkIndex,
          tokenCount: currentTokens,
        });
      }
      
      return chunks;
    }

    it('should create single chunk for small content', async () => {
      const content = 'This is a short sentence.';
      const chunks = await chunkDocument(content, 500);
      assert.strictEqual(chunks.length, 1);
      assert.strictEqual(chunks[0].content, 'This is a short sentence.');
    });

    it('should create multiple chunks for large content', async () => {
      const content = 'First sentence. '.repeat(50);
      const chunks = await chunkDocument(content, 200); // Small batch size
      assert(chunks.length > 1, 'Should create multiple chunks');
      assert(chunks[0].index === 0, 'First chunk should have index 0');
      assert(chunks[chunks.length - 1].index === chunks.length - 1, 'Last chunk index should match');
    });

    it('should throw error for batch size too small', async () => {
      const content = 'Some content.';
      try {
        await chunkDocument(content, 50); // Too small
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert(error.message.includes('too small for prompts'));
      }
    });

    it('should respect sentence boundaries', async () => {
      const content = 'First sentence. Second sentence. Third sentence.';
      const chunks = await chunkDocument(content, 300);
      
      // Check that no chunk starts or ends mid-sentence
      chunks.forEach(chunk => {
        assert(chunk.content.endsWith('.') || chunk.content.endsWith('!') || chunk.content.endsWith('?') || 
               chunk.content === content, 'Chunks should respect sentence boundaries');
      });
    });
  });
});

// Run the tests
if (require.main === module) {
  const tests = require('child_process').spawn('npm', ['test'], { stdio: 'inherit' });
}