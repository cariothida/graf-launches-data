import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
if (!process.env.API_TOKEN) throw new Error('API_TOKEN missing');
const transport = new StdioClientTransport({command:'npx',args:['-y','whapi-mcp@0.0.21'],env:{...process.env},stderr:'pipe'});
const client = new Client({name:'graf-channel-publisher',version:'1.0.0'});
const timer=setTimeout(()=>process.exit(1),90000);
try {
 await client.connect(transport);
 const {tools}=await client.listTools();
 for(const t of tools.filter(t=>/getMessagesNewsletter|getMessage$/.test(t.name))) console.log(JSON.stringify(t));
 const res=await client.callTool({name:'getNewsletterByInviteCode',arguments:{NewsletterInviteCode:'0029Vb5yX5A4Y9ltaBC4aH3G'}});
 if(res.isError) throw new Error('Channel lookup failed');
 for(const c of res.content??[]) if(c.type==='text') console.log(c.text.replaceAll(process.env.API_TOKEN,'[REDACTED]'));

} finally {clearTimeout(timer);await client.close();}
