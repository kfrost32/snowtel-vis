# CLAUDE.md

## Layout

npm workspaces monorepo:

- `apps/web` — Next.js app (Vercel root directory). Server-only code lives in `apps/web/lib` (NRCS fetching, API cache, SWR config); UI in `apps/web/components` and `apps/web/hooks`
- `packages/core` (`@snotel/core`) — platform-free logic and data shared by web and mobile: types, water-year math, envelope stats, basins, stations, spots, formatting, colors, theme tokens, plus shared JSON in `packages/core/data`. Imported as `@snotel/core/<module>` (source TS, transpiled by consumers). No DOM, React, or Node APIs here
- `apps/mobile` — Expo (SDK 58) iOS app. Expo Router with native tabs (Map, Favorites, Search) and a form-sheet station detail; MapLibre React Native map; SVG SWE chart. Talks to the deployed web API (`expo.extra.apiBase` in `app.json`). Needs Node 22+ (`nvm use 24`); native modules require a dev build (`npm run ios`), not Expo Go. Follow iOS 26 conventions: Liquid Glass (`expo-glass-effect`, `@expo/ui` `glassEffect`), SF Symbols, `PlatformColor` system colors, native sheets/menus/link previews. See `apps/mobile/AGENTS.md` before touching Expo APIs
- `scripts/` — data build scripts, run from the repo root

Shared behavior belongs in `packages/core` so both apps stay in sync: API paths (`endpoints.ts`), station stats (`station-stats.ts`), map layer styles (`map-style.ts`), colors and formatting. Apps only own their UI.

API changes must stay additive: installed mobile app versions keep calling older shapes.

## Commands

```bash
npm run dev        # Start web dev server (Turbopack) at localhost:3000
npm run build      # Production build of apps/web
npm run lint       # ESLint
npm run typecheck  # Typecheck packages/core
npm run ios        # Build and run the iOS app in the simulator (Node 24)
npm run mobile     # Start Metro for an installed dev build
```

No test suite exists.

## Routes

- `/` — Dashboard with national overview, regional gauges, biggest movers
- `/map` — Full-viewport interactive MapLibre map with sidebar filters
- `/station/[triplet]` — Station detail (triplet uses dashes in URL, e.g., `669-CO-SNTL`)
- `/rankings` — Sortable/filterable station rankings table
- `/compare` — Multi-station comparison tool (URL param: `?stations=`)
- `/api/stations` — All stations with current conditions (live SOAP fetch, 1hr CDN cache; falls back to last good fetch, then to `apps/web/data/station-conditions.json` seed)
- `/api/stations/[triplet]` — Single station season-to-date (4hr cache)
- `/api/basins/[huc]/season` — Region's current water-year average SWE (shared 1hr cache)
- `/envelopes/stations/[triplet].json`, `/envelopes/basins/[huc].json` — Static precomputed history (max/min/median by water-year day, plus per-year peak SWE for stations). Built by `node scripts/build-envelopes.mjs` (~30 min; raw NRCS responses cached in `node_modules/.cache/snotel-envelopes`), rebuilt yearly on Oct 2 by `.github/workflows/build-envelopes.yml`. Arrays are indexed by calendar row (Oct 1 = 1, Feb 29 = 152, 366 rows) like NRCS charts; `expandEnvelope` maps rows onto the current water year. Median peak, percentiles and percentile rank follow NRCS definitions. Per-year series for compare-year lines live in `/envelopes/years/`

## Architecture

### Data layer — live API with server-side caching

Data flows from the NRCS CSV Report Generator through Next.js API routes:
- `apps/web/lib/snotel-csv.ts` — URL builder + CSV parser for NRCS Report Generator
- API routes in `apps/web/app/api/` serve as caching proxy with in-memory Map + TTL
- Station metadata loaded from static `packages/core/data/stations.json` (GeoJSON from egagli/snotel_ccss_stations)
- `packages/core/src/stations.ts` — parses GeoJSON, builds station lookup indexes

### Hooks

- `hooks/useStationList` — fetches all stations with current conditions from `/api/stations`
- `hooks/useSeasonData(triplet)` — fetches season-to-date data for a single station
- `hooks/useHistoricalData(triplet)` — per-year peak SWE from the static station file plus the current season

### Theming and styling

**Theme:** `packages/core/src/theme.ts` — cool-gray winter palette. `theme` (grays), `snowColors` (condition colors + metric colors), `chartColors`, `yearColors`, `chartTooltipStyle`.

**Fonts:** DM Sans (body/headings via `font-sans`) and IBM Plex Mono (data/labels via `font-mono`).

**Formatting:** `packages/core/src/formatting.ts` has all formatters (formatSwe, formatSnowDepth, formatTemp, formatElevation, formatPctOfNormal, formatPrecip, formatChange, etc.).

**Colors:** `packages/core/src/colors.ts` maps % of normal values to condition levels, colors, labels, and map marker colors.

### Components

All web components live in `apps/web/components/`. Key components:
- `ChartCard` — bordered card with export-as-image functionality
- `StatCard` — metric display with count-up animation
- `SortableTable` — generic sortable table with type param
- `StationMap` — MapLibre GL JS map (dynamic import, no SSR)
- `SeasonChart` — Recharts area chart for season SWE vs median
- `PeakSweChart` — Recharts bar chart for historical peak SWE
- `PercentOfNormalGauge` — SVG arc gauge for % of normal
- `ConditionBadge` — color-coded condition pill
- `SparkLine` — tiny inline SVG chart
- `CommandSearch` — Cmd+K search across all stations
- `GlobalHeader`, `GlobalFooter`, `Section`, `SectionHeader`, `Tabs`

### Key utilities

- `packages/core/src/water-year.ts` — water year date math (Oct 1 start)
- `packages/core/src/geo.ts` — haversine distance, find nearest stations
- `packages/core/src/constants.ts` — SNOTEL states, regions, element codes
- `packages/core/src/stations.ts` — station data loader with urlTriplet/parseTripletFromUrl helpers
- `packages/core/src/spots.ts` — reference-only map layers for ski areas (OpenSkiMap via `node scripts/fetch-ski-areas.mjs` → `packages/core/data/ski-areas.json`, ODbL attribution required) and hand-curated backcountry spots (`packages/core/data/backcountry-areas.json`)
- `packages/core/src/basins.ts` — regional index (sum SWE / sum median). Stations count toward their own HUC plus NRCS iMap HUC associations from `packages/core/data/huc-associations.json` (regenerate with `node scripts/fetch-huc-associations.mjs`)
