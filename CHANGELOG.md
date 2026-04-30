# Changelog

## [0.2.0] — 2026-04-30

### Added
- **Receipts tab** — price history and price-spy view. Browse every item you've bought, see your best price, average price, and a full purchase timeline. Searchable by item name or category. Toggle between "By Item" and "By Store" views
- **Offline-first data layer** (`lib/data-cache.ts`) — all five tabs now read from a two-layer local cache (in-memory + `localStorage`) on mount. Data appears instantly on revisit with zero network wait. Works fully offline after first load
- **Offline write queue** — toggle, delete, edit, and category changes made while offline are queued in `localStorage` and automatically replayed when connectivity is restored
- **Auto-sync on reconnect** — `PWARegister` listens for the browser `online` event, flushes the pending write queue against Supabase, then signals all tabs to refresh their data
- **Voice input** on the shopping list quick-add bar (Web Speech API, where supported)
- **Section grouping** — shopping items can be grouped by store section (e.g. Woolworths, Chemist Warehouse) via the text parser
- **Price tracking** on shopping items and purchase history

### Changed
- **Navigation is instant on revisit** — removed `loading.tsx` Suspense boundaries that were causing a double-skeleton flash on every tab switch. React Concurrent Mode now keeps the current tab visible while the new one loads in the background
- **`getSession()` everywhere** — replaced all client-side `supabase.auth.getUser()` calls (network round-trips) with `supabase.auth.getSession()` (local cache read). Every write interaction is now one network call instead of two
- **Optimistic add** — adding items to the shopping list no longer triggers a full refetch. The insert returns the created rows via `.select()` and they're prepended to state immediately
- **Recharts code-split** — analytics charts are now a separate lazy-loaded chunk (~120 KB). They don't block the initial JS parse on any other tab
- **`requestAnimationFrame` for keyboard focus** — replaced `setTimeout(fn, 50)` delays with `requestAnimationFrame` so the keyboard appears in the same frame as the UI change
- **`useMemo` for derived data** — `groupBySection` in the shopping list and all analytics stat derivations (top items, monthly trend, category breakdown) are now memoised on the relevant data dependency
- **Service worker: stale-while-revalidate** — the app shell is now served from cache instantly on repeat visits and revalidated in the background, instead of waiting on the network
- **`manifest.json` icon purposes** — split `"any maskable"` into separate `"any"` and `"maskable"` entries per the Web App Manifest spec. Fixes broken PWA installation on Android
- README: corrected Next.js version (15, not 16), added Receipts to feature list

### Fixed
- Pre-existing build failures from unused imports (`SignOutButton` in app layout, `Trash2` in template dialog) and untyped SpeechRecognition references

---

## [0.1.0] — initial

- Shopping list with categories, quantity, notes
- Wishlist with priority, price, URL, notes
- Templates (reusable lists) with colour and emoji
- Analytics: monthly trend, category breakdown, top items by frequency
- Supabase auth (email + password)
- PWA manifest + service worker
- Cloudflare Pages deployment
