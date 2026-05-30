// Pumps 2026 – Google Apps Script Web App
// Sheet ID je natvrdo – neměň, pokud nepřesouváš data

const SS_ID     = '164rkNgIWwNbeL7arpYTIIGQiC11SKw2i5DKuM_vv87E';
const ADMIN_KEY = 'pumps2026'; // ← Změň před nasazením!

// ── Routing ───────────────────────────────────────────────────────────────────

function doGet(e) {
  const p     = e.parameter;
  const page  = p.page  || 'crew';
  const token = p.token || '';

  let tpl;
  if      (page === 'admin')       tpl = HtmlService.createTemplateFromFile('admin');
  else if (page === 'leaderboard') tpl = HtmlService.createTemplateFromFile('leaderboard');
  else                             tpl = HtmlService.createTemplateFromFile('crew');

  tpl.initToken = token;

  return tpl.evaluate()
    .setTitle('⛵ Pumps 2026')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Umožní vkládání sdílených souborů: <?!= include('styles') ?>
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ss()          { return SpreadsheetApp.openById(SS_ID); }
function sh(name)      { return ss().getSheetByName(name); }

function rows(name) {
  const s = sh(name);
  if (!s || s.getLastRow() <= 1) return [];
  return s.getRange(2, 1, s.getLastRow() - 1, s.getLastColumn()).getValues();
}

function today() {
  return Utilities.formatDate(new Date(), 'Europe/Prague', 'yyyy-MM-dd');
}

function nowHour() {
  return parseInt(Utilities.formatDate(new Date(), 'Europe/Prague', 'HH'), 10);
}

function tippingOpen() { return nowHour() < 12; }

function calcPoints(tip, result) {
  const d = Math.abs(tip - result);
  return d === 0 ? 3 : d === 1 ? 1 : 0;
}

function fmtDate(v) {
  if (!v) return '';
  if (v instanceof Date) return Utilities.formatDate(v, 'Europe/Prague', 'yyyy-MM-dd');
  return String(v).substring(0, 10);
}

// ── Server functions (volané z HTML přes google.script.run) ───────────────────

function getCrew(token) {
  if (!token) return { error: 'Chybí token – zkontroluj odkaz.' };
  const row = rows('Posadky').find(r => r[2] === token);
  if (!row) return { error: 'Posádka nenalezena. Zkontroluj odkaz.' };
  return { id: row[0], name: row[1], token: row[2], boat: row[3], bet: row[4] || null };
}

function getCrewTips(token, date) {
  if (!date) date = today();
  const crew = getCrew(token);
  if (crew.error) return crew;

  const races    = getRaces(date);
  const allTips  = rows('Tipy');
  const allRes   = rows('Vysledky');

  return {
    crew,
    date,
    canTip:  tippingOpen(),
    nowHour: nowHour(),
    races: races.map(race => {
      const tip = allTips.find(t => t[0] === crew.id && String(t[1]) === race.id);
      const res = allRes.find(r  => String(r[0]) === race.id && r[1] === crew.id);
      return {
        race,
        tip:    tip ? tip[2] : null,
        result: res ? res[2] : null,
        points: (tip && res) ? calcPoints(tip[2], res[2]) : null
      };
    })
  };
}

function getRaces(date) {
  if (!date) date = today();
  return rows('Rozjizdy')
    .filter(r => fmtDate(r[1]) === date)
    .map(r => ({ id: String(r[0]), date: fmtDate(r[1]), num: r[2] }))
    .sort((a, b) => a.num - b.num);
}

function setBet(token, amount) {
  const amt = parseFloat(amount);
  if (!amt || amt <= 0) return { error: 'Zadej platnou částku.' };

  const sheet = sh('Posadky');
  const all   = sheet.getDataRange().getValues();
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

function setTip(token, raceId, pos) {
  if (!tippingOpen()) return { error: 'Tipování je uzavřeno (po 12:00).' };
  pos = parseInt(pos, 10);
  if (!pos || pos < 1 || pos > 16) return { error: 'Pozice musí být 1–16.' };

  const crew = getCrew(token);
  if (crew.error) return crew;

  const sheet = sh('Tipy');
  const all   = sheet.getDataRange().getValues();
  for (let i = 1; i < all.length; i++) {
    if (all[i][0] === crew.id && String(all[i][1]) === String(raceId)) {
      sheet.getRange(i + 1, 3).setValue(pos);
      sheet.getRange(i + 1, 4).setValue(new Date());
      return { ok: true };
    }
  }
  sheet.appendRow([crew.id, raceId, pos, new Date()]);
  return { ok: true };
}

function adminSetRaces(key, date, count) {
  if (key !== ADMIN_KEY) return { error: 'Neplatný admin klíč.' };
  if (!date) date = today();
  count = parseInt(count, 10);
  if (!count || count < 1 || count > 10) return { error: 'Počet musí být 1–10.' };

  const sheet  = sh('Rozjizdy');
  const all    = sheet.getDataRange().getValues();
  const prefix = date.replace(/-/g, '');

  for (let i = all.length; i >= 2; i--) {
    if (String(all[i - 1][0]).startsWith(prefix)) sheet.deleteRow(i);
  }
  for (let i = 1; i <= count; i++) {
    sheet.appendRow([prefix + 'R' + i, date, i]);
  }
  return { ok: true, count };
}

function adminSetResult(key, raceId, crewId, pos) {
  if (key !== ADMIN_KEY) return { error: 'Neplatný admin klíč.' };
  pos = parseInt(pos, 10);
  if (!pos || pos < 1 || pos > 16) return { error: 'Pozice musí být 1–16.' };

  const sheet = sh('Vysledky');
  const all   = sheet.getDataRange().getValues();
  for (let i = 1; i < all.length; i++) {
    if (String(all[i][0]) === String(raceId) && all[i][1] === crewId) {
      sheet.getRange(i + 1, 3).setValue(pos);
      return { ok: true };
    }
  }
  sheet.appendRow([raceId, crewId, pos, new Date()]);
  return { ok: true };
}

function adminGetDayData(key, date) {
  if (key !== ADMIN_KEY) return { error: 'Neplatný admin klíč.' };
  if (!date) date = today();

  return {
    date,
    races:   getRaces(date),
    crews:   rows('Posadky').map(r => ({ id: r[0], name: r[1], boat: r[3] })),
    results: rows('Vysledky').map(r => ({ race: String(r[0]), crew: r[1], pos: r[2] })),
    tips:    rows('Tipy').map(r => ({ crew: r[0], race: String(r[1]) }))
  };
}

function getLeaderboardData() {
  const allTips = rows('Tipy');
  const allRes  = rows('Vysledky');

  const board = rows('Posadky').map(row => {
    const id = row[0];
    let pts = 0, tipped = 0, exact = 0;

    allTips.filter(t => t[0] === id).forEach(tip => {
      const res = allRes.find(r => String(r[0]) === String(tip[1]) && r[1] === id);
      if (res) {
        const p = calcPoints(tip[2], res[2]);
        pts += p; tipped++;
        if (p === 3) exact++;
      }
    });

    return { id, name: row[1], boat: row[3], bet: row[4] || 0, pts, tipped, exact };
  });

  const pot = board.reduce((s, c) => s + (c.bet || 0), 0);
  return { board: board.sort((a, b) => b.pts - a.pts), pot };
}

// ── Jednorázový setup – spusť z Apps Script editoru ──────────────────────────

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
  Logger.log('✅ Listy připraveny');
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
  CREWS.forEach(([id, name, boat, token]) => sheet.appendRow([id, name, token, boat, '', '']));

  const url = ScriptApp.getService().getUrl();
  Logger.log('');
  Logger.log('✅ Hotovo! Tvoje App URL:');
  Logger.log(url);
  Logger.log('');
  Logger.log('Admin panel:  ' + url + '?page=admin');
  Logger.log('Žebříček:     ' + url + '?page=leaderboard');
  Logger.log('');
  Logger.log('─── Odkaz pro každou posádku ───');
  CREWS.forEach(([, name,, token]) => {
    Logger.log(name + ':  ' + url + '?token=' + token);
  });
}
