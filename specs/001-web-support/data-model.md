# Data Model — Web Support

## Entities

- **Route**
  - id: string (required)
  - shortName: string
  - longName: string
  - color: string (hex)
  - textColor: string (hex)
  - type: enum ['subway','bus','rail','ferry','sir']
  - relationships: hasMany Stop; hasMany Vehicle; hasMany ServiceAlert
  - validation: id non‑empty; color fields match /^#?[0-9a-fA-F]{6}$/

- **Stop**
  - id: string (required)
  - name: string (required)
  - latitude: number (−90..90)
  - longitude: number (−180..180)
  - routes: string[] (route ids)
  - relationships: belongsToMany Route; hasMany ServiceAlert
  - validation: coords within bounds

- **Vehicle**
  - vehicleId: string (required)
  - routeId: string (required)
  - latitude: number
  - longitude: number
  - bearing: number?
  - speed: number?
  - timestamp: number (epoch seconds)
  - relationships: belongsTo Route
  - validation: coords within bounds; timestamp ≥ now − 10 min

- **ServiceAlert**
  - id: string (required)
  - title: string (required)
  - description: string
  - severity: enum ['info','warning','critical']
  - affectedRoutes: string[]
  - affectedStops: string[]
  - publishedAt: ISO8601
  - expiresAt: ISO8601?
  - relationships: belongsToMany Route; belongsToMany Stop
  - validation: severity in enum; publishedAt ≤ expiresAt (if set)

- **WebPreferences**
  - selectedRoutes: string[]
  - geolocationConsent: 'granted' | 'denied' | 'prompt'
  - notificationOptIn: boolean
  - subscriptions: string[] (route ids)
  - validation: ids exist in Route

## State & Transitions

- Vehicle positions refresh ≤20s; UI marks entries “stale” when >20s without update.
- Alerts list updates on interval; deduplicate by alert id.
- Preferences persisted in local storage (or AsyncStorage polyfill) on web.

## Notes

- Data comes from Google Directions (client) and Transiter/MTA (server APIs). When not available, degrade gracefully with scheduled info only.
