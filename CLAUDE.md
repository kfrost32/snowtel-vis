# CLAUDE.md

## Layout

npm workspaces monorepo:

- `apps/web` — Next.js app (Vercel root directory). Server-only code lives in `apps/web/lib` (NRCS fetching, snapshot cache, share metadata); UI in `apps/web/components` and `apps/web/hooks`
- `packages/core` (`@snotel/core`) — platform-free logic and data shared by web and mobile: types, water-year and date math, envelope stats, basins, stations, spots, storm detection, map layer styles, formatting, colors, theme tokens, plus shared JSON in `packages/core/data`. Imported as `@snotel/core/<module>` (source TS, transpiled by consumers). No DOM, React, or Node APIs here
- `apps/mobile` — Expo (SDK 58) iOS app. Expo Router with native tabs (Map, Stations, Search) and form-sheet station and region detail; MapLibre React Native map; SVG charts. Talks to the deployed web API (`expo.extra.apiBase` in `app.json`). Needs Node 22+ (`nvm use 24`); native modules require a dev build (`npm run ios`), not Expo Go. `apps/mobile/ios/` is generated and gitignored: after adding a native module or changing `app.json` plugins or permissions, run `npx expo prebuild --platform ios` before building. Follow iOS 26 conventions: Liquid Glass (`expo-glass-effect`, `@expo/ui` `glassEffect`), SF Symbols, `PlatformColor` system colors, native sheets/menus/link previews. See `apps/mobile/AGENTS.md` before touching Expo APIs
- `scripts/` — data build scripts, run from the repo root

Shared behavior belongs in `packages/core` so both apps stay in sync: API paths (`endpoints.ts`), station stats (`station-stats.ts`), map layer styles and feature builders (`map-style.ts`), storm detection (`storm.ts`), recent depth (`recent.ts`), colors and formatting. Apps only own their UI.

API changes must stay additive: installed mobile app versions keep calling older shapes.

## Commands

```bash
npm run dev                # Web dev server (Turbopack)
npm run build              # Production build of apps/web
npm run lint               # ESLint (apps/web, Next.js core-web-vitals + TypeScript rules)
npm run typecheck          # Typecheck packages/core
npm test                   # node:test suites in packages/core/test and apps/web/test (via tsx)
npm run ios                # Build and run the iOS app in the simulator (Node 24)
npm run mobile             # Start Metro for an installed dev build
npm run refresh-snapshots  # Fetch NRCS data and write Redis snapshots (needs Upstash env)
npm run build-spot-icons   # Render mobile spot icon PNGs from the shared SVG in core
```

## Routes

- `/` — Full-viewport MapLibre map with sidebar (metric, layers, state/elevation filters, favorites). `?station=` or `?basin=` opens a detail panel
- `/station/[triplet]` — Shareable station link (triplet uses dashes, e.g. `669-CO-SNTL`). Renders per-station metadata and a generated Open Graph image, then redirects to `/?station=`
- `/basins`, `/status`; `/map` redirects to `/`
- `/api/stations` — All 1,900 stations with current conditions (full records; kept for installed app versions)
- `/api/stations/readings` — Same data, compact: SNOTEL stations only as value rows plus a field list. Clients expand it with `unpackReadings` from `@snotel/core/readings`
- `/api/stations/recent` — Latest hourly snow depth and 24h change for every SNOTEL station
- `/api/stations/[triplet]` — Single station season-to-date with daily medians
- `/api/stations/[triplet]/hourly` — Last 7 days hourly depth, temperature and SWE
- `/api/basins/[huc]/season` — Region's current water-year average SWE
- `/envelopes/stations/[triplet].json`, `/envelopes/basins/[huc].json` — Static precomputed history (max/min/median by water-year day, plus per-year peak SWE for stations). Built by `node scripts/build-envelopes.mjs` (~30 min, still uses the NRCS SOAP service; raw responses cached in `node_modules/.cache/snotel-envelopes`), rebuilt yearly on Oct 2 by `.github/workflows/build-envelopes.yml`. Arrays are indexed by calendar row (Oct 1 = 1, Feb 29 = 152, 366 rows) like NRCS charts; `expandEnvelope` maps rows onto the current water year. Per-year series for compare-year lines live in `/envelopes/years/`

## Architecture

### Data layer — NRCS REST API, Redis snapshots

- `apps/web/lib/snotel-api.ts` fetches from the NRCS AWDB REST API. Requests are capped at 1,000 station-elements; a batch that fails is split down to the station NRCS can't serve, but if every batch fails it throws (outage)
- Date convention: REST dates a daily value (the midnight reading) as the end of the previous day. `fetchDailyData` shifts REST dates forward one day (`REST_DAILY_OFFSET_DAYS`) to the SOAP convention that the formatters (`formatReadingEndOfDay`), envelopes and water-year alignment assume. Hourly data needs no shift
- Snapshots live in Upstash Redis (`lib/snapshot-store.ts`, env `KV_REST_API_URL`/`KV_REST_API_TOKEN` or `UPSTASH_REDIS_REST_*`). `lib/snapshot-cache.ts` `getSnapshot` serves a snapshot while it is younger than `maxAge`, otherwise fetches live, saves the result and falls back to the stale snapshot (marked `stale: true`) when NRCS fails. Without Redis env it fetches live only
- `.github/workflows/refresh-snapshots.yml` runs `scripts/refresh-snapshots.ts` at ~7 and 11 AM Mountain: station list, every station's season, and regional averages. Hourly data (`recent`, per-station hourly) refreshes on demand; a station's hourly snapshot also expires when the bulk `recent` snapshot has a newer reading
- The station list keeps a station's last reading for up to 14 days when NRCS misses it; `lastUpdated` is the real reading date and the map fades stations more than a day behind
- Station metadata comes from static `packages/core/data/stations.json` (GeoJSON from egagli/snotel_ccss_stations); `packages/core/src/stations.ts` parses it and builds lookups

### Client caching

Web persists recent `/api/` SWR responses to localStorage (`lib/swr-config.tsx`, via `lib/stored-value.ts`); mobile persists API and envelope responses to expo-sqlite (`apps/mobile/src/lib/swr-cache.ts`). Both render saved data immediately and revalidate.

### Hooks (web)

- `useStationList` — compact readings expanded to full station records
- `useMapFilters` / `useMapSelection` — map page filter state and URL-synced station/basin selection
- `useSeasonData`, `useHourlyData`, `useRecentConditions`, `useHistoricalData`, `useEnvelopeData`
- `useFavorites`, `useMediaQuery` — built on `useSyncExternalStore` (no setState in effects)

### Theming and styling

**Theme:** `packages/core/src/theme.ts` — cool-gray winter palette. `theme` (grays), `snowColors` (condition, metric and snow-quality colors), `chartColors`, `yearColors`, `chartTooltipStyle`.

**Fonts:** DM Sans (body/headings via `font-sans`) and IBM Plex Mono (data/labels via `font-mono`).

**Formatting:** `packages/core/src/formatting.ts` has all formatters (formatSwe, formatSnowDepth, formatReadingEndOfDay, formatHourlyTime, formatDistance, formatChange, etc.).

**Colors:** `packages/core/src/colors.ts` maps % of normal values to condition levels, colors, labels, and map marker colors.

### Components (web)

All web components live in `apps/web/components/`. Key components:
- `StationMap` — MapLibre GL JS map (dynamic import, no SSR); basemap style is fetched once before the map is created
- `MapSidebar`, `MapControls`, `MapLegend` — map page chrome
- `StationDetailPanel`, `BasinDetailPanel` — detail overlays
- `EnvelopeChart`, `DepthTempChart`, `PeakSweChart`, `ChartCard` — charts
- `CommandSearch` — Cmd+K search across all stations

### Key utilities

- `packages/core/src/water-year.ts` — water year date math (Oct 1 start) and `shiftDate`
- `packages/core/src/storm.ts` — finds the latest storm in hourly data and rates snow-to-liquid ratio
- `packages/core/src/geo.ts` — haversine distance, find nearest stations
- `packages/core/src/constants.ts` — SNOTEL states, regions, element codes
- `packages/core/src/spots.ts` — ski areas (OpenSkiMap via `node scripts/fetch-ski-areas.mjs`, ODbL attribution required), hand-curated backcountry spots, and the shared spot icon SVG
- `packages/core/src/basins.ts` — regional index (sum SWE / sum median). Stations count toward their own HUC plus NRCS iMap HUC associations from `packages/core/data/huc-associations.json` (regenerate with `node scripts/fetch-huc-associations.mjs`)
- `packages/core/data/state-boundaries.json` — simplified Census state outlines for the 13 SNOTEL states (`node scripts/fetch-state-boundaries.mjs`), used for the state filter mask
