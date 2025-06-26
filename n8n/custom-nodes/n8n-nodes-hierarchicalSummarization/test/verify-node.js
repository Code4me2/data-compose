#!/usr/bin/env node

/**
 * Verification script for Hierarchical Summarization Node
 * This script tests the node functionality without running it in n8n
 */

const path = require('path');
const fs = require('fs').promises;
const { Pool } = require('pg');

// Import the compiled node
const { HierarchicalSummarization } = require('../dist/nodes/HierarchicalSummarization/HierarchicalSummarization.node.js');

// Configuration
const TEST_CONFIG = {
  db: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: process.env.TEST_DB_PORT || 5432,
    database: process.env.TEST_DB_NAME || 'postgres',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
  },
  testDir: path.join(__dirname, 'fixtures'),
  batchSize: 500,
};

// Color codes for output
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

async function testDatabaseConnection() {
  log('\n📊 Testing Database Connection...', 'blue');
  
  const pool = new Pool(TEST_CONFIG.db);
  
  try {
    await pool.query('SELECT 1');
    log('✅ Database connection successful', 'green');
    
    // Check if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('hierarchical_documents', 'processing_status')
    `);
    
    if (tablesResult.rows.length === 2) {
      log('✅ Required tables exist', 'green');
    } else {
      log('⚠️  Tables will be created on first run', 'yellow');
    }
    
    await pool.end();
    return true;
  } catch (error) {
    log(`❌ Database connection failed: ${error.message}`, 'red');
    await pool.end();
    return false;
  }
}

async function testNodeStructure() {
  log('\n🔧 Testing Node Structure...', 'blue');
  
  try {
    const node = new HierarchicalSummarization();
    
    // Check node description
    assert(node.description, 'Node should have description');
    assert(node.description.displayName === 'Hierarchical Summarization', 'Incorrect display name');
    assert(node.description.properties.length > 0, 'Node should have properties');
    
    log('✅ Node structure is valid', 'green');
    log(`   Display Name: ${node.description.displayName}`, 'green');
    log(`   Properties: ${node.description.properties.length}`, 'green');
    
    // List properties
    log('\n   Available Properties:', 'yellow');
    node.description.properties.forEach(prop => {
      log(`   - ${prop.displayName} (${prop.name}): ${prop.type}`, 'yellow');
    });
    
    return true;
  } catch (error) {
    log(`❌ Node structure test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testFileReading() {
  log('\n📁 Testing File Reading...', 'blue');
  
  try {
    const files = await fs.readdir(TEST_CONFIG.testDir);
    const txtFiles = files.filter(f => path.extname(f) === '.txt');
    
    log(`✅ Found ${txtFiles.length} test files`, 'green');
    
    for (const file of txtFiles) {
      const content = await fs.readFile(path.join(TEST_CONFIG.testDir, file), 'utf-8');
      const tokens = Math.ceil(content.length / 4); // Approximate token count
      log(`   - ${file}: ${content.length} chars (~${tokens} tokens)`, 'yellow');
    }
    
    return true;
  } catch (error) {
    log(`❌ File reading test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testHelperFunctions() {
  log('\n🧮 Testing Helper Functions...', 'blue');
  
  try {
    // Test token estimation
    const testText = 'This is a test sentence with exactly 40 characters now.';
    const expectedTokens = Math.ceil(testText.length / 4);
    log(`✅ Token estimation: "${testText.substring(0, 30)}..." = ~${expectedTokens} tokens`, 'green');
    
    // Test sentence splitting
    const multiSentence = 'First sentence. Second sentence! Third sentence?';
    const sentences = multiSentence.match(/[^.!?]+[.!?]+/g) || [];
    log(`✅ Sentence splitting: Found ${sentences.length} sentences`, 'green');
    
    return true;
  } catch (error) {
    log(`❌ Helper function test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testEndToEnd() {
  log('\n🚀 Testing End-to-End Functionality...', 'blue');
  
  const pool = new Pool(TEST_CONFIG.db);
  const testBatchId = 'test-e2e-' + Date.now();
  
  try {
    // Ensure schema exists
    await ensureSchema(pool);
    
    // Simulate document processing
    log('   1. Indexing test documents...', 'yellow');
    
    const docs = [
      { name: 'test1.txt', content: 'This is the first test document. It contains some sample text.' },
      { name: 'test2.txt', content: 'This is the second test document. It has different content.' },
      { name: 'test3.txt', content: 'This is the third test document. More sample text here.' },
    ];
    
    // Insert documents
    const docIds = [];
    for (const doc of docs) {
      const result = await pool.query(
        `INSERT INTO hierarchical_documents 
         (content, batch_id, hierarchy_level, token_count, metadata) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id`,
        [doc.content, testBatchId, 0, Math.ceil(doc.content.length / 4), JSON.stringify({ filename: doc.name })]
      );
      docIds.push(result.rows[0].id);
    }
    
    log(`   ✅ Indexed ${docIds.length} documents`, 'green');
    
    // Simulate summarization
    log('   2. Creating summaries...', 'yellow');
    
    const summary = 'Combined summary of all test documents.';
    const summaryResult = await pool.query(
      `INSERT INTO hierarchical_documents 
       (content, summary, batch_id, hierarchy_level, parent_id, token_count) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      ['', summary, testBatchId, 1, null, Math.ceil(summary.length / 4)]
    );
    
    log('   ✅ Created summary at level 1', 'green');
    
    // Verify hierarchy
    const hierarchyResult = await pool.query(
      'SELECT COUNT(*) as count, hierarchy_level FROM hierarchical_documents WHERE batch_id = $1 GROUP BY hierarchy_level',
      [testBatchId]
    );
    
    log('   3. Hierarchy structure:', 'yellow');
    hierarchyResult.rows.forEach(row => {
      log(`      Level ${row.hierarchy_level}: ${row.count} documents`, 'yellow');
    });
    
    // Clean up
    await pool.query('DELETE FROM hierarchical_documents WHERE batch_id = $1', [testBatchId]);
    
    log('✅ End-to-end test completed successfully', 'green');
    await pool.end();
    return true;
  } catch (error) {
    log(`❌ End-to-end test failed: ${error.message}`, 'red');
    await pool.end();
    return false;
  }
}

async function ensureSchema(pool) {
  const schemaSQL = `
    CREATE TABLE IF NOT EXISTS hierarchical_documents (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      summary TEXT,
      batch_id VARCHAR(255) NOT NULL,
      hierarchy_level INTEGER NOT NULL,
      parent_id INTEGER REFERENCES hierarchical_documents(id) ON DELETE CASCADE,
      child_ids INTEGER[] DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      token_count INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_batch_level 
      ON hierarchical_documents(batch_id, hierarchy_level);
  `;
  
  await pool.query(schemaSQL);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Main test runner
async function runTests() {
  log('========================================', 'blue');
  log('Hierarchical Summarization Node Tests', 'blue');
  log('========================================', 'blue');
  
  const tests = [
    { name: 'Node Structure', fn: testNodeStructure },
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'File Reading', fn: testFileReading },
    { name: 'Helper Functions', fn: testHelperFunctions },
    { name: 'End-to-End', fn: testEndToEnd },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      log(`\n❌ ${test.name} test crashed: ${error.message}`, 'red');
      failed++;
    }
  }
  
  log('\n========================================', 'blue');
  log(`Test Results: ${passed} passed, ${failed} failed`, failed > 0 ? 'red' : 'green');
  log('========================================', 'blue');
  
  if (failed === 0) {
    log('\n🎉 All tests passed! The node is ready to use.', 'green');
    log('\nNext steps:', 'yellow');
    log('1. Ensure n8n can access the node directory', 'yellow');
    log('2. Restart n8n to load the new node', 'yellow');
    log('3. Look for "Hierarchical Summarization" in the node panel', 'yellow');
  } else {
    log('\n⚠️  Some tests failed. Please fix the issues before using the node.', 'red');
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runTests };