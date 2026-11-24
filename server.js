const http = require("http");
const https = require("https");

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = "1540718495781302";
const VERIFY_TOKEN = "radd123";
const PORT = process.env.PORT || 3000;

function raddReply(text) {
  const t = String(text || "").toLowerCase();

  if (t.includes("هلا") || t.includes("سلام")) {
    return "هلا والله وغلا! حياك الله في عيادة هيا في الرياض 🦷 كيف أقدر أخدمك؟";
  }
  if (t.includes("تنظيف") || t.includes("سعر")) {
    return "تنظيف الأسنان عندنا بـ 100 ريال.";
  }
  if (t.includes("حشوة")) {
    return "الحشوة بـ 150 ريال.";
  }
  if (t.includes("تبييض")) {
    return "تبييض الأسنان بـ 400 ريال.";
  }
  if (t.includes("موقع") || t.includes("وين")) {
    return "موقعنا في الرياض، حي النرجس، طريق الملك فهد. الدوام من 9 الصبح لـ 10 الليل، ما عدا يوم الجمعة.";
  }
  return "أبشر، تبي تحجز تنظيف 100، حشوة 150، ولا تبييض 400؟";
}

function sendWhatsAppMessage(to, body) {
  const payload = JSON.stringify({
    messaging_product: "whatsapp",
    to: to,
    type: "text",
    text: { body: body }
  });

  const options = {
    hostname: "graph.facebook.com",
    path: "/v21.0/" + PHONE_NUMBER_ID + "/messages",
    method: "POST",
    headers: {
      "Authorization": "Bearer " + WHATSAPP_TOKEN,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload)
    }
  };

  const req = https.request(options, (res) => {
    let data = "";
    res.on("data", (chunk) => { data += chunk; });
    res.on("end", () => {
      console.log("WhatsApp API response:", res.statusCode, data);
    });
  });

  req.on("error", (err) => {
    console.error("WhatsApp API error:", err.message);
  });

  req.write(payload);
  req.end();
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));

  if (req.method === "GET" && url.pathname === "/webhook") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end(challenge);
    } else {
      res.writeHead(403, { "Content-Type": "text/plain" });
      res.end("Forbidden");
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/webhook") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("EVENT_RECEIVED");

      try {
        const data = JSON.parse(body);
        const entries = data.entry || [];
        for (const entry of entries) {
          for (const change of entry.changes || []) {
            const messages = (change.value && change.value.messages) || [];
            for (const msg of messages) {
              if (msg.type === "text" && msg.text && msg.text.body) {
                const reply = raddReply(msg.text.body);
                sendWhatsAppMessage(msg.from, reply);
              }
            }
          }
        }
      } catch (err) {
        console.error("Webhook parse error:", err.message);
      }
    });
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Radd server is running");
});

server.listen(PORT, () => {
  console.log("Server listening on port " + PORT);
});
