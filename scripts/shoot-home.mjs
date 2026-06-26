import { chromium } from 'playwright';
const dir = '/Users/johnkruse/Projects/kbl-tracker--auction-ux/spec-docs/prototypes/season-home/';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1140,height:900}, deviceScaleFactor:2 });
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+dir+'index.html',{waitUntil:'networkidle',timeout:15000}).catch(()=>{});
await p.waitForTimeout(1100);
await p.screenshot({ path: dir+'season-home.png', fullPage:true });
console.log('ERRORS='+JSON.stringify(errs)); await b.close(); console.log('DONE');
