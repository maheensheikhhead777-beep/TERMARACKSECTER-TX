'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = '127.0.0.1';
const PORT = 3307;
const DASHBOARD_FILE = path.join(__dirname, 'Termarack-Tactical-Dashboard.html');

const NPCGotBrains = require('./NPCGotBrains.js');
NPCGotBrains.activate('TERMARACKSECTER-FOUNDER-2025');

const BRIDGE_SCRIPT = `
<script>
(function () {
  function request(path, payload) {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', path, false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(payload || {}));
    if (xhr.status < 200 || xhr.status >= 300) {
      throw new Error('Bridge request failed: ' + xhr.status);
    }
    return JSON.parse(xhr.responseText || '{}');
  }

  window.NPCGotBrains = {
    tick: function (npc, player, environment) {
      const response = request('/api/tick', { npc: npc, player: player, environment: environment });
      if (response && response.npc) Object.assign(npc, response.npc);
      return response.result || null;
    },
    getLicenseStatus: function () {
      return request('/api/license', {});
    }
  };
})();
</script>
`;

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const reqPath = (req.url || '/').split('?')[0];

    if (req.method === 'GET' && reqPath === '/') {
      let html = fs.readFileSync(DASHBOARD_FILE, 'utf8');
      html = html.replace('</body>', `${BRIDGE_SCRIPT}\n</body>`);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    if (req.method === 'POST' && reqPath === '/api/tick') {
      const payload = await readBody(req);
      const npc = payload.npc || {};
      const player = payload.player || {};
      const environment = payload.environment || {};
      const result = NPCGotBrains.tick(npc, player, environment);
      sendJson(res, 200, { result, npc });
      return;
    }

    if (req.method === 'POST' && reqPath === '/api/license') {
      sendJson(res, 200, NPCGotBrains.getLicenseStatus());
      return;
    }

    if (req.method === 'GET' && reqPath === '/health') {
      sendJson(res, 200, { ok: true, service: 'termarack-dashboard' });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[TERMARACK] Dashboard running at http://${HOST}:${PORT}`);
  console.log('[TERMARACK] SUCCESS: MISSION CONTROL ONLINE. FOUNDER AUTHORIZED.');
});
