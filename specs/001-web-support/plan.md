# Implementation Plan: Web Support (Maps, Navigation, Notifications)

**Branch**: `[001-web-support]` | **Date**: 2025-11-09 | **Spec**: /home/cresqnt/Documents/EthanDevCode/Speedrail/specs/001-web-support/spec.md
**Input**: Feature specification from `/specs/001-web-support/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Deliver desktop web support focused on three pillars:
1) Interactive map using Google Maps on web with route/stop overlays and live vehicle updates (≤20s cadence).
2) Accessible page navigation across core views with deep-linking and keyboard support.
3) In-app notifications for service alerts (no background Web Push for MVP).

Initial approach: integrate Google Maps JavaScript API for web rendering, reuse existing services for directions (Google) and alerts/data (MTA/Transiter where available), and add web-specific UI to replace current placeholders.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.9 + Expo SDK 54 + React 19 + React Native 0.81 (web + native)  
**Primary Dependencies**: Expo Router, React Native Web, Google Maps JavaScript API (web), expo-maps (native), expo-location, expo-notifications (mobile), MTA GTFS/Alerts, Transiter (optional)  
**Storage**: N/A  
**Testing**: Jest + React Testing Library (unit), Playwright (web E2E)  
**Target Platform**: Desktop web only for MVP (latest 2 versions Chrome/Firefox/Safari/Edge)  
**Project Type**: Single Expo application (mobile + web targets)  
**Performance Goals**: Map loads ≤3s; live markers refresh ≤20s; 60fps interactions/scrolling  
**Constraints**: No Web Push for MVP; do not expose secrets; use `EXPO_PUBLIC_*` keys with referrer restrictions; TypeScript strict; no source comments  
**Scale/Scope**: Client-only MVP (no new backend), desktop web only; adhere to performance budgets and accessibility targets

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Type safety: `tsc --noEmit` with `strict` must pass for new web code.
- Lint/format: ESLint/Prettier pass with zero warnings for new/changed files.
- Comment scanner: No inline/block comments in source; explanations live in Markdown.
- Performance budgets: p95 ≤2s cold start to first interactive screen; p95 ≤200ms interaction; 60fps map/scroll.
- UX consistency: Reuse shared components/tokens; accessible labels, focus, contrast.

Status: PASS (plan introduces no violations; enforce during implementation and review).

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
```text
app/
components/
contexts/
services/
hooks/
constants/
assets/
utils/
web/
specs/001-web-support/
```

**Structure Decision**: Single Expo app targeting mobile and web. Web-specific UI lives in `*.web.tsx` components (e.g., `components/map-view-wrapper.web.tsx`, `components/live-tracking-view.web.tsx`) that integrate Google Maps on web while native uses `expo-maps`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
