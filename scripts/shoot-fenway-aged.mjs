import { chromium } from 'playwright';
const dir = '/Users/johnkruse/Projects/kbl-tracker--auction-ux/spec-docs/prototypes/fenway-aged/';
const url = 'file://' + dir + 'index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1160, height: 1000 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => p.goto(url));
await p.waitForTimeout(1100); // fonts decode
await p.screenshot({ path: dir + 'aged-full.png', fullPage: true });
const boards = await p.$$('.board, .paper');
await boards[0].screenshot({ path: dir + 'aged-today.png' });
await boards[2].screenshot({ path: dir + 'aged-news.png' });
console.log('ERRORS=' + JSON.stringify(errs)); await b.close(); console.log('DONE');
