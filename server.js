const http = require("http");
const https = require("https");

const TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = "1540718495781302";
const VERIFY_TOKEN = "radd123";

function raddReply(text) {
  const t = text.toLowerCase();
  if (t.includes("هلا") || t.includes("سلام")) {
    return "هلا، أبشر! أنا رَدّ، مساعد عيادة هيا في الرياض. تبي تحجز تنظيف، حشوة، ولا تبييض؟";
  }
  if (t.includes("تنظيف") || t.includes("سعر")) {
    return "تنظيف 100 ريال - بنشيل الجير والتصبغات وبترجع أسنانك تلمع. تبي أحجز لك أقرب موعد؟";
  }
  if (t.includes("حشوة")) {
    return "الحشوة 150 ريال، مع ضمان، وبدون ألم. تبي أحجز لك؟";
  }
  if (t.includes("تبييض")) {
    return "التبييض 400 ريال، نتيجة من أول جلسة. تبي أحجز لك؟";
  }
  if (t.includes("موقع") || t.includes("وين")) {
    return "موقعنا: الرياض، حي النرجس، طريق الملك فهد. دوامنا يوميا 9 لـ 10، ما عدا الجمعة. تبي أرسل لك اللوكيشن؟";
  }
  return "أبشر، تبي تحجز تنظيف 100، حشوة 150، ولا تبييض 400؟";
}

function sendWhatsApp(to, body) {
  const data = JSON.stringify({
    messaging_product: "whatsapp",
    to: to,
    text: { body: body }
  });
  const options = {
    hostname: "graph.facebook.com",
    path: "/v21.0/" + PHONE_NUMBER_ID + "/messages",
    method: "POST",
    headers: {
      "Authorization": "Bearer " + TOKEN,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data)
    }
  };
  const req = https.request(options, (res) => {
    res.on("data", () => {});
  });
  req.on("error", (e) => console.log(e.message));
  req.write(data);
  req.end();
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (req.method === "GET" && url.pathname === "/webhook") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end(challenge);
      return;
    }
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  if (req.method === "POST" && url.pathname === "/webhook") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const json = JSON.parse(body);
        const msg = json.entry[0].changes[0].value.messages[0];
        if (msg && msg.text) {
          const reply = raddReply(msg.text.body);
          sendWhatsApp(msg.from, reply);
        }
      } catch (e) {
        console.log(e.message);
      }
      res.writeHead(200);
      res.end("OK");
    });
    return;
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("RADD شغال");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("RADD شغال على " + PORT));
