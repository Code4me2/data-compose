#!/usr/bin/env node

/**
 * Master Test Runner for All n8n Custom Nodes
 * Runs tests for all custom nodes in sequence
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('========================================');
console.log('   n8n Custom Nodes Test Suite');
console.log('========================================\n');

// Define all custom nodes to test
const nodes = [
  {
    name: 'BitNet',
    dir: 'n8n-nodes-bitnet',
    testScript: 'test/run-tests.js'
  },
  {
    name: 'DeepSeek',
    dir: 'n8n-nodes-deepseek',
    testScript: 'test/run-tests.js'
  },
  {
    name: 'Haystack',
    dir: 'n8n-nodes-haystack',
    testScript: 'test/run-tests.js'
  },
  {
    name: 'Hierarchical Summarization',
    dir: 'n8n-nodes-hierarchicalSummarization',
    testScript: 'test/run-tests.js',
    optional: true // May not have migrated tests yet
  }
];

let currentNode = 0;
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  details: []
};

function runNodeTests(index) {
  if (index >= nodes.length) {
    // All tests completed
    printSummary();
    process.exit(results.failed > 0 ? 1 : 0);
    return;
  }

  const node = nodes[index];
  const nodePath = path.join(__dirname, node.dir);
  const testPath = path.join(nodePath, node.testScript);
  
  console.log(`\n[${index + 1}/${nodes.length}] Testing ${node.name} Node`);
  console.log('=' .repeat(50));
  console.log(`Directory: ${node.dir}`);

  // Check if directory exists
  if (!fs.existsSync(nodePath)) {
    console.log(`⚠️  Node directory not found, skipping`);
    results.skipped++;
    results.details.push({
      node: node.name,
      status: 'skipped',
      reason: 'Directory not found'
    });
    runNodeTests(index + 1);
    return;
  }

  // Check if test script exists
  if (!fs.existsSync(testPath)) {
    if (node.optional) {
      console.log(`⚠️  No test script found (optional), skipping`);
      results.skipped++;
      results.details.push({
        node: node.name,
        status: 'skipped',
        reason: 'No test script (optional)'
      });
    } else {
      console.log(`❌ Test script not found: ${node.testScript}`);
      results.failed++;
      results.details.push({
        node: node.name,
        status: 'failed',
        reason: 'Test script not found'
      });
    }
    runNodeTests(index + 1);
    return;
  }

  results.total++;

  // Run the test
  const child = spawn('node', [testPath], {
    stdio: 'inherit',
    cwd: nodePath
  });

  child.on('exit', (code) => {
    if (code === 0) {
      console.log(`\n✅ ${node.name} tests PASSED`);
      results.passed++;
      results.details.push({
        node: node.name,
        status: 'passed'
      });
    } else {
      console.log(`\n❌ ${node.name} tests FAILED (exit code: ${code})`);
      results.failed++;
      results.details.push({
        node: node.name,
        status: 'failed',
        exitCode: code
      });
    }
    
    // Run next node's tests
    runNodeTests(index + 1);
  });

  child.on('error', (error) => {
    console.error(`\n❌ ${node.name} test ERROR: ${error.message}`);
    results.failed++;
    results.details.push({
      node: node.name,
      status: 'error',
      error: error.message
    });
    runNodeTests(index + 1);
  });
}

function printSummary() {
  console.log('\n\n========================================');
  console.log('   Test Summary');
  console.log('========================================');
  console.log(`Total nodes tested: ${results.total}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log(`Skipped: ${results.skipped} ⚠️`);
  
  if (results.details.length > 0) {
    console.log('\nDetailed Results:');
    results.details.forEach(detail => {
      const icon = detail.status === 'passed' ? '✅' : 
                   detail.status === 'failed' ? '❌' : '⚠️';
      console.log(`  ${icon} ${detail.node}: ${detail.status}`);
      if (detail.reason) {
        console.log(`     ${detail.reason}`);
      }
    });
  }

  // Export combined results
  const resultsPath = path.join(__dirname, 'all-nodes-test-results.json');
  const exportData = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped
    },
    nodes: results.details
  };
  
  fs.writeFileSync(resultsPath, JSON.stringify(exportData, null, 2));
  console.log(`\nTest results exported to: ${resultsPath}`);
  
  console.log('\n========================================\n');
}

// Check for command line options
const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');
const specificNode = args.find(arg => !arg.startsWith('-'));

if (showHelp) {
  console.log('Usage: node run-all-node-tests.js [node-name] [options]');
  console.log('\nOptions:');
  console.log('  --help, -h     Show this help message');
  console.log('\nExamples:');
  console.log('  node run-all-node-tests.js          # Run all tests');
  console.log('  node run-all-node-tests.js bitnet   # Run only BitNet tests');
  console.log('\nAvailable nodes:');
  nodes.forEach(node => {
    console.log(`  - ${node.name.toLowerCase()}`);
  });
  process.exit(0);
}

// Filter nodes if specific one requested
if (specificNode) {
  const nodeIndex = nodes.findIndex(n => 
    n.name.toLowerCase() === specificNode.toLowerCase() ||
    n.dir.toLowerCase().includes(specificNode.toLowerCase())
  );
  
  if (nodeIndex >= 0) {
    console.log(`Running tests only for: ${nodes[nodeIndex].name}`);
    runNodeTests(nodeIndex);
  } else {
    console.error(`❌ Node not found: ${specificNode}`);
    console.log('\nAvailable nodes:');
    nodes.forEach(node => {
      console.log(`  - ${node.name.toLowerCase()}`);
    });
    process.exit(1);
  }
} else {
  // Run all tests
  runNodeTests(0);
}