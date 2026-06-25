import { chromium } from 'playwright';
const dir = '/Users/johnkruse/Projects/kbl-tracker--auction-ux/spec-docs/prototypes/auction-draft/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 920 }, deviceScaleFactor: 2 });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGEERR: ' + e.message));
await p.goto('http://localhost:4188/__preview/auction-stage', { waitUntil: 'networkidle', timeout: 20000 });
await p.waitForTimeout(900);
await p.screenshot({ path: dir + 'react-mlb.png', fullPage: true });
console.log('shot react-mlb');
// switch to farm tier (top-right pill)
await p.getByText('Farm stage', { exact: true }).click();
await p.waitForTimeout(500);
// reveal the scout
await p.evaluate(() => { const c = document.querySelector('.scout'); if (c) c.classList.add('revealed'); });
await p.waitForTimeout(300);
await p.screenshot({ path: dir + 'react-farm.png', fullPage: true });
console.log('shot react-farm');
console.log('CONSOLE_ERRORS=' + JSON.stringify(errs));
await b.close();
