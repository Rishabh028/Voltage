import http from 'http';
import { config } from './config.js';
import { resolve } from './router.js';
import { serveAsset } from './asset-server.js';
import { render404 } from './pages/404.js';

const server = http.createServer(async (req, res) => {
  if (req.url === '/__voltage/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  const host = req.headers.host;
  
  if (!host) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request: Missing Host Header');
    return;
  }

  const deploymentId = await resolve(host);

  if (!deploymentId) {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(render404(host));
    return;
  }

  await serveAsset(req, res, deploymentId, req.url || '/');
});

server.listen(config.PROXY_PORT, () => {
  console.log(`Reverse proxy listening on port \${config.PROXY_PORT}`);
  console.log(`Base domain: \${config.BASE_DOMAIN}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
