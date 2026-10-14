# Sign in with Apple – what you still need to do

Star Tiles v44 is ready for Apple sign-in on web and iOS. **Apple Developer Portal + Supabase Auth settings cannot be finished from this box** (they need your Apple ID and a Supabase personal access token). Do the steps below once.

Project ref: `etfhuwopqjderqutlyhk` · Bundle ID: `com.dhavalpatel.startiles` · Supabase URL: `https://etfhuwopqjderqutlyhk.supabase.co`

## A. Run the database SQL (required before any sync works)

1. Open https://supabase.com/dashboard/project/etfhuwopqjderqutlyhk/sql/new
2. Paste everything from `/workspace/star-tiles-supabase/001_profiles.sql` (also in this repo as `supabase/001_profiles.sql` after copy) and click **Run**.
3. Confirm: Table Editor → `profiles` exists, RLS is on.

(Direct Postgres from the Linux box timed out on every host/port/password variant, so the SQL is for you to run.)

## B. Apple Developer – App ID (iOS native Sign in with Apple)

1. https://developer.apple.com/account/resources/identifiers/list → your App ID **com.dhavalpatel.startiles** (create it if it doesn't exist: type App IDs → App → Bundle ID Exact).
2. Capabilities → tick **Sign In with Apple** → Configure → **Enable as a primary App ID** → Save → Save the App ID.
3. In Xcode (after opening `star-tiles-ios`): Target **App** → Signing & Capabilities → **+ Capability** → **Sign in with Apple**. The project's `App.entitlements` already declares it; Xcode must attach your Team.

## C. Apple Developer – Services ID (web / Capacitor OAuth)

1. Identifiers → **+** → **Services IDs** → Continue.
2. Description: `Star Tiles Web` · Identifier: e.g. `com.dhavalpatel.startiles.web` → Continue → Register.
3. Edit the Services ID → tick **Sign In with Apple** → Configure:
   - Primary App ID: `com.dhavalpatel.startiles`
   - Domains: `etfhuwopqjderqutlyhk.supabase.co`
   - Return URLs: `https://etfhuwopqjderqutlyhk.supabase.co/auth/v1/callback`
   - (Optional web game domain) also add `dhpa69.github.io` and return URL `https://dhpa69.github.io/star-tiles-game/`
4. Save → Continue → Save.

## D. Apple Developer – Key (.p8) for Supabase

1. Keys → **+** → name `Star Tiles Supabase` → tick **Sign In with Apple** → Configure → choose Primary App ID `com.dhavalpatel.startiles` → Save → Continue → Register.
2. **Download the .p8 once** (you can't download it again). Note the **Key ID** shown on the page.
3. Note your **Team ID** (top-right of developer.apple.com, or Membership details).

## E. Build the Apple client secret (JWT) for Supabase

Supabase needs a short-lived JWT signed with the .p8. On your Mac:

```bash
# Install once: brew install ruby && gem install jwt
# Or use: https://supabase.com/docs/guides/auth/social-login/auth-apple#configuration-self-hosted
python3 - <<'PY'
# pip install PyJWT cryptography
import time,jwt  # PyJWT
TEAM_ID="YOUR_TEAM_ID"
KEY_ID="YOUR_KEY_ID"
CLIENT_ID="com.dhavalpatel.startiles.web"   # Services ID (web). For native-only you can use the App ID.
with open("AuthKey_XXXXX.p8") as f: secret=f.read()
now=int(time.time())
token=jwt.encode({"iss":TEAM_ID,"iat":now,"exp":now+86400*150,"aud":"https://appleid.apple.com","sub":CLIENT_ID},
 secret,algorithm="ES256",headers={"kid":KEY_ID})
print(token)
PY
```

Apple expires the secret after at most 6 months — regenerate and paste again before then.

## F. Supabase → Authentication → Providers → Apple

1. https://supabase.com/dashboard/project/etfhuwopqjderqutlyhk/auth/providers → **Apple** → Enable.
2. **Client IDs**: comma-separated
   - `com.dhavalpatel.startiles` (iOS App ID – required for native `signInWithIdToken`)
   - `com.dhavalpatel.startiles.web` (Services ID – required for web OAuth)
3. **Secret Key**: paste the JWT from step E.
4. Save. Under Authentication → URL Configuration, allow redirect URLs:
   - `https://dhpa69.github.io/star-tiles-game/`
   - `https://dhpa69.github.io/star-tiles-game/index.html`
   - `capacitor://localhost` and `http://localhost` (Capacitor)

(I cannot flip these switches without a Supabase Personal Access Token with auth admin rights.)

## G. Test

1. Web (after SQL + Apple provider): open the live game → Account → Sign in with Apple. First sync merges the higher local/cloud coin count.
2. Guest: refuse Apple / stay signed out – missions and coins still save locally; Account shows “Playing as guest”.
3. iOS: rebuild (`npx cap sync ios`), open Xcode, ensure Sign in with Apple capability, run on a real device (Simulator Sign in with Apple needs an Apple ID signed into the simulator Settings).
4. Delete account: Account → Delete account → confirm. Profile row and auth user are removed via `delete_my_account()`; local guest progress remains.

## H. Privacy nutrition label (App Store Connect)

Add: **Contact Info (Name) – Linked to User – App Functionality** only when the user shares their Apple name; **User Content** if you declare chat. No tracking.
