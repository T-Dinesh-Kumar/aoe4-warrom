# AoE4 War Room

Aggregated player stats dashboard for Age of Empires IV.  
Combines all accounts per player, shows Ranked 1v1 and Quick Match 1v1 civ win rates with season filtering.

## Project structure

```
aoe4-warroom/
├── api/
│   └── player.js        ← Vercel serverless proxy (bypasses CORS)
├── public/
│   └── index.html       ← The full dashboard UI
├── vercel.json          ← Routing config
└── package.json
```

## Deploy to Vercel (free)

### Option A — Vercel CLI (fastest)
```bash
npm i -g vercel
cd aoe4-warroom
vercel
```
Follow the prompts. It'll give you a live URL in ~30 seconds.

### Option B — GitHub + Vercel dashboard
1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → Import your repo
3. No build settings needed — Vercel auto-detects it
4. Click Deploy

## Local development
```bash
npm i -g vercel
vercel dev
```
Opens at http://localhost:3000

## Adding/editing players
Edit the `PLAYERS` array in `public/index.html`.  
Each player has a list of accounts with `name` and `id` (the number from the aoe4world URL).

## How it works
- `api/player.js` is a serverless function that proxies requests to aoe4world's API server-side, avoiding CORS issues
- The dashboard fetches all accounts in parallel, then aggregates games + civ stats weighted by games played
- Season filter reads the `seasons` array from each account's mode data and lets you drill into a specific season
