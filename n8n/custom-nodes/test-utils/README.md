# n8n Custom Nodes Test Utilities

Shared testing utilities for n8n custom nodes to reduce duplication and standardize testing across all nodes.

## Directory Structure

```
test-utils/
├── common/              # Shared test utilities
│   ├── test-runner.js   # Unified test runner for all nodes
│   ├── node-validator.js # Node structure and configuration validation
│   ├── env-loader.js    # Environment variable loading and validation
│   └── api-tester.js    # API endpoint testing utilities
├── fixtures/            # Shared test data
│   ├── sample-documents/ # Sample documents for testing
│   └── mock-responses/  # Mock API responses
└── config/              # Test configuration
```

## Usage

### 1. Test Runner

The unified test runner provides a consistent way to run tests across all nodes:

```javascript
const UnifiedTestRunner = require('../test-utils/common/test-runner');

const runner = new UnifiedTestRunner('MyNode Tests');

// Add individual tests
runner.addTest('Environment Loading', './test-env.js', 'Verify environment variables');
runner.addTest('Node Validation', './test-node.js', 'Validate node structure');

// Or add multiple tests at once
runner.addTestGroup([
  { name: 'Unit Tests', file: './test/unit/index.js' },
  { name: 'Integration Tests', file: './test/integration/index.js' }
]);

// Run all tests
runner.runAll().then(success => {
  process.exit(success ? 0 : 1);
});
```

Options:
- `showOutput`: Show test output (default: true)
- `stopOnFail`: Stop on first failure (default: false)
- `timeout`: Test timeout in ms (default: 30000)

### 2. Node Validator

Validate node structure and configuration:

```javascript
const NodeValidator = require('../test-utils/common/node-validator');

// Validate node class structure
const { MyNode } = require('./dist/nodes/MyNode/MyNode.node.js');
const structureResults = NodeValidator.validateNodeStructure(MyNode);
NodeValidator.printResults(structureResults);

// Validate node can be loaded
const loadResults = NodeValidator.validateNodeLoading('./dist/nodes/MyNode/MyNode.node.js');

// Validate package.json
const packageResults = NodeValidator.validatePackageJson('./package.json');

// Validate file structure
const fileResults = NodeValidator.validateNodeFiles('.');
```

### 3. Environment Loader

Standardized environment variable handling:

```javascript
const EnvLoader = require('../test-utils/common/env-loader');

// Load environment for a specific node
const envResults = EnvLoader.loadNodeEnv('bitnet', {
  required: ['BITNET_SERVER_HOST', 'BITNET_SERVER_PORT']
});

EnvLoader.printResults(envResults, { maskSensitive: true });

// Define and validate environment schema
const schema = {
  SERVER_HOST: { type: 'string', required: true },
  SERVER_PORT: { type: 'number', default: 8080 },
  ENABLE_SSL: { type: 'boolean', default: false },
  API_ENDPOINTS: { type: 'array', delimiter: ',' }
};

const validated = EnvLoader.validateEnv(schema);
if (!validated.valid) {
  console.error('Environment validation failed:', validated.errors);
}

// Create example env file
EnvLoader.createExampleEnv(schema, '.env.example');
```

### 4. API Tester

Test API endpoints used by nodes:

```javascript
const ApiTester = require('../test-utils/common/api-tester');

// Test health endpoint
const healthResult = await ApiTester.testHealthEndpoint('http://localhost:8080/health');
ApiTester.printResults(healthResult);

// Test chat endpoint
const chatResult = await ApiTester.testChatEndpoint(
  'http://localhost:8080/chat',
  { message: 'Hello' },
  { 
    validateResponse: (res) => res.response && res.response.length > 0 
  }
);

// Test multiple endpoints
const results = await ApiTester.runEndpointTests([
  { name: 'Health Check', type: 'health', url: 'http://localhost:8080/health' },
  { name: 'Chat API', type: 'chat', url: 'http://localhost:8080/chat', 
    payload: { message: 'Test' } }
]);

// Test connection with retries
const connResult = await ApiTester.testConnection('http://localhost:8080', {
  retries: 5,
  retryDelay: 2000
});
```

## Migration Guide

### Migrating from Custom Test Scripts

1. Replace custom test runners with `UnifiedTestRunner`
2. Extract environment loading to use `EnvLoader`
3. Replace custom validation with `NodeValidator`
4. Use `ApiTester` for endpoint testing

### Example Migration

Before:
```javascript
// Old custom test script
const dotenv = require('dotenv');
dotenv.config({ path: '.env.bitnet' });

if (!process.env.BITNET_SERVER_HOST) {
  console.error('Missing BITNET_SERVER_HOST');
  process.exit(1);
}

// Custom node validation...
```

After:
```javascript
const EnvLoader = require('../test-utils/common/env-loader');
const NodeValidator = require('../test-utils/common/node-validator');

// Load and validate environment
const envResults = EnvLoader.loadNodeEnv('bitnet', {
  required: ['BITNET_SERVER_HOST', 'BITNET_SERVER_PORT']
});

if (!envResults.loaded) {
  EnvLoader.printResults(envResults);
  process.exit(1);
}

// Validate node structure
const loadResults = NodeValidator.validateNodeLoading('./dist/nodes/BitNet/BitNet.node.js');
NodeValidator.printResults(loadResults);
```

## Best Practices

1. **Consistent Test Structure**: Use the same directory structure for all nodes
2. **Shared Fixtures**: Place common test data in `test-utils/fixtures`
3. **Environment Files**: Use `.env.{nodename}` naming convention
4. **Exit Codes**: Always exit with proper codes (0 for success, 1 for failure)
5. **Descriptive Names**: Use clear test names and descriptions

## Adding New Utilities

To add new shared utilities:

1. Create new file in `test-utils/common/`
2. Follow the existing pattern of class-based exports
3. Include JSDoc comments for all public methods
4. Add usage examples to this README
5. Consider backward compatibility with existing tests