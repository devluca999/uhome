# Project Context — haume

haume is a web-first PWA property management application designed for independent landlords, small developers, and their tenants.

The product emphasizes calm, trust, clarity, and neutrality between tenants and landlords. It intentionally avoids the heavy, corporate feel of traditional property management software.

haume supports two primary user roles:
- Landlord (property owner / manager)
- Tenant

The UI should feel minimalist yet expressive, with subtle glassmorphic surfaces, ambient hue-based state indicators, and gentle microinteractions inspired by iOS, Notion, and Linear.

A Lovable-generated UI exists at the following repository and should be used strictly as a **visual and interaction reference**, not as a codebase:
https://github.com/devluca999/haume-lvbl-UI.git

This repository is the source of truth. Cursor should:
- Preserve the visual intent shown in the Lovable UI
- Rebuild UI components cleanly and intentionally
- Avoid generic or boilerplate SaaS visuals

The app is web-first and will later evolve into:
- PWA
- React Native app

Do not optimize for mobile-first yet.

Primary goals of the MVP:
- Clear landlord and tenant dashboards
- Property (household) management
- Tenant management
- Maintenance requests
- Document storage
- Manual rent tracking (automated later)

Non-goals for MVP:
- Legal document generation
- Automated payment processing
- Advanced analytics
- Admin super-panels

All engineering decisions should prioritize:
- Simplicity
- Clarity
- Scalability
- Clean separation of concerns

