export const channelId = '120363400434813832@newsletter';
export const inviteCode = '0029Vb5yX5A4Y9ltaBC4aH3G';
export function dubaiDate(now = new Date()) {
  return new Date(now.getTime() + 4 * 3600000).toISOString().slice(0, 10);
}
export function slot(date, index, count) {
  return new Date(Date.parse(date + 'T08:00:00+04:00') + (count <= 1 ? 0 : index * 12 * 3600000 / (count - 1)));
}
function grafUrl(value, page = false) {
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.hostname !== 'graf.ae' || u.username || u.password || (page && !u.pathname.startsWith('/launches/'))) throw Error('Only graf.ae launch-page links allowed');
}
export function validate(q) {
  if (q.version !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(q.briefingDate) || !Array.isArray(q.posts) || q.posts.length > 5) throw Error('Invalid daily queue');
  const keys = new Set(), projects = new Set();
  for (const p of q.posts) {
    if (!/^[a-z0-9][a-z0-9-]+$/.test(p.projectId) || !/^[a-z0-9][a-z0-9:._-]+$/.test(p.eventKey) || keys.has(p.eventKey) || projects.has(p.projectId)) throw Error('Duplicate/invalid project or event');
    keys.add(p.eventKey); projects.add(p.projectId);
    if (p.scheduledAt !== undefined && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\+04:00$/.test(p.scheduledAt) || p.scheduledAt.slice(0,10) !== q.briefingDate || !Number.isFinite(Date.parse(p.scheduledAt)) || new Date(p.scheduledAt) < slot(q.briefingDate,0,1) || new Date(p.scheduledAt) > new Date(q.briefingDate+'T20:00:00+04:00') || !p.scheduleReason)) throw Error('Invalid explicit Dubai slot/reason');
    if (p.kind !== 'hot-launch' || p.language !== 'en' || !['confirmed','broker-intelligence'].includes(p.status) || p.approved !== true || !p.materialUpdate || !Array.isArray(p.sources) || !p.sources.length) throw Error('Not an approved sourced hot launch');
    for (const s of p.sources) if (!/^https:\/\//.test(s)) throw Error('Invalid internal source');
    if (typeof p.body !== 'string' || p.body.length < 40 || p.body.length > 3500 || /[\u0400-\u04ff]/.test(p.body)) throw Error('Invalid English body');
    grafUrl(p.siteUrl, true);
    if (!p.body.includes(p.siteUrl)) throw Error('Body must link to its launch page');
    for (const link of p.body.match(/https?:\/\/[^\s<>]+/g) || []) grafUrl(link);
    if (p.imageUrl) { grafUrl(p.imageUrl); if (p.imageVerified !== true) throw Error('Image identity/rights not verified'); }
    if (p.status === 'broker-intelligence' && !/broker|unconfirmed|not yet confirmed/i.test(p.body)) throw Error('Missing uncertainty label');
  }
  return q;
}
export function due(q, ledger, now = new Date()) {
  validate(q);
  if (q.briefingDate !== dubaiDate(now)) throw Error('Today\'s briefing queue is missing; do not reuse old projects');
  // Slots target 08:00–20:00 Dubai. Up to 30 minutes grace for delayed Actions runners.
  if (now < slot(q.briefingDate, 0, 1) || now > new Date(q.briefingDate + 'T20:30:00+04:00')) return null;
  return q.posts.find((p, i) => ledger.posts[p.eventKey]?.state !== 'sent' && (p.scheduledAt ? new Date(p.scheduledAt) : slot(q.briefingDate, i, q.posts.length)) <= now) || null;
}
export function containsBody(history, body) {
  if (typeof history === 'string') return history === body;
  if (!history || typeof history !== 'object') return false;
  return Object.values(history).some(v => containsBody(v, body));
}
