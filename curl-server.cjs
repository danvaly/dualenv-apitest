const http = require('http');
const { exec } = require('child_process');
const url = require('url');

const PORT = 3001;

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/execute') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const { method, url: targetUrl, headers, body: requestBody } = JSON.parse(body);

        // Build cURL command
        const curlParts = ['curl', '-s', '-w', '"\\n%{http_code}"', '-X', method];

        // Add headers
        if (headers) {
          Object.entries(headers).forEach(([key, value]) => {
            curlParts.push('-H', `'${key}: ${value}'`);
          });
        }

        // Add body for POST/PUT/PATCH
        if (requestBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
          curlParts.push('-d', `'${requestBody.replace(/'/g, "'\\''")}'`);
        }

        // Add URL
        curlParts.push(`'${targetUrl}'`);

        const curlCommand = curlParts.join(' ');
        const startTime = Date.now();

        exec(curlCommand, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
          const duration = Date.now() - startTime;

          if (error && !stdout) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: error.message,
              stderr,
              duration
            }));
            return;
          }

          // Parse response - last line is status code
          const lines = stdout.trim().split('\n');
          const statusCode = parseInt(lines.pop(), 10) || 0;
          const responseBody = lines.join('\n');

          // Try to parse as JSON
          let data;
          try {
            data = JSON.parse(responseBody);
          } catch {
            data = responseBody;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: statusCode,
            statusText: statusCode >= 200 && statusCode < 300 ? 'OK' : 'Error',
            data,
            duration,
            headers: {} // cURL doesn't easily give us response headers in this mode
          }));
        });
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`cURL proxy server running on http://localhost:${PORT}`);
  console.log('POST /execute - Execute a cURL request');
});
