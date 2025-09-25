# YouTube WebPush PRO (Supabase + webhook + crony)

Kompletní řešení bez mobilní appky. Uživatel klikne na webu a dostává notifikace při novém videu.

## Hlavní vlastnosti
- ✅ Web Push (VAPID) – funguje i se zavřeným prohlížečem
- ✅ Service Worker + elegantní UI (subscribe/unsubscribe)
- ✅ Supabase databáze (subscriptions + state)
- ✅ Dvě strategie doručení:
  1. **Cron polling** YouTube API (`/cron/check`) – spouštěj přes Vercel/Render Cron
  2. **Webhook (PubSubHubbub)** – YouTube pushne změnu na `/webhook/youtube` (vyžaduje registraci callbacku)
- ✅ Testovací endpoint `/broadcast`

## Nasazení (rychlá varianta – Render)
1. V Supabase vytvoř projekt a spusti SQL ze souboru `sql/schema.sql`.
2. V Renderu vytvoř Web Service z tohoto repo/balíčku.
3. Doplň v **Environment** proměnné z `.env.example` (hlavně `SUPABASE_*`, `VAPID_*`, `YT_API_KEY`, `CHANNEL_ID`, `CRON_SECRET`).
4. Spusť aplikaci a nastav **Cron Job** (Render Cron) na `POST https://tvoje-domena/cron/check` s hlavičkou `x-cron-secret: <CRON_SECRET>`.

## Nasazení (Vercel)
- Přidej projekt, uploadni obsah balíčku. Vercel použije `server.js` jako serverless.
- V `vercel.json` je nastavená cron funkce každých 5 min na `/cron/check`.
- Pozn.: Web push na Vercelu funguje, ale mysli na to, že `server.js` je stateless funkce. Odběry jsou v Supabase, takže OK.

## Lokální vývoj
```bash
npm i
npm run generate:vapid # vygeneruj klíče a zapiš do .env
npm run dev
```
Otevři `http://localhost:3000`.

## YouTube webhook registrace (volitelné, pokročilé)
YouTube využívá PubSubHubbub (WebSub). Potřebuješ přihlásit téma kanálu přes hub:
- HUB: `https://pubsubhubbub.appspot.com/`
- TOPIC: `https://www.youtube.com/xml/feeds/videos.xml?channel_id=CHANNEL_ID`
- CALLBACK: `https://tvoje-domena.cz/webhook/youtube`

Lze poslat `POST` na hub s parametry (`hub.mode=subscribe`, `hub.topic`, `hub.callback`, `hub.verify=async` atd.). Jakmile YouTube potvrdí, začne pushovat Atom feed. Server endpoint `/webhook/youtube` už zvládá verifikaci (GET `hub.challenge`) i příjem (POST).

## Ochrana a limity
- YouTube API má quota. Cron intervaluj rozumně (5 min je safe).
- VAPID private key a Supabase service role klíč **nikdy** nepatří do frontendu.
- Na produkci je **nutné HTTPS**.

## Endpoints
- `GET /vapidPublicKey` – veřejný klíč pro prohlížeč
- `POST /subscribe` – uloží subscription do Supabase
- `POST /unsubscribe` – smaže subscription
- `POST /broadcast` – ruční test push
- `POST /cron/check` – polling (vyžaduje header `x-cron-secret`)
- `GET|POST /webhook/youtube` – PubSubHubbub webhook

## Customizace UI
Uprav `public/index.html` (barvy, logo, texty). SW je v `public/sw.js`.
