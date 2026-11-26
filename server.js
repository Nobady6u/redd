"use strict";
const http=require("http"),https=require("https"),crypto=require("crypto"),fs=require("fs"),path=require("path");
const adminApi=require("./admin-api");
const PORT=process.env.PORT||3000,TOKEN=process.env.WHATSAPP_TOKEN,PHONE_ID=process.env.PHONE_NUMBER_ID,VERIFY=process.env.WEBHOOK_VERIFY_TOKEN,APP_SECRET=process.env.META_APP_SECRET;
let db=null;try{if(process.env.DATABASE_URL){const{Pool}=require("pg");db=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL==="true"?{rejectUnauthorized:false}:undefined});}}catch(e){console.error("DB init error",e.message);}
const fallback="أبشر، بشيك مع الإدارة وبرد عليك. 🙏";
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

function send(to,body,senderPhoneId){if(!TOKEN||!senderPhoneId)return Promise.reject(Error("WhatsApp config missing"));const p=JSON.stringify({messaging_product:"whatsapp",to,type:"text",text:{body}});return new Promise((resolve,reject)=>{const r=https.request({hostname:"graph.facebook.com",path:"/"+(process.env.GRAPH_API_VERSION||"v26.0")+"/"+senderPhoneId+"/messages",method:"POST",headers:{Authorization:"Bearer "+TOKEN,"Content-Type":"application/json","Content-Length":Buffer.byteLength(p)}},res=>{let d="";res.on("data",x=>d+=x);res.on("end",()=>res.statusCode>=200&&res.statusCode<300?resolve(d):reject(Error("Meta API "+res.statusCode)));});r.on("error",reject);r.write(p);r.end();});}
function equal(a,b){try{return crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));}catch{return false;}}
function serve(req,res){const u=new URL(req.url,"http://localhost");
if(req.method==="GET"&&u.pathname==="/"){try{res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});res.end(fs.readFileSync(path.join(__dirname,"public","index.html")));}catch{res.writeHead(404);res.end("Page missing");}return;}
if(req.method==="GET"&&u.pathname==="/admin"){try{res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});res.end(fs.readFileSync(path.join(__dirname,"public","admin.html")));}catch{res.writeHead(404);res.end("Admin page missing");}return;}
if(req.method==="GET"&&u.pathname==="/admin-debug"){try{res.writeHead(200,{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"});res.end(fs.readFileSync(path.join(__dirname,"public","admin-debug.html")));}catch{res.writeHead(404);res.end("Debug page missing");}return;}
if(u.pathname.startsWith("/api/admin/")){adminApi(req,res,db);return;}
if(req.method==="GET"&&u.pathname==="/health"){const base={status:"ok",databaseConfigured:!!db,whatsappConfigured:!!TOKEN&&!!PHONE_ID};if(!db){res.writeHead(200,{"Content-Type":"application/json","Cache-Control":"no-store"});res.end(JSON.stringify({...base,databaseConnected:false}));return;}db.query("SELECT 1").then(()=>{res.writeHead(200,{"Content-Type":"application/json","Cache-Control":"no-store"});res.end(JSON.stringify({...base,databaseConnected:true}));}).catch(e=>{console.error("Health DB check:",e.message);res.writeHead(503,{"Content-Type":"application/json","Cache-Control":"no-store"});res.end(JSON.stringify({...base,databaseConnected:false,error:"Database connection failed"}));});return;}
if(req.method==="GET"&&u.pathname==="/webhook"){if(u.searchParams.get("hub.mode")==="subscribe"&&VERIFY&&u.searchParams.get("hub.verify_token")===VERIFY){res.writeHead(200);res.end(u.searchParams.get("hub.challenge"));}else{res.writeHead(403);res.end("Forbidden");}return;}
if(req.method==="POST"&&u.pathname==="/webhook"){let body="",tooLarge=false;req.on("data",d=>{body+=d;if(body.length>1e6){tooLarge=true;res.writeHead(413);res.end("Payload too large");req.destroy();}});req.on("end",async()=>{if(tooLarge)return;if(!APP_SECRET&&process.env.NODE_ENV==="production"){res.writeHead(503);res.end("Webhook signature verification unavailable");return;}if(APP_SECRET){const sig=req.headers["x-hub-signature-256"]||"",expected="sha256="+crypto.createHmac("sha256",APP_SECRET).update(body).digest("hex");if(!equal(sig,expected)){res.writeHead(401);res.end("Invalid signature");return;}}let payload;try{payload=JSON.parse(body);}catch{res.writeHead(400);res.end("Invalid JSON");return;}res.writeHead(200);res.end("EVENT_RECEIVED");try{for(const ent of payload.entry||[])for(const ch of ent.changes||[]){const val=ch.value||{};for(const m of val.messages||[]){if(m.type!=="text"||!m.text?.body||!db)continue;const ph=val.metadata?.phone_number_id;if(!ph)continue;const ins=await db.query("INSERT INTO message_events(whatsapp_message_id,sender,body,phone_number_id) VALUES($1,$2,$3,$4) ON CONFLICT(whatsapp_message_id) DO NOTHING RETURNING id",[m.id,m.from,m.text.body,ph]);if(!ins.rowCount)continue;const active=await db.query("SELECT b.id,b.name,r.reply_text,k.content FROM businesses b LEFT JOIN auto_reply_rules r ON r.phone_number_id=b.whatsapp_phone_number_id AND r.enabled=true LEFT JOIN business_knowledge k ON k.business_id=b.id WHERE b.whatsapp_phone_number_id=$1 AND b.status='active' ORDER BY r.priority DESC LIMIT 1",[ph]);if(!active.rowCount){console.log("Stored message; business inactive/unconfigured",ph);continue;}await db.query("UPDATE message_events SET business_id=$1 WHERE whatsapp_message_id=$2",[active.rows[0].id,m.id]);const answer=knowledgeReply(m.text.body,active.rows[0].content)||active.rows[0].reply_text||fallback;try{await send(m.from,answer,ph);await db.query("UPDATE message_events SET reply_body=$1,reply_status=$2,replied_at=now() WHERE whatsapp_message_id=$3",[answer,"sent",m.id]);}catch(e){await db.query("UPDATE message_events SET reply_body=$1,reply_status=$2,reply_error=$3 WHERE whatsapp_message_id=$4",[answer,"failed",e.message,m.id]).catch(()=>{});console.error("Send error",e.message);}}}}catch(e){console.error("Webhook error",e.message);}});return;}
res.writeHead(404);res.end("Not found");}
if(db){db.query(fs.readFileSync(path.join(__dirname,"db","schema.sql"),"utf8")).then(()=>console.log("Database schema checked")).catch(e=>console.error("Schema migration failed",e.message));}
http.createServer(serve).listen(PORT,()=>console.log("RADD listening on "+PORT));
