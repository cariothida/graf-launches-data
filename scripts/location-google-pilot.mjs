import { chromium } from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await mkdir('research-output',{recursive:true});
const base='https://raw.githubusercontent.com/cariothida/graf-launches-data/main/';
const inputs={};
for(const name of ['launches.json','radar-watchlist.json','RADAR-RESEARCH.md','research/2026-11-25-launch-location-query-plan.json']){
 const r=await fetch(base+name);if(!r.ok)throw new Error(name+' '+r.status);
 const content=await r.text();inputs[name]={sha256:createHash('sha256').update(content).digest('hex'),content};
}
const feed=JSON.parse(inputs['launches.json'].content),plan=JSON.parse(inputs['research/2026-11-25-launch-location-query-plan.json'].content);
const watch=JSON.parse(inputs['radar-watchlist.json'].content);
const result={schemaVersion:1,checkedAt:new Date().toISOString(),engine:'Google',source:'ordinary Chromium Google search navigation on GitHub Actions ubuntu-latest',inputHashes:Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,v.sha256])),watchlistSources:watch.sources.length,queries:[],stopReason:null};
await writeFile('research-output/input-snapshot.json',JSON.stringify(inputs,null,2));
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
try{
 outer:for(const pilot of plan.projects.filter(p=>p.projectId!=='rabdan-rabdan-avenue-meydan')){
 const current=feed.launches.find(x=>x.id===pilot.projectId);
 if(!current || current.published!==true){result.stopReason='Pilot missing or not published: '+pilot.projectId;break;}
 if((current.phase||null)!==(pilot.phase||null)){result.stopReason='Live phase changed; query plan requires review: '+pilot.projectId;break;}
 for(const item of pilot.queries){
 let query=item.query;if(current.id==='signature-w-residences-jlt-phase-3'&&!/phase\s*3/i.test(query))query+=' Phase 3';
 const row={projectId:pilot.projectId,phase:current.phase||null,number:item.number,language:item.language,query,engine:'Google',executedAt:new Date().toISOString(),status:'attempted',resultUrls:[],snippets:[]};
 result.queries.push(row);
 const requestedUrl='https://www.google.com/search?'+new URLSearchParams({q:query,hl:item.language});
 row.requestedUrl=requestedUrl;
 let response;
 try{response=await page.goto(requestedUrl,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(1500);}
 catch(e){row.status='navigation-error';row.accessLimit=String(e);result.stopReason='Google navigation failed';break outer;}
 let body=await page.locator('body').innerText();
 // Non-binding cookie choices only. Never interact with challenge or CAPTCHA.
 if(/consent.google.com/.test(page.url())||/Before you continue to Google/.test(body)){
   const reject=page.getByRole('button',{name:/Reject all|رفض الكل|Отклонить все/i});
   if(await reject.count()){await reject.first().click();await page.waitForLoadState('domcontentloaded');await page.waitForTimeout(1000);body=await page.locator('body').innerText();}
 }
 row.finalUrl=page.url();row.httpStatus=response?.status();
 const serial=String(result.queries.length).padStart(3,'0');
 await writeFile('research-output/'+serial+'.html',await page.content());
 await page.screenshot({path:'research-output/'+serial+'.png',fullPage:true});
 const challenge=/\/sorry\b/.test(page.url())||/unusual traffic|our systems have detected|not a robot|reCAPTCHA|captcha|automated queries|подозрительный трафик|غير معتاد/i.test(body)||row.httpStatus===429;
 if(challenge){row.status='blocked';row.accessLimit='Google challenge / unusual traffic / rate-limit; stopped without solving or evasion';result.stopReason=row.accessLimit;row.visibleText=body.slice(0,12000);break outer;}
 if(!/google\.[^/]+\/search/.test(page.url())){row.status='not-serp';row.accessLimit='Navigation did not produce Google search results';result.stopReason=row.accessLimit;row.visibleText=body.slice(0,12000);break outer;}
 const entries=await page.locator('a:has(h3)').evaluateAll(as=>as.map(a=>({url:a.href,title:a.innerText})).filter(x=>/^https?:/.test(x.url)&&!/^https:\/\/(?:[^/]+\.)?google\./.test(x.url)));
 row.resultUrls=[...new Set(entries.map(x=>x.url))];row.snippets=entries;row.visibleText=body.slice(0,40000);
 if(!entries.length){row.status='unverified-serp';row.accessLimit='No organic h3 result links verified; not counted';result.stopReason=row.accessLimit;break outer;}
 row.status='completed';console.log('GOOGLE_QUERY '+JSON.stringify({projectId:row.projectId,number:row.number,language:row.language,query:row.query,results:entries.length}));
 await writeFile('research-output/google-query-journal.json',JSON.stringify(result,null,2));
 await page.waitForTimeout(5000);
 }
 }
}finally{
 await browser.close();
 result.successfulGoogleQueries=result.queries.filter(x=>x.status==='completed').length;
 result.byProject=Object.fromEntries(plan.projects.map(p=>[p.projectId,result.queries.filter(x=>x.projectId===p.projectId&&x.status==='completed').length]));
 result.complete=plan.projects.every(p=>result.byProject[p.projectId]>=40);
 await writeFile('research-output/google-query-journal.json',JSON.stringify(result,null,2));
 console.log('GOOGLE_RESEARCH_SUMMARY '+JSON.stringify(result));
}