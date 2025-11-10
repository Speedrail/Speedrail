# Quickstart — Web Support Feature

## Prerequisites

- Node.js 18+
- npm 9+
- Expo CLI (optional): `npm i -g expo-cli`

## Configure environment

Create `.env` in repo root (do not commit secrets):

```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
# Optional: Realtime arrivals via Transiter (self‑hosted or provided)
EXPO_PUBLIC_TRANSITER_URL=https://your-transiter.example.com
# Optional: MTA BusTime API key (for bus stops, etc.)
EXPO_PUBLIC_MTA_BUS_API_KEY=your_bus_key_here
```

Ensure your Google Maps key is referrer‑restricted to your dev and prod domains.

## Install and run (web)

```
npm install
npm run web
```

Open the local URL in a supported desktop browser (latest 2 versions of Chrome/Firefox/Safari/Edge).

## Verify

- Navigation is keyboard operable with visible focus.
- Live Tracking view renders the web map once implemented (initially a placeholder).
- If Transiter URL is set, arrivals display with a “Live” badge; otherwise scheduled details or none.

## Notes

- MVP excludes Web Push; notifications are in‑app banners/toasts.
- Keep TypeScript strict; fix all lint warnings before commit.
