import { chromium } from 'playwright';
const base = '/Users/johnkruse/Projects/kbl-tracker--auction-ux/spec-docs/prototypes/';
const b = await chromium.launch();
const errs=[];
// money
let p = await b.newPage({ viewport:{width:1080,height:1000}, deviceScaleFactor:2 });
p.on('pageerror',e=>errs.push('money:'+e.message));
await p.goto('file://'+base+'draft-money/index.html',{waitUntil:'networkidle',timeout:15000}).catch(()=>{});
await p.waitForTimeout(1100);
await p.screenshot({ path: base+'draft-money/money.png', fullPage:true });
console.log('money shot');
// hub tabs — PC then RR lens
let q = await b.newPage({ viewport:{width:1120,height:880}, deviceScaleFactor:2 });
q.on('pageerror',e=>errs.push('hub:'+e.message));
await q.goto('file://'+base+'hub-tabs-teamcolor/index.html',{waitUntil:'networkidle',timeout:15000}).catch(()=>{});
await q.waitForTimeout(1100);
await q.screenshot({ path: base+'hub-tabs-teamcolor/lens-page.png', fullPage:true });
console.log('hub PC shot');
await q.click('.tchip[data-team="RR"]'); await q.waitForTimeout(450);
await q.screenshot({ path: base+'hub-tabs-teamcolor/lens-river.png', fullPage:true });
console.log('hub RR shot');
console.log('ERRORS='+JSON.stringify(errs)); await b.close(); console.log('DONE');
