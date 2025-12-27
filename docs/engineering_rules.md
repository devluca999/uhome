# Engineering Rules — haume

## General Rules
- Favor clarity over cleverness
- Prefer explicitness over abstraction
- Avoid premature optimization
- No feature creep beyond MVP scope

## UI Rules
- Do not change layouts without justification
- Do not introduce new UI paradigms
- Use light, shadow, blur, and motion to communicate state
- Avoid heavy borders or flat, lifeless surfaces
- Status should be communicated via tone and glow, not labels

## State Management
- Keep state localized where possible
- Avoid global state unless necessary
- Prefer simple patterns over complex stores

## Styling
- Tailwind-first styling
- Centralize design tokens (colors, shadows, motion)
- Reusable components over page-specific hacks

## Data
- Supabase is the source of truth
- Tables should map cleanly to UI views:
  - users
  - properties
  - tenants
  - maintenance_requests
  - documents
  - rent_records

## Security
- Enforce role-based access at the database level
- Never trust client-side role checks alone
- No sensitive data exposed to tenants beyond their scope

## AI Usage (Cursor)
- Cursor should act as a senior engineer
- Cursor should not invent features
- Cursor should ask for clarification only if a decision affects architecture

If unsure, default to the simplest correct solution.

