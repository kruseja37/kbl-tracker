import { chromium } from 'playwright';

const dir = '/Users/johnkruse/Projects/kbl-tracker--auction-ux/spec-docs/prototypes/auction-draft/';
const url = 'file://' + dir + 'index.html';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 920 }, deviceScaleFactor: 2 });
await p.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => p.goto(url));
await p.waitForTimeout(800); // let webfont settle

const screens = ['setup', 'mlb', 'handoff', 'farm', 'summary'];
for (const s of screens) {
  await p.click(`.step[data-screen="${s}"]`);
  await p.waitForTimeout(450);
  await p.screenshot({ path: dir + `screen-${s}.png`, fullPage: true });
  console.log('shot', s);
}

// farm: capture the press-and-hold scout reveal
await p.click('.step[data-screen="farm"]');
await p.waitForTimeout(300);
const cover = await p.$('#scoutcover');
const box = await cover.boundingBox();
await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await p.mouse.down();
await p.waitForTimeout(350);
await p.screenshot({ path: dir + 'screen-farm-revealed.png', fullPage: true });
await p.mouse.up();
console.log('shot farm-revealed');

await b.close();
console.log('DONE');
