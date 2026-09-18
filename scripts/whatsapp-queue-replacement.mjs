import {due} from './whatsapp-queue-policy.mjs';
export function isReplacement(p,e) {
 if(!p.replacement || e?.replacementRequestId===p.replacement.requestId)return false;
 const r=p.replacement;
 if(r.requestId!=='alex-2026-09-18-nine-image-cards'||r.authorizedBy!=='Alex explicit delete-and-republish request'||!e||e.state!=='sent'||e.messageId!==r.originalMessageId||e.body!==p.body||!p.imageRepoPath||p.imageVerified!==true)throw Error('Invalid authorized image replacement');
 return true;
}
export function replacementDue(q,ledger,now=new Date()){
 const copy={...ledger,posts:{...ledger.posts}};
 for(const p of q.posts)if(isReplacement(p,ledger.posts[p.eventKey]))delete copy.posts[p.eventKey];
 return due(q,copy,now);
}
export function archiveReplacement(p,e){
 if(isReplacement(p,e))return {replacementRequestId:p.replacement.requestId,previousPublications:[...(e.previousPublications||[]),{...e,previousPublications:undefined}],replacementReason:'User deleted original and explicitly requested identical caption with approved card'};
 return e?.replacementRequestId?{replacementRequestId:e.replacementRequestId,previousPublications:e.previousPublications,replacementReason:e.replacementReason}:{};
}
