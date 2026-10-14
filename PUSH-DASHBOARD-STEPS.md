# Deploy notify-turn from the Supabase dashboard (no CLI / token needed)

Already done: `push_tokens`, `register_push()` and `reports` exist (checked live). The APNs key was tested against Apple: both production and sandbox accept it (a dummy token got `BadDeviceToken`, not an auth error).

## 1. Create the function
1. https://supabase.com/dashboard/project/etfhuwopqjderqutlyhk/functions → **Deploy a new function** → **Via Editor**.
2. Function name: **`notify-turn`** (exactly).
3. Delete the sample code and paste the whole of `supabase/functions/notify-turn/index.ts` (also saved at `/workspace/saved/star-tiles/notify-turn.index.ts`).
4. Click **Deploy function**.
5. Open the function → **Details / Settings** → turn **OFF "Enforce JWT verification"** (Verify JWT) → Save. (The game calls it with the public anon key; the function itself only uses the service role internally.)

## 2. Secrets
Dashboard → **Edge Functions → Secrets** (https://supabase.com/dashboard/project/etfhuwopqjderqutlyhk/functions/secrets).
The page accepts a pasted .env: copy the whole content of `/workspace/saved/star-tiles/notify-turn.secrets.env` (private, not in git) into the first "Key" field — it splits into 8 rows — then **Save**:
`APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID, APNS_ENV, APNS_KEY_P8, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT`.
If pasting doesn't split, add them one by one. For `APNS_KEY_P8` you can paste the .p8 file as-is (real line breaks are fine).
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically.
APNs host: the function tries the `APNS_ENV` host first (sandbox) and automatically retries the other one on `BadDeviceToken`, so Xcode builds and TestFlight both work without changes.

## 3. Quick check (any terminal)
```bash
curl -s -X POST https://etfhuwopqjderqutlyhk.supabase.co/functions/v1/notify-turn \
  -H "apikey: <anon key>" -H "Authorization: Bearer <anon key>" -H "content-type: application/json" \
  -d '{"room":"TEST01","from_device":"curl-test-device","from_name":"Curl","scores":[100,200]}'
# expected: {"sent":0,"out":[]}   (404 = not deployed, 401 = JWT verification still on, 500 = see Logs)
```

## 4. Real test
- **iPhone app:** build from Xcode to a real phone (simulator can't get APNs). Start an online game, allow notifications. Lock the phone. On a second device play a move → "Your turn vs <name>" / "<name> just played. You 0 – <name> 240".
- **Web push:** on an iPhone (iOS 16.4+) add the site to the Home Screen, open it from the icon, play an online game and allow notifications; then move from the other device.
- Function logs: dashboard → Edge Functions → notify-turn → **Logs** / **Invocations** (shows `apns: 200` or the Apple reason).
- Want me to deploy it myself next time? Give me a **Supabase personal access token** (Account → Access Tokens) — then I can run `npx supabase functions deploy notify-turn --no-verify-jwt` and `secrets set` from the box over 443.
