import { chromium } from 'playwright';
const dir = '/Users/johnkruse/Projects/kbl-tracker--auction-ux/spec-docs/prototypes/auction-draft/';
const url = 'file://' + dir + 'index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 920 }, deviceScaleFactor: 2 });
await p.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => p.goto(url));
await p.waitForTimeout(700);

const setLook = async (look) => { await p.click(`#lookseg button[data-look="${look}"]`); await p.waitForTimeout(250); };
const help = async (on) => {
  const isOn = await p.evaluate(() => document.body.classList.contains('help-on'));
  if (isOn !== on) { await p.click('#helpbtn'); await p.waitForTimeout(200); }
};
const goto = async (s) => { await p.click(`.step[data-screen="${s}"]`); await p.waitForTimeout(350); };

// MLB look comparison + help on/off
await goto('mlb');
await setLook('soft'); await help(false);
await p.screenshot({ path: dir + 'cmp-mlb-soft.png', fullPage: true }); console.log('cmp-mlb-soft');
await help(true);
await p.screenshot({ path: dir + 'cmp-mlb-soft-help.png', fullPage: true }); console.log('cmp-mlb-soft-help');
await setLook('edgy'); await help(false);
await p.screenshot({ path: dir + 'cmp-mlb-edgy.png', fullPage: true }); console.log('cmp-mlb-edgy');
await help(true);
await p.screenshot({ path: dir + 'cmp-mlb-edgy-help.png', fullPage: true }); console.log('cmp-mlb-edgy-help');

// Farm edgy (reveal scout)
await goto('farm'); await help(false);
await p.evaluate(() => document.getElementById('scout').classList.add('revealed'));
await p.waitForTimeout(250);
await p.screenshot({ path: dir + 'cmp-farm-edgy.png', fullPage: true }); console.log('cmp-farm-edgy');

// Summary edgy
await goto('summary');
await p.screenshot({ path: dir + 'cmp-summary-edgy.png', fullPage: true }); console.log('cmp-summary-edgy');

await b.close(); console.log('DONE');
