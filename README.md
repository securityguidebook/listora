# Carter

Smart shopping & wishlist PWA — usable on day 1 from web or iPhone home screen.

## Features

- **Shopping List** — add items with category, quantity, notes, section, and price. Voice input supported (Web Speech API). Check off items to record purchase history
- **Wishlist** — track things you want with priority, price, and URL. Mark as purchased to record to price history
- **Templates** — colour-coded post-it cards of reusable lists (recipes, hiking, weekly shop). One tap to add all items to your shopping list
- **Receipts** — price history and price-spy view. Browse every item you've bought, see best price, average price, and full purchase timeline. Toggle between "By Item" and "By Store" views
- **Analytics** — purchase frequency, item trends, category breakdown, monthly spend
- **PWA** — installable on iPhone via Safari → Share → Add to Home Screen. Works fully offline after first load — data is cached locally and writes are queued and replayed when connectivity returns

## Stack

- **Frontend**: Next.js 15 App Router + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Hosting**: Cloudflare Pages

## Local setup

```bash
cp .env.example .env.local
# Fill in your Supabase URL and anon key

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. In the SQL editor, run `supabase/migrations/001_initial_schema.sql`
3. Copy your project URL and anon key into `.env.local`

## Cloudflare Pages deployment

### Via GitHub Actions (recommended)

Add these secrets to your GitHub repo:

| Secret | Where to find |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare → Account Home → right sidebar |

Push to `main` — GitHub Actions builds and deploys automatically.

### Manual

```bash
npm run deploy
```

## PWA icons

Replace `public/icons/icon-192.png` and `public/icons/icon-512.png` with real PNG icons.

A helper script generates placeholder SVGs:

```bash
node scripts/generate-icons.mjs
```

## Project structure

```
app/
  (app)/          # Authenticated app pages (shopping, wishlist, templates, analytics, receipts)
  login/          # Auth pages
  register/
components/
  shopping/       # Shopping list components
  wishlist/       # Wishlist components
  templates/      # Template card + dialog
  analytics/      # Charts and stats
  receipts/       # Price history / receipts view
  ui/             # Button, Input, Dialog, Select primitives
lib/
  supabase/       # Browser + server Supabase clients
  data-cache.ts   # Two-layer local cache (in-memory + localStorage) + offline write queue
  types.ts        # Shared TypeScript types
supabase/
  migrations/     # SQL schema + RLS policies
```
