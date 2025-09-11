const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const os = require('os');
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '200kb' }));

// If a built frontend exists, serve it at the root so a single public URL (ngrok) serves both frontend and API
const FRONTEND_DIST = path.join(__dirname, '..', 'ng-app', 'dist', 'quiz-ng-app');
if(fs.existsSync(FRONTEND_DIST)){
  app.use(express.static(FRONTEND_DIST));
  // Note: static middleware is registered; we'll serve index.html for any non-API route
}

const STORAGE = path.join(__dirname, 'leaderboard.json');

// SSE clients
const sseClients = [];

function sendSse(data){
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for(const res of sseClients.slice()){
    try{ res.write(payload); }catch(e){ /* ignore broken */ }
  }
}

function load(){
  try{
    if(!fs.existsSync(STORAGE)) return [];
    const raw = fs.readFileSync(STORAGE, 'utf8');
    return JSON.parse(raw || '[]');
  }catch(e){ console.warn('load failed', e); return []; }
}
function save(arr){
  try{ fs.writeFileSync(STORAGE, JSON.stringify(arr, null, 2), 'utf8'); }catch(e){ console.warn('save failed', e); }
}

// Helper: get client IP from request (respect X-Forwarded-For for tunnels)
function getClientIp(req){
  const xff = req.headers['x-forwarded-for'];
  if(xff && typeof xff === 'string'){
    return xff.split(',')[0].trim();
  }
  if(req.connection && req.connection.remoteAddress) return req.connection.remoteAddress;
  if(req.socket && req.socket.remoteAddress) return req.socket.remoteAddress;
  if(req.ip) return req.ip;
  return 'unknown';
}

// Helper: determine if an IP is local to this machine (loopback or one of the host interfaces)
function isLocalIp(ip){
  if(!ip) return true;
  // strip IPv6 zone id if present (e.g. fe80::1%en0)
  if(ip.indexOf('%') !== -1) ip = ip.split('%')[0];
  // strip IPv4-mapped IPv6 prefix
  if(ip.startsWith('::ffff:')) ip = ip.split('::ffff:')[1];
  // common local addresses
  if(ip === '127.0.0.1' || ip === '::1' || ip === '0:0:0:0:0:0:0:1') return true;
  // treat link-local and private ranges as local
  if(ip.startsWith('169.254.') || ip.startsWith('10.') || ip.startsWith('192.168.') ) return true;
  // 172.16.0.0 - 172.31.255.255
  if(ip.startsWith('172.')){
    try{
      const parts = ip.split('.');
      const p2 = parseInt(parts[1]||'0', 10);
      if(p2 >=16 && p2 <=31) return true;
    }catch(e){}
  }
  try{
    const ifs = os.networkInterfaces();
    for(const name of Object.keys(ifs)){
      for(const addr of ifs[name]){
        if(addr && addr.address){
          let a = addr.address;
          if(typeof a === 'string' && a.indexOf('%') !== -1) a = a.split('%')[0];
          if(a === ip) return true;
          // account for IPv4-mapped form in interface list
          if(a.startsWith('::ffff:') && a.split('::ffff:')[1] === ip) return true;
        }
      }
    }
  }catch(e){}
  return false;
}

app.get('/api/leaderboard', (req, res) => {
  const lb = load();
  try{
    const remoteOnly = req.query && (req.query.remoteOnly === '1' || req.query.remoteOnly === 'true');
    if(remoteOnly){
      // Prefer IP-based classification when available; fall back to stored `via` for older entries
      const filtered = lb.filter(it => {
        if(it.ip){
          return !isLocalIp(it.ip);
        }
        return it.via === 'remote';
      });
      return res.json(filtered.slice(0, 100));
    }
  }catch(e){}
  res.json(lb.slice(0, 100));
});

app.post('/api/submit', (req, res) => {
  const { name, percentage, correct, total, via } = req.body || {};
  if(!name || typeof percentage !== 'number') return res.status(400).json({ error: 'invalid' });
  const list = load();
  const clientIp = getClientIp(req);
  const isRemote = !isLocalIp(clientIp);
  const entry = { name, percentage, correct, total, time: Date.now(), via: (isRemote? 'remote' : 'local'), ip: clientIp };
  // debug log: show incoming submit and classification
  try{ console.log('[SUBMIT]', { clientIp, isRemote, payload: { name, percentage, correct, total } }); }catch(e){}
  list.push(entry);
  // sort desc by percentage then asc by time
  list.sort((a,b)=> b.percentage - a.percentage || a.time - b.time);
  save(list);
  // broadcast to SSE clients
  try{ sendSse(entry); }catch(e){}
  res.json({ ok: true });
});

// Simple SSE endpoint for live submissions
app.get('/api/stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
  res.flushHeaders && res.flushHeaders();
  res.write('retry: 10000\n\n');
  sseClients.push(res);
  req.on('close', () => {
    const i = sseClients.indexOf(res); if(i>=0) sseClients.splice(i,1);
  });
});

// Clear only remote entries (admin action)
app.post('/api/clear-remote', (req, res) => {
  try{
    const list = load();
    // Remove entries that appear to be remote. Prefer IP-based classification when present.
    const remaining = list.filter(it => {
      if(it.ip) return isLocalIp(it.ip); // keep local
      return it.via !== 'remote'; // fallback to via flag
    });
    save(remaining);
    return res.json({ ok: true, removed: list.length - remaining.length });
  }catch(e){ return res.status(500).json({ error: 'failed' }); }
});

// Simple admin UI to view remote-only submissions and clear them
// Serve the static admin UI from disk for maintainability
app.get('/admin', (req, res) => {
  const adminFile = path.join(__dirname, 'admin.html');
  if(fs.existsSync(adminFile)){
    return res.sendFile(adminFile);
  }
  return res.status(404).send('admin UI not found');
});

const port = process.env.PORT || 3000;
// If frontend exists, serve index.html for any route not handled by /api
if(fs.existsSync(FRONTEND_DIST)){
  app.get('*', (req, res) => {
    // if the request URL starts with /api, don't serve index (should be handled above)
    if(req.path && req.path.startsWith('/api')) return res.status(404).end();
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

app.listen(port, ()=> console.log('Quiz server running on', port));
