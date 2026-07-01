import { chromium } from 'playwright';
const dir = '/Users/johnkruse/Projects/kbl-tracker--auction-ux/spec-docs/prototypes/franchise-lens/';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1180,height:1000}, deviceScaleFactor:2 });
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push('PAGEERR:'+e.message));
await p.goto('http://localhost:4188/__preview/franchise-lens',{waitUntil:'networkidle',timeout:20000});
await p.waitForTimeout(900);
await p.screenshot({ path: dir+'react-home-page.png', fullPage:true });
console.log('home (PC)');
// switch to River lens
await p.evaluate(()=>{const c=[...document.querySelectorAll('.fen-teamchip')].find(x=>x.textContent.includes('River Rats')); if(c)c.click();});
await p.waitForTimeout(450);
await p.screenshot({ path: dir+'react-home-river.png', fullPage:true });
console.log('home (River)');
// back to PC, open Roster tab to confirm it still works
await p.evaluate(()=>{const c=[...document.querySelectorAll('.fen-teamchip')].find(x=>x.textContent.includes('Page Capitals')); if(c)c.click();});
await p.waitForTimeout(300);
await p.evaluate(()=>{const t=[...document.querySelectorAll('.fen-tab')].find(x=>x.textContent.trim()==='Roster'); if(t)t.click();});
await p.waitForTimeout(350);
await p.screenshot({ path: dir+'react-roster-2.png', fullPage:true });
console.log('roster');
console.log('CONSOLE_ERRORS='+JSON.stringify(errs)); await b.close(); console.log('DONE');
