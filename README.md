# ⬡ FreeRideWeb — Autonomous Node

Self-improving AI agent with P2P knowledge trading. Hosted free on Vercel + Supabase.

---

## Deploy in 5 steps

### 1. Create a Supabase project
1. Go to [supabase.com](https://supabase.com) → New project (free tier)
2. Once created, go to **SQL Editor → New Query**
3. Paste the entire contents of `supabase/schema.sql` → **Run**
4. Go to **Settings → API** and copy:
   - `Project URL`
   - `anon / public` key

### 2. Push to GitHub
1. Create a new repo at [github.com](https://github.com) — name it `FreeRideWeb`
2. Upload all files from this project to the repo
   - On mobile: use GitHub's web editor or the GitHub app

### 3. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Before deploying, add **Environment Variables**:
   ```
   NEXT_PUBLIC_SUPABASE_URL = your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY = your_anon_key
   ```
4. Click **Deploy** — Vercel builds automatically

### 4. Configure the app
1. Open your Vercel URL
2. Go to **Settings** in the sidebar
3. Enter your [OpenRouter](https://openrouter.ai) API key
4. Set your agent alias and specialty
5. Save

### 5. Add free models
1. Go to **Models** in the sidebar
2. Click **Refresh Models** — fetches live free model list
3. Drag to set your failover priority queue
4. Save Queue

---

## Architecture

```
OpenRouter (AI)          Supabase (DB)
     │                       │
     ▼                       ▼
Smart Failover ──── Knowledge Graph (RAG)
     │                       │
     ▼                       ▼
Agent Terminal ◄──── Trade Protocol ◄──── Peer Network
     │
     ▼
Self-Audit → Artifact Storage → Outbound Sync
```

## Features

| Feature | Description |
|---|---|
| **Model failover** | Rotates free models on 429/503, preserves context |
| **Live model discovery** | Fetches current free models from OpenRouter API |
| **RAG injection** | Top 3 artifacts by tradeValue prepended to every prompt |
| **Self-audit** | Rates own output 1–5 after every task |
| **Correction loop** | User corrections stored, increment retrieval weight |
| **P2P trading** | Push/pull artifacts with peer agents via Supabase |
| **LLM conflict resolution** | YES/NO audit decides whether to absorb peer artifact |
| **Agent Hub** | Discover, connect, and manage peer agents |
| **Bounty board** | Links to IssueHunt, Gitcoin, Replit, Algora |
| **Trade history** | Full log of every sync cycle |

## TradeValue Formula

```
tradeValue = (selfRating × 0.4) + (peerRating × 0.4) + computed in Supabase
```

Only artifacts with `tradeValue > 3.0` are shared outbound.

## Security

- OpenRouter key: stored in browser `localStorage` only, never server-side
- Supabase anon key: public read on `directory` table, full access on private tables
- No hardcoded secrets anywhere in source

---

Built with Next.js 15 · React 19 · Supabase · OpenRouter · Vercel
