#!/usr/bin/env node

/**
 * Unified Test Runner for n8n Custom Nodes
 * Based on the bitnet test runner pattern but made reusable
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class UnifiedTestRunner {
  constructor(nodeName, options = {}) {
    this.nodeName = nodeName;
    this.tests = [];
    this.results = { passed: 0, failed: 0, skipped: 0 };
    this.options = {
      showOutput: options.showOutput !== false,
      stopOnFail: options.stopOnFail || false,
      timeout: options.timeout || 30000
    };
  }

  addTest(name, file, description = '') {
    this.tests.push({
      name,
      file,
      description,
      status: 'pending'
    });
  }

  addTestGroup(tests) {
    tests.forEach(test => this.addTest(test.name, test.file, test.description));
  }

  async runTest(test, index) {
    const testNumber = `[${index + 1}/${this.tests.length}]`;
    
    console.log(`\n${testNumber} Running: ${test.name}`);
    if (test.description) {
      console.log(`Description: ${test.description}`);
    }
    console.log('----------------------------------------');

    const testPath = path.isAbsolute(test.file) 
      ? test.file 
      : path.join(process.cwd(), test.file);
    
    if (!fs.existsSync(testPath)) {
      console.error(`ERROR: Test file not found: ${testPath}`);
      test.status = 'failed';
      this.results.failed++;
      return false;
    }

    return new Promise((resolve) => {
      const child = spawn('node', [testPath], {
        stdio: this.options.showOutput ? 'inherit' : 'pipe',
        cwd: path.dirname(testPath),
        timeout: this.options.timeout
      });

      let output = '';
      if (!this.options.showOutput) {
        child.stdout?.on('data', (data) => { output += data.toString(); });
        child.stderr?.on('data', (data) => { output += data.toString(); });
      }

      child.on('exit', (code) => {
        if (code === 0) {
          console.log(`\n✓ ${test.name} - PASSED`);
          test.status = 'passed';
          this.results.passed++;
          resolve(true);
        } else {
          console.log(`\n✗ ${test.name} - FAILED (exit code: ${code})`);
          if (!this.options.showOutput && output) {
            console.log('\nTest output:');
            console.log(output);
          }
          test.status = 'failed';
          this.results.failed++;
          resolve(false);
        }
      });

      child.on('error', (error) => {
        console.error(`\n✗ ${test.name} - ERROR: ${error.message}`);
        test.status = 'failed';
        this.results.failed++;
        resolve(false);
      });
    });
  }

  async runAll() {
    console.log('================================');
    console.log(`   ${this.nodeName} Test Suite`);
    console.log('================================\n');

    const startTime = Date.now();

    for (let i = 0; i < this.tests.length; i++) {
      const test = this.tests[i];
      const success = await this.runTest(test, i);
      
      if (!success && this.options.stopOnFail) {
        console.log('\n⚠️  Stopping test execution due to failure');
        break;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    this.printSummary(duration);
    
    return this.results.failed === 0;
  }

  printSummary(duration) {
    console.log('\n================================');
    console.log('   Test Summary');
    console.log('================================');
    console.log(`Total tests: ${this.tests.length}`);
    console.log(`Passed: ${this.results.passed} ✓`);
    console.log(`Failed: ${this.results.failed} ✗`);
    if (this.results.skipped > 0) {
      console.log(`Skipped: ${this.results.skipped} ⚠️`);
    }
    console.log(`Duration: ${duration}s`);
    console.log('================================\n');
  }

  exportResults(outputPath) {
    const results = {
      nodeName: this.nodeName,
      timestamp: new Date().toISOString(),
      summary: this.results,
      tests: this.tests.map(t => ({
        name: t.name,
        status: t.status,
        description: t.description
      }))
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`Test results exported to: ${outputPath}`);
  }
}

module.exports = UnifiedTestRunner;

// Support direct execution for testing
if (require.main === module) {
  const runner = new UnifiedTestRunner('Test Runner Self-Test');
  runner.addTest('Version Check', path.join(__dirname, 'test-self.js'), 'Verify test runner works');
  runner.runAll().then(success => {
    process.exit(success ? 0 : 1);
  });
}