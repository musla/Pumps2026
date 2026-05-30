// GitHub-backed JSON database
// Reads and writes db.json on the 'db' branch via GitHub API

function ghUrl(path) {
  return `https://api.github.com/repos/${CFG.owner}/${CFG.repo}/${path}`;
}

function ghHeaders() {
  return {
    'Authorization': `token ${CFG.pat}`,
    'Content-Type':  'application/json',
    'Accept':        'application/vnd.github.v3+json',
  };
}

function b64enc(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function b64dec(str) {
  return decodeURIComponent(escape(atob(str.replace(/\s/g, ''))));
}

async function readDb() {
  const r = await fetch(ghUrl(`contents/${CFG.file}?ref=${CFG.branch}`), { headers: ghHeaders() });
  if (!r.ok) throw new Error('Nelze načíst databázi (' + r.status + ')');
  const meta = await r.json();
  return { sha: meta.sha, db: JSON.parse(b64dec(meta.content)) };
}

async function writeDb(db, sha, attempt = 0) {
  if (attempt > 0) {                      // SHA conflict – re-read
    const fresh = await readDb();
    sha = fresh.sha;
    db  = mergeDb(fresh.db, db);          // keep newer writes from others
  }
  const r = await fetch(ghUrl(`contents/${CFG.file}`), {
    method:  'PUT',
    headers: ghHeaders(),
    body:    JSON.stringify({
      message: 'db',
      content: b64enc(JSON.stringify(db)),
      branch:  CFG.branch,
      sha,
    }),
  });
  if (r.status === 409 && attempt < 3) return writeDb(db, sha, attempt + 1);
  if (!r.ok) { const e = await r.json(); throw new Error(e.message || r.status); }
  return true;
}

// Simple merge: combine arrays, deduplicate by key
function mergeDb(base, update) {
  return {
    posadky:  update.posadky,
    rozjizdy: dedupe([...base.rozjizdy,  ...update.rozjizdy],  r => r.id),
    tipy:     dedupe([...update.tipy,    ...base.tipy],         t => t.crewId + '|' + t.raceId),
    vysledky: dedupe([...update.vysledky,...base.vysledky],     r => r.raceId + '|' + r.crewId),
  };
}

function dedupe(arr, key) {
  const seen = new Set();
  return arr.filter(x => { const k = key(x); if (seen.has(k)) return false; seen.add(k); return true; });
}

// ── Business logic ────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().substring(0, 10); }
function canTipNow() { return new Date().getHours() < 12; }
function pts(tip, res) { const d = Math.abs(tip - res); return d === 0 ? 3 : d === 1 ? 1 : 0; }

async function getCrewPage(token) {
  const { db } = await readDb();
  const crew = db.posadky.find(p => p.token === token);
  if (!crew) return { error: 'Posádka nenalezena. Zkontroluj odkaz.' };

  const today = todayStr();
  const races = db.rozjizdy.filter(r => r.date === today).sort((a, b) => a.num - b.num);

  return {
    crew,
    canTip:  canTipNow(),
    nowHour: new Date().getHours(),
    races: races.map(race => {
      const tip = db.tipy.find(t => t.crewId === crew.id && t.raceId === race.id);
      const res = db.vysledky.find(r => r.raceId === race.id && r.crewId === crew.id);
      return { race, tip: tip?.pos ?? null, result: res?.pos ?? null,
               points: (tip && res) ? pts(tip.pos, res.pos) : null };
    }),
  };
}

async function setBet(token, amount) {
  const amt = parseFloat(amount);
  if (!amt || amt <= 0) return { error: 'Zadej platnou částku.' };
  const { db, sha } = await readDb();
  const idx = db.posadky.findIndex(p => p.token === token);
  if (idx < 0) return { error: 'Posádka nenalezena.' };
  if (db.posadky[idx].bet) return { error: 'Sázka již byla zadána.' };
  db.posadky[idx].bet = amt;
  await writeDb(db, sha);
  return { ok: true };
}

async function setTip(token, raceId, pos) {
  if (!canTipNow()) return { error: 'Tipování je uzavřeno (po 12:00).' };
  pos = parseInt(pos);
  if (!pos || pos < 1 || pos > 16) return { error: 'Pozice 1–16.' };
  const { db, sha } = await readDb();
  const crew = db.posadky.find(p => p.token === token);
  if (!crew) return { error: 'Posádka nenalezena.' };
  const idx = db.tipy.findIndex(t => t.crewId === crew.id && t.raceId === raceId);
  if (idx >= 0) db.tipy[idx].pos = pos;
  else db.tipy.push({ crewId: crew.id, raceId, pos });
  await writeDb(db, sha);
  return { ok: true };
}

async function adminSetRaces(key, date, count) {
  if (key !== CFG.adminKey) return { error: 'Neplatný klíč.' };
  count = parseInt(count);
  if (!count || count < 1 || count > 10) return { error: 'Počet 1–10.' };
  const { db, sha } = await readDb();
  db.rozjizdy = db.rozjizdy.filter(r => r.date !== date);
  const pre = date.replace(/-/g, '');
  for (let i = 1; i <= count; i++) db.rozjizdy.push({ id: `${pre}R${i}`, date, num: i });
  await writeDb(db, sha);
  return { ok: true, count };
}

async function adminSetResult(key, raceId, crewId, pos) {
  if (key !== CFG.adminKey) return { error: 'Neplatný klíč.' };
  pos = parseInt(pos);
  if (!pos || pos < 1 || pos > 16) return { error: 'Pozice 1–16.' };
  const { db, sha } = await readDb();
  const idx = db.vysledky.findIndex(r => r.raceId === raceId && r.crewId === crewId);
  if (idx >= 0) db.vysledky[idx].pos = pos;
  else db.vysledky.push({ raceId, crewId, pos });
  await writeDb(db, sha);
  return { ok: true };
}

async function adminGetDay(key, date) {
  if (key !== CFG.adminKey) return { error: 'Neplatný klíč.' };
  const { db } = await readDb();
  return { date, races: db.rozjizdy.filter(r => r.date === date).sort((a,b)=>a.num-b.num),
           crews: db.posadky, results: db.vysledky, tips: db.tipy };
}

async function getLeaderboard() {
  const { db } = await readDb();
  const board = db.posadky.map(crew => {
    let p = 0, t = 0, e = 0;
    db.tipy.filter(x => x.crewId === crew.id).forEach(tip => {
      const res = db.vysledky.find(r => r.raceId === tip.raceId && r.crewId === crew.id);
      if (res) { const s = pts(tip.pos, res.pos); p += s; t++; if (s === 3) e++; }
    });
    return { ...crew, pts: p, tipped: t, exact: e };
  });
  return { board: board.sort((a, b) => b.pts - a.pts),
           pot: db.posadky.reduce((s, c) => s + (c.bet || 0), 0) };
}
