/**
 * DeepSeek Configuration Test
 * Validates DeepSeek-specific configuration
 */

const path = require('path');

console.log('Testing DeepSeek Node Configuration\n');

// Test 1: Check default Ollama configuration
console.log('Test 1: Checking Ollama API configuration...');

// Load the compiled node to check its configuration
let nodeLoaded = false;
let nodeConfig = null;

try {
  const nodePath = path.join(__dirname, '..', '..', 'dist', 'nodes', 'Dsr1', 'Dsr1.node.js');
  const { Dsr1 } = require(nodePath);
  const node = new Dsr1();
  nodeLoaded = true;
  
  // Extract configuration from node properties
  const properties = node.description.properties || [];
  
  console.log('✅ Node loaded successfully');
  console.log('\nChecking configuration properties:');
  
  // Check for endpoint configuration
  const endpointProp = properties.find(p => 
    p.name === 'endpoint' || 
    p.name === 'apiEndpoint' || 
    p.name === 'baseUrl' ||
    p.name === 'url'
  );
  
  if (endpointProp) {
    console.log('✅ API endpoint property found:', endpointProp.name);
    if (endpointProp.default) {
      console.log('  Default value:', endpointProp.default);
      
      // Validate default endpoint
      if (endpointProp.default.includes('localhost:11434')) {
        console.log('  ✅ Using standard Ollama port (11434)');
      } else {
        console.log('  ⚠️  Non-standard endpoint configuration');
      }
    }
  } else {
    console.log('⚠️  No API endpoint property found');
  }
  
  // Check for model configuration
  const modelProp = properties.find(p => p.name === 'model' || p.name === 'modelName');
  if (modelProp) {
    console.log('\n✅ Model property found:', modelProp.name);
    if (modelProp.default) {
      console.log('  Default model:', modelProp.default);
      
      // Check if it's DeepSeek model
      if (modelProp.default.toLowerCase().includes('deepseek')) {
        console.log('  ✅ Default model is DeepSeek');
      } else {
        console.log('  ⚠️  Default model is not DeepSeek');
      }
    }
  } else {
    console.log('\n⚠️  No model property found');
  }
  
  // Check for temperature and other parameters
  const temperatureProp = properties.find(p => p.name === 'temperature');
  if (temperatureProp) {
    console.log('\n✅ Temperature property found');
    console.log('  Default:', temperatureProp.default || 'Not set');
  }
  
  const maxTokensProp = properties.find(p => 
    p.name === 'maxTokens' || 
    p.name === 'max_tokens' ||
    p.name === 'maxLength'
  );
  if (maxTokensProp) {
    console.log('\n✅ Max tokens property found:', maxTokensProp.name);
    console.log('  Default:', maxTokensProp.default || 'Not set');
  }
  
} catch (error) {
  console.error('❌ Failed to load node:', error.message);
  console.log('\n💡 Make sure to run "npm run build" first');
  process.exit(1);
}

// Test 2: Check for thinking mode support
console.log('\n\nTest 2: Checking DeepSeek-specific features...');

if (nodeLoaded) {
  try {
    const nodePath = path.join(__dirname, '..', '..', 'dist', 'nodes', 'Dsr1', 'Dsr1.node.js');
    const nodeSource = require('fs').readFileSync(nodePath, 'utf8');
    
    // Check for thinking mode support
    if (nodeSource.includes('showThinking') || nodeSource.includes('show_thinking')) {
      console.log('✅ Thinking mode support detected');
    } else {
      console.log('⚠️  No thinking mode support found');
    }
    
    // Check for streaming support
    if (nodeSource.includes('stream')) {
      console.log('✅ Streaming support detected');
    } else {
      console.log('⚠️  No streaming support found');
    }
    
    // Check for Ollama API compatibility
    if (nodeSource.includes('/api/generate') || nodeSource.includes('/api/chat')) {
      console.log('✅ Ollama API endpoints found');
    } else {
      console.log('⚠️  No Ollama API endpoints found');
    }
    
  } catch (error) {
    console.log('⚠️  Could not analyze node source:', error.message);
  }
}

// Test 3: Environment configuration
console.log('\n\nTest 3: Checking environment configuration...');

// DeepSeek via Ollama typically doesn't need special env vars
// but might use standard Ollama configuration
const ollamaEnvVars = [
  'OLLAMA_HOST',
  'OLLAMA_API_BASE',
  'OLLAMA_MODELS_PATH'
];

console.log('Checking for Ollama environment variables:');
let hasEnvVars = false;
ollamaEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`  ✅ ${varName}: ${process.env[varName]}`);
    hasEnvVars = true;
  } else {
    console.log(`  - ${varName}: Not set`);
  }
});

if (!hasEnvVars) {
  console.log('\n💡 No Ollama environment variables set (using defaults)');
}

// Summary
console.log('\n' + '='.repeat(50));
if (nodeLoaded) {
  console.log('✅ DeepSeek configuration test passed');
  console.log('\n💡 Note: DeepSeek runs through Ollama, so ensure:');
  console.log('   1. Ollama is installed and running');
  console.log('   2. DeepSeek model is pulled: ollama pull deepseek-r1:1.5b');
  console.log('   3. Ollama API is accessible at localhost:11434');
  process.exit(0);
} else {
  console.log('❌ DeepSeek configuration test failed');
  process.exit(1);
}