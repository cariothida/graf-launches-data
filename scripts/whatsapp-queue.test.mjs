import test from 'node:test';
import assert from 'node:assert/strict';
import {slot, validate, due, containsBody} from './whatsapp-queue-policy.mjs';
import {sharp,checkImage,normalizePhoto} from './whatsapp-queue-image.mjs';
const post = {projectId:'new-launch',eventKey:'new-launch:release-1',kind:'hot-launch',language:'en',status:'confirmed',approved:true,materialUpdate:'New EOI opened',sources:['https://example.com/announcement'],siteUrl:'https://graf.ae/launches/new-launch/',body:'NEW LAUNCH: Genuine new launch information. https://graf.ae/launches/new-launch/'};
const q = () => ({version:1,briefingDate:'2026-09-12',posts:[structuredClone(post)]});
test('one post at 08; three evenly spaced; five evenly spaced',()=>{
 assert.equal(slot('2026-09-12',0,1).toISOString(),'2026-09-12T04:00:00.000Z');
 assert.deepEqual([0,1,2].map(i=>slot('2026-09-12',i,3).getUTCHours()),[4,10,16]);
 assert.deepEqual([0,1,2,3,4].map(i=>slot('2026-09-12',i,5).getUTCHours()),[4,7,10,13,16]);
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
test('explicit extra post leaves evening post at 20 Dubai',()=>{
 const a=q(); a.posts.push({...post,projectId:'extra-launch',eventKey:'extra-launch:initial',scheduledAt:'2026-09-12T10:00:00+04:00',scheduleReason:'Alex requested an additional post now'}, {...post,projectId:'evening-launch',eventKey:'evening-launch:initial'});
 const l={posts:{[post.eventKey]:{state:'sent'}}};
 assert.equal(due(a,l,new Date('2026-09-12T05:59Z')),null);
 assert.equal(due(a,l,new Date('2026-09-12T06:00Z')).projectId,'extra-launch');
 l.posts['extra-launch:initial']={state:'sent'};
 assert.equal(due(a,l,new Date('2026-09-12T15:59Z')),null);
 assert.equal(due(a,l,new Date('2026-09-12T16:00Z')).projectId,'evening-launch');
 for(const bad of ['2026-09-13T10:00:00+04:00','2026-09-12T07:00:00+04:00','nonsense']){a.posts[1].scheduledAt=bad;assert.throws(()=>validate(a));}
});
test('transparent input becomes fixed opaque JPEG; invalid assets rejected',async()=>{
 const transparent=await sharp({create:{width:1400,height:1000,channels:4,background:{r:255,g:0,b:0,alpha:0}}}).png().toBuffer();
 const out=await normalizePhoto(transparent);const qa=await checkImage(out);
 assert.equal(qa.width,1200);assert.equal(qa.height,900);assert.equal(qa.sha256.length,64);
 const pixel=await sharp(out).raw().toBuffer();assert.ok(pixel[0]>230 && pixel[1]>230 && pixel[2]>220);
 await assert.rejects(checkImage(transparent));await assert.rejects(checkImage(Buffer.from('<html>error</html>')));
 await assert.rejects(checkImage(Buffer.alloc(2000001)));
});
