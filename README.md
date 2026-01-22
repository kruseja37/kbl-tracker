# KBL Tracker

A comprehensive baseball game tracker for Super Mega Baseball 4 (SMB4), designed to track statistics, Fame events, and player performance across games and seasons.

## Features

- **At-Bat Tracking**: Record every at-bat with detailed outcomes (hits, walks, strikeouts, etc.)
- **Fame System**: Track memorable moments (Fame Bonuses ⭐) and embarrassing moments (Fame Boners 💀)
- **Live Stats**: Real-time statistics combining season totals with current game performance
- **Game Persistence**: Games auto-save and can be recovered after page refresh
- **Season Aggregation**: Stats automatically roll up from games to season totals

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Storage**: IndexedDB (client-side persistence)
- **Backend**: Supabase (optional, for cloud sync)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
kbl-tracker/
├── src/
│   ├── components/GameTracker/  # Main game tracking UI
│   ├── hooks/                   # React hooks (Fame detection, persistence, stats)
│   ├── utils/                   # Storage and calculation utilities
│   ├── types/                   # TypeScript type definitions
│   └── tests/                   # Test files
├── spec-docs/                   # Detailed specifications
│   ├── SPEC_INDEX.md           # Start here for documentation
│   ├── archive/                # Superseded specs
│   └── data/                   # CSV data and templates
└── reference-docs/              # External reference materials
```

## Documentation

See `spec-docs/SPEC_INDEX.md` for a complete guide to the specification documents.

Key specs:
- `STAT_TRACKING_ARCHITECTURE_SPEC.md` - How stats flow from at-bat → game → season
- `FAME_SYSTEM_TRACKING.md` - Fame bonus/boner event system
- `KBL_XHD_TRACKER_MASTER_SPEC_v3.md` - Comprehensive master specification

## Development

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Preview production build
npm run preview
```

## License

Private project.
