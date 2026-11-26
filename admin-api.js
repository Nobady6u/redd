"use strict";
const crypto=require("crypto");
function eq(a,b){try{return crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));}catch{return false;}}
function json(res,s,x){res.writeHead(s,{"Content-Type":"application/json; charset=utf-8"});res.end(JSON.stringify(x));}
async function body(req){let b="";for await(const d of req){b+=d;if(b.length>1e6)throw Error("size");}return JSON.parse(b||"{}");}
module.exports=async function(req,res,db){if(!req.url.startsWith("/api/admin/"))return false;const key=process.env.ADMIN_KEY;if(!key||!eq(req.headers["x-admin-key"]||"",key)){json(res,401,{error:"Unauthorized"});return true;}if(!db){json(res,503,{error:"Database unavailable"});return true;}const u=new URL(req.url,"http://local");try{
if(req.method==="GET"&&u.pathname==="/api/admin/businesses"){const q=await db.query("SELECT id,name,city,status,contact_phone,whatsapp_phone_number_id,created_at FROM businesses ORDER BY created_at DESC");json(res,200,q.rows);}
else if(req.method==="POST"&&u.pathname==="/api/admin/businesses"){const x=await body(req);const q=await db.query("INSERT INTO businesses(name,city,contact_phone,whatsapp_phone_number_id,status) VALUES($1,$2,$3,$4,$5) RETURNING *",[x.name,x.city||null,x.contact_phone||null,x.phone_number_id||null,x.status||"pending"]);json(res,201,q.rows[0]);}
else if(req.method==="PATCH"&&/^\/api\/admin\/businesses\/\d+$/.test(u.pathname)){const id=u.pathname.split("/").pop(),x=await body(req);const q=await db.query("UPDATE businesses SET name=COALESCE($2,name),city=COALESCE($3,city),contact_phone=COALESCE($4,contact_phone),whatsapp_phone_number_id=COALESCE($5,whatsapp_phone_number_id),status=COALESCE($6,status) WHERE id=$1 RETURNING *",[id,x.name??null,x.city??null,x.contact_phone??null,x.phone_number_id??null,x.status??null]);json(res,q.rowCount?200:404,q.rows[0]||{});}
else if(req.method==="GET"&&u.pathname==="/api/admin/messages"){const q=await db.query("SELECT id,phone_number_id,sender,body,received_at FROM message_events ORDER BY received_at DESC LIMIT 200");json(res,200,q.rows);}
else if(req.method==="GET"&&u.pathname==="/api/admin/stats"){const b=await db.query("SELECT status,count(*)::int AS count FROM businesses GROUP BY status"),m=await db.query("SELECT count(*)::int AS total,count(*) FILTER(WHERE received_at::date=CURRENT_DATE)::int AS today FROM message_events");json(res,200,{businesses:b.rows,messages:m.rows[0]});}
else json(res,404,{error:"Not found"});
}catch(e){console.error("Admin API:",e.message);json(res,500,{error:"Server error"});}return true;};
