import { chromium } from 'playwright';
const dir = '/Users/johnkruse/Projects/kbl-tracker--auction-ux/spec-docs/prototypes/franchise-lens/';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1180,height:940}, deviceScaleFactor:2 });
const errs=[]; p.on('pageerror',e=>errs.push('PAGEERR:'+e.message));
await p.goto('http://localhost:4188/__preview/franchise-lens',{waitUntil:'networkidle',timeout:20000});
await p.waitForTimeout(800);
// open Lars Stad morale ledger via programmatic click (bypass interception)
await p.evaluate(() => {
  const btns=[...document.querySelectorAll('.fen-morale')];
  const lars=btns.find(b=>b.textContent.includes('38')); if(lars) lars.click();
});
await p.waitForTimeout(350);
await p.screenshot({ path: dir+'react-morale-ledger.png', fullPage:true });
console.log('react-morale-ledger');
// close + switch to River Rats lens
await p.evaluate(()=>{ const bd=document.querySelector('.fen-popbackdrop'); if(bd) bd.click(); });
await p.evaluate(() => {
  const chips=[...document.querySelectorAll('.fen-teamchip')];
  const rr=chips.find(c=>c.textContent.includes('River Rats')); if(rr) rr.click();
});
await p.waitForTimeout(450);
await p.screenshot({ path: dir+'react-lens-river.png', fullPage:true });
console.log('react-lens-river');
console.log('ERRORS='+JSON.stringify(errs));
await b.close(); console.log('DONE');
