// Supabase Edge Function: notify-turn
// POST {room, from_device, from_name, scores:[mine, theirs], over}
// Sends "Your turn vs <from_name>" to every other device registered for that room (APNs token auth + Web Push).
// Secrets (supabase secrets set ...): APNS_KEY_P8, APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID, APNS_ENV (sandbox|production),
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
    const { room, from_device, from_name, scores, over } = await req.json();
    if (!room || !from_device || typeof room !== "string" || room.length > 16) return new Response("bad", { status: 400, headers: cors });
    const k = room + ":" + from_device, now = Date.now();
    if ((recent.get(k) ?? 0) > now - 4000) return new Response("slow down", { status: 429, headers: cors });
    recent.set(k, now);
    const { data: rows, error } = await db.from("push_tokens").select("device_id,platform,token,web_sub").contains("rooms", [room]).neq("device_id", from_device).limit(10);
    if (error) throw error;
    const name = String(from_name || "your friend").slice(0, 24);
    const sc = Array.isArray(scores) ? ` · ${Number(scores[1] || 0).toLocaleString()} – ${Number(scores[0] || 0).toLocaleString()}` : "";
    const title = over ? `Game over vs ${name}` : `Your turn vs ${name}`;
    const body = over ? `Final score${sc}. Tap to see the result.` : `${name} just played${sc}`;
    const out: unknown[] = [];
    if (env("VAPID_PRIVATE_KEY")) webpush.setVapidDetails(env("VAPID_SUBJECT") || "mailto:dhaval83@icloud.com", env("VAPID_PUBLIC_KEY"), env("VAPID_PRIVATE_KEY"));
    for (const r of rows ?? []) {
      try {
        if (r.platform === "ios" && r.token && env("APNS_KEY_P8")) {
          const host = env("APNS_ENV") === "production" ? "api.push.apple.com" : "api.sandbox.push.apple.com";
          const res = await fetch(`https://${host}/3/device/${r.token}`, {
            method: "POST",
            headers: { authorization: `bearer ${await apnsToken()}`, "apns-topic": env("APNS_BUNDLE_ID") || "com.dhavalpatel.startiles", "apns-push-type": "alert", "apns-priority": "10", "apns-collapse-id": `turn-${room}` },
            body: JSON.stringify({ aps: { alert: { title, body }, sound: "default", "thread-id": room }, room }),
          });
          if (res.status === 410 || res.status === 400) await db.from("push_tokens").update({ token: null }).eq("device_id", r.device_id);
          out.push({ d: r.device_id, apns: res.status });
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
