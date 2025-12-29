# Framework Decision — uhome

## Decision: Vite + React

After evaluating Vite + React vs Next.js for uhome's requirements, **Vite + React** was chosen as the framework.

## Rationale

### Why Vite + React

1. **MVP Alignment**: Pure client-side app matches MVP scope (no SSR needed)
   - Dashboard views with data from Supabase
   - Client-side forms and interactions
   - No SEO requirements (authenticated app)
   - No server-side rendering benefits for MVP

2. **React Native Parity**: Pure React components easily portable to React Native
   - No framework abstractions (server components, file-based routing)
   - Components can be directly adapted for React Native
   - Business logic hooks easily shared

3. **Simplicity**: Fewer abstractions align with "favor clarity over cleverness"
   - Less magic, more explicit code
   - Easier to reason about
   - Faster development iteration

4. **PWA Ready**: `vite-plugin-pwa` provides all needed PWA features
   - Manifest generation
   - Service worker setup
   - Installability

5. **Tool Compatibility**: Works perfectly with chosen tools
   - Tailwind CSS: Native Vite support
   - shadcn/ui: Perfect compatibility (React-agnostic)
   - Supabase: Excellent client-side integration

### Why Not Next.js

- **React Native Parity**: Server components and file-based routing don't translate to RN
- **SSR Complexity**: Introduces patterns user wants to avoid for MVP
- **Overengineering**: SSR/SSG not needed for authenticated dashboard app
- **More Abstraction**: Harder to reason about for MVP simplicity goals

## Architecture

**Stack:**
- **Framework**: Vite + React (TypeScript)
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (Radix UI primitives)
- **State**: React hooks + Context (localized state, avoid global store)
- **Data**: Supabase client (browser-side queries)
- **PWA**: `vite-plugin-pwa`

## PWA Strategy

**Implementation:**
- `vite-plugin-pwa` handles:
  - Web App Manifest (name, icons, theme, display mode)
  - Service Worker (caching, offline support)
  - Install prompts
  - Update notifications

**PWA Features for MVP:**
- Basic offline support (cache static assets)
- Installability (Add to Home Screen)
- App-like experience (standalone display mode)
- Future: Offline data caching (post-MVP)

**Not in MVP:**
- Advanced offline sync
- Background sync
- Push notifications

## React Native Parity Path

**Future Strategy:**
- Share `src/components/ui/` (shadcn components adapted for RN)
- Share `src/lib/` utilities (Supabase client works in RN)
- Share business logic hooks
- Separate routing (React Router web vs React Navigation RN)
- Separate platform-specific code in `src/platforms/web/` and `src/platforms/native/`

This architecture makes RN migration straightforward.

