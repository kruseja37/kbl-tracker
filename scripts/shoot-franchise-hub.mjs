import { chromium } from 'playwright';
const dir = '/Users/johnkruse/Projects/kbl-tracker--auction-ux/spec-docs/prototypes/franchise-hub/';
const url = 'file://' + dir + 'index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERR: ' + e.message));
await p.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => p.goto(url));
await p.waitForTimeout(700);

const setLook = async (look) => { await p.click(`#lookseg button[data-look="${look}"]`); await p.waitForTimeout(220); };
const help = async (on) => { const isOn = await p.evaluate(() => document.body.classList.contains('help-on')); if (isOn !== on) { await p.click('#helpbtn'); await p.waitForTimeout(180); } };
const tab = async (t) => { await p.click(`.tab-btn[data-tab="${t}"]`); await p.waitForTimeout(350); };

const tabs = ['today','team','standings','leaders','news'];
for (const t of tabs) {
  await tab(t);
  await setLook('soft'); await help(false);
  await p.screenshot({ path: dir + `fh-${t}-soft.png`, fullPage: true }); console.log(`fh-${t}-soft`);
  await setLook('edgy');
  await p.screenshot({ path: dir + `fh-${t}-edgy.png`, fullPage: true }); console.log(`fh-${t}-edgy`);
}
// help-on example on Today (edgy)
await tab('today'); await setLook('edgy'); await help(true);
await p.screenshot({ path: dir + 'fh-today-edgy-help.png', fullPage: true }); console.log('fh-today-edgy-help');

console.log('PAGE_ERRORS=' + JSON.stringify(errs));
await b.close(); console.log('DONE');
