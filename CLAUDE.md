# job-finder — project guide

A free tool that tracks early-career job openings (estágio, trainee, júnior) at
top Brazilian companies. It sends Telegram alerts and publishes a filterable web
job board with AI-generated job summaries. Runs free on GitHub Actions.

## Status (2026-05-21)

**Built and working locally. Not yet committed to git, not yet deployed.**

Done:

- Daily poller (`src/poll.ts`) — 12 companies on Greenhouse/Lever, plus the
  whole Gupy network via the portal search API.
- São Paulo–city filter (`src/location.ts`) — board scoped to the city of São
  Paulo plus remote roles; toggle with `SAO_PAULO_ONLY` in `src/config.ts`.
- Static filterable job board (`docs/`) — light theme, meant for GitHub Pages.
- Telegram push alerts for new jobs.
- AI job summaries via Google Gemini (`gemini-2.5-flash`) — backfilled for all
  current São Paulo jobs; `data/seen.json` reset to empty for a clean first run.

Pending — next steps, in order:

1. **Commit everything.** `git init` is done but there are zero commits.
2. **Deploy** — see the Deploy section below.

## Architecture

`src/poll.ts` is the entry point. Each run:

1. fetches postings from every company's ATS and the Gupy-wide search (`src/connectors/`),
2. keeps early-career titles, classifies level + area (`src/keywords.ts`),
3. builds the board, carrying first-seen dates + summaries over (`src/board.ts`),
4. generates AI summaries for new jobs (`src/summarize.ts` + `src/description.ts`),
5. writes the board to `docs/jobs.json`,
6. sends jobs not seen before to Telegram (`src/telegram.ts`),
7. records seen ids in `data/seen.json` (`src/state.ts`).

Per-company connectors share `ConnectorFn = (company) => Promise<Posting[]>`,
registered in `src/connectors/connector.ts` — Greenhouse and Lever read public
JSON APIs, one company at a time. Gupy is covered network-wide instead:
`connectors/gupyPortal.ts` queries Gupy's public portal search API
(`portal.api.gupy.io`), one source for every company on Gupy. It searches a set
of level keywords, drops "Banco de Talentos" pools, and dedups by job id. Job
descriptions for summaries are fetched on demand per job (`src/description.ts`).

The board (`docs/`) is a static page — vanilla HTML/CSS/JS, no build — that
fetches `docs/jobs.json` and filters client-side. GitHub Pages serves it.

## Key files

- `src/poll.ts` — pipeline entry point
- `src/companies.ts` — the 12 Greenhouse/Lever companies (adding one is a single line)
- `src/connectors/` — `connector.ts` (registry), `greenhouse.ts`, `lever.ts`, `gupyPortal.ts`, `http.ts`
- `src/keywords.ts` — early-career filter + level/area classification (PT-aware)
- `src/summarize.ts` — Gemini client · `src/description.ts` — per-job description fetch
- `src/board.ts` · `src/state.ts` · `src/telegram.ts` · `src/config.ts` · `src/text.ts`
- `docs/` — `index.html`, `style.css`, `app.js`, `jobs.json` (the board)
- `.github/workflows/` — `poll.yml` (daily cron), `ci.yml`

## Conventions

- TypeScript strict, ESM, run with `tsx` — no build step.
- Plain interfaces and functions. No classes, no clever type-level code.
- Zero runtime dependencies; everything is a devDependency.
- `data/seen.json` (dedup state) and `docs/jobs.json` (board data) are committed
  on purpose — the cron commits them back each run.
- Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run format` before committing.

## Gotchas

- An empty `seen.json` = first run: it seeds silently and sends nothing (no
  day-one flood). Keep it `{"seenIds": []}` in commits until deploy.
- Each company is polled in its own try/catch — one failure never aborts the
  run. The Gupy network search has its own try/catch, and each level-keyword
  query inside it is isolated too.
- The board's default sort is "Variedade" — it round-robins companies so no
  single company (Itaú, PagBank…) dominates the feed.
- AI summaries are cached in `jobs.json` and carried over — each job is
  summarized once. Without `GEMINI_API_KEY` the poll just skips summaries.
- Gemini free tier is rate-limited — the poll paces calls (`SUMMARY_DELAY_MS`,
  default 4s) and caps at `SUMMARY_LIMIT` (default 150) per run; the model is
  `gemini-2.5-flash`, overridable with `GEMINI_MODEL`.
- The board filter matches job titles only, so big sales-heavy boards (PagBank)
  bring some non-tech _júnior_ roles — the Área filter narrows to tech.

## Working locally

- `npm install`
- `.env` holds `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `GEMINI_API_KEY` (gitignored).
- `DRY_RUN=true npm run poll` — poll without sending Telegram messages.
- Preview the board: `npx serve docs`, then open the printed URL.

## Deploy

1. Create a **public** GitHub repo and push.
2. Settings → Secrets and variables → Actions: add `TELEGRAM_BOT_TOKEN`,
   `TELEGRAM_CHAT_ID`, `GEMINI_API_KEY`.
3. Settings → Pages → Deploy from a branch → `main`, folder `/docs`.
4. Update `BOARD_URL` in `src/config.ts` if the repo name differs.
5. The `Poll jobs` workflow runs daily at 09:00 UTC; trigger it manually to test.

## Ideas — not yet built

- **More job sources** — expanding coverage beyond Greenhouse/Lever + the Gupy
  network (CIEE/Nube estágio aggregators, more ATSs). Plan and manual-task list
  in [`JOB-SOURCES.md`](JOB-SOURCES.md); tracked in its own conversation.
- **Full web app (original Phase 2-4)** — Telegram login, per-user company
  selection, Postgres on Vercel. Designed earlier in the project, not built.
- **GitHub-issues job source** — _considered and dropped (2026-05-21)._ Brazilian
  dev community repos (`frontendbr/vagas`, `backend-br/vagas`, `react-brasil/vagas`)
  post jobs as GitHub Issues, but they skew senior/pleno and carry almost no
  estágio, so they don't fit this tool's early-career focus.

## Commands

`npm run poll` (needs `.env`) · `npm test` · `npm run lint` · `npm run typecheck` · `npm run format`
