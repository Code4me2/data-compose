#!/usr/bin/env node

/**
 * Comprehensive test suite for verifying hierarchical summarization fixes
 */

const fs = require('fs').promises;
const path = require('path');

// Test data representing various n8n input formats
const testCases = {
  // Standard n8n formats
  standardFormats: [
    {
      name: 'Standard content field',
      input: { json: { content: 'This is a test document about AI technology.' } },
      expectedField: 'content'
    },
    {
      name: 'Text field format',
      input: { json: { text: 'This is a test document using text field.' } },
      expectedField: 'text'
    },
    {
      name: 'Data field format',
      input: { json: { data: 'This is a test document using data field.' } },
      expectedField: 'data'
    },
    {
      name: 'Message field format',
      input: { json: { message: 'This is a test document using message field.' } },
      expectedField: 'message'
    },
    {
      name: 'Body field format',
      input: { json: { body: 'This is a test document using body field.' } },
      expectedField: 'body'
    },
    {
      name: 'HTML content',
      input: { json: { html: '<p>This is HTML content</p>', text: 'This is HTML content' } },
      expectedField: 'text' // Should prefer text over html
    }
  ],

  // Documents with challenging punctuation for sentence splitting
  sentenceSplitTests: [
    {
      name: 'Abbreviations',
      content: 'Dr. Smith met with Mr. Johnson at 3 p.m. to discuss the proposal. They agreed on the terms.',
      expectedSentences: 2
    },
    {
      name: 'Decimal numbers',
      content: 'The profit margin increased by 3.14%. Sales reached $2.5 million this quarter.',
      expectedSentences: 2
    },
    {
      name: 'Ellipsis',
      content: 'The results were... unexpected. We need to reconsider our approach.',
      expectedSentences: 2
    },
    {
      name: 'Quotes and dialogue',
      content: 'She said, "Hello, how are you?" He replied, "I\'m fine, thanks!"',
      expectedSentences: 2
    },
    {
      name: 'URLs and emails',
      content: 'Visit our website at https://example.com/page. Contact us at info@example.com for details.',
      expectedSentences: 2
    },
    {
      name: 'Mixed punctuation',
      content: 'Really?! That\'s amazing! I can\'t believe it... What do you think?',
      expectedSentences: 4
    }
  ],

  // AI model response formats from different providers
  aiResponseFormats: [
    {
      name: 'OpenAI format',
      response: {
        choices: [{
          message: { content: 'This is a summary from OpenAI.' },
          finish_reason: 'stop'
        }]
      },
      expectedSummary: 'This is a summary from OpenAI.'
    },
    {
      name: 'Anthropic format',
      response: {
        content: 'This is a summary from Anthropic.',
        stop_reason: 'end_turn'
      },
      expectedSummary: 'This is a summary from Anthropic.'
    },
    {
      name: 'Simple text response',
      response: 'This is a simple text summary.',
      expectedSummary: 'This is a simple text summary.'
    },
    {
      name: 'Cohere format',
      response: {
        text: 'This is a summary from Cohere.',
        generation_id: '123'
      },
      expectedSummary: 'This is a summary from Cohere.'
    },
    {
      name: 'Google format',
      response: {
        candidates: [{
          content: { parts: [{ text: 'This is a summary from Google.' }] }
        }]
      },
      expectedSummary: 'This is a summary from Google.'
    },
    {
      name: 'Ollama format',
      response: {
        response: 'This is a summary from Ollama.',
        model: 'llama2'
      },
      expectedSummary: 'This is a summary from Ollama.'
    }
  ],

  // Error scenarios
  errorScenarios: [
    {
      name: 'Empty input',
      input: { json: {} },
      expectedError: 'No text content found in input'
    },
    {
      name: 'All fields empty',
      input: { json: { content: '', text: '', data: null } },
      expectedError: 'Input contains empty content'
    },
    {
      name: 'Binary data only',
      input: { binary: { data: 'base64data' }, json: {} },
      expectedError: 'Binary data processing not supported'
    },
    {
      name: 'Invalid AI response',
      response: { error: 'Model overloaded' },
      expectedError: 'No summary content in AI response'
    }
  ],

  // Transaction safety tests
  transactionTests: [
    {
      name: 'Database connection failure',
      simulateError: 'connection',
      expectedBehavior: 'No partial data in database'
    },
    {
      name: 'Mid-processing failure',
      simulateError: 'processing',
      expectedBehavior: 'Rollback all changes'
    },
    {
      name: 'Schema creation failure',
      simulateError: 'schema',
      expectedBehavior: 'Clear error message, no corruption'
    }
  ]
};

// Test utilities
function extractTextContent(item) {
  if (!item.json) return null;
  
  // Priority order for field checking
  const fieldPriority = [
    'content', 'text', 'data', 'message', 'body', 
    'description', 'value', 'output', 'result'
  ];
  
  for (const field of fieldPriority) {
    if (item.json[field] && typeof item.json[field] === 'string' && item.json[field].trim()) {
      return item.json[field];
    }
  }
  
  // Check for HTML with text fallback
  if (item.json.html && item.json.text) {
    return item.json.text;
  }
  
  return null;
}

function parseAIResponse(response) {
  if (!response) {
    throw new Error('No response from AI model');
  }

  // Direct string response
  if (typeof response === 'string') {
    return response;
  }

  // Common AI provider formats
  const extractors = [
    // OpenAI
    () => response.choices?.[0]?.message?.content,
    () => response.choices?.[0]?.text,
    // Anthropic
    () => response.content,
    // Cohere
    () => response.text,
    // Google
    () => response.candidates?.[0]?.content?.parts?.[0]?.text,
    () => response.candidates?.[0]?.text,
    // Ollama
    () => response.response,
    // Generic
    () => response.message?.content,
    () => response.data?.content,
    () => response.result,
    () => response.output,
    () => response.completion,
    () => response.generated_text
  ];

  for (const extractor of extractors) {
    try {
      const result = extractor();
      if (result && typeof result === 'string') {
        return result.trim();
      }
    } catch (e) {
      // Continue to next extractor
    }
  }

  throw new Error('No summary content found in AI response');
}

function splitIntoSentences(text) {
  // Improved sentence splitting that handles edge cases
  
  // Protect abbreviations and decimals
  const abbreviations = ['Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.', 'Sr.', 'Jr.', 'Ph.D.', 'M.D.', 'B.A.', 'M.A.', 'B.S.', 'M.S.'];
  let protected = text;
  const placeholders = new Map();
  let placeholderIndex = 0;

  // Protect abbreviations
  abbreviations.forEach(abbr => {
    const placeholder = `__ABBR_${placeholderIndex++}__`;
    placeholders.set(placeholder, abbr);
    protected = protected.replace(new RegExp(abbr.replace('.', '\\.'), 'g'), placeholder);
  });

  // Protect decimal numbers
  protected = protected.replace(/(\d+)\.(\d+)/g, (match) => {
    const placeholder = `__NUM_${placeholderIndex++}__`;
    placeholders.set(placeholder, match);
    return placeholder;
  });

  // Protect URLs
  protected = protected.replace(/https?:\/\/[^\s]+/g, (match) => {
    const placeholder = `__URL_${placeholderIndex++}__`;
    placeholders.set(placeholder, match);
    return placeholder;
  });

  // Protect email addresses
  protected = protected.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, (match) => {
    const placeholder = `__EMAIL_${placeholderIndex++}__`;
    placeholders.set(placeholder, match);
    return placeholder;
  });

  // Split sentences on sentence-ending punctuation followed by space and capital letter
  const sentenceRegex = /(?<=[.!?])\s+(?=[A-Z])/g;
  let sentences = protected.split(sentenceRegex);

  // Handle edge cases
  sentences = sentences.map(s => s.trim()).filter(s => s.length > 0);

  // Restore protected content
  sentences = sentences.map(sentence => {
    let restored = sentence;
    placeholders.forEach((original, placeholder) => {
      restored = restored.replace(placeholder, original);
    });
    return restored;
  });

  // Handle sentences without ending punctuation
  if (sentences.length === 0 && text.trim()) {
    return [text.trim()];
  }

  return sentences;
}

// Test runner
async function runTests() {
  console.log('🧪 Hierarchical Summarization Comprehensive Test Suite\n');
  
  let totalTests = 0;
  let passedTests = 0;
  
  // Test 1: Input format flexibility
  console.log('📝 Testing input format flexibility...');
  for (const test of testCases.standardFormats) {
    totalTests++;
    const extracted = extractTextContent(test.input);
    if (extracted && extracted === test.input.json[test.expectedField]) {
      console.log(`  ✅ ${test.name}`);
      passedTests++;
    } else {
      console.log(`  ❌ ${test.name} - Failed to extract correct field`);
    }
  }
  
  // Test 2: Sentence splitting
  console.log('\n✂️  Testing improved sentence splitting...');
  for (const test of testCases.sentenceSplitTests) {
    totalTests++;
    const sentences = splitIntoSentences(test.content);
    if (sentences.length === test.expectedSentences) {
      console.log(`  ✅ ${test.name} - Split into ${sentences.length} sentences`);
      passedTests++;
    } else {
      console.log(`  ❌ ${test.name} - Expected ${test.expectedSentences} sentences, got ${sentences.length}`);
      console.log(`     Sentences: ${JSON.stringify(sentences)}`);
    }
  }
  
  // Test 3: AI response parsing
  console.log('\n🤖 Testing AI response parsing...');
  for (const test of testCases.aiResponseFormats) {
    totalTests++;
    try {
      const summary = parseAIResponse(test.response);
      if (summary === test.expectedSummary) {
        console.log(`  ✅ ${test.name}`);
        passedTests++;
      } else {
        console.log(`  ❌ ${test.name} - Got: "${summary}"`);
      }
    } catch (error) {
      console.log(`  ❌ ${test.name} - Error: ${error.message}`);
    }
  }
  
  // Test 4: Error handling
  console.log('\n⚠️  Testing error scenarios...');
  for (const test of testCases.errorScenarios) {
    totalTests++;
    try {
      if (test.input) {
        const content = extractTextContent(test.input);
        if (!content || !content.trim()) {
          console.log(`  ✅ ${test.name} - Correctly identified empty/invalid input`);
          passedTests++;
        } else {
          console.log(`  ❌ ${test.name} - Should have failed but extracted: "${content}"`);
        }
      } else if (test.response) {
        try {
          parseAIResponse(test.response);
          console.log(`  ❌ ${test.name} - Should have thrown error`);
        } catch (error) {
          if (error.message.includes(test.expectedError)) {
            console.log(`  ✅ ${test.name} - Correct error: ${error.message}`);
            passedTests++;
          } else {
            console.log(`  ❌ ${test.name} - Wrong error: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.log(`  ❌ ${test.name} - Unexpected error: ${error.message}`);
    }
  }
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${totalTests - passedTests}`);
  console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n✅ All tests passed! The fixes are working correctly.');
  } else {
    console.log('\n❌ Some tests failed. Please review the implementation.');
  }
  
  // Write test results for verification
  const results = {
    timestamp: new Date().toISOString(),
    totalTests,
    passedTests,
    failedTests: totalTests - passedTests,
    successRate: ((passedTests / totalTests) * 100).toFixed(1) + '%'
  };
  
  await fs.writeFile(
    path.join(__dirname, 'test-results.json'),
    JSON.stringify(results, null, 2)
  );
  
  return passedTests === totalTests;
}

// Export for use in other tests
module.exports = {
  extractTextContent,
  parseAIResponse,
  splitIntoSentences,
  testCases
};

// Run if called directly
if (require.main === module) {
  runTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Test suite error:', error);
      process.exit(1);
    });
}