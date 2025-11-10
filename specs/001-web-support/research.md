# Phase 0 Research — Web Support

## Decisions

- **Map provider (web)**
  - Decision: Google Maps JavaScript API
  - Rationale: Aligns with spec (FR-014), rich transit rendering, reliable tiles, stable quota/SDK
  - Alternatives: Mapbox GL (strong styling but account/migration overhead), Leaflet (lighter but missing out-of-box transit + directions)

- **Notifications (web)**
  - Decision: In-app banners/toasts only for MVP (no Web Push)
  - Rationale: Matches spec (FR-015), avoids service worker + permission complexity for MVP
  - Alternatives: Web Push via service worker (adds complexity and user friction); defer to post‑MVP

- **Browser support**
  - Decision: Desktop only; last two versions of Chrome/Firefox/Safari/Edge
  - Rationale: Matches spec (FR-016); keeps testing surface manageable
  - Alternatives: Mobile web (out of scope for MVP)

- **Testing strategy**
  - Decision: Unit: Jest + React Testing Library. E2E (web): Playwright.
  - Rationale: Common React stack; Playwright has robust cross‑browser support.
  - Alternatives: Vitest/Cypress. Chosen tools are widely adopted and CI‑friendly.

- **Key management & security**
  - Decision: Use `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` with domain‑restricted referrers; never hardcode secrets.
  - Rationale: Prevent key leakage; follow least‑privilege.
  - Alternatives: Server proxy (adds backend complexity for MVP).

- **Live data updates**
  - Decision: Use Transiter if `EXPO_PUBLIC_TRANSITER_URL` is configured for arrivals; otherwise graceful fallback to scheduled/static or omit arrivals.
  - Rationale: Works with or without self‑hosted Transiter; preserves UX with clear “stale” indicators.
  - Alternatives: Build our own aggregator (out of scope for MVP).

- **Web map implementation pattern**
  - Decision: Implement `components/map-view-wrapper.web.tsx` using Google Maps JS API (dynamic script loader), with overlays for route polylines, stop markers, and live vehicle markers (refresh ≤20s).
  - Rationale: Clean platform split via `*.web.tsx`; native uses `expo-maps`.
  - Alternatives: Single abstraction with custom renderer (adds complexity).

- **Accessibility**
  - Decision: Keyboard operable navigation; visible focus ring; ARIA roles/labels for controls; color contrast per WCAG 2.1 AA.
  - Rationale: Meets spec and constitution gates.
  - Alternatives: None acceptable.

- **Performance**
  - Decision: Lazy‑load Google Maps script; cluster or limit markers for heavy views; batch refresh; avoid long frames; measure first map paint ≤3s.
  - Rationale: Aligns with performance budgets; keeps UI smooth.

## Clarifications resolved

- Testing: Adopt Jest + RTL + Playwright.
- Scale/Scope: Client‑side only; no new backend for MVP. Performance budgets apply at device/runtime level.
- Browser targets: Desktop only (confirmed).

## Implementation notes (non‑binding)

- Use an internal script loader to insert the Google Maps JS `<script>` with the API key.
- Draw route polylines using encoded polylines from directions API where available.
- For arrivals, if Transiter not configured, show scheduled details and omit realtime badge.

All NEEDS CLARIFICATION items in the plan are addressed above.
