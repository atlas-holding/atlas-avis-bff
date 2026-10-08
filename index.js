// atlas-avis-bff -- Backend (Golden Path Node.js)
// Point d'entree unique du frontend : orchestre l'API avis (Go) et le
// service d'analyse IA (LLM). Aucune dependance npm (Node 20 : fetch natif).
const http = require('http');
const port = process.env.PORT || 3000;
const SERVICE = 'atlas-avis-bff';

// Adresses internes au cluster (convention DxP : <service>.<service>-dev.svc.cluster.local)
const AVIS_API_URL = process.env.AVIS_API_URL || 'http://atlas-avis-api.atlas-avis-api-dev.svc.cluster.local';
const ANALYSE_URL = process.env.ANALYSE_URL || 'http://atlas-avis-llm.atlas-avis-llm-dev.svc.cluster.local';

function send(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
    });
  });
}

async function callJSON(url, options = {}) {
  const r = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(options.timeout || 10000),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `${url} -> HTTP ${r.status}`);
  return data;
}

async function ping(url) {
  try {
    const r = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) });
    const body = await r.json().catch(() => ({}));
    return { state: r.ok ? 'up' : `HTTP ${r.status}`, body };
  } catch (e) {
    return { state: 'down', body: {} };
  }
}

http.createServer(async (req, res) => {
  // CORS -- origines autorisees injectees par DxP (service-ref browser du frontend)
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

  const [path, query = ''] = req.url.split('?');
  try {
    if (path === '/health') {
      return send(res, 200, { status: 'ok', service: SERVICE });
    }

    // Etat des dependances -- affiche par le frontend
    if (path === '/api/status' || path === '/') {
      const [api, llm] = await Promise.all([ping(AVIS_API_URL), ping(ANALYSE_URL)]);
      // Base de donnees : vue a travers l'API (seul service qui y accede)
      let db = 'down';
      if (api.body.stockage === 'postgresql') db = api.body.base === 'ok' ? 'up' : 'down';
      else if (api.body.stockage === 'memoire') db = 'memoire';
      return send(res, 200, { service: SERVICE, status: 'ok', dependances: { 'atlas-avis-api': api.state, 'atlas-avis-db': db, 'atlas-avis-llm': llm.state } });
    }

    if (path === '/api/produits' && req.method === 'GET') {
      return send(res, 200, await callJSON(`${AVIS_API_URL}/produits`));
    }

    if (path === '/api/avis' && req.method === 'GET') {
      return send(res, 200, await callJSON(`${AVIS_API_URL}/avis?${query}`));
    }

    if (path === '/api/avis' && req.method === 'POST') {
      const body = await readBody(req);
      return send(res, 201, await callJSON(`${AVIS_API_URL}/avis`, { method: 'POST', body: JSON.stringify(body) }));
    }

    // Analyse IA : lit l'avis, interroge le service LLM, enregistre le resultat
    const m = path.match(/^\/api\/avis\/(\d+)\/analyse$/);
    if (m && req.method === 'POST') {
      const { avis, produit } = await callJSON(`${AVIS_API_URL}/avis/${m[1]}`);
      const analyse = await callJSON(`${ANALYSE_URL}/analyse`, {
        method: 'POST',
        timeout: 35000,
        body: JSON.stringify({ produit, note: avis.note, texte: avis.texte, client: avis.client }),
      });
      const updated = await callJSON(`${AVIS_API_URL}/avis/${m[1]}/analyse`, { method: 'PUT', body: JSON.stringify(analyse) });
      return send(res, 200, { ...updated, modele: analyse.modele });
    }

    return send(res, 404, { error: 'route inconnue' });
  } catch (e) {
    console.error(e.message);
    return send(res, 502, { error: e.message });
  }
}).listen(port, () => {
  console.log(`${SERVICE} running on port ${port}`);
});
