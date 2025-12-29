# uhome

A minimalist property management SaaS application for independent landlords and their tenants.

## Features

- **Landlord Dashboard**: Manage properties, tenants, maintenance requests, and documents
- **Tenant Dashboard**: View property info, rent status, submit maintenance requests, access documents
- **Authentication**: Email/password and Google OAuth
- **Role-Based Access**: Secure separation between landlord and tenant views
- **PWA Ready**: Installable web app with offline capabilities
- **Modern UI**: Glassmorphic design with subtle microinteractions

## Tech Stack

- **Framework**: Vite + React (TypeScript)
- **Routing**: React Router v6
- **Styling**: Tailwind CSS v4
- **Components**: shadcn/ui
- **Backend**: Supabase (Auth, Database, Storage)
- **PWA**: vite-plugin-pwa

## Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/devluca999/haume.git
cd haume
```

2. Install dependencies:
```bash
npm install --legacy-peer-deps
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Add your Supabase credentials to `.env.local`:
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

5. Set up the database:
   - Go to your Supabase project
   - Navigate to SQL Editor
   - Run the SQL from `supabase/schema.sql`
   - Run `supabase/fix_rls_policies.sql` if needed

6. Start the development server:
```bash
npm run dev
```

## Development

```bash
# Start dev server
npm run dev

# Seed mock data (for testing UI with populated data)
npm run seed:mock

# Type check
npm run type-check

# Lint
npm run lint

# Format code
npm run format

# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing with Mock Data

To see the app with realistic data, run the seed script:

```bash
npm run seed:mock
```

Then log in with:
- **Landlord:** `landlord@example.com` / `password123`
- **Tenant:** `tenant1@example.com` / `password123`

See [scripts/README.md](scripts/README.md) for details.

## Project Structure

```
uhome/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Route pages
│   ├── hooks/          # Custom React hooks
│   ├── contexts/       # React contexts (auth)
│   ├── lib/            # Utilities and configs
│   └── types/          # TypeScript types
├── public/             # Static assets
├── docs/               # Documentation
├── supabase/           # Database schemas
└── dist/               # Build output
```

## Documentation

- [Project Context](docs/project_context.md)
- [MVP Roadmap](docs/mvp_roadmap.md)
- [Engineering Rules](docs/engineering_rules.md)
- [Design System](docs/design_system.md)
- [Environment Setup](docs/environment_setup.md)
- [Deployment Guide](docs/deployment.md)
- [PWA Setup](docs/pwa_setup.md)
- [CI/CD](docs/ci_cd.md)

## Deployment

See [Deployment Guide](docs/deployment.md) for detailed instructions.

**Quick Deploy:**
1. Push to GitHub
2. Connect repository to hosting platform (Vercel, Netlify, etc.)
3. Set environment variables
4. Deploy

## Environment Variables

Required:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

See [Environment Setup](docs/environment_setup.md) for details.

## License

Private - All rights reserved
