# PWA Setup — uhome

## Overview

uhome is built as a Progressive Web App (PWA) from the start. This document explains what PWA features are enabled and how they work.

## PWA Features (MVP)

### Enabled Features

- **Installability**: App can be installed on desktop and mobile devices
- **App Manifest**: Defines app name, icons, theme colors, display mode
- **Service Worker**: Minimal caching of static assets
- **Offline Shell**: Basic offline support for static assets

### Implementation

**Technology:** `vite-plugin-pwa`

**Configuration:**
- Service worker strategy: PrecacheManifest (caches static assets only)
- No runtime caching (keeps app fresh, no stale data)
- Auto-update on new builds
- Disabled in development (no dev caching issues)

## What's Cached

**Static Assets Only:**
- JavaScript bundles
- CSS files
- Images and icons
- HTML shell

**Not Cached:**
- API responses (Supabase queries)
- Dynamic content
- User data

## Installability

**Desktop:**
- Browser will show install prompt when criteria are met
- App installs as standalone application
- Appears in applications menu

**Mobile:**
- iOS Safari: Share → Add to Home Screen
- Android Chrome: Automatic install prompt or menu option
- App appears on home screen

## PWA Icons

**Required Sizes:**
- 192x192px (Android)
- 512x512px (Android, iOS)
- 180x180px (Apple touch icon)
- Favicon (32x32, 16x16)

**Location:** `public/` directory

## Testing PWA Features

**Local Testing:**
1. Build production bundle: `npm run build`
2. Preview production build: `npm run preview`
3. Open in browser
4. Check installability in DevTools → Application → Manifest

**Lighthouse Audit:**
- Run Lighthouse PWA audit
- Target: All PWA checks passing
- Score: 90+ for PWA category

## Future Enhancements (Post-MVP)

**Not in MVP but straightforward to add:**
- Runtime caching for API responses (Supabase queries)
- Offline data caching with IndexedDB
- Background sync for maintenance requests
- Push notifications
- Custom install prompt UI
- Update notification UI

These can be added incrementally without breaking existing functionality.

## Troubleshooting

**Service Worker Not Updating?**
- Clear browser cache
- Service worker auto-updates on new build

**Install Prompt Not Showing?**
- Ensure manifest is valid
- Check all required icons are present
- Verify HTTPS (required for PWA)

**Offline Mode Not Working?**
- MVP only caches static assets
- Dynamic content requires connection
- This is expected behavior for MVP

