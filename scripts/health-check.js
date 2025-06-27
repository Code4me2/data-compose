#!/usr/bin/env node
/**
 * Health check script for Data Compose services
 */

const http = require('http');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Service checks
const checks = [
  {
    name: 'Web Server',
    check: () => checkHttp('http://localhost:8080', 'GET'),
  },
  {
    name: 'n8n Service',
    check: () => checkHttp('http://localhost:8080/n8n/healthz', 'GET'),
  },
  {
    name: 'PostgreSQL Database',
    check: () => checkDatabase(),
  },
  {
    name: 'Docker Services',
    check: () => checkDocker(),
  },
];

// Check HTTP endpoint
async function checkHttp(url, method = 'GET') {
  return new Promise((resolve) => {
    const req = http.request(url, { method }, (res) => {
      resolve({
        success: res.statusCode >= 200 && res.statusCode < 300,
        message: `Status: ${res.statusCode}`,
      });
    });
    
    req.on('error', (err) => {
      resolve({
        success: false,
        message: err.message,
      });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        success: false,
        message: 'Timeout',
      });
    });
    
    req.end();
  });
}

// Check database connection
async function checkDatabase() {
  try {
    const { stdout } = await execAsync('docker-compose exec -T db pg_isready -U postgres');
    return {
      success: stdout.includes('accepting connections'),
      message: 'Connected',
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
}

// Check Docker services
async function checkDocker() {
  try {
    const { stdout } = await execAsync('docker-compose ps --format json');
    const services = stdout.trim().split('\n').map(line => JSON.parse(line));
    const allHealthy = services.every(service => 
      service.State === 'running' && (!service.Health || service.Health === 'healthy')
    );
    
    return {
      success: allHealthy,
      message: `${services.length} services running`,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
}

// Run all checks
async function runHealthChecks() {
  console.log('🏥 Running health checks...\n');
  
  let allSuccess = true;
  
  for (const { name, check } of checks) {
    process.stdout.write(`Checking ${name}... `);
    
    try {
      const result = await check();
      
      if (result.success) {
        console.log(`✅ ${result.message}`);
      } else {
        console.log(`❌ ${result.message}`);
        allSuccess = false;
      }
    } catch (error) {
      console.log(`❌ ${error.message}`);
      allSuccess = false;
    }
  }
  
  console.log('\n' + (allSuccess ? '✅ All checks passed!' : '❌ Some checks failed'));
  process.exit(allSuccess ? 0 : 1);
}

// Run checks
runHealthChecks().catch(console.error);