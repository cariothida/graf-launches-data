import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const body="AL GHADEER PARKS | ALDAR\n\nTownhouses and villas in Al Ghadeer, Abu Dhabi, between Dubai and Abu Dhabi.\n\nDeveloper-published starting prices:\n• 2-bedroom townhouse: AED 1.9 million\n• 3-bedroom townhouse: AED 2.2 million\n• 4-bedroom villa: AED 3.3 million\n\nPayment plan: 55/45\nDown payment: 5%\nExpected handover: Q2 2031\nCommunity: 453 homes\n\nBroker’s view: worth considering for family-home buyers seeking an Aldar community with a low initial payment. Location and the 2031 delivery timeline should fit your plans.\n\nPrices and terms checked against Aldar’s official page on 11 September 2026. Specific unit availability is subject to confirmation.\n\nOfficial source:\nhttps://www.aldar.com/properties/en/alghadeer-parks\n\nFollow this channel for new UAE property launches and material updates.";
const invite='0029Vb5yX5A4Y9ltaBC4aH3G';
const expected='120363400434813832@newsletter';
if(!process.env.API_TOKEN) throw new Error('API_TOKEN missing');
if(Number(process.env.GITHUB_RUN_ATTEMPT||1)>1) throw new Error('One-off post: reruns disabled; verify previous result first.');
const transport=new StdioClientTransport({command:'npx',args:['-y','whapi-mcp@0.0.21'],env:{...process.env},stderr:'pipe'});
const client=new Client({name:'graf-channel-publisher',version:'1.0.0'});
const timer=setTimeout(()=>{console.error('Deadline exceeded. Do NOT blindly resend: verify channel history.');process.exit(1)},120000);
async function call(name,args){
 const r=await client.callTool({name,arguments:args},undefined,{timeout:45000});
 if(r.isError) throw new Error(name+' returned tool error');
 const t=(r.content??[]).filter(c=>c.type==='text').map(c=>c.text).join('\n');
 let data;try{data=JSON.parse(t)}catch{throw new Error(name+' response is not JSON')}
 if(data.status && (data.status<200||data.status>=300)) throw new Error(name+' HTTP '+data.status);
 return data.content??data;
}
try{
 await client.connect(transport);
 const channel=await call('getNewsletterByInviteCode',{NewsletterInviteCode:invite});
 if(channel.id!==expected||channel.invite_code!==invite)throw new Error('Recipient mismatch: stopped');
 console.log('Verified public channel: '+channel.name+' '+channel.id);
 const history=await call('getMessagesNewsletter',{NewsletterID:expected,count:100});
 if(JSON.stringify(history).includes(JSON.stringify(body).slice(1,-1))){
   console.log('Identical post already present; no message sent.');
 }else{
   const result=await call('sendMessageText',{to:expected,body,no_link_preview:true});
   const id=result.message?.id??result.id;
   if(!id)throw new Error('Send response lacks message ID. Verify channel before any retry.');
   console.log('SENT_MESSAGE_ID='+id);
   let verified=false;
   for(let i=0;i<3;i++){
     const messages=await call('getMessagesNewsletter',{NewsletterID:expected,count:20});
     if(JSON.stringify(messages).includes(JSON.stringify(body).slice(1,-1))){
       verified=true;break;
     }
     await new Promise(r=>setTimeout(r,3000));
   }
   if(!verified)throw new Error('API accepted message, but channel-history confirmation pending. Do NOT resend.');
   console.log('PUBLICATION_VERIFIED: exact English post found in intended channel history.');
 }
} catch(e){console.error(String(e.message).replaceAll(process.env.API_TOKEN,'[REDACTED]'));process.exitCode=1;}
finally{clearTimeout(timer);await client.close();}
