# BitNet Node Tests

This directory contains tests for the BitNet n8n node to verify functionality after changes.

## Available Tests

1. **test-env.js** - Environment Variable Loading
   - Verifies `.env.bitnet` file is loaded correctly
   - Checks all environment variables are accessible
   - Tests BitNetServerWrapper configuration

2. **test-node-functionality.js** - Node Functionality Tests
   - Verifies compiled JavaScript files exist
   - Tests module loading (BitNet node, RecursiveSummary)
   - Validates file paths (BitNet installation, model file)
   - Checks node descriptor properties

## Running Tests

### Run All Tests
```bash
cd /home/manzanita/coding/data-compose/n8n/custom-nodes/n8n-nodes-bitnet
node tests/run-all-tests.js
```

### Run Individual Tests
```bash
# Test environment variables
node tests/test-env.js

# Test node functionality
node tests/test-node-functionality.js
```

## Prerequisites

Before running tests:

1. Ensure `.env.bitnet` exists (copy from `.env.bitnet.example`)
2. Build the node: `npm run build`
3. Install dependencies: `npm install`

## Test Output

Tests use colored output:
- ✓ Green checkmark for passed tests
- ✗ Red X for failed tests

The test runner provides a summary at the end showing total tests, passed, and failed counts.