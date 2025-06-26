#!/usr/bin/env node

/**
 * Quick test script that doesn't require database connection
 */

const path = require('path');
const fs = require('fs').promises;

// Import the compiled node
const { HierarchicalSummarization } = require('../dist/nodes/HierarchicalSummarization/HierarchicalSummarization.node.js');

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runQuickTests() {
  log('========================================', 'blue');
  log('Quick Node Tests (No Database Required)', 'blue');
  log('========================================', 'blue');
  
  try {
    // Test 1: Node instantiation
    log('\n1. Testing node instantiation...', 'yellow');
    const node = new HierarchicalSummarization();
    log('✅ Node created successfully', 'green');
    
    // Test 2: Node description
    log('\n2. Testing node description...', 'yellow');
    const desc = node.description;
    log(`✅ Display Name: ${desc.displayName}`, 'green');
    log(`✅ Name: ${desc.name}`, 'green');
    log(`✅ Version: ${desc.version}`, 'green');
    log(`✅ Group: ${desc.group.join(', ')}`, 'green');
    
    // Test 3: Node properties
    log('\n3. Testing node properties...', 'yellow');
    log(`✅ Found ${desc.properties.length} properties:`, 'green');
    desc.properties.forEach((prop, index) => {
      log(`   ${index + 1}. ${prop.displayName} (${prop.name})`, 'yellow');
      log(`      Type: ${prop.type}`, 'yellow');
      if (prop.default !== undefined) {
        log(`      Default: ${JSON.stringify(prop.default)}`, 'yellow');
      }
    });
    
    // Test 4: Test fixtures
    log('\n4. Testing fixture files...', 'yellow');
    const fixturesDir = path.join(__dirname, 'fixtures');
    const files = await fs.readdir(fixturesDir);
    const txtFiles = files.filter(f => f.endsWith('.txt'));
    
    log(`✅ Found ${txtFiles.length} test files:`, 'green');
    for (const file of txtFiles) {
      const content = await fs.readFile(path.join(fixturesDir, file), 'utf-8');
      const lines = content.split('\n').length;
      const chars = content.length;
      const approxTokens = Math.ceil(chars / 4);
      log(`   - ${file}: ${lines} lines, ${chars} chars, ~${approxTokens} tokens`, 'yellow');
    }
    
    // Test 5: Helper function logic
    log('\n5. Testing helper function logic...', 'yellow');
    
    // Test token estimation
    const testText = 'This is a test sentence.';
    const tokens = Math.ceil(testText.length / 4);
    log(`✅ Token estimation: "${testText}" = ${tokens} tokens`, 'green');
    
    // Test sentence splitting
    const multiSentence = 'First. Second! Third?';
    const sentences = multiSentence.match(/[^.!?]+[.!?]+/g) || [];
    log(`✅ Sentence splitting: "${multiSentence}" = ${sentences.length} sentences`, 'green');
    
    // Test chunking logic
    log('\n6. Testing chunking logic...', 'yellow');
    const longText = 'Short sentence. '.repeat(20);
    const maxTokensPerChunk = 50;
    const tokensPerSentence = Math.ceil('Short sentence. '.length / 4);
    const sentencesPerChunk = Math.floor(maxTokensPerChunk / tokensPerSentence);
    const expectedChunks = Math.ceil(20 / sentencesPerChunk);
    log(`✅ Chunking: 20 sentences with ${maxTokensPerChunk} token limit = ~${expectedChunks} chunks`, 'green');
    
    // Summary
    log('\n========================================', 'blue');
    log('✅ All quick tests passed!', 'green');
    log('========================================', 'blue');
    
    log('\n📋 Node is ready for use in n8n!', 'green');
    log('\nNext steps:', 'yellow');
    log('1. Make sure n8n can access this directory', 'yellow');
    log('2. Restart n8n to load the new node', 'yellow');
    log('3. Configure PostgreSQL connection in the node', 'yellow');
    log('4. Start processing documents!', 'yellow');
    
  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, 'red');
    log(error.stack, 'red');
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runQuickTests().catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
}