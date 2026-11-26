"use strict";
const crypto=require("crypto");
const attempts=new Map();
const WINDOW_MS=15*60*1000,MAX_FAILURES=10,MAX_BODY_BYTES=1000000;
function eq(a,b){try{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y);}catch{return false;}}
function json(res,status,data){res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});res.end(JSON.stringify(data));}
function clientKey(req){const forwarded=req.headers["x-forwarded-for"];return String(Array.isArray(forwarded)?forwarded[0]:forwarded||req.socket?.remoteAddress||"unknown").split(",")[0].trim().slice(0,100);}
function authAllowed(req,res,key){const ip=clientKey(req),now=Date.now(),entry=attempts.get(ip);if(entry&&entry.until>now&&entry.count>=MAX_FAILURES){json(res,429,{error:"محاولات كثيرة. انتظر 15 دقيقة ثم حاول مجدداً."});return false;}if(!key||!eq(req.headers["x-admin-key"]||"",key)){const next=entry&&entry.until>now?entry:{count:0,until:now+WINDOW_MS};next.count++;attempts.set(ip,next);json(res,401,{error:"Unauthorized"});return false;}attempts.delete(ip);return true;}
async function body(req){let size=0,chunks=[];for await(const d of req){size+=d.length;if(size>MAX_BODY_BYTES){const e=Error("Request body too large");e.status=413;throw e;}chunks.push(d);}try{const value=JSON.parse(Buffer.concat(chunks).toString("utf8")||"{}");if(!value||typeof value!=="object"||Array.isArray(value)){const e=Error("Invalid JSON object");e.status=400;throw e;}return value;}catch(e){if(!e.status)e.status=400;throw e;}}
function validOptional(x,key,max){return x[key]==null||(typeof x[key]==="string"&&x[key].length<=max);}
module.exports=async function(req,res,db){
 if(!req.url.startsWith("/api/admin/"))return false;
 const key=process.env.ADMIN_KEY;
 if(!authAllowed(req,res,key))return true;
 const u=new URL(req.url,"http://local");
 if(req.method==="GET"&&u.pathname==="/api/admin/auth"){json(res,200,{ok:true});return true;}
 if(req.method==="GET"&&u.pathname==="/api/admin/diagnostics"){
  if(!db){json(res,200,{auth:true,databaseConfigured:false,databaseConnected:false,error:"Database pool is not configured"});return true;}
  try{await db.query("SELECT 1");const tables=await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name');const checks={};for(const t of ["businesses","auto_reply_rules","message_events","business_knowledge"]){try{await db.query("SELECT * FROM "+t+" LIMIT 0");checks[t]="OK";}catch{checks[t]="Unavailable";}}json(res,200,{auth:true,databaseConfigured:true,databaseConnected:true,tables:tables.rows.map(x=>x.table_name),checks});}
  catch{json(res,200,{auth:true,databaseConfigured:true,databaseConnected:false,error:"Database connection failed"});}return true;
 }
 if(!db){json(res,503,{error:"Database unavailable"});return true;}
 try{
  if(req.method==="GET"&&u.pathname==="/api/admin/businesses"){const q=await db.query("SELECT id,name,city,status,contact_phone,whatsapp_phone_number_id,created_at FROM businesses ORDER BY created_at DESC");json(res,200,q.rows);}
  else if(req.method==="POST"&&u.pathname==="/api/admin/businesses"){
   const x=await body(req),name=typeof x.name==="string"?x.name.trim():"",status=x.status||"pending";
   if(!name||name.length>120){json(res,400,{error:"اسم النشاط مطلوب وبحد أقصى 120 حرفًا"});return true;}
   if(!["pending","active","paused"].includes(status)||!validOptional(x,"city",100)||!validOptional(x,"contact_phone",40)||!validOptional(x,"phone_number_id",100)){json(res,400,{error:"بيانات النشاط غير صالحة أو تتجاوز الحد المسموح"});return true;}
   const q=await db.query("INSERT INTO businesses(name,city,contact_phone,whatsapp_phone_number_id,status) VALUES($1,$2,$3,$4,$5) RETURNING *",[name,x.city||null,x.contact_phone||null,x.phone_number_id||null,status]);json(res,201,q.rows[0]);
  }
  else if(req.method==="PATCH"&&/^\/api\/admin\/businesses\/\d+$/.test(u.pathname)){
   const id=u.pathname.split("/").pop(),x=await body(req);
   if(x.status!==undefined&&!["pending","active","paused"].includes(x.status)){json(res,400,{error:"حالة النشاط غير صالحة"});return true;}
   if(x.name!==undefined&&(typeof x.name!=="string"||!x.name.trim()||x.name.length>120)){json(res,400,{error:"اسم النشاط غير صالح"});return true;}
   if(!validOptional(x,"city",100)||!validOptional(x,"contact_phone",40)||!validOptional(x,"phone_number_id",100)){json(res,400,{error:"بيانات النشاط غير صالحة أو تتجاوز الحد المسموح"});return true;}
   const q=await db.query("UPDATE businesses SET name=COALESCE($2,name),city=COALESCE($3,city),contact_phone=COALESCE($4,contact_phone),whatsapp_phone_number_id=COALESCE($5,whatsapp_phone_number_id),status=COALESCE($6,status) WHERE id=$1 RETURNING *",[id,x.name?.trim()??null,x.city??null,x.contact_phone??null,x.phone_number_id??null,x.status??null]);json(res,q.rowCount?200:404,q.rows[0]||{});
  }
  else if(req.method==="GET"&&u.pathname==="/api/admin/knowledge"){const q=await db.query("SELECT b.id,b.name,b.whatsapp_phone_number_id,k.content,k.updated_at FROM businesses b LEFT JOIN business_knowledge k ON k.business_id=b.id ORDER BY b.created_at DESC");json(res,200,q.rows);}
  else if(req.method==="POST"&&u.pathname==="/api/admin/knowledge"){
   const x=await body(req);if(typeof x.phone_number_id!=="string"||!x.phone_number_id.trim()||x.phone_number_id.length>100||typeof x.content!=="string"||x.content.length>30000){json(res,400,{error:"رقم واتساب مطلوب، ومحتوى قاعدة المعرفة يجب ألا يتجاوز 30000 حرف"});return true;}
   const b=await db.query("SELECT id FROM businesses WHERE whatsapp_phone_number_id=$1",[x.phone_number_id]);if(!b.rowCount){json(res,404,{error:"Business not found for this Phone ID"});return true;}
   const q=await db.query("INSERT INTO business_knowledge(business_id,content) VALUES($1,$2) ON CONFLICT(business_id) DO UPDATE SET content=EXCLUDED.content,updated_at=now() RETURNING *",[b.rows[0].id,x.content]);json(res,200,q.rows[0]);
  }
  else if(req.method==="GET"&&u.pathname==="/api/admin/rules"){const q=await db.query("SELECT id,phone_number_id,reply_text,enabled,priority FROM auto_reply_rules ORDER BY priority DESC");json(res,200,q.rows);}
  else if(req.method==="POST"&&u.pathname==="/api/admin/rules"){
   const x=await body(req);if(typeof x.phone_number_id!=="string"||!x.phone_number_id.trim()||x.phone_number_id.length>100||typeof x.reply_text!=="string"||!x.reply_text.trim()||x.reply_text.length>1000){json(res,400,{error:"رقم واتساب ونص رد صالح (حتى 1000 حرف) مطلوبان"});return true;}
   if(x.priority!==undefined&&(!Number.isInteger(Number(x.priority))||Math.abs(Number(x.priority))>1000)){json(res,400,{error:"الأولوية يجب أن تكون رقمًا صحيحًا بين -1000 و1000"});return true;}
   const q=await db.query("INSERT INTO auto_reply_rules(phone_number_id,reply_text,enabled,priority) VALUES($1,$2,$3,$4) ON CONFLICT(phone_number_id) DO UPDATE SET reply_text=EXCLUDED.reply_text,enabled=EXCLUDED.enabled,priority=EXCLUDED.priority RETURNING *",[x.phone_number_id,x.reply_text,!!x.enabled,Number(x.priority||0)]);json(res,201,q.rows[0]);
  }
  else if(req.method==="GET"&&u.pathname==="/api/admin/messages"){const q=await db.query("SELECT id,phone_number_id,sender,body,reply_body,reply_status,reply_error,received_at FROM message_events ORDER BY received_at DESC LIMIT 200");json(res,200,q.rows);}
  else if(req.method==="GET"&&u.pathname==="/api/admin/stats"){const b=await db.query("SELECT status,count(*)::int AS count FROM businesses GROUP BY status"),m=await db.query("SELECT count(*)::int AS total,count(*) FILTER(WHERE received_at::date=CURRENT_DATE)::int AS today FROM message_events");json(res,200,{businesses:b.rows,messages:m.rows[0]});}
  else json(res,404,{error:"Not found"});
 }catch(e){if(e.status){json(res,e.status,{error:e.status===413?"حجم الطلب أكبر من المسموح.": "صيغة البيانات غير صحيحة."});return true;}console.error("Admin API:",e.message);json(res,500,{error:"Server error"});}
 return true;
};
