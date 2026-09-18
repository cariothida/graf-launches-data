import test from 'node:test';
import assert from 'node:assert/strict';
import {slot, validate, due, containsBody} from './whatsapp-queue-policy.mjs';
import {sharp,checkImage,normalizePhoto} from './whatsapp-queue-image.mjs';
const post = {projectId:'new-launch',eventKey:'new-launch:release-1',kind:'hot-launch',language:'en',status:'confirmed',approved:true,materialUpdate:'New EOI opened',sources:['https://example.com/announcement'],siteUrl:'https://graf.ae/launches/new-launch/',body:'NEW LAUNCH: Genuine new launch information. https://graf.ae/launches/new-launch/'};
const q = () => ({version:1,briefingDate:'2026-09-12',posts:[structuredClone(post)]});
test('all daily posts target 08 Dubai',()=>{
 assert.equal(slot('2026-09-12',0,1).toISOString(),'2026-09-12T04:00:00.000Z');
 assert.deepEqual([0,1,2].map(i=>slot('2026-09-12',i,3).getUTCHours()),[4,4,4]);
 assert.deepEqual([0,1,2,3,4].map(i=>slot('2026-09-12',i,5).getUTCHours()),[4,4,4,4,4]);
});
test('no early sends, no sent repeats, no stale queues',()=>{
 assert.equal(due(q(),{posts:{}},new Date('2026-09-12T03:59Z')),null);
 assert.equal(due(q(),{posts:{}},new Date('2026-09-12T04:00Z')).eventKey,post.eventKey);
 assert.equal(due(q(),{posts:{[post.eventKey]:{state:'sent'}}},new Date('2026-09-12T04:01Z')),null);
 assert.throws(()=>due(q(),{posts:{}},new Date('2026-09-13T04:00Z')));
});
test('reject catalogue links, external links and duplicate projects',()=>{
 const a=q();a.posts[0].siteUrl='https://graf.ae/fakhruddin/treppan-vision/';assert.throws(()=>validate(a));
 const b=q();b.posts[0].body+=' https://developer.com/';assert.throws(()=>validate(b));
 const c=q();c.posts.push({...post,eventKey:'new-launch:release-2'});assert.throws(()=>validate(c));
});
test('reject rumour and unverified image, require broker hedges',()=>{
 for(const patch of [{status:'rumour'},{imageUrl:'https://graf.ae/image.jpg'},{status:'broker-intelligence'}]){const a=q();Object.assign(a.posts[0],patch);assert.throws(()=>validate(a));}
});
test('history proof requires exact full body, can reconcile pending state',()=>{
 assert.ok(containsBody({messages:[{text:{body:post.body}}]},post.body));
 assert.equal(containsBody({messages:[{text:{body:post.body+' altered'}}]},post.body),false);
 assert.equal(due(q(),{posts:{[post.eventKey]:{state:'pending'}}},new Date('2026-09-12T04:01Z')).eventKey,post.eventKey);
});
test('morning batch drains all unsent posts once; late explicit slots rejected',()=>{
 const a=q();
 for(let i=2;i<=5;i++)a.posts.push({...post,projectId:'launch-'+i,eventKey:'launch-'+i+':initial'});
 const l={posts:{[post.eventKey]:{state:'sent'}}}, sent=[];
 assert.equal(due(a,l,new Date('2026-09-12T03:59Z')),null);
 let p;
 while((p=due(a,l,new Date('2026-09-12T04:00Z')))){sent.push(p.projectId);l.posts[p.eventKey]={state:'sent'};}
 assert.deepEqual(sent,['launch-2','launch-3','launch-4','launch-5']);
 assert.equal(due(a,l,new Date('2026-09-12T16:00Z')),null);
 for(const bad of ['2026-09-13T08:00:00+04:00','2026-09-12T07:00:00+04:00','2026-09-12T20:00:00+04:00','nonsense']){a.posts[1].scheduledAt=bad;a.posts[1].scheduleReason='Morning batch';assert.throws(()=>validate(a));}
 a.posts[1].scheduledAt='2026-09-12T08:00:00+04:00';assert.doesNotThrow(()=>validate(a));
});
test('transparent input becomes fixed opaque JPEG; invalid assets rejected',async()=>{
 const transparent=await sharp({create:{width:1400,height:1000,channels:4,background:{r:255,g:0,b:0,alpha:0}}}).png().toBuffer();
 const out=await normalizePhoto(transparent);const qa=await checkImage(out);
 assert.equal(qa.width,1200);assert.equal(qa.height,900);assert.equal(qa.sha256.length,64);
 const pixel=await sharp(out).raw().toBuffer();assert.ok(pixel[0]>230 && pixel[1]>230 && pixel[2]>220);
 await assert.rejects(checkImage(transparent));await assert.rejects(checkImage(Buffer.from('<html>error</html>')));
 await assert.rejects(checkImage(Buffer.alloc(2000001)));
});
