import { readFileSync, writeFileSync } from 'fs';
const root = '/Users/johnkruse/Projects/kbl-tracker--auction-ux';
const html = root + '/spec-docs/prototypes/fenway-aged/index.html';
const b64 = (p) => readFileSync(p).toString('base64');
const chalk = b64(root + '/src/assets/fonts/chalk.otf');
const moms = b64(root + '/src/assets/fonts/moms-typewriter.ttf');
const face = `
@font-face{font-family:'Chalk';src:url(data:font/otf;base64,${chalk}) format('opentype');font-weight:400;font-display:swap}
@font-face{font-family:'Moms Typewriter';src:url(data:font/ttf;base64,${moms}) format('truetype');font-weight:400;font-display:swap}
`;
let s = readFileSync(html, 'utf8');
s = s.replace('/*FONTS*/', face);
writeFileSync(html, s);
console.log('injected fonts; chalk=' + chalk.length + 'b64 moms=' + moms.length + 'b64; file size now ' + s.length);
