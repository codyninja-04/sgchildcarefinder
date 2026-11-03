# SGChildcareFinder

Finding infant care in Singapore usually means calling a dozen centres one by one to ask if they have space, then keeping track of who said what in a spreadsheet. SGChildcareFinder puts that in one place.

- **Find centres near you.** Every ECDA licensed centre, sorted by distance from your home, with ECDA's vacancy indicator for the month you want to start.
- **See what you'd really pay.** Basic and Additional Subsidy worked out from ECDA's published tables for your household income, including the wider bands that start on 1 Jan 2027.
- **Track every waitlist.** Log where you registered, your place in line, the fee quoted and every call. The board flags offers that need a reply, follow ups that are due, and centres that now show space.
- **Ask about care.** Claude answers the bigger questions (infant care, nanny or grandparents, tax relief, how early to register) using your family's details, and explains your subsidy in plain English.

It does not register your child anywhere and it does not show live vacancies. Registration still happens with the centre or through LifeSG, and the vacancy indicator is what centres report to ECDA each month.

## Stack

Next.js 14 (App Router, PWA manifest), TypeScript in strict mode, Supabase (Postgres, RLS, Google sign in), Claude through the Anthropic SDK, Mapbox GL, Tailwind CSS. Vitest for tests.

## Where the data comes from

| What | Source |
| --- | --- |
| Centres, contact details, hours, vacancy | ECDA, [Listing of Centres](https://data.gov.sg/datasets/d_696c994c50745b079b3684f0e90ffc53/view) on data.gov.sg |
| Fees by class, programme and citizenship | ECDA, [Listing of centres' programme offerings and fees](https://data.gov.sg/datasets/d_44cfe12f2858ae503a093dfc075a28be/view) |
| Coordinates for centres and home addresses | OneMap search API (SLA) |
| Subsidy amounts and income bands | ECDA subsidy tables for infant care and childcare, updated 6 Oct 2026 |

ECDA's listing gives each centre's vacancy for the next seven months as Available, Limited or Full, per class (infant, playgroup, N1, N2, K1, K2). That's the closest thing to vacancy data that's public, so the app uses it, but it's labelled as a guide everywhere it shows up.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in the keys
```

1. Create a Supabase project and run `supabase/migrations/001_initial_schema.sql` in the SQL editor.
2. Turn on Google under Authentication, Providers, and add `http://localhost:3000/auth/callback` as a redirect URL.
3. Load the centres:

   ```bash
   npm run import:ecda -- --limit 50    # quick first try
   npm run import:ecda                  # all ~1,870 centres
   ```

   The first full run takes around 15 minutes because OneMap only allows a few lookups a second. Later runs reuse stored coordinates, so only new or moved centres are looked up. ECDA refreshes the listing monthly, so run it once a month. Add `--dry-run` to fetch and parse without touching Supabase.

4. `npm run dev` and open http://localhost:3000.

### Environment

| Variable | Used for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The app |
| `SUPABASE_SERVICE_ROLE_KEY` | The importer only. Never used by the web app |
| `ANTHROPIC_API_KEY` | Subsidy explanations and Q&A. Everything else works without it |
| `CLAUDE_MODEL` | Optional, defaults to `claude-sonnet-5-5` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Map view. The list works without it |
| `DATA_GOV_SG_API_KEY` | Optional, raises data.gov.sg's rate limit for the importer |
| `ENFORCE_PRO` | Set to `true` to apply the free plan limits |

## Scripts

```bash
npm run dev          # local dev server
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
npm test             # vitest
npm run import:ecda  # pull ECDA data into Supabase
```

## How it fits together

```
app/
  (auth)/login, signup          Google sign in
  (app)/search                  centre finder, list and map
  (app)/centre/[id]             vacancy grid, fees, subsidy, details
  (app)/waitlist                waitlist board and log
  (app)/subsidy                 calculator with Claude explanation
  (app)/qa                      care Q&A, streamed
  (app)/settings                family details
  api/                          route handlers for all of the above
lib/
  subsidy.ts                    ECDA subsidy tables and the estimate
  levels.ts                     which class a child joins, vacancy lookups
  search.ts                     ranking and filtering for search
  ecda.ts                       parsing ECDA's datasets
  onemap.ts                     geocoding
  waitlist.ts                   what needs attention on the board
  claude/                       prompts for the explainer and Q&A
scripts/import-ecda.ts          monthly data import
supabase/migrations/            schema and RLS
tests/                          unit tests, including a real ECDA record
```

A few decisions worth knowing about:

- **Subsidy maths is plain code, not Claude.** `lib/subsidy.ts` encodes ECDA's tables, the minimum co-payment, per capita income for households of five or more, and the rule that gives low income families full childcare subsidy even when the mother isn't working. The rate year is picked from the start date, so a January 2027 start uses the 2027 bands. Claude only explains the result, through a forced tool call, and the figures returned are always ours.
- **Fees are per class and citizenship.** ECDA lists different fees for Singapore Citizen, PR and other children, so `centre_fees` stores the whole schedule and search uses the one that matches your child.
- **Plan changes are guarded in the database.** A trigger stops users editing their own `plan` column, since a column level revoke wouldn't beat Supabase's table level grant.
- **Pro limits are off by default.** The free plan caps (3 tracked centres, 10 questions a month) only apply with `ENFORCE_PRO=true`. Billing isn't wired up yet.

## Not built, on purpose

- Submitting registrations. Parents register directly with centres or through LifeSG.
- Real time vacancy. It isn't public. The app shows ECDA's monthly indicator and says so.
- KiFAS for kindergartens. Kindergarten fees are shown, but the subsidy estimate only covers infant care and childcare.

## Still to do

- Stripe for the $4 Pro plan
- Email or push reminders for offer deadlines and follow ups
- A scheduled job to run the ECDA import monthly
