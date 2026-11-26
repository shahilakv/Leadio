/**
 * LEAD DESK — Google Apps Script backend
 * ---------------------------------------
 * Paste this into Extensions → Apps Script of your leads Google Sheet.
 *
 * How it reads your sheet:
 *  - Each TAB = one client. (Tabs whose name starts with "_" are ignored.)
 *  - Row 1 = headers (Meta's own headers like full_name, phone_number,
 *    campaign_name, created_time all work automatically).
 *  - The app adds 5 columns at the end if missing:
 *    Status | Notes | Follow Up | Attempts | Last Called | First Called
 *    Everything you mark in the app is saved there, so the sheet stays the source of truth.
 */

const EXTRA_COLS = ['Status', 'Notes', 'Follow Up', 'Attempts', 'Last Called', 'First Called'];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Lead Desk')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** List of clients = tab names */
function getClients() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()
    .map(s => s.getName())
    .filter(n => !n.startsWith('_'));
}

/** All leads of one tab */
function getLeads(tab) {
  const sh = sheet_(tab);
  ensureCols_(sh);
  const values = sh.getDataRange().getDisplayValues();
  if (!values.length) return { headers: [], leads: [] };
  const headers = values[0].map(h => String(h).trim());
  const leads = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (!r.some(v => v !== '')) continue;          // skip empty rows
    const d = {};
    headers.forEach((h, j) => { if (h) d[h] = r[j]; });
    leads.push({ row: i + 1, d: d });
  }
  return { headers: headers, leads: leads };
}

/**
 * Save status / notes / follow-up for one lead.
 * key/val (optional) = a unique column like "id" so the right row is updated
 * even if someone sorted the sheet in between.
 */
function updateLead(tab, row, updates, key, val) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_(tab);
    ensureCols_(sh);
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0].map(h => String(h).trim());

    // Safety check: make sure the row still belongs to the same lead
    if (key && val) {
      const kc = headers.indexOf(key);
      if (kc > -1) {
        const cur = sh.getRange(row, kc + 1).getDisplayValue();
        if (String(cur) !== String(val)) {
          const col = sh.getRange(2, kc + 1, Math.max(sh.getLastRow() - 1, 1), 1).getDisplayValues();
          const idx = col.findIndex(c => String(c[0]) === String(val));
          if (idx === -1) throw new Error('Lead not found — refresh the app');
          row = idx + 2;
        }
      }
    }

    Object.keys(updates).forEach(k => {
      const c = headers.indexOf(k);
      if (c === -1) return;
      sh.getRange(row, c + 1).setNumberFormat('@').setValue(String(updates[k] == null ? '' : updates[k]));
    });
    return true;
  } finally {
    lock.releaseLock();
  }
}

function sheet_(tab) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tab);
  if (!sh) throw new Error('Tab not found: ' + tab);
  return sh;
}

function ensureCols_(sh) {
  const lastCol = Math.max(sh.getLastColumn(), 1);
  const headers = sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(h => String(h).trim());
  const missing = EXTRA_COLS.filter(c => headers.indexOf(c) === -1);
  if (!missing.length) return;
  const start = headers.every(h => h === '') ? 1 : lastCol + 1;
  sh.getRange(1, start, 1, missing.length).setValues([missing]);
}
