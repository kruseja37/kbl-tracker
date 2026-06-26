import { chromium } from 'playwright';
const dir = '/Users/johnkruse/Projects/kbl-tracker--auction-ux/spec-docs/prototypes/franchise-lens/';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1180,height:940}, deviceScaleFactor:2 });
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push('PAGEERR:'+e.message));
await p.goto('http://localhost:4188/__preview/franchise-lens',{waitUntil:'networkidle',timeout:20000});
await p.waitForTimeout(900);
await p.screenshot({ path: dir+'react-lens-page.png', fullPage:true });
console.log('react-lens-page');
// open Lars Stad morale ledger (the 38 button)
await p.locator('.fen-morale', { hasText: '38' }).first().click();
await p.waitForTimeout(350);
await p.screenshot({ path: dir+'react-morale-ledger.png', fullPage:true });
console.log('react-morale-ledger');
// switch to River Rats lens
await p.locator('.fen-teamchip', { hasText: 'River Rats' }).click();
await p.waitForTimeout(450);
await p.screenshot({ path: dir+'react-lens-river.png', fullPage:true });
console.log('react-lens-river');
console.log('CONSOLE_ERRORS='+JSON.stringify(errs));
await b.close(); console.log('DONE');
