# haume

A modern property management SaaS application for independent landlords and tenants.

## Tech Stack

- **Framework:** Vite + React (TypeScript)
- **Routing:** React Router v6
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui
- **Backend:** Supabase
- **PWA:** vite-plugin-pwa

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase credentials in `.env.local`

4. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── components/      # React components
│   ├── ui/         # shadcn/ui primitives
│   ├── landlord/   # Landlord-specific components
│   ├── tenant/     # Tenant-specific components
│   └── layout/     # Layout components
├── pages/          # Route pages
├── lib/            # Utilities and Supabase client
├── hooks/          # Custom React hooks
└── router/         # React Router configuration
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run type-check` - Type check without emitting files

## Documentation

See the `/docs` folder for detailed documentation:
- Project context and vision
- MVP roadmap
- Engineering rules
- Design system
- Environment setup

## License

Private

