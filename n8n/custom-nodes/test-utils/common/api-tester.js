/**
 * API Testing Utilities
 * Common patterns for testing APIs used by n8n custom nodes
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

class ApiTester {
  /**
   * Test if a health endpoint is responding
   * @param {string} url - The health check URL
   * @param {object} options - Test options
   * @returns {Promise<object>} Test results
   */
  static async testHealthEndpoint(url, options = {}) {
    const results = {
      success: false,
      statusCode: null,
      responseTime: null,
      error: null,
      body: null
    };

    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest(url, {
        method: 'GET',
        timeout: options.timeout || 5000,
        headers: options.headers || {}
      });

      results.statusCode = response.statusCode;
      results.responseTime = Date.now() - startTime;
      results.body = response.body;

      // Determine success based on status code
      if (options.expectedStatus) {
        results.success = response.statusCode === options.expectedStatus;
      } else {
        results.success = response.statusCode >= 200 && response.statusCode < 300;
      }

      // Check response body if validator provided
      if (results.success && options.validateResponse) {
        try {
          const bodyObj = JSON.parse(response.body);
          results.success = options.validateResponse(bodyObj);
        } catch (e) {
          results.error = `Invalid response format: ${e.message}`;
          results.success = false;
        }
      }

    } catch (error) {
      results.error = error.message;
      results.responseTime = Date.now() - startTime;
    }

    return results;
  }

  /**
   * Test a chat/completion endpoint
   * @param {string} url - The chat endpoint URL
   * @param {object} payload - The request payload
   * @param {object} options - Test options
   * @returns {Promise<object>} Test results
   */
  static async testChatEndpoint(url, payload, options = {}) {
    const results = {
      success: false,
      statusCode: null,
      responseTime: null,
      error: null,
      response: null,
      validResponse: false
    };

    const startTime = Date.now();

    try {
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        body: JSON.stringify(payload),
        timeout: options.timeout || 30000
      });

      results.statusCode = response.statusCode;
      results.responseTime = Date.now() - startTime;

      if (response.statusCode >= 200 && response.statusCode < 300) {
        try {
          results.response = JSON.parse(response.body);
          results.success = true;

          // Validate response structure
          if (options.validateResponse) {
            results.validResponse = options.validateResponse(results.response);
          } else {
            // Default validation for common chat response formats
            results.validResponse = !!(
              results.response.content ||
              results.response.message ||
              results.response.text ||
              results.response.response ||
              results.response.choices?.[0]?.message?.content
            );
          }
        } catch (e) {
          results.error = `Failed to parse response: ${e.message}`;
          results.success = false;
        }
      } else {
        results.error = `HTTP ${response.statusCode}: ${response.body}`;
      }

    } catch (error) {
      results.error = error.message;
      results.responseTime = Date.now() - startTime;
    }

    return results;
  }

  /**
   * Test multiple endpoints in sequence
   * @param {Array} tests - Array of test configurations
   * @returns {Promise<object>} Combined test results
   */
  static async runEndpointTests(tests) {
    const results = {
      total: tests.length,
      passed: 0,
      failed: 0,
      tests: []
    };

    for (const test of tests) {
      console.log(`Testing ${test.name}...`);
      
      let testResult;
      if (test.type === 'health') {
        testResult = await this.testHealthEndpoint(test.url, test.options);
      } else if (test.type === 'chat') {
        testResult = await this.testChatEndpoint(test.url, test.payload, test.options);
      } else {
        testResult = { success: false, error: `Unknown test type: ${test.type}` };
      }

      testResult.name = test.name;
      results.tests.push(testResult);

      if (testResult.success) {
        results.passed++;
        console.log(`  ✅ ${test.name} passed (${testResult.responseTime}ms)`);
      } else {
        results.failed++;
        console.log(`  ❌ ${test.name} failed: ${testResult.error}`);
      }
    }

    return results;
  }

  /**
   * Test connection to a service with retry logic
   * @param {string} url - The service URL
   * @param {object} options - Test options including retry configuration
   * @returns {Promise<object>} Connection test results
   */
  static async testConnection(url, options = {}) {
    const maxRetries = options.retries || 3;
    const retryDelay = options.retryDelay || 1000;
    const results = {
      connected: false,
      attempts: 0,
      lastError: null,
      responseTime: null
    };

    for (let i = 0; i < maxRetries; i++) {
      results.attempts++;
      
      const testResult = await this.testHealthEndpoint(url, {
        timeout: options.timeout || 5000,
        expectedStatus: options.expectedStatus
      });

      if (testResult.success) {
        results.connected = true;
        results.responseTime = testResult.responseTime;
        break;
      }

      results.lastError = testResult.error;
      
      if (i < maxRetries - 1) {
        console.log(`  Retry ${i + 1}/${maxRetries - 1} in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    return results;
  }

  /**
   * Make HTTP/HTTPS request (internal helper)
   */
  static makeRequest(urlString, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(urlString);
      const client = url.protocol === 'https:' ? https : http;

      const reqOptions = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: options.timeout || 10000
      };

      const req = client.request(reqOptions, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk.toString();
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  /**
   * Print API test results
   */
  static printResults(results, title = 'API Test Results') {
    console.log(`\n${title}:`);
    console.log('----------------------------------------');
    
    if (results.tests) {
      // Multiple test results
      console.log(`Total: ${results.total}`);
      console.log(`Passed: ${results.passed} ✅`);
      console.log(`Failed: ${results.failed} ❌`);
      
      if (results.tests.length > 0) {
        console.log('\nDetailed Results:');
        results.tests.forEach(test => {
          const status = test.success ? '✅' : '❌';
          const time = test.responseTime ? ` (${test.responseTime}ms)` : '';
          console.log(`  ${status} ${test.name}${time}`);
          if (!test.success && test.error) {
            console.log(`     Error: ${test.error}`);
          }
        });
      }
    } else {
      // Single test result
      const status = results.success || results.connected ? '✅ SUCCESS' : '❌ FAILED';
      console.log(`Status: ${status}`);
      
      if (results.responseTime) {
        console.log(`Response Time: ${results.responseTime}ms`);
      }
      
      if (results.attempts) {
        console.log(`Attempts: ${results.attempts}`);
      }
      
      if (results.error || results.lastError) {
        console.log(`Error: ${results.error || results.lastError}`);
      }
    }
    
    console.log('');
  }
}

module.exports = ApiTester;