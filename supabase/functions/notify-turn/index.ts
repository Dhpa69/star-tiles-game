// Supabase Edge Function: notify-turn
// POST {room, from_device, from_name, scores:[mine, theirs], over}
// Sends "Your turn vs <from_name>" to every other device registered for that room (APNs token auth + Web Push).
// Secrets: APNS_KEY_P8, APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID, APNS_ENV (optional: sandbox|production = which host to try first; the other is tried automatically),
//                                     VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
import { createClient } from "npm:@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "npm:jose@5";
import webpush from "npm:web-push@3";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const env = (k: string) => Deno.env.get(k) ?? "";
const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
let apnsJwt = "", apnsAt = 0;
async function apnsToken() {
  if (apnsJwt && Date.now() - apnsAt < 40 * 60 * 1000) return apnsJwt; // APNs wants a refresh every 20–60 min
  const key = await importPKCS8(env("APNS_KEY_P8").replace(/\\n/g, "\n"), "ES256");
  apnsJwt = await new SignJWT({}).setProtectedHeader({ alg: "ES256", kid: env("APNS_KEY_ID") }).setIssuer(env("APNS_TEAM_ID")).setIssuedAt().sign(key);
  apnsAt = Date.now(); return apnsJwt;
}
const recent = new Map<string, number>(); // simple per-room rate limit (per instance)

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { room, from_device, from_name, scores, over, team, mover_team, next_player } = await req.json();
    if (!room || !from_device || typeof room !== "string" || room.length > 16) return new Response("bad", { status: 400, headers: cors });
    const k = room + ":" + from_device, now = Date.now();
    if ((recent.get(k) ?? 0) > now - 4000) return new Response("slow down", { status: 429, headers: cors });
    recent.set(k, now);
    const { data: rows, error } = await db.from("push_tokens").select("device_id,platform,token,web_sub").contains("rooms", [room]).neq("device_id", from_device).limit(10);
    if (error) throw error;
    const name = String(from_name || "your friend").slice(0, 24);
    const mine = Array.isArray(scores) ? Number(scores[1] || 0) : null, theirs = Array.isArray(scores) ? Number(scores[0] || 0) : null; // scores = [mover, recipient]
    const sc = mine === null ? "" : `You ${mine.toLocaleString("en-US")} – ${name} ${theirs!.toLocaleString("en-US")}`;
    // v59 team 2v2: everyone in the room hears whose turn it is (team + player)
    const np = String(next_player || "").slice(0, 40), mt = String(mover_team || "").slice(0, 10);
    const title = team ? (over ? `Team 2v2 game over` : `Team 2v2: ${np} is up`) : over ? `Game over vs ${name}` : `Your turn vs ${name}`;
    const body = team ? `${name}${mt ? " (" + mt + ")" : ""} just played.${mine === null ? "" : " " + (mt || "Them") + " " + theirs!.toLocaleString("en-US") + " – " + (mt === "Team A" ? "Team B" : "Team A") + " " + mine.toLocaleString("en-US")}` : over ? `${sc ? sc + ". " : ""}Tap to see the result.` : `${name} just played.${sc ? " " + sc : ""}`;
    const out: unknown[] = [];
    if (env("VAPID_PRIVATE_KEY")) webpush.setVapidDetails(env("VAPID_SUBJECT") || "mailto:dhaval83@icloud.com", env("VAPID_PUBLIC_KEY"), env("VAPID_PRIVATE_KEY"));
    for (const r of rows ?? []) {
      try {
        if (r.platform === "ios" && r.token && env("APNS_KEY_P8")) {
          // Xcode builds use sandbox tokens, TestFlight/App Store use production: try the preferred host, fall back to the other on BadDeviceToken
          const pref = env("APNS_ENV") === "sandbox" ? ["api.sandbox.push.apple.com", "api.push.apple.com"] : ["api.push.apple.com", "api.sandbox.push.apple.com"];
          let status = 0, reason = "";
          for (const host of pref) {
            const res = await fetch(`https://${host}/3/device/${r.token}`, {
              method: "POST",
              headers: { authorization: `bearer ${await apnsToken()}`, "apns-topic": env("APNS_BUNDLE_ID") || "com.dhavalpatel.startiles", "apns-push-type": "alert", "apns-priority": "10", "apns-collapse-id": `turn-${room}` },
              body: JSON.stringify({ aps: { alert: { title, body }, sound: "default", "thread-id": room }, room }),
            });
            status = res.status; reason = status === 200 ? "" : ((await res.json().catch(() => ({}))) as { reason?: string }).reason ?? "";
            if (status === 200 || reason !== "BadDeviceToken") { out.push({ d: r.device_id, apns: status, host, reason }); break; }
          }
          if (reason === "BadDeviceToken" || reason === "Unregistered" || status === 410) { await db.from("push_tokens").update({ token: null }).eq("device_id", r.device_id); out.push({ d: r.device_id, apns: status, reason }); }
        } else if (r.platform === "web" && r.web_sub && env("VAPID_PRIVATE_KEY")) {
          await webpush.sendNotification(r.web_sub, JSON.stringify({ title, body, room }), { TTL: 3600, urgency: "high" });
          out.push({ d: r.device_id, web: "ok" });
        }
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.from("push_tokens").update({ web_sub: null }).eq("device_id", r.device_id);
        out.push({ d: r.device_id, err: String(e) });
      }
    }
    return new Response(JSON.stringify({ sent: out.length, out }), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});
