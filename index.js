const http = require('http');
const port = process.env.PORT || 3000;
const SERVICE = 'atlas-avis-bff';
const ENV = process.env.ENV || 'dev';
const VERSION = process.env.VERSION || 'latest';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${SERVICE}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f1117;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: #1a1d2e;
      border: 1px solid #2d3148;
      border-radius: 12px;
      padding: 40px 48px;
      min-width: 420px;
      box-shadow: 0 4px 32px rgba(0,0,0,0.4);
    }
    .platform {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #6366f1;
      margin-bottom: 8px;
    }
    .service-name {
      font-size: 28px;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 32px;
    }
    .divider {
      border: none;
      border-top: 1px solid #2d3148;
      margin-bottom: 24px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .label {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .value {
      font-size: 13px;
      font-weight: 600;
      color: #e2e8f0;
    }
    .status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      margin-right: 8px;
      box-shadow: 0 0 6px #22c55e;
    }
    .env-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      background: #1e293b;
      color: #6366f1;
      border: 1px solid #6366f1;
      text-transform: uppercase;
    }
    .footer {
      margin-top: 32px;
      text-align: center;
      font-size: 11px;
      color: #334155;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="platform">DxP Platform &mdash; Atlas Holding</div>
    <div class="service-name">${SERVICE}</div>
    <hr class="divider">
    <div class="row">
      <span class="label">Status</span>
      <span class="value"><span class="status-dot"></span>Live</span>
    </div>
    <div class="row">
      <span class="label">Environment</span>
      <span class="value"><span class="env-badge">${ENV}</span></span>
    </div>
    <div class="row">
      <span class="label">Version</span>
      <span class="value">${VERSION}</span>
    </div>
    <div class="row">
      <span class="label">Port</span>
      <span class="value">${port}</span>
    </div>
    <div class="footer">Powered by DxP &mdash; DXC Technology Maroc</div>
  </div>
</body>
</html>`;

http.createServer((req, res) => {
  // S79 (ADR S0-083, service-ref Phase B suite) -- reflete l'origine
  // recue uniquement si elle figure dans ALLOWED_ORIGINS (liste separee
  // par virgules, vide par defaut -- aucun changement de comportement
  // pour un service sans service-ref reference vers lui). Mis a jour et
  // pod redemarre automatiquement par dxp-serve des qu'un service tiers
  // declare une dependance de nature browser vers ce service.
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.url === '/health') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({ status: 'ok', service: SERVICE }));
    return;
  }
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(html);
}).listen(port, () => {
  console.log(`${SERVICE} running on port ${port}`);
});
