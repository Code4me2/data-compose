const http = require('http');

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'GET' && req.url === '/health') {
    res.statusCode = 200;
    res.end(JSON.stringify({
      status: 'ok',
      model: 'mock-bitnet-b1.58',
      version: '1.0.0-mock'
    }));
  } else if (req.method === 'POST' && req.url === '/completion') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const data = JSON.parse(body);
      res.statusCode = 200;
      res.end(JSON.stringify({
        choices: [{
          text: `Mock response to: "${data.prompt}"`,
          index: 0,
          finish_reason: 'stop'
        }],
        model: 'mock-bitnet-b1.58',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15
        }
      }));
    });
  } else {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = 8081;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Mock BitNet server running at http://0.0.0.0:${PORT}`);
});