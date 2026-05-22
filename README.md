# job-finder

A free job tracker for top Brazilian tech and finance companies. Once a day it
checks their career pages, sends new early-career openings — internships,
new-grad, trainee, junior — to Telegram, and publishes a filterable web board
with an AI-written one-line summary on every job.

No database, no LinkedIn scraping. It reads public ATS APIs — Greenhouse and
Lever per company, and Gupy's network-wide search — and runs for free on a
GitHub Actions cron.

## What you get

- **Telegram alerts** — a message the moment a new matching job appears.
- **A filterable web board** — every current opening, filtered by level, área,
  company, and recency. Lives in [`docs/`](docs/), served free by GitHub Pages.
- **AI summaries** — a one-line synthesis of each role (via Google Gemini's
  free tier), cached so each job is summarized only once.

## How it works

1. A daily GitHub Action runs `src/poll.ts`.
2. It fetches open jobs for every company in `src/companies.ts`, plus every
   early-career opening on the Gupy network.
3. It keeps early-career titles (`src/keywords.ts`) and classifies them by
   level and area.
4. It summarizes new jobs with Gemini, writes `docs/jobs.json`, and sends new
   jobs to Telegram.
5. The updated files are committed back to the repo.

## Setup

1. **Telegram** — create a bot with [@BotFather](https://t.me/BotFather), copy
   the token. Get your chat ID: message the bot, then open
   `https://api.telegram.org/bot<token>/getUpdates` and read `chat.id`.
2. **Gemini (optional, for AI summaries)** — get a free key at
   [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
3. `cp .env.example .env` and fill in the values. Without `GEMINI_API_KEY` the
   tool still works — it just skips summaries.

## Run locally

```sh
npm install
DRY_RUN=true npm run poll   # polls and logs, sends nothing
npm run poll                # polls and sends to Telegram
```

The first run seeds `data/seen.json` and sends nothing, so you are not flooded
with every existing job. Preview the board with `npx serve docs`.

## Deploy (free, automated)

1. Push to a **public** GitHub repo.
2. Add `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, and `GEMINI_API_KEY` as Actions
   secrets (Settings → Secrets and variables → Actions).
3. Enable the board: Settings → Pages → Deploy from a branch, `main`, `/docs`.
4. Update `BOARD_URL` in `src/config.ts` if your repo name differs.

The **Poll jobs** workflow then runs every day at 09:00 UTC (06:00 in Brazil).

## Add a company

Append one entry to `src/companies.ts`. `token` is the slug in the ATS URL:

| ATS        | Careers URL                        | token          |
| ---------- | ---------------------------------- | -------------- |
| Greenhouse | `job-boards.greenhouse.io/<token>` | the board slug |
| Lever      | `jobs.lever.co/<token>`            | the board slug |

Each entry needs a `domain` for its logo. Companies on **Gupy** need no entry —
`connectors/gupyPortal.ts` already covers every company on the Gupy network.

## Scripts

- `npm run poll` — run the poller (needs `.env`)
- `npm test` — run unit tests
- `npm run lint` / `npm run typecheck` — static checks
- `npm run format` — format with Prettier

## License

MIT — free for anyone to use, fork, and host.
