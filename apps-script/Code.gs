// lolly.is impression logger.
// Lives inside a Google Sheet (Extensions → Apps Script) and appends one row
// per short-link visit. Deployed as a Web App: Execute as "Me", access "Anyone".

const SHEET_NAME = 'clicks';

// Neutralise strings Sheets would otherwise interpret as formulas.
function clean(v) {
  const s = String(v == null ? '' : v).slice(0, 500);
  return /^[=+@]/.test(s) ? "'" + s : s;
}

function doPost(e) {
  let d = {};
  try { d = JSON.parse(e.postData.contents); } catch (err) {}

  const lock = LockService.getScriptLock();
  lock.tryLock(5000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sh.getLastRow() === 0) {
      sh.appendRow(['when', 'slug', 'destination', 'referrer', 'languages',
                    'timezone', 'platform', 'screen', 'user agent']);
    }
    sh.appendRow([
      new Date(),
      clean(d.slug), clean(d.dest), clean(d.ref), clean(d.lang),
      clean(d.tz), clean(d.platform), clean(d.screen), clean(d.ua)
    ]);
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput('ok');
}

// Visiting the /exec URL in a browser confirms the deployment is alive.
function doGet() {
  return ContentService.createTextOutput('lolly.is logger is running');
}
