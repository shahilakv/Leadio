// Serves src/Index.html locally in demo mode (sample leads, nothing touches the sheet).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const PORT = Number(process.env.PORT) || 3000;
createServer(async (req, res) => {
  if (req.url !== '/' && !req.url.startsWith('/?')) { res.writeHead(404); return res.end('Not found'); }
  try {
    const html = await readFile(new URL('../src/Index.html', import.meta.url));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(html);
  } catch (e) { res.writeHead(500); res.end(String(e)); }
}).listen(PORT, () => console.log(`Lead Desk preview (demo data): http://localhost:${PORT}`));
