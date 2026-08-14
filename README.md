# Lockal Events

Single-user web app to discover and track local events near you — ranked by taste, with “I'm going” reminders.

## Stack

Next.js (App Router) · **Supabase** · **Grok (xAI)** · optional Tavily / Ticketmaster / Eventbrite

## Setup

1. **Install**

```bash
npm install
```

2. **Env** — copy and fill keys in `.env.local`:

```bash
cp .env.example .env.local
```

Required:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anon key |
| `XAI_API_KEY` | Grok API key from [console.x.ai](https://console.x.ai) |

Optional: `TAVILY_API_KEY`, `TICKETMASTER_API_KEY`, `EVENTBRITE_API_KEY`, `CRON_SECRET`

3. **Create tables** — in the Supabase SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql).

4. **Run**

```bash
npm run dev
```

5. Set city + preferences on **Profile**, then pull live events:

```bash
npm run ingest
```

## Daily ingest

- Local: `npm run ingest`
- Production: `GET /api/cron/ingest` with `Authorization: Bearer $CRON_SECRET`

Pipeline: **Grok first** (optional Tavily snippets) → Ticketmaster → Eventbrite → upsert into Supabase → rank on read.

## Pages

- `/` — Upcoming (going reminders + day-grouped timeline)
- `/agenda` — Calendar + day timeline
- `/profile` — Location, distance, preferences
- `/events/[id]` — Event lore + “I'm going”
