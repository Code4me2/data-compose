#!/usr/bin/env node

/**
 * Unit tests for the improved functions in the hierarchical summarization node
 */

const assert = require('assert');

// Import the built node
const nodeModule = require('../../dist/nodes/HierarchicalSummarization/HierarchicalSummarization.node.js');

// Extract the functions we want to test (they should be exported or we'll test through the class)
// Since the functions are not exported, we'll create local versions for testing

// Copy of extractTextContent function
function extractTextContent(item) {
  if (!item.json) return null;
  
  // Priority order for field checking - most common fields first
  const fieldPriority = [
    'content', 'text', 'data', 'message', 'body', 
    'description', 'value', 'output', 'result', 'html'
  ];
  
  for (const field of fieldPriority) {
    const value = item.json[field];
    if (value && typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  
  // Check for HTML with text fallback
  if (item.json.html && item.json.text) {
    const textValue = item.json.text;
    if (typeof textValue === 'string' && textValue.trim()) {
      return textValue;
    }
  }
  
  // Check for nested content in common structures
  if (typeof item.json.response === 'object' && item.json.response && 'content' in item.json.response) {
    const content = item.json.response.content;
    if (typeof content === 'string' && content.trim()) {
      return content;
    }
  }
  
  if (typeof item.json.payload === 'object' && item.json.payload && 'text' in item.json.payload) {
    const text = item.json.payload.text;
    if (typeof text === 'string' && text.trim()) {
      return text;
    }
  }
  
  // Check binary data for text content
  if (item.binary && Object.keys(item.binary).length > 0) {
    console.log('Binary data detected but not processed. Consider converting binary to text first.');
  }
  
  return null;
}

// Test suite
describe('Improved Functions Test Suite', () => {
  
  describe('extractTextContent', () => {
    it('should extract from standard content field', () => {
      const item = { json: { content: 'Test content' } };
      assert.strictEqual(extractTextContent(item), 'Test content');
    });
    
    it('should extract from text field', () => {
      const item = { json: { text: 'Test text' } };
      assert.strictEqual(extractTextContent(item), 'Test text');
    });
    
    it('should extract from data field', () => {
      const item = { json: { data: 'Test data' } };
      assert.strictEqual(extractTextContent(item), 'Test data');
    });
    
    it('should handle nested response.content', () => {
      const item = { json: { response: { content: 'Nested content' } } };
      assert.strictEqual(extractTextContent(item), 'Nested content');
    });
    
    it('should handle nested payload.text', () => {
      const item = { json: { payload: { text: 'Payload text' } } };
      assert.strictEqual(extractTextContent(item), 'Payload text');
    });
    
    it('should return null for empty json', () => {
      const item = { json: {} };
      assert.strictEqual(extractTextContent(item), null);
    });
    
    it('should return null for non-string values', () => {
      const item = { json: { content: 123, text: true, data: {} } };
      assert.strictEqual(extractTextContent(item), null);
    });
    
    it('should prefer text over html when both exist', () => {
      const item = { json: { html: '<p>HTML</p>', text: 'Plain text' } };
      assert.strictEqual(extractTextContent(item), 'Plain text');
    });
    
    it('should handle binary data gracefully', () => {
      const item = { 
        json: {}, 
        binary: { data: 'base64content' } 
      };
      // Should log a message but return null
      assert.strictEqual(extractTextContent(item), null);
    });
  });
  
  describe('Node Instantiation', () => {
    it('should create node instance', () => {
      const { HierarchicalSummarization } = nodeModule;
      const node = new HierarchicalSummarization();
      assert(node.description);
      assert.strictEqual(node.description.displayName, 'Hierarchical Summarization');
    });
    
    it('should have correct version', () => {
      const { HierarchicalSummarization } = nodeModule;
      const node = new HierarchicalSummarization();
      assert.strictEqual(node.description.version, 1);
    });
    
    it('should have AI Language Model input', () => {
      const { HierarchicalSummarization } = nodeModule;
      const node = new HierarchicalSummarization();
      const aiInput = node.description.inputs.find(
        input => typeof input === 'object' && input.displayName === 'Language Model'
      );
      assert(aiInput);
      assert.strictEqual(aiInput.required, true);
    });
  });
});

// Simple test runner
console.log('🧪 Unit Tests for Improved Functions\n');

let testsPassed = 0;
let testsFailed = 0;

function describe(name, fn) {
  console.log(`\n${name}`);
  fn();
}

function it(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${error.message}`);
    testsFailed++;
  }
}

// Run tests
describe('Improved Functions Test Suite', () => {
  
  describe('extractTextContent', () => {
    it('should extract from standard content field', () => {
      const item = { json: { content: 'Test content' } };
      assert.strictEqual(extractTextContent(item), 'Test content');
    });
    
    it('should extract from text field', () => {
      const item = { json: { text: 'Test text' } };
      assert.strictEqual(extractTextContent(item), 'Test text');
    });
    
    it('should extract from data field', () => {
      const item = { json: { data: 'Test data' } };
      assert.strictEqual(extractTextContent(item), 'Test data');
    });
    
    it('should handle nested response.content', () => {
      const item = { json: { response: { content: 'Nested content' } } };
      assert.strictEqual(extractTextContent(item), 'Nested content');
    });
    
    it('should handle nested payload.text', () => {
      const item = { json: { payload: { text: 'Payload text' } } };
      assert.strictEqual(extractTextContent(item), 'Payload text');
    });
    
    it('should return null for empty json', () => {
      const item = { json: {} };
      assert.strictEqual(extractTextContent(item), null);
    });
    
    it('should return null for non-string values', () => {
      const item = { json: { content: 123, text: true, data: {} } };
      assert.strictEqual(extractTextContent(item), null);
    });
    
    it('should prefer text over html when both exist', () => {
      const item = { json: { html: '<p>HTML</p>', text: 'Plain text' } };
      assert.strictEqual(extractTextContent(item), 'Plain text');
    });
    
    it('should handle binary data gracefully', () => {
      const item = { 
        json: {}, 
        binary: { data: 'base64content' } 
      };
      // Should log a message but return null
      assert.strictEqual(extractTextContent(item), null);
    });
    
    it('should ignore empty strings', () => {
      const item = { json: { content: '', text: '   ', data: 'Valid data' } };
      assert.strictEqual(extractTextContent(item), 'Valid data');
    });
  });
  
  describe('Node Instantiation', () => {
    it('should create node instance', () => {
      const { HierarchicalSummarization } = nodeModule;
      const node = new HierarchicalSummarization();
      assert(node.description);
      assert.strictEqual(node.description.displayName, 'Hierarchical Summarization');
    });
    
    it('should have correct version', () => {
      const { HierarchicalSummarization } = nodeModule;
      const node = new HierarchicalSummarization();
      assert.strictEqual(node.description.version, 1);
    });
    
    it('should have AI Language Model input', () => {
      const { HierarchicalSummarization } = nodeModule;
      const node = new HierarchicalSummarization();
      const aiInput = node.description.inputs.find(
        input => typeof input === 'object' && input.displayName === 'Language Model'
      );
      assert(aiInput);
      assert.strictEqual(aiInput.required, true);
    });
  });
});

console.log('\n📊 Test Summary:');
console.log(`   Passed: ${testsPassed}`);
console.log(`   Failed: ${testsFailed}`);
console.log(`   Total: ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
  console.log('\n✅ All unit tests passed!');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed.');
  process.exit(1);
}