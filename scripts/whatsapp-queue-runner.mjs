import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { channelId, inviteCode, validate, due, containsBody } from './whatsapp-queue-policy.mjs';
import {checkImage} from './whatsapp-queue-image.mjs';
const repo = 'cariothida/graf-launches-data';
const dry = process.env.DRY_RUN === 'true';
async function github(path, options = {}) {
  const r = await fetch('https://api.github.com/repos/' + repo + '/contents/' + path, {
    ...options, headers: {Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json','Content-Type':'application/json',...options.headers}, signal:AbortSignal.timeout(20000)
  });
  if(!r.ok) throw Error('GitHub '+path+' HTTP '+r.status);
  return r.json();
}
async function read(path) {
 const r=await github(path+'?ref=main');return {sha:r.sha,data:JSON.parse(Buffer.from(r.content,'base64').toString())};
}
const q=(await read('whatsapp-queue.json')).data;
validate(q);
let ledger=await read('whatsapp-ledger.json');
async function save() {
 const r=await github('whatsapp-ledger.json',{method:'PUT',body:JSON.stringify({branch:'main',sha:ledger.sha,message:'Record WhatsApp publication state [skip ci]',content:Buffer.from(JSON.stringify(ledger.data,null,2)+'\n').toString('base64')})});
 ledger.sha=r.content.sha;
}
if(dry){console.log('DRY_RUN: queue validation passed; no messages or ledger writes');process.exit(0);}
let p=due(q,ledger.data);
if(!p){
 const next=q.posts.find(x=>x.scheduledAt && ledger.data.posts[x.eventKey]?.state!=='sent' && Date.parse(x.scheduledAt)>Date.now() && Date.parse(x.scheduledAt)-Date.now()<=240000);
 if(next){console.log('Waiting for explicit authorized slot '+next.scheduledAt);while(Date.now()<Date.parse(next.scheduledAt))await new Promise(r=>setTimeout(r,Math.min(15000,Date.parse(next.scheduledAt)-Date.now())));p=due(q,ledger.data);}
}
if(!p){console.log('No due unpublished hot launches');process.exit(0);}
if(!process.env.API_TOKEN)throw Error('WHAPI_TOKEN is missing');
const transport=new StdioClientTransport({command:'npx',args:['-y','whapi-mcp@0.0.21'],env:{...process.env},stderr:'pipe'});
const client=new Client({name:'graf-hot-launch-queue',version:'1.0.0'});
const timer=setTimeout(()=>{console.error('Deadline; inspect durable pending state before retrying');process.exit(1)},480000);
async function call(name,args){
 const r=await client.callTool({name,arguments:args},undefined,{timeout:45000});
 if(r.isError)throw Error(name+' tool error');
 const t=(r.content??[]).filter(c=>c.type==='text').map(c=>c.text).join('\n');
 let d;try{d=JSON.parse(t)}catch{throw Error(name+' non-JSON response')}
 if(d.status&&(d.status<200||d.status>=300))throw Error(name+' HTTP '+d.status);
 return d.content??d;
}
try{
 await client.connect(transport);
 const channel=await call('getNewsletterByInviteCode',{NewsletterInviteCode:inviteCode});
 if(channel.id!==channelId||channel.invite_code!==inviteCode)throw Error('Recipient identity mismatch');
 do {
 const existing=ledger.data.posts[p.eventKey];
 if(existing?.body&&existing.body!==p.body)throw Error('Pending/sent event body was changed; reconcile before publication');
 if((existing?.imageUrl && existing.imageUrl!==p.imageUrl)||(existing?.imageRepoPath && existing.imageRepoPath!==p.imageRepoPath))throw Error('Pending image was changed');
 const history=await call('getMessagesNewsletter',{NewsletterID:channelId,count:100});
 if(containsBody(history,p.body)){
   ledger.data.posts[p.eventKey]={...existing,projectId:p.projectId,body:p.body,state:'sent',verifiedAt:new Date().toISOString(),reconciled:true};
   await save();console.log('VERIFIED existing post; no resend: '+p.eventKey);
 }else{
   if(existing)throw Error('UNRESOLVED previous send attempt for '+p.eventKey+'; no blind resend');
   const page=await fetch(p.siteUrl,{redirect:'error',signal:AbortSignal.timeout(20000)});
   if(!page.ok)throw Error('Launch page not live HTTP '+page.status);
   const html=await page.text();
   if(!/text\/html/i.test(page.headers.get('content-type')||'')||!html.includes('<title'))throw Error('Launch page response is not HTML');
   if(/<title[^>]*>\s*(One moment|Just a moment|Access denied)/i.test(html)||!html.includes('/launches/'+p.projectId+'/'))throw Error('Page identity not verified (challenge or wrong page)');
   let imageQA,imageBytes;
   if(p.imageUrl||p.imageRepoPath){
     if(p.imageRepoPath){const stored=await github(p.imageRepoPath+'?ref=main');imageBytes=Buffer.from(stored.content,'base64');}
     else {const media=await fetch(p.imageUrl,{redirect:'error',signal:AbortSignal.timeout(20000)});if(!media.ok||!/^image\/jpeg/.test(media.headers.get('content-type')||''))throw Error('Verified project JPEG unavailable');imageBytes=Buffer.from(await media.arrayBuffer());}
     imageQA=await checkImage(imageBytes);
     if(p.imageSha256 && p.imageSha256!==imageQA.sha256)throw Error('Published image differs from approved asset');
   }
   // Persist BEFORE sending. If the runner dies, later runs reconcile history, never blindly resend.
   ledger.data.posts[p.eventKey]={state:'pending',projectId:p.projectId,body:p.body,imageUrl:p.imageUrl,imageRepoPath:p.imageRepoPath,imageQA,attemptedAt:new Date().toISOString()};
   await save();
   const hasImage=!!(p.imageUrl||p.imageRepoPath);
   const sent=await call(hasImage?'sendMessageImage':'sendMessageText',hasImage?{to:channelId,media:p.imageRepoPath?'data:image/jpeg;name='+p.projectId+'.jpg;base64,'+imageBytes.toString('base64'):p.imageUrl,caption:p.body}:{to:channelId,body:p.body,no_link_preview:true});
   const id=sent.message?.id??sent.id;
   if(!id)throw Error('Send response missing message ID; pending state retained');
   ledger.data.posts[p.eventKey].messageId=id;
   await save();
   let verified=false;
   for(let i=0;i<3;i++){
     const h=await call('getMessagesNewsletter',{NewsletterID:channelId,count:100});
     if(containsBody(h,p.body)){verified=true;break;}
     await new Promise(r=>setTimeout(r,3000));
   }
   if(!verified)throw Error('API accepted post but history not yet confirmed; pending state retained');
   ledger.data.posts[p.eventKey].state='sent';
   ledger.data.posts[p.eventKey].verifiedAt=new Date().toISOString();
   await save();console.log('PUBLICATION_VERIFIED '+p.eventKey+' '+id);
 }
 p=due(q,ledger.data);
 } while(p);
}catch(e){console.error(String(e.message).replaceAll(process.env.API_TOKEN||'__NO_TOKEN__','[REDACTED]'));process.exitCode=1;}
finally{clearTimeout(timer);await client.close();}
