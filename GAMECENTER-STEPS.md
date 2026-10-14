# Game Center (later) – Star Tiles

The web/app already has Supabase weekly leaderboards and 16 local achievements (`board.js`). Game Center is an optional extra layer for the iOS app.
`board.js` already calls `window.StGC.report(id)` on every unlock, if it exists – so wiring is one small file.

## 1. App Store Connect
App → **Services → Game Center** → enable.
- **Leaderboards:** create "Weekly best" (Classic, Integer, High to Low, *Recurring*: weekly, starting Monday 00:00 UTC) id `startiles.weekly`, and "Daily puzzle" (recurring daily) id `startiles.daily`.
- **Achievements:** create one per entry in `board.js` → `ACH` with id `startiles.<id>` (e.g. `startiles.first`, `startiles.master`, `startiles.m20k` …), 100 points total split as you like, each with a 512×512 image.
Add both to the app version before submitting.

## 2. Xcode
Signing & Capabilities → + Capability → **Game Center**.

## 3. Plugin (on the Mac)
```bash
npm i @openforge/capacitor-game-connect   # Game Center + Play Games plugin for Capacitor
npx cap sync ios
```
Then add `www/gamecenter.js` (I can write it once the plugin version is chosen):
```js
const GC=Capacitor.Plugins.CapacitorGameConnect;
GC.signIn().catch(()=>{});
window.StGC={report:id=>GC.unlockAchievement({achievementID:'startiles.'+id}).catch(()=>{}),
  score:(board,v)=>GC.submitScore({leaderboardID:board,totalScoreAmount:v}).catch(()=>{}),
  show:()=>GC.showLeaderboard({leaderboardID:'startiles.weekly'})};
```
and call `StGC.score('startiles.weekly',score)` next to `StBoard.submit` in `board.js`.
Note: Game Center sign-in shows Apple's banner; it never blocks play.
