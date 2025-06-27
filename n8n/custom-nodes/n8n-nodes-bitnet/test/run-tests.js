#!/usr/bin/env node

/**
 * BitNet Node Test Suite
 * Using shared test utilities
 */

const path = require('path');
const UnifiedTestRunner = require('../../test-utils/common/test-runner');

// Create test runner instance
const runner = new UnifiedTestRunner('BitNet Node', {
  showOutput: true,
  stopOnFail: false
});

// Add test files
runner.addTestGroup([
  {
    name: 'Environment Configuration',
    file: path.join(__dirname, 'unit', 'test-env.js'),
    description: 'Validates environment variables and configuration'
  },
  {
    name: 'Node Structure Validation',
    file: path.join(__dirname, 'unit', 'test-node-structure.js'),
    description: 'Validates node compilation and structure'
  },
  {
    name: 'File Path Validation',
    file: path.join(__dirname, 'unit', 'test-paths.js'),
    description: 'Verifies configured paths exist'
  },
  {
    name: 'Server Wrapper Functionality',
    file: path.join(__dirname, 'unit', 'test-server-wrapper.js'),
    description: 'Tests BitNet server wrapper'
  }
]);

// Add integration tests if they exist
const fs = require('fs');
const integrationTestPath = path.join(__dirname, 'integration', 'test-api.js');
if (fs.existsSync(integrationTestPath)) {
  runner.addTest(
    'API Integration',
    integrationTestPath,
    'Tests connection to BitNet server'
  );
}

// Run all tests
runner.runAll().then(success => {
  // Export results
  const resultsPath = path.join(__dirname, '..', 'test-results.json');
  runner.exportResults(resultsPath);
  
  process.exit(success ? 0 : 1);
});