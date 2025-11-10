# Feature Specification: Web Support (Maps, Navigation, Notifications)

**Feature Branch**: `[001-web-support]`  
**Created**: 2025-11-09  
**Status**: Draft  
**Input**: User description: "I want you to add web support, this should include support for maps, navigation, notifications, etc."

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - View live transit map on web (Priority: P1)

As a web user, I can open the app in a supported browser and see an interactive map with transit routes, stops, and live vehicle positions so I can understand service status at a glance.

**Why this priority**: Core value of “web support” is map visibility and live data in the browser.

**Independent Test**: Launch the app in a clean profile, select a route, and verify the map renders, the route path and stops are visible, and vehicle positions update at a set interval.

**Acceptance Scenarios**:

1. **Given** a supported browser and network connectivity, **When** I open the live tracking view, **Then** I see a base map and can pan/zoom without errors.
2. **Given** routes are available, **When** I select a route, **Then** I see its path and stops drawn on the map and can toggle its visibility on/off.
3. **Given** live vehicle data is available, **When** vehicles change position, **Then** their markers update on the map at least every 20 seconds and show a “last updated” timestamp.

---

### User Story 2 - Navigate across pages on web (Priority: P2)

As a web user, I can navigate between primary pages (e.g., Home, Live Tracking, Settings) using a consistent, accessible navigation so I can reach key features quickly with mouse or keyboard.

**Why this priority**: Web “navigation” is required to make features discoverable and usable.

**Independent Test**: Using keyboard only, move focus through top-level navigation and activate each destination; verify deep links load the correct view and browser back/forward works.

**Acceptance Scenarios**:

1. **Given** the app header is visible, **When** I use Tab/Shift+Tab and Enter/Space, **Then** I can reach and activate each top-level page with a visible focus indicator.
2. **Given** I open a deep link to a specific feature view, **When** the page loads, **Then** the correct view is displayed and is navigable.
3. **Given** I use browser Back/Forward, **When** I navigate history, **Then** the previously viewed content is restored without breaking state or crashing.

---

### User Story 3 - Receive service alert notifications (Priority: P3)

As a web user, I can opt in to be notified of service alerts for selected routes so I’m informed of disruptions without constantly monitoring the map.

**Why this priority**: Notifications increase user awareness and reduce the need to poll the app.

**Independent Test**: After subscribing to a route and granting permission, a test alert triggers a browser notification (or in-app fallback) within 60 seconds.

**Acceptance Scenarios**:

1. **Given** I have not granted notification permission, **When** the app needs to notify me, **Then** I see a contextual permission prompt with a clear explanation and the app proceeds even if I dismiss it.
2. **Given** I opted-in and granted permission, **When** a new alert is published for my subscribed route(s), **Then** I receive a notification without needing the tab in focus.
3. **Given** notifications are denied or unsupported, **When** a new alert is published, **Then** I receive an in-app banner/toast as a fallback.

---

### Edge Cases

- Geolocation permission denied → app defaults to a sensible area and shows a message with a “Use my location” retry.
- Notifications blocked or not supported → show in-app fallback and a settings link to retry permission.
- Limited or offline connectivity → show last known data with a “stale data” indicator and retry/backoff logic.
- Browser lacks hardware acceleration/WebGL → degrade rendering to a compatible mode without blocking core usage.
- Data API errors, timeouts, or rate-limit responses → user sees error state and partial content continues to function.
- Multiple tabs open → deduplicate notifications to avoid spamming the same user.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: The system MUST render an interactive map in modern desktop browsers in a secure context (HTTPS).
- **FR-002**: Users MUST be able to pan/zoom the map and optionally center on their current location after explicit consent.
- **FR-003**: Users MUST be able to select one or more routes to display their paths and stops on the map and toggle them on/off.
- **FR-004**: The system MUST display live vehicle positions for visible routes and refresh them at least every 20 seconds, showing a “last updated” indicator.
- **FR-005**: The system MUST handle temporary data/API outages gracefully, showing the most recent known data with a “stale” indicator and automatic retries with backoff.
- **FR-006**: The system MUST provide accessible, keyboard-operable navigation to top-level pages with visible focus indicators and meaningful labels.
- **FR-007**: The system MUST support deep-linking to specific views (e.g., a particular route), restoring the relevant content when opened directly.
- **FR-008**: The system MUST allow users to opt in/out of notifications for service alerts and select which routes they want alerts for.
- **FR-009**: The system MUST request and manage browser notification permissions contextually and provide an in-app fallback when permission is denied or unsupported.
- **FR-010**: The system MUST display service alerts in-app (banner/toast/list) and notify opted-in users promptly when new alerts are available.
- **FR-011**: The system MUST be responsive across common desktop viewports without horizontal scrolling for primary flows.
- **FR-012**: The system MUST meet basic accessibility requirements (WCAG 2.1 AA for focus, contrast, semantics) for the added web features.
- **FR-013**: The system MUST avoid exposing secrets (e.g., API keys) to the public and operate safely under least-privilege principles for any web capabilities.
- **FR-014**: The system MUST use Google Maps as the web map provider and comply with provider attribution and Terms of Service.
- **FR-015**: The system MUST deliver service alerts as in-app notifications (toasts/banners); background Web Push is out of scope for MVP.
- **FR-016**: The system MUST support desktop browsers only for MVP: last two versions of Chrome, Firefox, Safari, and Edge.

Assumptions (non-binding until confirmed):

- Supported browsers are desktop-only: last two major versions of Chrome, Firefox, Safari, and Edge. Mobile web is out of scope for MVP.
- Live updates target ≤20s refresh cadence subject to upstream API rate limits.
- Notifications are in-app only for MVP; background Web Push is not required.

Dependencies:

- Transit data availability via existing backend/data sources (e.g., Transiter/MTA APIs), subject to rate limits and uptime.
- Google Maps web access with correct attribution and allowed referrers.
- Browser APIs for Geolocation and Notifications (with graceful fallback when unavailable).
- HTTPS hosting; service worker not required for MVP.

### Key Entities *(include if feature involves data)*

- **Route**: Identifier, name, color, path geometry, associated stops.
- **Stop**: Identifier, name, location (lat/lng), served routes.
- **Vehicle**: Identifier, route reference, current position, heading, updatedAt.
- **ServiceAlert**: Identifier, affected routes/stops, severity, title, description, publishedAt, expiresAt.
- **WebPreferences**: Selected routes, geolocation consent status, notification opt-in status and subscriptions.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: In supported browsers, users can load the map and display a selected route’s path and stops within 3 seconds on a typical broadband connection.
- **SC-002**: Live vehicle markers reflect backend updates within 20 seconds for at least 95% of updates during a 10-minute observation window.
- **SC-003**: Primary navigation is fully reachable and operable via keyboard, with zero critical accessibility violations for focus and contrast (WCAG 2.1 AA).
- **SC-004**: For opted-in users, service-alert notifications (browser or in-app fallback) appear within 60 seconds of alert availability in at least 95% of cases.
