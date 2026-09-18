// Read-only WhatsApp research export. Never logs or writes plaintext responses.
import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes, publicEncrypt, createCipheriv, constants, createPublicKey } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const req=JSON.parse(readFileSync('whatsapp-reader-request.json','utf8'));
const pub=createPublicKey(req.publicKey);
if(pub.asymmetricKeyType!=='rsa'||pub.asymmetricKeyDetails.modulusLength<3072) throw Error('Invalid encryption public key');
if(!process.env.API_TOKEN) throw Error('WHAPI_TOKEN missing');
if(req.mode!=='recent-100') throw Error('Unsupported read request');
const timer=setTimeout(()=>{console.error('Read deadline exceeded; no plaintext exported');process.exit(1)},240000);
const transport=new StdioClientTransport({command:'npx',args:['-y','whapi-mcp@0.0.21'],env:{...process.env},stderr:'pipe'});
transport.stderr?.on('data',()=>{});
const client=new Client({name:'graf-readonly-research',version:'1.0.0'});
let failed=false;
const results={requestId:req.requestId,readAt:new Date().toISOString(),results:[]};
try{
 await client.connect(transport);
 const listing=await client.listTools();
 const names=listing.tools.map(t=>t.name);
 // Strict allowlist: no send, read-receipt, subscribe, health/wakeup or settings tools.
 for(const name of ['getChats','getMessages']){
   if(!names.includes(name)){results.results.push({name,error:'tool unavailable'});failed=true;continue;}
   const args=name==='getMessages'?{count:100,sort:'desc',from_me:false}:{count:100};
   const response=await client.callTool({name,arguments:args},undefined,{timeout:90000});
   results.results.push({name,response});
   if(response.isError) failed=true;
 }
}catch{failed=true;results.error='Read failed; sensitive error text suppressed';}
finally{try{await client.close()}catch{}clearTimeout(timer);}
const aes=randomBytes(32),iv=randomBytes(12);
const cipher=createCipheriv('aes-256-gcm',aes,iv);
const plaintext=Buffer.from(JSON.stringify(results).split(process.env.API_TOKEN).join('[REDACTED]'));
const ciphertext=Buffer.concat([cipher.update(plaintext),cipher.final()]);
const envelope={version:1,algorithm:'RSA-OAEP-SHA256+AES-256-GCM',requestId:req.requestId,key:publicEncrypt({key:pub,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},aes).toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')};
writeFileSync('whatsapp-research.encrypted.json',JSON.stringify(envelope));
console.log('Encrypted read-only export created. No message text or contact identifiers logged.');
if(failed){console.error('One or more reads failed; details are inside encrypted export');process.exitCode=1;}
