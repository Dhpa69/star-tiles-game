# Star Tiles – money setup (in-app purchases + ads)

**Plugins used:** `@capgo/native-purchases@7` (StoreKit 2, no RevenueCat account needed) and `@capacitor-community/admob@7` (Google Mobile Ads + App Tracking Transparency). Both come in through Swift Package Manager after `npx cap sync ios`.
All IDs live in **`www/config.js`** (`ST_CONFIG.iap`, `ST_CONFIG.admob`). The web version shows a "Get the app" note in the shop instead.

## 1. App Store Connect: agreements
1. App Store Connect → **Business** → sign the **Paid Apps** agreement.
2. Add **bank account** and **tax forms** (W-9 for the US). IAP can't be tested in TestFlight/sandbox until the agreement is *Active*.

## 2. Create the in-app purchases (App → Monetization → In-App Purchases → +)
Use these exact Product IDs (they must match config.js):

| Product ID | Type | Price | Gives |
|---|---|---|---|
| com.dhavalpatel.startiles.coins500 | Consumable | $0.99 | 500 coins |
| com.dhavalpatel.startiles.coins1500 | Consumable | $2.99 | 1,500 coins |
| com.dhavalpatel.startiles.coins3500 | Consumable | $4.99 | 3,500 coins |
| com.dhavalpatel.startiles.coins8000 | Consumable | $9.99 | 8,000 coins (shown as BEST VALUE) |
| com.dhavalpatel.startiles.coins20000 | Consumable | $19.99 | 20,000 coins |
| com.dhavalpatel.startiles.removeads | Non-Consumable | $2.99 | No ads |
| com.dhavalpatel.startiles.pro | Non-Consumable | $4.99 | No ads + 2,000 coins (one time) |

For each: Reference name, price, a display name + description (English), and a **review screenshot** (screenshot of the shop is fine; `screenshot-v45-shop.png`). Then attach them to the app version under **In-App Purchases** before you submit (first IAPs must be submitted with a build).
Testing: Settings → App Store → Sandbox Account on the iPhone, then buy in a Debug/TestFlight build.

**Restore purchases** button is in the shop (restores Remove Ads / Pro; consumable coins are not restorable by Apple's rules – that's expected).
**Receipt validation (future):** coins are credited on-device right after StoreKit 2 returns a verified transaction, de-duplicated by transaction id, then synced to the Supabase profile if signed in. For stronger anti-cheat later, send the transaction to an Edge Function that checks it with the App Store Server API before crediting.

## 3. AdMob
1. Create an account at admob.google.com (link the same Google account for payments).
2. **Apps → Add app → iOS**, "Is it listed?" → No for now (link it after launch).
3. Create two ad units: **Interstitial** ("After game") and **Rewarded** ("+25 coins", reward 25 coins).
4. **Send me:** the **App ID** (`ca-app-pub-XXXX~YYYY`), both **ad unit IDs** (`ca-app-pub-XXXX/ZZZZ`) and your **publisher ID** (`pub-XXXX`). I'll put them in config.js + `GADApplicationIdentifier` in Info.plist and set `testing:false`. Until then the app uses Google's test IDs (safe; never click your own real ads).
5. AdMob → Privacy & messaging: create an **IDFA explainer** message (optional) and a GDPR message if you serve EU users.

Behavior: interstitial after a finished game only (never mid-game), at most once every 2 minutes, skipped when Remove Ads/Pro is owned. Rewarded ad: +25 coins, max 5 per day. ATT prompt appears ~2s after first launch; if the user denies, ads are requested **non-personalized** (`npa`).

## 4. app-ads.txt
AdMob requires `app-ads.txt` on the **developer website** listed in App Store Connect. Once you send the publisher ID I'll add `app-ads.txt` to the repo root:
```
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```
Note: AdMob looks for it at the *root* of the domain (`https://dhpa69.github.io/app-ads.txt`), not under `/star-tiles-game/`. So either create a repo named **`Dhpa69.github.io`** containing that file, or use a custom domain. Set the App Store "Marketing/Support URL" to that domain.

## 5. App Store privacy answers – see APP-STORE-LISTING.md (updated for ads + IAP).
