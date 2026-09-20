// Read-only WhatsApp research export. Never logs or writes plaintext responses.
import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes, publicEncrypt, createCipheriv, constants, createPublicKey } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const req=JSON.parse(readFileSync('whatsapp-reader-request.json','utf8'));
const pub=createPublicKey(req.publicKey);
if(pub.asymmetricKeyType!=='rsa'||pub.asymmetricKeyDetails.modulusLength<3072) throw Error('Invalid encryption public key');
if(!process.env.API_TOKEN) throw Error('WHAPI_TOKEN missing');
if(!['recent-100','stories-24h'].includes(req.mode)) throw Error('Unsupported read request');
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
 const call=async(name,args)=>{if(!['getChats','getMessagesByChatID','getStories'].some(n=>n.toLowerCase()===name.toLowerCase())) throw Error('Read tool not allowed');const response=await client.callTool({name,arguments:args},undefined,{timeout:45000});results.results.push({name,args,response});return response;};
 const unpack=r=>{for(const c of r.content||[]){if(c.type==='text'){try{const j=JSON.parse(c.text);return typeof j.content==='object'?j.content:j;}catch{}}}return {};};
 if(req.mode==='stories-24h'){
  const now=Math.floor(Date.now()/1000);
  if(!names.includes('getStories')) throw Error('Stories read unavailable');
  let total=0;
  for(let offset=0;offset<500;offset+=100){
   const response=await call('getStories',{count:100,offset,time_from:now-86400,time_to:now,from_me:false,normal_types:true});
   const data=unpack(response);
   if(response.isError||data.error) {failed=true;break;}
   const rows=data.messages||data.stories;
   if(!Array.isArray(rows)){failed=true;results.responseShape=Object.keys(data);break;}
   total+=rows.length;
   if(rows.length<100)break;
  }
  results.coverage={storiesReturned:total,windowHours:24,maximum:500};
 } else {
 const chatResponse=await call('getChats',{count:200,offset:0});
 const chats=unpack(chatResponse).chats||[];
 if(chatResponse.isError||chats.length===0) failed=true;
 const signal=/launch|EOI|developer|off.?plan|residenc|townhouse|real estate|broker|Imtiaz|Ellington|Emaar|Sobha|Aldar|Reportage|Binghatti|Meraas|Nakheel|Dubai Holding|DHRE|Expo City|Danube|Samana|Qube|Modon|Bloom|Damac|Azizi|Deyaar|Arada|Nshama|Taraf|Iman|BEYOND|Omniyat|застройщик|запуск|старт продаж|إطلاق/i;
 const exclude=/maintenance|school|rent dubai|offers.requests/i;
 const targets=chats.filter(c=>!exclude.test(c.name||'') && signal.test((c.name||'')+' '+JSON.stringify(c.last_message||{}))).slice(0,45);
 const historyTool=listing.tools.find(t=>/^getmessagesbychatid$/i.test(t.name));
 if(!historyTool){results.toolSchemas=listing.tools.filter(t=>/messages.*chat/i.test(t.name));failed=true;}
 else{
  const props=historyTool.inputSchema?.properties||{};
  const idKey=Object.keys(props).find(k=>/^chat_?id$/i.test(k));
  if(!idKey){results.toolSchemas=[historyTool];failed=true;}
  else for(const c of targets){await call(historyTool.name,{[idKey]:c.id,count:100,sort:'desc'});}
 }
 results.coverage={chatsListed:chats.length,historyChatsSelected:targets.length};
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
