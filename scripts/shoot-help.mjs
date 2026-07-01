import { chromium } from 'playwright';
const dir = '/Users/johnkruse/Projects/kbl-tracker--auction-ux/spec-docs/prototypes/franchise-lens/';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1180,height:1000}, deviceScaleFactor:2 });
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push('PAGEERR:'+e.message));
await p.goto('http://localhost:4188/__preview/franchise-lens',{waitUntil:'networkidle',timeout:20000});
await p.waitForTimeout(900);
await p.screenshot({ path: dir+'react-home-helpoff.png', fullPage:true });
console.log('home help OFF');
// turn Help on
await p.evaluate(()=>{const h=document.querySelector('.fen-helpbtn'); if(h)h.click();});
await p.waitForTimeout(300);
await p.screenshot({ path: dir+'react-home-helpon.png', fullPage:true });
console.log('home help ON');
// Tootwhistle Times tab (help off again)
await p.evaluate(()=>{const h=document.querySelector('.fen-helpbtn'); if(h)h.click();});
await p.evaluate(()=>{const t=[...document.querySelectorAll('.fen-tab')].find(x=>x.textContent.trim().startsWith('Tootwhistle')); if(t)t.click();});
await p.waitForTimeout(400);
await p.screenshot({ path: dir+'react-tootwhistle.png', fullPage:true });
console.log('tootwhistle');
console.log('CONSOLE_ERRORS='+JSON.stringify(errs)); await b.close(); console.log('DONE');
