# Online mode
Room play (v14) works with no account. Since v19 a phone that left can rejoin: it replays its saved move log, then catches up from the relay history (ntfy.sh keeps messages about 12h by default) or asks the other phone to resend. Moves go through the free public relay ntfy.sh, using HTTPS and Server-Sent Events.
Both phones run the same seeded game and send each other only their actions: commit, swap or blast.
Anyone who knows a room code can read that room's messages: player names and moves. No other data is sent.

## Online profiles and coins sync (needs one account step)
Profiles live in localStorage under `startiles.profile` (`schema`, `id`, `name`, `coins`, `wins`, `games`, `difficulty`, `synced`).
To sync them online, create a free Supabase project. You sign in with GitHub, and no card is needed.
Then send the Project URL and the anon public key.
A `profiles` table plus a small sync in app.js will push and pull this object. Swapping the relay to Supabase Realtime makes rooms private too.
