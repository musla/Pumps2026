// Pumps 2026 – Google Apps Script backend
// Nasadit jako Web App: Execute as Me, Access: Anyone

const ADMIN_KEY = 'pumps2026admin'; // Změň před nasazením!

function doGet(e) {
  const p = e.parameter;
  let result;
  try {
    switch (p.action) {
      case 'crew':      result = getCrew(p.token); break;
      case 'races':     result = getRaces(p.date); break;
      case 'tips':      result = getTips(p.token, p.date); break;
      case 'board':     result = getLeaderboard(); break;
      case 'bet':       result = setBet(p.token, p.amount); break;
      case 'tip':       result = setTip(p.token, p.race, +p.pos); break;
      case 'setRaces':  result = setRaces(p.key, p.date, +p.count); break;
      case 'setResult': result = setResult(p.key, p.race, p.crew, +p.pos); break;
      case 'dayData':   result = getDayData(p.key, p.date); break;
      default:          result = { error: 'Neznámá akce' };
    }
  } catch (err) {
    result = { error: err.toString() };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const ss = () => SpreadsheetApp.getActiveSpreadsheet();
const sh = name => ss().getSheetByName(name);
const rows = name => sh(name).getDataRange().getValues().slice(1);

function today() {
  return fmtDate(new Date());
}

function fmtDate(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.substring(0, 10);
  const dt = new Date(d);
  return dt.getFullYear() + '-' +
    String(dt.getMonth() + 1).padStart(2, '0') + '-' +
    String(dt.getDate()).padStart(2, '0');
}

function tippingOpen() {
  // Tipování otevřeno do 12:00 každý den
  // Sheet musí mít timezone nastavenou na Europe/Prague
  return new Date().getHours() < 12;
}

function calcPoints(tip, result) {
  const d = Math.abs(tip - result);
  if (d === 0) return 3;
  if (d === 1) return 1;
  return 0;
}

// ── Crew ─────────────────────────────────────────────────────────────────────

function getCrew(token) {
  if (!token) return { error: 'Chybí token – zkontroluj odkaz.' };
  const row = rows('Posadky').find(r => r[2] === token);
  if (!row) return { error: 'Posádka nenalezena. Zkontroluj odkaz.' };
  return { id: row[0], name: row[1], token: row[2], boat: row[3], bet: row[4] || null };
}

// ── Bet ──────────────────────────────────────────────────────────────────────

function setBet(token, amount) {
  const amt = parseFloat(amount);
  if (!amt || amt <= 0) return { error: 'Zadej platnou částku.' };

  const sheet = sh('Posadky');
  const all = sheet.getDataRange().getValues();
  for (let i = 1; i < all.length; i++) {
    if (all[i][2] === token) {
      if (all[i][4]) return { error: 'Sázka již byla zadána a nelze ji změnit.' };
      sheet.getRange(i + 1, 5).setValue(amt);
      sheet.getRange(i + 1, 6).setValue(new Date());
      return { ok: true };
    }
  }
  return { error: 'Posádka nenalezena.' };
}

// ── Races ─────────────────────────────────────────────────────────────────────

function getRaces(date) {
  if (!date) date = today();
  return rows('Rozjizdy')
    .filter(r => fmtDate(r[1]) === date)
    .map(r => ({ id: r[0], date: fmtDate(r[1]), num: r[2] }))
    .sort((a, b) => a.num - b.num);
}

// ── Tips ─────────────────────────────────────────────────────────────────────

function getTips(token, date) {
  if (!date) date = today();
  const crew = getCrew(token);
  if (crew.error) return crew;

  const races = getRaces(date);
  const allTips = rows('Tipy');
  const allResults = rows('Vysledky');
  const open = tippingOpen();

  return {
    crew,
    canTip: open,
    deadline: '12:00',
    races: races.map(race => {
      const tip = allTips.find(t => t[0] === crew.id && t[1] === race.id);
      const res = allResults.find(r => r[0] === race.id && r[1] === crew.id);
      return {
        race,
        tip: tip ? tip[2] : null,
        result: res ? res[2] : null,
        points: (tip && res) ? calcPoints(tip[2], res[2]) : null
      };
    })
  };
}

function setTip(token, raceId, pos) {
  if (!tippingOpen()) return { error: 'Tipování je uzavřeno – deadline byl 12:00.' };
  if (!raceId) return { error: 'Chybí ID rozjízdy.' };
  if (!pos || pos < 1 || pos > 16) return { error: 'Pozice musí být 1–16.' };

  const crew = getCrew(token);
  if (crew.error) return crew;

  const sheet = sh('Tipy');
  const all = sheet.getDataRange().getValues();
  for (let i = 1; i < all.length; i++) {
    if (all[i][0] === crew.id && all[i][1] === raceId) {
      sheet.getRange(i + 1, 3).setValue(pos);
      sheet.getRange(i + 1, 4).setValue(new Date());
      return { ok: true };
    }
  }
  sheet.appendRow([crew.id, raceId, pos, new Date()]);
  return { ok: true };
}

// ── Admin: set races for a day ────────────────────────────────────────────────

function setRaces(key, date, count) {
  if (key !== ADMIN_KEY) return { error: 'Neplatný admin klíč.' };
  if (!date) date = today();
  if (!count || count < 1 || count > 10) return { error: 'Počet 1–10.' };

  const sheet = sh('Rozjizdy');
  const all = sheet.getDataRange().getValues();
  // Delete existing races for this day (bottom-up)
  for (let i = all.length; i >= 2; i--) {
    if (fmtDate(all[i - 1][1]) === date) sheet.deleteRow(i);
  }
  for (let i = 1; i <= count; i++) {
    sheet.appendRow([date.replace(/-/g, '') + 'R' + i, date, i]);
  }
  return { ok: true, count };
}

// ── Admin: save race result ───────────────────────────────────────────────────

function setResult(key, raceId, crewId, pos) {
  if (key !== ADMIN_KEY) return { error: 'Neplatný admin klíč.' };
  if (!pos || pos < 1 || pos > 16) return { error: 'Pozice musí být 1–16.' };

  const sheet = sh('Vysledky');
  const all = sheet.getDataRange().getValues();
  for (let i = 1; i < all.length; i++) {
    if (all[i][0] === raceId && all[i][1] === crewId) {
      sheet.getRange(i + 1, 3).setValue(pos);
      return { ok: true };
    }
  }
  sheet.appendRow([raceId, crewId, pos, new Date()]);
  return { ok: true };
}

// ── Admin: get full day overview ─────────────────────────────────────────────

function getDayData(key, date) {
  if (key !== ADMIN_KEY) return { error: 'Neplatný admin klíč.' };
  if (!date) date = today();

  const races = getRaces(date);
  const crews = rows('Posadky').map(r => ({ id: r[0], name: r[1], boat: r[3] }));
  const allResults = rows('Vysledky').map(r => ({ race: r[0], crew: r[1], pos: r[2] }));
  const allTips = rows('Tipy').map(r => ({ crew: r[0], race: r[1], pos: r[2] }));

  return { date, races, crews, results: allResults, tips: allTips };
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

function getLeaderboard() {
  const allTips = rows('Tipy');
  const allResults = rows('Vysledky');

  const board = rows('Posadky').map(row => {
    const id = row[0];
    let pts = 0, tipped = 0, exact = 0;

    allTips.filter(t => t[0] === id).forEach(tip => {
      const res = allResults.find(r => r[0] === tip[1] && r[1] === id);
      if (res) {
        const p = calcPoints(tip[2], res[2]);
        pts += p;
        tipped++;
        if (p === 3) exact++;
      }
    });

    return { id, name: row[1], boat: row[3], bet: row[4] || 0, pts, tipped, exact };
  });

  const pot = board.reduce((s, c) => s + (c.bet || 0), 0);
  return { board: board.sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name)), pot };
}

// ═══════════════════════════════════════════════════════════════════════════════
// JEDNORÁZOVÉ SETUP FUNKCE – spusť jednou z Apps Script editoru
// ═══════════════════════════════════════════════════════════════════════════════

function setupSheets() {
  const spreadsheet = ss();
  const defs = {
    Posadky:  ['id', 'jmeno', 'token', 'lod', 'sazka', 'datum_sazky'],
    Rozjizdy: ['id', 'datum', 'cislo'],
    Tipy:     ['posadka_id', 'rozjizda_id', 'pozice', 'cas'],
    Vysledky: ['rozjizda_id', 'posadka_id', 'pozice', 'cas'],
  };
  Object.entries(defs).forEach(([name, headers]) => {
    let s = spreadsheet.getSheetByName(name);
    if (!s) s = spreadsheet.insertSheet(name);
    if (s.getLastRow() === 0) s.appendRow(headers);
  });
  Logger.log('✅ Sheets připraveny');
}

const CREWS = [
  ['P01', 'Polyněšti Tygři',     'NABU',      'nabu26'],
  ['P02', 'Keraservis',           'IO',        'io26ker'],
  ['P03', 'Ebm, Výběr z hroznů', 'DIA',       'dia26ebm'],
  ['P04', 'Hinton',               'KORE',      'kore26hi'],
  ['P05', 'ELOS Sailing team',    'METIS',     'metis26e'],
  ['P06', 'Lumeni',               'JANUS',     'janus26l'],
  ['P07', 'Avrio',                'MILKY WAY', 'milky26a'],
  ['P08', 'Legends sailing team', 'CERES',     'ceres26l'],
  ['P09', 'Invin',                'KETU',      'ketu26in'],
  ['P10', 'Kopyta z Brna',        'ELARA',     'elara26k'],
  ['P11', 'Twinky Holky',         'NEBULA',    'nebul26t'],
  ['P12', 'Ebm, Men over board',  'ALBEDO',    'albed26m'],
  ['P13', 'Futura racing team',   'CALISTO',   'calis26f'],
  ['P14', 'Lokomotiva ČB',        'MONDO',     'mondo26l'],
  ['P15', 'OHLA ŽS',              'ERIS',      'eris26oh'],
  ['P16', 'HY Racing',            'MIMAS',     'mimas26h'],
];

function initCrews() {
  setupSheets();
  const sheet = sh('Posadky');
  if (sheet.getLastRow() > 1) sheet.deleteRows(2, sheet.getLastRow() - 1);

  CREWS.forEach(([id, name, boat, token]) => {
    sheet.appendRow([id, name, token, boat, '', '']);
  });

  Logger.log('✅ Posádky inicializovány!');
  Logger.log('');
  Logger.log('═══ ODKAZ PRO KAŽDOU POSÁDKU ═══');
  Logger.log('Nahraď BASE_URL svou GitHub Pages URL');
  const BASE_URL = 'https://musla.github.io/Pumps2026/';
  CREWS.forEach(([, name, , token]) => {
    Logger.log(name + ':');
    Logger.log('  ' + BASE_URL + '?token=' + token);
    Logger.log('');
  });
}
