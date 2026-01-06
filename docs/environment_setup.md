# Environment Setup — uhome

## Quick Start

1. Copy `.env.example` to `.env.local`
2. Fill in your Supabase credentials
3. Start development server: `npm run dev`

## Environment Variables

### Required Variables

**Public Variables** (safe to expose in browser - Vite uses `VITE_` prefix):
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous/public key

**Private Variables** (for server-side operations if needed):
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (keep secret! Only for server-side use)

### Optional Variables

- `NODE_ENV` - Handled automatically by Vite and hosting providers
- `VITE_APP_URL` - App URL for OAuth callbacks (optional, defaults to current origin)

### Dev Mode (Development/Staging Only)

**⚠️ CRITICAL: Never enable in production!**

- `VITE_TENANT_DEV_MODE_ENABLED` - Enable Tenant Dev Mode for testing and demos (default: `false`)
- `VITE_LANDLORD_DEV_MODE_ENABLED` - Enable Landlord Dev Mode for testing and demos (default: `false`)

**What is Dev Mode?**
Dev Mode provides realistic mock experiences for both tenants and landlords with complete data (properties, leases, work orders, notifications, messages) for:
- End-to-End (E2E) testing with Playwright
- Visual User Acceptance Testing (UAT)
- Demo and QA environments
- Developer onboarding
- Multi-tab real-time sync testing

**How to Enable:**

**Option 1: Quick Login Buttons (Recommended)**
1. Set environment variables: `VITE_TENANT_DEV_MODE_ENABLED=true` and/or `VITE_LANDLORD_DEV_MODE_ENABLED=true` in `.env.local`
2. Visit login page (`/login`)
3. Click "Demo Tenant" or "Demo Landlord" button
4. Automatically logged in with dev mode active

**Option 2: URL Parameter**
1. Set environment variables as above
2. Add URL parameter `?dev=tenant` or `?dev=landlord` when visiting the app
3. Log in with demo accounts (see Dev Mode documentation)

**Security Model:**
- **Primary Gate**: Environment variable must be `true` (prevents production accidents)
- **Secondary Trigger**: URL parameter `?dev=tenant` or `?dev=landlord` (allows runtime toggling)
- Both must be true for dev mode to activate

**When to Use:**
- ✅ Local development
- ✅ Staging environments
- ✅ Demo environments
- ✅ E2E test runs
- ✅ Multi-tab testing (landlord in one tab, tenant in another)
- ❌ **NEVER in production** - Keep all dev mode env vars `false` or unset

**Demo Account Credentials:**
- Tenant: `demo-tenant@uhome.internal` / `DemoTenant2024!`
- Landlord: `demo-landlord@uhome.internal` / `DemoLandlord2024!`

See [`docs/tenant-dev-mode.md`](tenant-dev-mode.md) for complete documentation.

## Getting Supabase Keys

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret! Only for server-side use)

## Development Setup

**Local Development:**
- Create `.env.local` file in project root
- Add your environment variables
- `.env.local` is gitignored and won't be committed

## Production Setup

**Hosting Platform (Vercel, Netlify, Railway, Cloudflare Pages, etc.):**
- Set environment variables in your hosting platform's dashboard
- Go to Project Settings → Environment Variables
- Add the same variables as in `.env.local` (with `VITE_` prefix)
- Deploy

**Provider-Specific Instructions:**

**Vercel:**
1. Go to Project Settings → Environment Variables
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Set for Production, Preview, and Development environments
4. Deploy (Vercel auto-detects Vite projects)

**Netlify:**
1. Go to Site Settings → Environment Variables
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Deploy

**Cloudflare Pages:**
1. Go to Pages → Settings → Environment Variables
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Build command: `npm run build`
4. Build output directory: `dist`
5. Deploy

**Railway:**
1. Go to Project → Variables
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Build command: `npm run build`
4. Deploy

**Note:** This app is provider-agnostic. No provider-specific code is required.

## Security Notes

⚠️ **Important:**
- Never commit `.env.local` or any `.env*` file (except `.env.example`)
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code
- Use `VITE_*` prefix for variables that need to be accessible in the browser
- Service role key should only be used server-side (not needed for MVP)
- Variables prefixed with `VITE_` are exposed to the browser - only use for public keys

## Troubleshooting

**Variables not loading?**
- Ensure file is named `.env.local` (not `.env`)
- Restart development server after adding variables
- Check variable names match exactly (case-sensitive)

**Build fails with missing variables?**
- Ensure all required variables are set in hosting platform
- Check `.env.example` for required variables list

