# Feature & Improvement Pipeline

Ordered by impact vs effort. Items at the top are closest to ready.

---

## High priority

### Supabase Realtime sync
Subscribe to `purchase_history` and `shopping_items` changes via Supabase Realtime so changes made on another device (or browser tab) propagate without a manual refresh. Would replace the current `carter:synced` custom event with a proper push channel. Low code surface — just add a `supabase.channel(...)` subscription in the affected components and call `fetchItems` on INSERT/UPDATE/DELETE events.

### Lazy-load AddWishlistDialog
`AddWishlistDialog` is imported statically by `Wishlist`. The dialog is rarely opened but its form fields (Select, Textarea, priority badges) inflate the Wishlist chunk. Wrap with `next/dynamic({ ssr: false })` — same pattern used for recharts in Analytics. Should shave 10–15 KB off the Wishlist JS parse on first load.

### SW Background Sync API
The current write queue flushes on the `online` DOM event. If the app is in the background when connectivity returns, the event never fires until the user re-opens it. The Background Sync API (`ServiceWorkerRegistration.sync.register`) allows the browser to wake the SW and replay queued writes even when the app is closed. Requires storing the write queue in IndexedDB (SW can't read localStorage). Medium lift.

---

## Medium priority

### Upgrade localStorage cache to IndexedDB
`localStorage` is synchronous and limited to ~5 MB. For users with large purchase histories (500+ rows) the JSON parse/stringify on every cache write will start to lag. IndexedDB is async and supports structured data. The `idb` package (~3 KB) is the cleanest wrapper. `lib/data-cache.ts` would be the only file to change — the component API stays identical.

### Bundle analyser integration
Add `@next/bundle-analyzer` behind an env flag (`ANALYZE=true npm run build`) so we can see exactly what's in each route chunk over time. One-time 30-minute setup; prevents chunk bloat from creeping back in.

### Smart restock suggestions
In the Shopping tab, surface a "you usually buy X every ~N days" nudge next to items that appear frequently in `purchase_history`. The `avgDaysBetween` value is already computed in `AnalyticsView` — could be promoted to a shared hook and shown inline in the shopping list as a soft reminder badge.

---

## Lower priority / exploratory

### Barcode scan to add items
Use the device camera + a barcode decoding library (e.g. `@zxing/browser`) to scan product barcodes and auto-populate item name and category. Would significantly speed up building a full weekly shop from scratch.

### Budget / spend cap per category
Let the user set a monthly spend limit per category. Analytics would show a progress bar. Requires a new `budgets` table in Supabase and a settings screen.

### Shared lists
Allow two users to share a shopping list in real time (Supabase Realtime + RLS policy update). Useful for households. Significant auth + data model complexity.

### Remove `date-fns` if unused
Check whether `date-fns` is still referenced anywhere (`grep -r "date-fns" .`). If the only date formatting in the app is done by the custom `formatDate`/`formatRelative` utilities in `lib/utils.ts`, `date-fns` can be removed entirely (~25 KB gzipped saved).
