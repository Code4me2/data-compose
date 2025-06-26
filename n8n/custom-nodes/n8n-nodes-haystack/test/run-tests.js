#!/usr/bin/env node

/**
 * Haystack Node Test Suite
 * Using shared test utilities
 */

const path = require('path');
const UnifiedTestRunner = require('../../test-utils/common/test-runner');

// Create test runner instance
const runner = new UnifiedTestRunner('Haystack Search Node', {
  showOutput: true,
  stopOnFail: false
});

// Add test files
runner.addTestGroup([
  {
    name: 'Node Structure Validation',
    file: path.join(__dirname, 'unit', 'test-node-structure.js'),
    description: 'Validates node compilation and structure'
  },
  {
    name: 'Haystack Configuration',
    file: path.join(__dirname, 'unit', 'test-config.js'),
    description: 'Validates Haystack node configuration'
  },
  {
    name: 'API Integration',
    file: path.join(__dirname, 'integration', 'test-haystack-api.js'),
    description: 'Tests connection to Haystack service'
  }
]);

// Run all tests
runner.runAll().then(success => {
  // Export results
  const resultsPath = path.join(__dirname, '..', 'test-results.json');
  runner.exportResults(resultsPath);
  
  process.exit(success ? 0 : 1);
});