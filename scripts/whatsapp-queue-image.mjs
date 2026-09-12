import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require = createRequire(import.meta.url);
export const sharp = require(require.resolve('sharp', {paths:[process.cwd(),process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES].filter(Boolean)}));
export async function checkImage(bytes) {
  if(bytes.length > 2000000) throw Error('Social image exceeds 2 MB');
  const m = await sharp(bytes,{limitInputPixels:40000000}).metadata();
  if(m.format !== 'jpeg' || m.width !== 1200 || m.height !== 900 || m.hasAlpha || m.space !== 'srgb') throw Error('Expected opaque sRGB 1200x900 JPEG');
  await sharp(bytes).raw().toBuffer(); // Decode pixels, not only the header.
  return {width:m.width,height:m.height,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
}
export async function normalizePhoto(bytes) {
  const m=await sharp(bytes,{limitInputPixels:40000000}).metadata();
  if(!['jpeg','png','webp','avif'].includes(m.format) || Math.max(m.width,m.height)<1200) throw Error('Unsupported or low-resolution project image');
  // Contain avoids cutting buildings or embedded disclosures; light matte avoids black transparency.
  const out=await sharp(bytes).rotate().flatten({background:'#f4f1e9'}).resize(1200,900,{fit:'contain',background:'#f4f1e9'}).toColourspace('srgb').jpeg({quality:90,chromaSubsampling:'4:4:4'}).toBuffer();
  await checkImage(out); return out;
}
