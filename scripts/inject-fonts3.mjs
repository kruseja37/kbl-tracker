import { readFileSync, writeFileSync } from 'fs';
const root = '/Users/johnkruse/Projects/kbl-tracker--auction-ux';
const html = process.argv[2];
const b64 = (p) => readFileSync(p).toString('base64');
const chalk = b64(root + '/src/assets/fonts/chalk.otf');
const moms = b64(root + '/src/assets/fonts/moms-typewriter.ttf');
const score = b64(root + '/src/assets/fonts/scoreboard.ttf');
const face = `
@font-face{font-family:'Chalk';src:url(data:font/otf;base64,${chalk}) format('opentype');font-weight:400;font-display:swap}
@font-face{font-family:'Moms Typewriter';src:url(data:font/ttf;base64,${moms}) format('truetype');font-weight:400;font-display:swap}
@font-face{font-family:'Scoreboard';src:url(data:font/ttf;base64,${score}) format('truetype');font-weight:400;font-display:swap}
`;
let s = readFileSync(html, 'utf8');
if (!s.includes('/*FONTS*/')) { console.log('NO PLACEHOLDER'); process.exit(0); }
writeFileSync(html, s.replace('/*FONTS*/', face));
console.log('injected 3 fonts; size ' + readFileSync(html,'utf8').length);
