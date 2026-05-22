# Job sources — expansion plan

Working brief for **growing the number of jobs** on the board. Split into its own
track from the core pipeline work. A fresh conversation can start here.

## Goal

More early-career jobs (estágio, trainee, júnior, aprendiz) — engineering-leaning,
in the **city of São Paulo** — feeding the board and Telegram alerts. Free and
lean: public APIs only, no scraping that breaks easily, no LinkedIn.

## Current state (2026-05-21)

Two source types feed the board today:

- **12 companies on Greenhouse/Lever** — polled one at a time (`src/companies.ts`).
- **The entire Gupy network** — `src/connectors/gupyPortal.ts`, one network-wide
  search API covering every company on Gupy.

A São Paulo–city filter (`src/location.ts`, toggled by `SAO_PAULO_ONLY` in
`src/config.ts`; remote jobs kept) trims the board. Latest run: **335 early-career
postings found → 118 in São Paulo**.

**Fixed (2026-05-21):** `gupyPortal.ts` was dropping `vacancy_type_apprentice`
(Jovem Aprendiz) jobs — its `KEEP_TYPES` set omitted that type. Adding it lifted
Gupy from 255 → 315 postings (+10 in São Paulo). The Gupy public portal is a
_curated subset_ of the network, not every company; `name`-keyword search tops
out around 255–387 results per term, so Gupy is now close to its free ceiling.

**New (2026-05-21):**

- **SmartRecruiters connector** — `connectors/smartrecruiters.ts`, a per-company
  ATS connector on the public Posting API (no auth). Companies use `ats:
'smartrecruiters'` in `companies.ts`.
- **Job freshness + expiry** — each `JobRecord` now carries a `lastSeen` date.
  Jobs missing from a poll are carried over for `EXPIRY_DAYS` (config, default 7)
  then dropped, so genuinely-closed postings fall off the board while a transient
  per-company fetch failure no longer wipes that company's still-open jobs.

## The gap

- **Greenhouse/Lever** have no network-wide search — each company must be added by
  its board token. Only 12 so far. Easy to grow, but needs a token list.
- **Estágio aggregators** (CIEE, Nube) — thousands of estágios, the natural fit —
  are not integrated yet.

## How to add a source (architecture)

- **Per-company ATS connector** — `(company) => Promise<Posting[]>`, registered in
  `connectors/connector.ts`; company added to `companies.ts`.
- **Network-wide source** (like the Gupy portal) — a standalone function returning
  `Posting[]`, called in `poll.ts`'s `fetchAllPostings()` in its own try/catch.
  Best shape for aggregators. Use `gupyPortal.ts` as the reference implementation.
- `Posting` = `id, company, title, location, url, source, logo?, description?`.
  `description` feeds AI summaries and is not persisted to the board.
- `source` is the `Source` union in `types.ts` — add a value for a new source.
- Connectors return raw postings; `keywords.ts` filters early-career by title and
  `location.ts` filters by city. A connector does **not** filter.

## Expansion options (ranked by payoff)

1. **CIEE / Nube — estágio aggregators.** ★ Biggest win. CIEE advertises 10,000+
   estágios, filterable by area and city. Blocker: the listings load via
   JavaScript, so the API endpoint must be captured from the browser — see
   Manual task A.
   - **Dead end (2026-05-21):** the `nube.com.br/api/` _partner_ API
     (e.g. the `integracao_nube_empresa` GitHub example) is **not** a job feed —
     its endpoints are HR back-office (`documentos`, `rescisao/gerar_rescisao`)
     and it needs a `SECRET`+`TOKEN` pair Nube issues only to contracted partner
     companies. No public key exists; even with one it returns zero vacancies.
     The only viable Nube/CIEE route is the **student-facing public vagas API**
     captured from the browser — Manual task A.
2. **More Greenhouse/Lever companies.** One line each in `companies.ts`. Needs a
   list of Brazilian company tokens — see Manual task B.
3. **New ATS connectors.** Each unlocks a batch of companies.
   - **SmartRecruiters — done (2026-05-21).** `connectors/smartrecruiters.ts`
     polls the public Posting API
     (`api.smartrecruiters.com/v1/companies/{id}/postings`), no auth. Add a
     company with one line in `companies.ts` (`ats: 'smartrecruiters'`).
   - **inhire (`*.inhire.app`) — viable, needs a capture.** Brazilian tech ATS
     (Loft, Dasa…). Career pages are public, but `api.inhire.app` requires an
     `Authorization` header the career-page SPA fetches at runtime — capture it
     from the browser (Manual task A). One capture may unlock every inhire
     company at once, like the Gupy portal.
   - **Abler (`*.abler.com.br`) — rejected (2026-05-21).** The `vagas.` and
     `api.` subdomains both redirect to the marketing site; no public job API,
     and Abler skews toward SMB / non-tech employers.
   - **Workday (`*.myworkdayjobs.com`)** — still open; a per-tenant JSON API.
4. **ProgramaThor / Brazilian dev boards** — 100% tech, has estágio/júnior
   filters, modest volume.
5. **"Programa de estágio" season watcher** — branded annual programs (Nubank,
   iFood "Vem Ser", Mercado Livre, Globo, Embraer). Different mechanism: watch
   landing pages and alert when applications open.

**Rejected:** GitHub-issues repos (`frontendbr/vagas` etc.) — skew senior/pleno,
almost no estágio.
**Off-limits:** LinkedIn (ToS), Indeed / Google Jobs (no clean API).

## Manual tasks (for the user — these unblock the connectors)

### A. Capture the CIEE / Nube job API (~10 min, highest leverage)

1. Open the vacancy page — CIEE: `portal.ciee.org.br` · Nube: `nube.com.br` ·
   inhire: any company board, e.g. `jobs.inhire.app/loft`
2. `F12` → **Network** tab → filter **Fetch/XHR**
3. Reload, or click a filter / "Carregar mais"
4. Find the request whose response is JSON full of jobs
5. Right-click it → **Copy → Copy as cURL** → paste it into the job-search chat

The cURL gives the endpoint, params, and headers — enough to build the connector.
Same recipe works for ProgramaThor and Vagas.com.br.

### B. Harvest Greenhouse/Lever tokens (Google dorks)

The token is the slug in the URL. Run these, list any Brazilian company found:

- `site:job-boards.greenhouse.io estágio`
- `site:boards.greenhouse.io "são paulo"`
- `site:jobs.lever.co brasil estágio`

Provide `company → token` pairs. (Claude can also do this with web search.)

### C. ATS-check wishlist companies

For a target company, open "Trabalhe Conosco", click a job, read the URL host:
`*.gupy.io` → already covered · `job-boards.greenhouse.io/X` or
`jobs.lever.co/X` → provide `X` · `*.myworkdayjobs.com` / `smartrecruiters.com`
/ `*.abler.com.br` / `*.inhire.app` → flag it as a new connector to build.
