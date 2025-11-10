# API Configuration and Safety for GitHub Pages

## API Configuration

### 1. Google Maps API Key
- **Storage**: Stored in GitHub Secrets as `GOOGLE_MAPS_API_KEY`
- **Access**: Injected during build time via GitHub Actions
- **Security**: Never exposed in client-side code

### 2. Environment Variables
```javascript
// In your app, access API keys securely:
const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
```

## Safety Measures

### 1. API Key Restrictions
Configure your Google Maps API key with these restrictions:
- **HTTP referrers**: `*.github.io/*` and `localhost:*`
- **API restrictions**: Enable only required APIs (Maps JavaScript API, Geocoding API, etc.)
- **Usage quotas**: Set appropriate daily quotas to prevent abuse

### 2. Build-time Security
- API keys are injected during the GitHub Actions build process
- No API keys are committed to the repository
- Production builds use environment variables, not hardcoded values

### 3. GitHub Pages Security
- **HTTPS enforced**: All traffic served over HTTPS
- **CORS headers**: Properly configured for API calls
- **Content Security Policy**: Consider adding CSP headers for additional security

### 4. Rate Limiting and Monitoring
- Monitor API usage through Google Cloud Console
- Implement client-side rate limiting
- Add error handling for API quota exceeded scenarios

## Setup Instructions

### 1. Add GitHub Secrets
In your GitHub repository:
1. Go to Settings → Secrets and variables → Actions
2. Add `GOOGLE_MAPS_API_KEY` with your Google Maps API key

### 2. Configure Google Maps API Key
1. Go to Google Cloud Console
2. Select your API key
3. Under "Application restrictions", add:
   - HTTP referrers: `*.github.io/Speedrail/*`
4. Under "API restrictions", enable only:
   - Maps JavaScript API
   - Geocoding API
   - Places API (if needed)

### 3. Enable GitHub Pages
1. Go to repository Settings → Pages
2. Source: Deploy from a branch
3. Branch: main / (root)
4. Select GitHub Actions as the deployment method

## Auto-build Configuration

The GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) automatically:
- Triggers on push to main branch
- Builds the web version using Expo
- Deploys to GitHub Pages
- Updates the live site

Your site will be available at: `https://[username].github.io/Speedrail/`
