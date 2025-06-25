/**
 * API Integration Test
 * Tests actual connection to BitNet server
 */

const ApiTester = require('../../../test-utils/common/api-tester');
const EnvLoader = require('../../../test-utils/common/env-loader');

console.log('Testing BitNet API Integration\n');

// Load environment
const envResults = EnvLoader.loadNodeEnv('bitnet');
if (!envResults.loaded) {
  console.error('❌ Failed to load environment variables');
  process.exit(1);
}

// Get server URL
const serverUrl = process.env.BITNET_EXTERNAL_SERVER_URL || 
  `http://${process.env.BITNET_SERVER_HOST || 'localhost'}:${process.env.BITNET_SERVER_PORT || 8080}`;

console.log(`Testing server at: ${serverUrl}\n`);

// Test suite
async function runTests() {
  // Test 1: Basic connectivity
  console.log('Test 1: Testing server connectivity...');
  const connResult = await ApiTester.testConnection(serverUrl, {
    retries: 3,
    retryDelay: 2000,
    timeout: 5000
  });
  
  ApiTester.printResults(connResult, 'Connection Test');
  
  if (!connResult.connected) {
    console.error('\n❌ Cannot connect to BitNet server');
    console.log('💡 Make sure the BitNet server is running');
    console.log(`💡 Expected server at: ${serverUrl}`);
    return false;
  }

  // Test 2: Health endpoint (if available)
  console.log('\nTest 2: Testing health endpoint...');
  const healthResult = await ApiTester.testHealthEndpoint(`${serverUrl}/health`, {
    expectedStatus: 200,
    timeout: 5000
  });
  
  if (healthResult.success) {
    ApiTester.printResults(healthResult, 'Health Check');
  } else {
    console.log('⚠️  No health endpoint available (this is normal for BitNet)');
  }

  // Test 3: Chat/completion endpoint
  console.log('\nTest 3: Testing chat completion...');
  const chatTests = [
    {
      name: 'Simple completion',
      endpoint: '/completion',
      payload: {
        prompt: "Hello, how are you?",
        temperature: 0.7,
        max_tokens: 50
      }
    },
    {
      name: 'Chat format',
      endpoint: '/v1/chat/completions',
      payload: {
        messages: [
          { role: "user", content: "Hello, how are you?" }
        ],
        temperature: 0.7,
        max_tokens: 50
      }
    }
  ];

  let successfulEndpoint = null;
  
  for (const test of chatTests) {
    console.log(`\nTrying ${test.name} at ${test.endpoint}...`);
    
    const result = await ApiTester.testChatEndpoint(
      `${serverUrl}${test.endpoint}`,
      test.payload,
      {
        timeout: 30000,
        validateResponse: (res) => {
          // Different servers have different response formats
          return !!(
            res.content ||
            res.response ||
            res.choices?.[0]?.message?.content ||
            res.choices?.[0]?.text ||
            res.text
          );
        }
      }
    );

    if (result.success) {
      console.log(`✅ ${test.name} successful`);
      console.log('Response time:', result.responseTime, 'ms');
      
      // Show sample response
      if (result.response) {
        const content = result.response.content || 
                       result.response.response || 
                       result.response.choices?.[0]?.message?.content ||
                       result.response.choices?.[0]?.text ||
                       result.response.text;
        
        if (content) {
          console.log('Sample response:', content.substring(0, 100) + '...');
        }
      }
      
      successfulEndpoint = test;
      break;
    } else {
      console.log(`❌ ${test.name} failed:`, result.error);
    }
  }

  if (!successfulEndpoint) {
    console.error('\n❌ No working chat endpoint found');
    console.log('💡 BitNet server may use a different API format');
    return false;
  }

  // Test 4: Performance test
  console.log('\n\nTest 4: Running performance test...');
  console.log('Sending 3 requests to measure consistency...');
  
  const perfResults = [];
  for (let i = 0; i < 3; i++) {
    const startTime = Date.now();
    const result = await ApiTester.testChatEndpoint(
      `${serverUrl}${successfulEndpoint.endpoint}`,
      successfulEndpoint.payload,
      { timeout: 60000 }
    );
    
    if (result.success) {
      perfResults.push(result.responseTime);
      console.log(`  Request ${i + 1}: ${result.responseTime}ms`);
    } else {
      console.log(`  Request ${i + 1}: Failed`);
    }
  }

  if (perfResults.length > 0) {
    const avgTime = perfResults.reduce((a, b) => a + b) / perfResults.length;
    const minTime = Math.min(...perfResults);
    const maxTime = Math.max(...perfResults);
    
    console.log('\nPerformance Summary:');
    console.log(`  Average: ${avgTime.toFixed(0)}ms`);
    console.log(`  Min: ${minTime}ms`);
    console.log(`  Max: ${maxTime}ms`);
  }

  return true;
}

// Run tests
runTests().then(success => {
  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('✅ API integration test passed');
    process.exit(0);
  } else {
    console.log('❌ API integration test failed');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Unexpected error:', error.message);
  process.exit(1);
});