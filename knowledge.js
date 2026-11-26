"use strict";
function knowledgeReply(question,content){
 if(!content||typeof question!=="string")return null;
 const norm=s=>s.toLowerCase()
  .replace(/[\u064B-\u065F\u0670]/g,"")
  .replace(/\u0640/g,"")
  .replace(/[.,،؛!?؟:()[\]{}\-_/]/g," ")
  .replace(/\\/g," ")
  .replace(/\s+/g," ").trim();
 const stop=new Set(["من","في","على","الى","إلى","عن","مع","هذا","هذه","ذلك","ما","ماذا","هل","كم","كيف","متى","وين","انا","أنت","هو","هي","و","أو","the","and","or","is","are","to","of"]);
 const words=s=>norm(s).split(" ").filter(x=>x.length>1&&!stop.has(x));
 const q=[...new Set(words(question))];if(q.length<2)return null;
 const lines=content.split(/\r?\n+/).map(x=>x.trim()).filter(Boolean);
 const entries=[];let pending=null;
 for(const line of lines){
  const qm=line.match(/^(?:سؤال|السؤال|q)\s*[:：-]\s*(.+)$/i);
  const am=line.match(/^(?:جواب|الإجابة|الاجابة|answer|a)\s*[:：-]\s*(.+)$/i);
  if(qm){if(pending?.answer)entries.push(pending);pending={question:qm[1],answer:null};}
  else if(am&&pending){pending.answer=am[1];entries.push(pending);pending=null;}
 }
 if(!entries.length)return null;
 const ranked=entries.map(e=>{const w=[...new Set(words(e.question))];const hits=q.filter(t=>w.includes(t)).length;return {answer:e.answer,coverage:hits/q.length,precision:hits/Math.max(1,w.length),hits};})
  .filter(x=>x.hits>=2&&x.coverage>=0.6&&x.precision>=0.45)
  .sort((a,b)=>b.coverage-a.coverage||b.precision-a.precision);
 if(!ranked.length)return null;
 if(ranked.length>1&&ranked[0].coverage-ranked[1].coverage<0.15&&ranked[0].precision-ranked[1].precision<0.1)return null;
 return ranked[0].answer;
}
module.exports={knowledgeReply};
