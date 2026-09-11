import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const body="NEW LAUNCH | TRÉPPAN VISION\n\nFakhruddin Properties has unveiled a new mixed-use development in Dubai Land Residence Complex (DLRC).\n\nThe announced collection includes:\n• 408 apartments: studios, 1- and 2-bedroom homes\n• 48 office suites\n• 7 retail units\n\nThe concept combines smart-home technology with planned robotic services for reception, deliveries and day-to-day assistance.\n\nMy take: a distinctive concept worth watching, but the investment case should be judged on the unit price, layout and ongoing service charges—not technology alone.\n\nExplore the project and request details:\nhttps://graf.ae/fakhruddin/treppan-vision/\n\nFollow this channel for new UAE launches and important project updates.";
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
