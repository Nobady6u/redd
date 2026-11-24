const 【entity-express¦canonical_name=express】 = require(' 【entity-express¦canonical_name=express】');
const 【entity-axios¦canonical_name=axios】 = require(' 【entity-axios¦canonical_name=axios】');
const app = 【entity-express¦canonical_name=express】();
app.use(【entity-express¦canonical_name=express】.json());

const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = "1540718495781302";
const VERIFY_TOKEN = "radd123";

function raddReply(text) {
  const t = text.toLowerCase();
  if (t.includes("هلا") || t.includes("سلام")) return "هلا، أبشر! أنا رَدّ، مساعد عيادة هيا في الرياض 🦷 تبي تحجز تنظيف، حشوة، ولا تبييض؟";
  if (t.includes("تنظيف") || t.includes("سعر")) return "تنظيف 100 ريال - بنشيل الجير والتصبغات وبترجع أسنانك تلمع ✨ تبي أحجز لك أقرب موعد؟";
  if (t.includes("حشوة")) return "الحشوة 150 ريال، مع ضمان، وبدون ألم. تبي أحجز لك؟";
  if (t.includes("تبييض")) return "التبييض 400 ريال، نتيجة من أول جلسة. تبي أحجز لك؟";
  if (t.includes("موقع") || t.includes("وين")) return "موقعنا: الرياض، حي النرجس، طريق الملك فهد. دوامنا يومياً 9 لـ 10، ما عدا الجمعة. تبي أرسل لك اللوكيشن؟";
  return "أبشر، تبي تحجز تنظيف 100، حشوة 150، ولا تبييض 400؟";
}

app.get("/webhook", (req, res) => {
  if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === VERIFY_TOKEN) {
    return res.status(200).send(req.query["hub.challenge"]);
  }
  return res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  try {
    const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (msg && msg.text) {
      const reply = raddReply(msg.text.body);
      await axios.post(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
        messaging_product: " whatsapp",
        to: msg.from,
        text: { body: reply }
      }, { headers: { Authorization: `Bearer ${TOKEN}` } });
    }
    res.sendStatus(200);
  } catch (e) { console.log(e.message); res.sendStatus(200); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("RADD شغال"));
