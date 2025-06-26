/**
 * Ollama API Integration Test
 * Tests connection to Ollama for DeepSeek model
 */

const ApiTester = require('../../../test-utils/common/api-tester');

console.log('Testing DeepSeek via Ollama API Integration\n');

// Ollama default configuration
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'localhost';
const OLLAMA_PORT = process.env.OLLAMA_PORT || 11434;
const ollamaUrl = `http://${OLLAMA_HOST}:${OLLAMA_PORT}`;

console.log(`Testing Ollama at: ${ollamaUrl}\n`);

async function runTests() {
  // Test 1: Basic connectivity
  console.log('Test 1: Testing Ollama server connectivity...');
  const connResult = await ApiTester.testConnection(ollamaUrl, {
    retries: 3,
    retryDelay: 2000,
    timeout: 5000
  });
  
  ApiTester.printResults(connResult, 'Ollama Connection Test');
  
  if (!connResult.connected) {
    console.error('\n❌ Cannot connect to Ollama server');
    console.log('💡 Make sure Ollama is running:');
    console.log('   - Install: https://ollama.ai');
    console.log('   - Start: ollama serve');
    console.log(`   - Expected at: ${ollamaUrl}`);
    return false;
  }

  // Test 2: Check Ollama version/health
  console.log('\nTest 2: Checking Ollama API...');
  const versionResult = await ApiTester.testHealthEndpoint(`${ollamaUrl}/api/version`, {
    expectedStatus: 200
  });
  
  if (versionResult.success) {
    console.log('✅ Ollama API is responding');
    try {
      const version = JSON.parse(versionResult.body);
      console.log('  Version:', version.version || 'Unknown');
    } catch (e) {
      console.log('  Version info not parseable');
    }
  }

  // Test 3: List available models
  console.log('\nTest 3: Checking available models...');
  const modelsResult = await ApiTester.makeRequest(`${ollamaUrl}/api/tags`);
  
  let hasDeepSeek = false;
  if (modelsResult.statusCode === 200) {
    try {
      const data = JSON.parse(modelsResult.body);
      const models = data.models || [];
      console.log(`✅ Found ${models.length} models:`);
      
      models.forEach(model => {
        const name = model.name || model;
        console.log(`  - ${name}`);
        if (name.toLowerCase().includes('deepseek')) {
          hasDeepSeek = true;
        }
      });
      
      if (!hasDeepSeek) {
        console.log('\n⚠️  DeepSeek model not found');
        console.log('💡 Pull the model with: ollama pull deepseek-r1:1.5b');
      }
    } catch (e) {
      console.log('❌ Failed to parse models list');
    }
  } else {
    console.log('❌ Failed to list models');
  }

  // Test 4: Test generation endpoint
  console.log('\nTest 4: Testing text generation...');
  
  const testPrompts = [
    {
      model: 'deepseek-r1:1.5b',
      prompt: 'Hello, please respond with a simple greeting.',
      endpoint: '/api/generate'
    },
    {
      model: 'deepseek-r1',
      prompt: 'Hello, please respond with a simple greeting.',
      endpoint: '/api/generate'
    },
    {
      model: 'deepseek',
      prompt: 'Hello, please respond with a simple greeting.',
      endpoint: '/api/generate'
    }
  ];

  let generationSuccess = false;
  
  for (const test of testPrompts) {
    console.log(`\nTrying model: ${test.model}`);
    
    const result = await ApiTester.testChatEndpoint(
      `${ollamaUrl}${test.endpoint}`,
      {
        model: test.model,
        prompt: test.prompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 50
        }
      },
      {
        timeout: 30000,
        validateResponse: (res) => {
          return res && (res.response || res.content || res.text);
        }
      }
    );

    if (result.success) {
      generationSuccess = true;
      console.log(`✅ Generation successful with ${test.model}`);
      console.log('  Response time:', result.responseTime, 'ms');
      
      if (result.response) {
        const content = result.response.response || result.response.content || result.response.text;
        console.log('  Response:', content.substring(0, 100) + (content.length > 100 ? '...' : ''));
        
        // Check for thinking tags if present
        if (content.includes('<think>') && content.includes('</think>')) {
          console.log('  ✅ Thinking mode detected in response');
        }
      }
      break;
    } else {
      console.log(`  ❌ Failed:`, result.error);
    }
  }

  if (!generationSuccess && hasDeepSeek) {
    console.log('\n⚠️  DeepSeek model found but generation failed');
    console.log('💡 Try running: ollama run deepseek-r1:1.5b "test"');
  }

  // Test 5: Test chat endpoint (if available)
  if (generationSuccess) {
    console.log('\n\nTest 5: Testing chat format...');
    
    const chatResult = await ApiTester.testChatEndpoint(
      `${ollamaUrl}/api/chat`,
      {
        model: 'deepseek-r1:1.5b',
        messages: [
          { role: 'user', content: 'What is 2+2?' }
        ],
        stream: false
      },
      {
        timeout: 30000,
        validateResponse: (res) => {
          return res && res.message && res.message.content;
        }
      }
    );

    if (chatResult.success) {
      console.log('✅ Chat format supported');
      const content = chatResult.response.message.content;
      console.log('  Response:', content.substring(0, 100));
    } else {
      console.log('⚠️  Chat format not supported (using /api/generate instead)');
    }
  }

  return connResult.connected && (hasDeepSeek || generationSuccess);
}

// Run tests
runTests().then(success => {
  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('✅ Ollama API integration test passed');
    console.log('\n💡 DeepSeek is ready to use via Ollama');
    process.exit(0);
  } else {
    console.log('❌ Ollama API integration test failed');
    console.log('\n💡 To fix:');
    console.log('   1. Install Ollama: https://ollama.ai');
    console.log('   2. Start Ollama: ollama serve');
    console.log('   3. Pull DeepSeek: ollama pull deepseek-r1:1.5b');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Unexpected error:', error.message);
  process.exit(1);
});