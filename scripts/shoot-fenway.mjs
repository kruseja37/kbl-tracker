import { chromium } from 'playwright';
const dir = '/Users/johnkruse/Projects/kbl-tracker--auction-ux/spec-docs/prototypes/fenway-scoreboard/';
const url = 'file://' + dir + 'index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1240, height: 1000 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => p.goto(url));
await p.waitForTimeout(900);
await p.screenshot({ path: dir + 'fenway-full.png', fullPage: true });
// crop: just the hero board
const board = await p.$('.board');
await board.screenshot({ path: dir + 'fenway-board.png' });
console.log('ERRORS=' + JSON.stringify(errs)); await b.close(); console.log('DONE');
