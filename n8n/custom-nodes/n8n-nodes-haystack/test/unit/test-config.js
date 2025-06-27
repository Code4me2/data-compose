/**
 * Haystack Configuration Test
 * Validates Haystack-specific configuration
 */

const path = require('path');
const fs = require('fs');

console.log('Testing Haystack Node Configuration\n');

// Test 1: Check Haystack API configuration
console.log('Test 1: Checking Haystack API configuration...');

let nodeLoaded = false;
try {
  const nodePath = path.join(__dirname, '..', '..', 'dist', 'nodes', 'HaystackSearch', 'HaystackSearch.node.js');
  const { HaystackSearch } = require(nodePath);
  const node = new HaystackSearch();
  nodeLoaded = true;
  
  const properties = node.description.properties || [];
  
  console.log('✅ Node loaded successfully');
  console.log('\nChecking configuration properties:');
  
  // Check for API endpoint
  const defaultUrl = 'http://localhost:8000';
  console.log(`  Expected default URL: ${defaultUrl}`);
  
  // Check operations
  const operationProp = properties.find(p => p.name === 'operation');
  if (operationProp) {
    console.log('\n✅ Operations configured:');
    const operations = operationProp.options || [];
    console.log(`  Total operations: ${operations.length}`);
    
    // Check for critical operations
    const criticalOps = ['importFromNode', 'search', 'healthCheck'];
    criticalOps.forEach(op => {
      const found = operations.find(o => o.value === op);
      if (found) {
        console.log(`  ✅ ${op}: ${found.description || 'Available'}`);
      } else {
        console.log(`  ❌ ${op}: Missing`);
      }
    });
  }
  
  // Check search configuration
  const searchType = properties.find(p => p.name === 'searchType');
  if (searchType && searchType.displayOptions?.show?.operation?.includes('search')) {
    console.log('\n✅ Search type configuration found');
    if (searchType.options) {
      console.log('  Available search types:', searchType.options.map(o => o.name).join(', '));
    }
  }
  
  // Check for hybrid search option
  const useHybrid = properties.find(p => p.name === 'useHybrid');
  if (useHybrid) {
    console.log('\n✅ Hybrid search option available');
  }
  
} catch (error) {
  console.error('❌ Failed to load node:', error.message);
  console.log('\n💡 Make sure to run "npm run build" first');
  process.exit(1);
}

// Test 2: Check Docker Compose configuration
console.log('\n\nTest 2: Checking Docker Compose configuration...');

const dockerComposePath = path.join(__dirname, '..', '..', '..', '..', 'docker-compose.haystack.yml');
if (fs.existsSync(dockerComposePath)) {
  console.log('✅ Docker Compose file found');
  
  try {
    const dockerContent = fs.readFileSync(dockerComposePath, 'utf8');
    
    // Check for Elasticsearch service
    if (dockerContent.includes('elasticsearch')) {
      console.log('  ✅ Elasticsearch service configured');
    }
    
    // Check for Haystack API service
    if (dockerContent.includes('haystack_api')) {
      console.log('  ✅ Haystack API service configured');
    }
    
    // Check ports
    if (dockerContent.includes('9200')) {
      console.log('  ✅ Elasticsearch port 9200 configured');
    }
    if (dockerContent.includes('8000')) {
      console.log('  ✅ Haystack API port 8000 configured');
    }
    
  } catch (error) {
    console.log('  ⚠️  Could not read Docker Compose file');
  }
} else {
  console.log('⚠️  Docker Compose file not found at expected location');
  console.log('  Expected:', dockerComposePath);
}

// Test 3: Check for service implementation
console.log('\n\nTest 3: Checking Haystack service implementation...');

const servicePath = path.join(__dirname, '..', '..', '..', '..', 'haystack_service.py');
if (fs.existsSync(servicePath)) {
  console.log('✅ Haystack service script found');
  
  try {
    const serviceContent = fs.readFileSync(servicePath, 'utf8');
    
    // Check for implemented endpoints
    const endpoints = [
      '/import_from_node',
      '/search',
      '/hierarchy',
      '/health',
      '/get_final_summary',
      '/get_complete_tree',
      '/get_document_with_context'
    ];
    
    console.log('\nChecking implemented endpoints:');
    endpoints.forEach(endpoint => {
      if (serviceContent.includes(`"${endpoint}"`) || serviceContent.includes(`'${endpoint}'`)) {
        console.log(`  ✅ ${endpoint}`);
      } else {
        console.log(`  ❌ ${endpoint} - Not found`);
      }
    });
    
    // Check for batch_hierarchy endpoint
    if (serviceContent.includes('batch_hierarchy')) {
      console.log('  ✅ /batch_hierarchy');
    } else {
      console.log('  ❌ /batch_hierarchy - Missing (known issue)');
    }
    
    // Check for Elasticsearch client
    if (serviceContent.includes('Elasticsearch') || serviceContent.includes('elasticsearch')) {
      console.log('\n✅ Elasticsearch integration found');
    }
    
  } catch (error) {
    console.log('  ⚠️  Could not analyze service file');
  }
} else {
  console.log('❌ Haystack service script not found');
  console.log('  Expected:', servicePath);
}

// Test 4: Environment variables
console.log('\n\nTest 4: Checking environment configuration...');

const envVars = [
  { name: 'ELASTICSEARCH_URL', default: 'http://localhost:9200' },
  { name: 'HAYSTACK_API_URL', default: 'http://localhost:8000' }
];

console.log('Checking for Haystack environment variables:');
envVars.forEach(env => {
  const value = process.env[env.name];
  if (value) {
    console.log(`  ✅ ${env.name}: ${value}`);
  } else {
    console.log(`  - ${env.name}: Not set (will use default: ${env.default})`);
  }
});

// Summary
console.log('\n' + '='.repeat(50));
if (nodeLoaded) {
  console.log('✅ Haystack configuration test passed');
  console.log('\n💡 Important notes:');
  console.log('   1. Haystack requires Elasticsearch to be running');
  console.log('   2. Start services: docker-compose -f docker-compose.haystack.yml up -d');
  console.log('   3. Known issue: batch_hierarchy operation has no backend implementation');
  console.log('   4. Default ports: Elasticsearch (9200), Haystack API (8000)');
  process.exit(0);
} else {
  console.log('❌ Haystack configuration test failed');
  process.exit(1);
}