const http = require('http');

// Test 1: Native llama.cpp completion endpoint
function testCompletion() {
  const data = JSON.stringify({
    prompt: "Hello, my name is",
    n_predict: 10,
    temperature: 0.7
  });

  const options = {
    hostname: 'localhost',
    port: 11434,
    path: '/completion',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  console.log('Testing /completion endpoint...');
  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response:', JSON.parse(body));
    });
  });

  req.on('error', (e) => console.error('Error:', e));
  req.write(data);
  req.end();
}

// Test 2: OpenAI-compatible chat endpoint
function testChat() {
  const data = JSON.stringify({
    messages: [
      { role: "user", content: "What is 2+2?" }
    ],
    model: "bitnet",
    max_tokens: 50
  });

  const options = {
    hostname: 'localhost',
    port: 11434,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  console.log('\nTesting /v1/chat/completions endpoint...');
  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response:', JSON.parse(body));
    });
  });

  req.on('error', (e) => console.error('Error:', e));
  req.write(data);
  req.end();
}

// Test 3: Wrong endpoint (Ollama format)
function testWrongEndpoint() {
  const data = JSON.stringify({
    model: "bitnet",
    prompt: "Hello",
    stream: false
  });

  const options = {
    hostname: 'localhost',
    port: 11434,
    path: '/api/generate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  console.log('\nTesting WRONG /api/generate endpoint (Ollama format)...');
  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response:', body);
    });
  });

  req.on('error', (e) => console.error('Error:', e));
  req.write(data);
  req.end();
}

// Run tests
testCompletion();
setTimeout(testChat, 1000);
setTimeout(testWrongEndpoint, 2000);