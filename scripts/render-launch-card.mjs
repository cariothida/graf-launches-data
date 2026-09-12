import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import {normalizePhoto} from './whatsapp-queue-image.mjs';
const require = createRequire(import.meta.url);
const sharp = require(require.resolve('sharp', {paths: [process.cwd(), process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES].filter(Boolean)}));
const [input, output] = process.argv.slice(2);
if (!input || !output) throw Error('Usage: node render-launch-card.mjs input.json output.jpg');
const c = JSON.parse(await readFile(input, 'utf8'));
if(c.photoBase64){
 if(c.verifiedProjectImage!==true || !c.source || !c.rightsBasis)throw Error('Photo identity and reuse basis required');
 await writeFile(output,await normalizePhoto(Buffer.from(c.photoBase64,'base64')));
 console.log('Verified photograph normalized to 1200x900 opaque JPEG');process.exit(0);
}
const esc = s => String(s).replace(/[<>&"']/g, x => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[x]));
if (!Array.isArray(c.title) || c.title.length > 2 || c.title.some(s => s.length > 26)) throw Error('Title needs one or two short lines');
// Stable editorial template, not an invented architectural render. Always opaque RGB JPEG.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#073F46"/><stop offset="1" stop-color="#087D7D"/></linearGradient></defs><rect width="1200" height="900" fill="url(#bg)"/><circle cx="1070" cy="240" r="360" fill="none" stroke="#61B6AD" stroke-opacity=".22" stroke-width="2"/><circle cx="1070" cy="240" r="290" fill="none" stroke="#61B6AD" stroke-opacity=".22" stroke-width="2"/><text x="72" y="103" font-family="sans-serif" font-weight="bold" font-size="46" fill="white">GRAF</text><text x="270" y="100" font-family="sans-serif" font-size="22" letter-spacing="4" fill="#ABD6D0">LAUNCH RADAR</text><rect x="72" y="160" width="394" height="46" rx="23" fill="#EACC85"/><text x="96" y="190" font-family="sans-serif" font-size="20" font-weight="bold" letter-spacing="1" fill="#123E42">${esc(c.badge)}</text>${c.title.map((s,i)=>`<text x="72" y="${330+i*78}" font-family="sans-serif" font-size="${i?49:64}" font-weight="bold" fill="white">${esc(s)}</text>`).join('')}<text x="72" y="480" font-family="sans-serif" font-size="30" fill="#C6E3DF">${esc(c.location)}</text><rect x="72" y="534" width="1056" height="208" rx="18" fill="#FFFFFF"/><text x="72" y="809" font-family="sans-serif" font-size="25" fill="#F1DEAC">${esc(c.note)}</text><text x="72" y="857" font-family="sans-serif" font-size="21" fill="#AAD5CF">EARLY ACCESS INTELLIGENCE</text><text x="1010" y="857" font-family="sans-serif" font-size="25" fill="white">graf.ae</text></svg>`;
const overlays=[];
if(c.logoBase64){
 const b=Buffer.from(c.logoBase64,'base64');
 const meta=await sharp(b,{limitInputPixels:40000000}).metadata();
 if(!['png','jpeg','webp','avif'].includes(meta.format)) throw Error('Unsupported logo');
 // Contain, not cover: never clip the logo. White matte prevents transparent-black failure.
 const logo=await sharp(b).rotate().flatten({background:'#ffffff'}).resize(620,150,{fit:'contain',background:'#ffffff'}).png().toBuffer();
 overlays.push({input:logo,left:290,top:563});
}
const out=await sharp(Buffer.from(svg)).composite(overlays).flatten({background:'#ffffff'}).toColourspace('srgb').jpeg({quality:90,chromaSubsampling:'4:4:4'}).toBuffer();
const m=await sharp(out).metadata();
if(m.width!==1200||m.height!==900||m.hasAlpha||out.length>2000000)throw Error('Image QA failed');
await writeFile(output,out);
console.log(JSON.stringify({width:m.width,height:m.height,format:m.format,bytes:out.length,hasAlpha:m.hasAlpha}));
