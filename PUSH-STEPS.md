# Star Tiles – turn notifications setup

How it works: when you play a move online, the app calls the Supabase Edge Function **notify-turn** with the room code. It looks up the other player's device(s) in `push_tokens` (registered with a random device id + their active room codes, so guests work too) and sends "Your turn vs <name> · score" by **APNs** (iPhone app) or **Web Push/VAPID** (home-screen web app on iOS 16.4+). The permission prompt appears ~4s after your first online game starts.

## 1. Database
Supabase → SQL Editor → run `supabase/002_push_reports.sql` (after 001_profiles.sql). It creates `push_tokens`, the `register_push` RPC and the `reports` table (chat reports).

## 2. APNs key (Apple Developer → Certificates, IDs & Profiles)
1. **Identifiers** → `com.dhavalpatel.startiles` → enable **Push Notifications** → Save.
2. **Keys** → + → name "Star Tiles APNs", tick **Apple Push Notifications service (APNs)** (you can also tick Sign in with Apple on the same key, or reuse that key by editing it) → Continue → Register → **Download the .p8** (one time only).
3. Note the **Key ID** (10 chars) and your **Team ID** (top right of the developer site).

## 3. Deploy the edge function (on the Mac)
```bash
brew install supabase/tap/supabase
cd star-tiles-ios            # contains supabase/functions/notify-turn
supabase login
supabase link --project-ref etfhuwopqjderqutlyhk
supabase secrets set APNS_KEY_ID=XXXXXXXXXX APNS_TEAM_ID=YYYYYYYYYY APNS_BUNDLE_ID=com.dhavalpatel.startiles APNS_ENV=sandbox
supabase secrets set APNS_KEY_P8="$(cat ~/Downloads/AuthKey_XXXXXXXXXX.p8)"
supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:dhaval83@icloud.com
supabase functions deploy notify-turn --no-verify-jwt
```
The VAPID pair is in the box at `/workspace/saved/star-tiles/vapid.env` (the public key is already in config.js; the private key is not in the repo – ask me for it or regenerate both with `npx web-push generate-vapid-keys` and send me the public one).
`APNS_ENV=sandbox` for Xcode/debug builds; switch to `production` for TestFlight/App Store builds.
Dashboard alternative: Edge Functions → Deploy new function → name `notify-turn`, paste `supabase/functions/notify-turn/index.ts`, turn **off** "Verify JWT", add the secrets under Edge Functions → Secrets.

## 4. Xcode
Already in the project: `aps-environment` entitlement, `remote-notification` background mode, AppDelegate token forwarding. In Signing & Capabilities make sure **Push Notifications** shows (click + Capability → Push Notifications if not). Xcode switches `aps-environment` to production when archiving.

## 5. Test
Two phones (or phone + home-screen web app), start an online game, allow notifications, lock phone A, play on phone B → A gets "Your turn vs B".
