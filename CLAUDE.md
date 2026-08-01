# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Dev server (Vite)
npm run build     # Production build + PWA service worker generation
npm run preview   # Preview production build locally
npm run lint      # ESLint
```

No test suite exists in this project.

After `npm run build`, deploy by pushing to `origin/main` — the remote is https://github.com/lacteoslatoba/ventas.git.

## Architecture

**Stack:** React 19 + Vite + Zustand + Supabase + TailwindCSS. PWA (vite-plugin-pwa). Capacitor for Android packaging. No TypeScript.

### Single Store (`src/store.js`)

All application state lives in one Zustand store with `persist` middleware (localStorage key: `ventas-quesos-storage`, version 3). Every mutation sets `synced: false` on the affected item, then immediately calls `syncToSupabase()`.

**Two roles:**
- `admin` — hardcoded id `'admin'`, email `administrador@lacteoslatoba.local`, pin `5151`
- `repartidor` — regular users from the `users` table, email pattern `{name}@lacteoslatoba.local`

**Auth flow:** Online → Supabase Auth → fetches user row by `auth_id`. Offline → local PIN match against `state.users`. Session restored on reload via `initAuth()` called in `App.jsx`.

### Supabase Column Naming — Critical Pattern

PostgreSQL returns all column names in **lowercase**. The app uses **camelCase** internally. The `normalizeRow` function inside `fetchFromSupabase` maps them on read:

| Table | Supabase column | App field |
|-------|----------------|-----------|
| `products` | `pricea`, `priceb`, `pricec` | `priceA`, `priceB`, `priceC` |
| `users` | `pricelist` | `priceList` |
| `sales` | `userid`, `clientid`, `paymentmethod` | `userId`, `clientId`, `paymentMethod` |
| `clients` | `userid` | `userId` |
| `expenses` | `userid` | `userId` |

`syncToSupabase` does the reverse: maps camelCase → lowercase before upsert, filtered by `cloudColumns` (the actual columns known from the last fetch). **Any new camelCase field added to a table must be added to both `normalizeRow` (read) and the safePayload mapping (write).**

### Data Sync Flow

1. **Read:** `fetchFromSupabase()` → `select('*')` all tables → `normalizeRow` → `mergeStateHelper` (keeps unsynced local items, replaces rest with remote)
2. **Write:** mutations set `synced: false` → `syncToSupabase()` → upserts only pending items → marks them `synced: true`
3. **Conflict:** local unsynced item always wins over remote version of the same `id`

### ticket_config Serialization

The `ticket_config` table has limited columns (`id`, `header`, `footer`, `doubleCopy`, `centerTotal`, `spaceBetweenItems`, `showCashAndChange`). Extra fields are packed into `footer` as `JSON_CONFIG:{...json, _realFooter: "..."}`. On read, this is unpacked and merged. `showFooterLine1`/`showFooterLine2` are always forced to `true` and never stored in Supabase.

Column aliases: `header` ↔ `businessName`, `footer` ↔ `footerLine1`, `doubleCopy` ↔ `printCopy`.

### RLS (Row Level Security)

Policies are defined in `supabase_rls_setup.sql`. Key helpers:
- `is_admin()` — checks `auth.jwt() ->> 'email' = 'administrador@lacteoslatoba.local'`
- `my_user_id()` — returns `id` from `public.users` where `auth_id = auth.uid()`

Client/data filtering by repartidor is done **in the frontend** (not RLS), because `clients_read` uses `USING (true)`. The UI applies `c.userId === currentUser?.id` in `Clients.jsx` and `Sales.jsx`.

### Product Pricing

Each product has `priceA`, `priceB`, `priceC`. Each user (`repartidor`) has a `priceList` field (`'A'`, `'B'`, or `'C'`). `Sales.jsx` uses `getPrecio(p)` to select the right price. Always access as `p.priceA || p.pricea` (both camelCase and lowercase) because some items may come from localStorage before normalization.

### Routing & Layout

- `App.jsx` renders `<Login />` when `currentUser` is null; otherwise a `<Router>` with the full layout.
- Mobile: `MobileHeader` (top) + `BottomNavigation` (fixed bottom, 60px).
- Desktop: `<Sidebar />` (left).
- Admin-only routes (`/menu`, `/productos`, `/inventario`, `/usuarios`, `/impresora`, `/ticket`) are wrapped in `<AdminRoute>`.
- `--vh` CSS variable is set to `window.innerHeight * 0.01` to handle mobile browser chrome; use `calc(var(--vh, 1vh) * 100)` instead of `100vh`.

### Report Exports (`src/lib/reportExports.js`)

- `generateReportPDF` — jsPDF + jspdf-autotable, A4 portrait, monochrome theme
- `generateReportImage` — html2canvas renders an HTML template to PNG and downloads it

Both are lazy-imported to avoid bloating the main bundle.

### Bluetooth Printing

`src/lib/bluetoothPrinter.js` implements ESC/POS over Web Bluetooth. The global connection lives on `window.__btPrinter`. `useBTPrinter` hook (mounted in `App.jsx` via `<PrinterAutoConnect />`) handles auto-reconnect. `printTicket()` is called from `Sales.jsx` after a sale.
