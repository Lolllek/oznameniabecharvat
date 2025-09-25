import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import webpush from "web-push";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// --- ENV proměnné ---
import dotenv from "dotenv";
dotenv.config();

const {
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT,
  ADMIN_TOKEN,
  CRON_SECRET,
  PORT = 3000,
} = process.env;

// --- WebPush nastavení ---
webpush.setVapidDetails(
  VAPID_SUBJECT || "mailto:test@example.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// --- Jednoduché „úložiště“ odběratelů v JSON (pro testy) ---
const SUBS_FILE = path.join(__dirname, "data", "subs.json");
if (!fs.existsSync(path.dirname(SUBS_FILE))) {
  fs.mkdirSync(path.dirname(SUBS_FILE), { recursive: true });
}
if (!fs.existsSync(SUBS_FILE)) fs.writeFileSync(SUBS_FILE, "[]");

function loadSubs() {
  return JSON.parse(fs.readFileSync(SUBS_FILE, "utf8"));
}
function saveSubs(subs) {
  fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2));
}

// --- Admin ochrana ---
function requireAdmin(req, res, next) {
  if (!ADMIN_TOKEN)
    return res.status(500).json({ error: "ADMIN_TOKEN není nastaven" });
  const auth = req.headers["authorization"] || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== ADMIN_TOKEN)
    return res.status(401).json({ error: "Unauthorized" });
  next();
}

// --- API ---
app.get("/vapidPublicKey", (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

app.post("/subscribe", (req, res) => {
  const subs = loadSubs();
  subs.push(req.body);
  saveSubs(subs);
  res.json({ ok: true });
});

app.post("/unsubscribe", (req, res) => {
  const { endpoint } = req.body;
  let subs = loadSubs();
  subs = subs.filter((s) => s.endpoint !== endpoint);
  saveSubs(subs);
  res.json({ ok: true });
});

// --- Odesílání notifikací ---
async function notifyAll({ title, body, url, icon }) {
  const subs = loadSubs();
  let sent = 0;
  let dropped = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        sub,
        JSON.stringify({ title, body, url, icon })
      );
      sent++;
    } catch (e) {
      dropped++;
    }
  }
  return { sent, dropped };
}

app.post("/broadcast", async (req, res) => {
  try {
    const { title, body, url, icon } = req.body || {};
    const stats = await notifyAll({
      title: title || "Zpráva",
      body: body || "",
      url: url || "/",
      icon,
    });
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- ADMIN endpointy ---
app.get("/admin/ping", requireAdmin, (req, res) => res.json({ ok: true }));

app.get("/admin/subscriptions", requireAdmin, (req, res) => {
  const subs = loadSubs();
  res.json({ count: subs.length, items: subs });
});

app.get("/admin/state", requireAdmin, (req, res) => {
  // placeholder – tady by mohla být logika pro YouTube poslední video
  res.json({ lastVideoId: null });
});

app.post("/admin/set-state", requireAdmin, (req, res) => {
  // placeholder – tady by se ukládal stav
  res.json({ ok: true });
});

app.post("/admin/notify", requireAdmin, async (req, res) => {
  try {
    const { title = "Test", body = "Zpráva", url = "/", icon } = req.body || {};
    const stats = await notifyAll({ title, body, url, icon });
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Start serveru ---
app.listen(PORT, () => {
  console.log(`Server běží na http://localhost:${PORT}`);
});
