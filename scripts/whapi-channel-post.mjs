import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
if (!process.env.API_TOKEN) throw new Error('API_TOKEN missing');
const transport = new StdioClientTransport({command:'npx',args:['-y','whapi-mcp@0.0.21'],env:{...process.env},stderr:'pipe'});
const client = new Client({name:'graf-channel-publisher',version:'1.0.0'});
const timer=setTimeout(()=>process.exit(1),90000);
try {
 await client.connect(transport);
 const {tools}=await client.listTools();
 for(const t of tools.filter(t=>/newsletter.*(link|invite|message)|sendMessageText|getNewsletter$/i.test(t.name))) console.log(JSON.stringify(t));
} finally {clearTimeout(timer);await client.close();}
