# Environment Setup — haume

## Quick Start

1. Copy `.env.example` to `.env.local`
2. Fill in your Supabase credentials
3. Start development server

## Environment Variables

### Required Variables

**Public Variables** (safe to expose in browser):
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous/public key

**Private Variables** (server-side only):
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin operations)

### Optional Variables

- `NODE_ENV` - Handled automatically by Next.js and hosting providers
- `NEXT_PUBLIC_APP_URL` - App URL for OAuth callbacks (optional for MVP)

## Getting Supabase Keys

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

## Development Setup

**Local Development:**
- Create `.env.local` file in project root
- Add your environment variables
- `.env.local` is gitignored and won't be committed

## Production Setup

**Hosting Platform (Vercel, Netlify, Railway, etc.):**
- Set environment variables in your hosting platform's dashboard
- Go to Project Settings → Environment Variables
- Add the same variables as in `.env.local`
- Deploy

**Provider Compatibility:**
- **Vercel**: Project Settings → Environment Variables
- **Netlify**: Site Settings → Environment Variables
- **Railway**: Project Variables
- **Any Next.js host**: Standard environment variable injection

No code changes needed - Next.js handles this automatically.

## Security Notes

⚠️ **Important:**
- Never commit `.env.local` or any `.env*` file (except `.env.example`)
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code
- Use `NEXT_PUBLIC_*` prefix only for truly public variables
- Service role key should only be used server-side (API routes, if needed)

## Troubleshooting

**Variables not loading?**
- Ensure file is named `.env.local` (not `.env`)
- Restart development server after adding variables
- Check variable names match exactly (case-sensitive)

**Build fails with missing variables?**
- Ensure all required variables are set in hosting platform
- Check `.env.example` for required variables list

