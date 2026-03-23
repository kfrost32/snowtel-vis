# CLAUDE.md

## Commands

```bash
npm run dev       # Start dev server (Turbopack) at localhost:3000
npm run build     # Production build
npm run lint      # ESLint
```

No test suite exists.

## Routes

- `/` — Dashboard with national overview, regional gauges, biggest movers
- `/map` — Full-viewport interactive MapLibre map with sidebar filters
- `/station/[triplet]` — Station detail (triplet uses dashes in URL, e.g., `669-CO-SNTL`)
- `/rankings` — Sortable/filterable station rankings table
- `/compare` — Multi-station comparison tool (URL param: `?stations=`)
- `/api/stations` — All stations with current conditions (1hr cache)
- `/api/stations/[triplet]` — Single station season-to-date (4hr cache)
- `/api/stations/[triplet]/historical` — Period-of-record peak SWE (24hr cache)

## Architecture

### Data layer — live API with server-side caching

Data flows from the NRCS CSV Report Generator through Next.js API routes:
- `lib/snotel-csv.ts` — URL builder + CSV parser for NRCS Report Generator
- API routes in `app/api/` serve as caching proxy with in-memory Map + TTL
- Station metadata loaded from static `data/stations.json` (GeoJSON from egagli/snotel_ccss_stations)
- `lib/stations.ts` — parses GeoJSON, builds station lookup indexes

### Hooks

- `hooks/useStationList` — fetches all stations with current conditions from `/api/stations`
- `hooks/useSeasonData(triplet)` — fetches season-to-date data for a single station
- `hooks/useHistoricalData(triplet)` — fetches period-of-record historical data

### Theming and styling

**Theme:** `lib/theme.ts` — cool-gray winter palette. `theme` (grays), `snowColors` (condition colors + metric colors), `chartColors`, `yearColors`, `chartTooltipStyle`.

**Fonts:** DM Sans (body/headings via `font-sans`) and IBM Plex Mono (data/labels via `font-mono`).

**Formatting:** `lib/formatting.ts` has all formatters (formatSwe, formatSnowDepth, formatTemp, formatElevation, formatPctOfNormal, formatPrecip, formatChange, etc.).

**Colors:** `lib/colors.ts` maps % of normal values to condition levels, colors, labels, and map marker colors.

### Components

All components live in `components/`. Key components:
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

- `lib/water-year.ts` — water year date math (Oct 1 start)
- `lib/geo.ts` — haversine distance, find nearest stations
- `lib/constants.ts` — SNOTEL states, regions, element codes
- `lib/stations.ts` — station data loader with urlTriplet/parseTripletFromUrl helpers
