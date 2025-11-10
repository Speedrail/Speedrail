---

description: "Tasks for 001-web-support"
---

# Tasks: Web Support (Maps, Navigation, Notifications)

**Input**: Design documents from `/specs/001-web-support/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

Tests are OPTIONAL; each story lists an Independent Test for manual verification.

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create web API key env var EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in .env
- [ ] T002 [P] Add optional EXPO_PUBLIC_TRANSITER_URL and EXPO_PUBLIC_MTA_BUS_API_KEY in .env
- [X] T003 [P] Add @types/google.maps as devDependency in package.json
- [X] T004 [P] Ensure strict TypeScript enabled in tsconfig.json

---

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T005 Create Google Maps JS loader util (idempotent) in utils/google-maps-loader.web.ts
- [X] T006 Implement Google Maps-backed MapView wrapper in components/map-view-wrapper.web.tsx
- [X] T007 [P] Add google.maps types to compilerOptions in tsconfig.json

Checkpoint: Foundation ready — story work can start.

---

## Phase 3: User Story 1 - View live transit map on web (Priority: P1) 🎯 MVP

Goal: Interactive Google Map with route polyline, stop markers, and live refresh (≤20s).
Independent Test: Open Live Tracking on desktop browser → base map renders; route/stops visible; arrivals refresh ≤20s with “last updated” and stale indicator when >20s.

- [ ] T008 [US1] Replace placeholder and render base map using MapView wrapper in components/live-tracking-view.web.tsx
- [ ] T009 [US1] Draw route polyline via GoogleMapsService.decodePolyline in components/live-tracking-view.web.tsx
- [ ] T010 [US1] Render stop markers for transit steps in components/live-tracking-view.web.tsx
- [ ] T011 [US1] Refresh arrivals ≤20s using transiterAPI.getStopArrivals and show "Last updated" in components/live-tracking-view.web.tsx
- [ ] T012 [P] [US1] Add "Center on my location" using Geolocation API in components/live-tracking-view.web.tsx
- [ ] T013 [P] [US1] Add accessible toggles for overlays (route/stops/vehicles) in components/live-tracking-view.web.tsx

Checkpoint: US1 independently demoable on web.

---

## Phase 4: User Story 2 - Navigate across pages on web (Priority: P2)

Goal: Accessible keyboard navigation and deep links across tabs.
Independent Test: Keyboard-only focus/activation works; deep links open correct view; Back/Forward restores view state.

- [ ] T014 [P] [US2] Add roles/labels and visible focus styles to tabs in components/tab-bar.tsx
- [ ] T015 [P] [US2] Support Left/Right + Enter/Space keyboard handling in components/tab-bar.tsx
- [ ] T016 [P] [US2] Parse deep-link params (start,dest) and prefill in app/(tabs)/index.tsx
- [ ] T017 [US2] Preserve filter state across history in app/(tabs)/navigation.tsx

Checkpoint: US2 independently testable.

---

## Phase 5: User Story 3 - Receive service alert notifications (Priority: P3)

Goal: In-app alert banners/toasts on web (no Web Push for MVP).
Independent Test: Opt-in → new alert surfaces as in-app banner within 60s; works even if permission denied.

- [ ] T018 [P] [US3] Create web alert banner that polls fetchServiceAlerts in components/alert-banner.web.tsx
- [ ] T019 [US3] Mount alert banner globally across tabs in app/(tabs)/_layout.tsx
- [ ] T020 [P] [US3] Add opt-in toggle and persist preference in app/(tabs)/notifications.tsx

Checkpoint: US3 independently testable.

---

## Phase N: Polish & Cross-Cutting

- [ ] T021 [P] Update web key setup and domain restrictions in specs/001-web-support/quickstart.md
- [ ] T022 [P] Reduce verbose console logging in services/google-maps-api.ts
- [ ] T023 Code cleanup and stronger types in components/live-tracking-view.web.tsx
- [ ] T024 [P] Add brief web support notes to README.md

---

## Dependencies & Execution Order

- Setup (P1) → Foundational (P2) → User Stories (P3+)
- US1 depends on Phase 2 only.
- US2 depends on Phase 2 only.
- US3 depends on Phase 2 only.

### Parallel Opportunities

- [P] tasks within phases: T002,T003,T004,T007,T012,T013,T014,T015,T016,T018,T020,T021,T022,T024
- Different user stories can proceed in parallel after Phase 2.

### Implementation Strategy

- MVP First: Complete Phase 1 → Phase 2 → Phase 3 (US1). Validate and demo.
- Incremental: Add US2, then US3, validating each story independently.
