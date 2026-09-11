// Whapi MCP connectivity probe — checkHealth ONLY.
// Launches the official stdio server (npx -y whapi-mcp@latest) via the MCP SDK
// client and calls the single read-only tool. No messages are sent, no settings
// changed, no reconnects. Token comes from env API_TOKEN and is never printed
// (GitHub masks the secret; we additionally redact long token-like strings).
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const DEADLINE_MS = 90_000;
const redact = (s) => String(s)
  .replace(/[A-Za-z0-9_-]{25,}/g, '«REDACTED»')
  .replace(/authorization[^\n]*/gi, 'authorization: «REDACTED»');

if (!process.env.API_TOKEN) { console.error('::error::API_TOKEN is not set'); process.exit(1); }

const killer = setTimeout(() => { console.error('::error::probe deadline exceeded'); process.exit(1); }, DEADLINE_MS);

const transport = new StdioClientTransport({
  command: 'npx',
  args: ['-y', 'whapi-mcp@latest'],
  env: { ...process.env },      // API_TOKEN travels to the server process only
  stderr: 'pipe',
});
const client = new Client({ name: 'graf-launches-health-probe', version: '1.0.0' });

let serverErr = '';
try {
  await client.connect(transport);
  transport.stderr?.on('data', (d) => { serverErr += d.toString(); });

  const tools = await client.listTools();
  const names = tools.tools.map((t) => t.name);
  console.log(`tools exposed: ${names.length}; checkHealth present: ${names.includes('checkHealth')}`);
  if (!names.includes('checkHealth')) { console.error('::error::checkHealth tool not found'); process.exit(1); }

  const res = await client.callTool({ name: 'checkHealth', arguments: {} }, undefined, { timeout: 60_000 });
  const text = (res.content ?? []).map((c) => c.type === 'text' ? c.text : `[${c.type}]`).join('\n');
  const safe = redact(text);
  console.log('--- checkHealth result (sanitized) ---');
  console.log(safe.slice(0, 1500));

  const cf = /cloudflare|browser'?s signature|attention required/i.test(text) || /\b403\b/.test(text);
  const statusMatch = text.match(/"text"\s*:\s*"([A-Z_]+)"/) || text.match(/\b(AUTH|QR|INIT|LAUNCH|STOP|SYNC_ERROR)\b/);
  if (cf) {
    console.error('::error::CLOUDFLARE_BLOCK — same 403/browser-signature block through the official MCP client. Stopping, no workarounds attempted.');
    process.exit(1);
  }
  if (res.isError) {
    console.error(`::error::checkHealth returned an error (sanitized above)`);
    process.exit(1);
  }
  if (!statusMatch) {
    console.error('::error::no channel status found in checkHealth response');
    process.exit(1);
  }
  console.log(`CHANNEL_STATUS=${statusMatch[1]}`);
  console.log('probe OK — connection to Whapi API works from this runner via official MCP client');
  process.exit(0);
} catch (e) {
  const msg = redact(e?.message ?? String(e));
  const errAll = redact(serverErr).slice(0, 800);
  const cf = /cloudflare|browser'?s signature|403/i.test(String(e?.message ?? '') + serverErr);
  console.error(`::error::${cf ? 'CLOUDFLARE_BLOCK — ' : ''}probe failed: ${msg}`);
  if (errAll.trim()) console.error(`server stderr (sanitized): ${errAll}`);
  process.exit(1);
} finally {
  clearTimeout(killer);
  try { await client.close(); } catch {}
}
