# Deployment Guide — haume

## Pre-Deployment Checklist

### ✅ Code Quality
- [x] All TypeScript types pass (`npm run type-check`)
- [x] All linting passes (`npm run lint`)
- [x] All formatting passes (`npm run format:check`)
- [x] Build succeeds (`npm run build`)

### ✅ Environment Variables
- [ ] `VITE_SUPABASE_URL` configured in hosting platform
- [ ] `VITE_SUPABASE_ANON_KEY` configured in hosting platform
- [ ] Variables set for Production environment
- [ ] Variables verified in hosting dashboard

### ✅ PWA Configuration
- [x] Manifest generated (`dist/manifest.webmanifest`)
- [x] Service worker generated (`dist/sw.js`)
- [x] Icons present (192x192, 512x512)
- [x] Theme color configured
- [ ] PWA installability tested in production

### ✅ Supabase Configuration
- [ ] Database schema deployed
- [ ] RLS policies active
- [ ] Storage bucket created (for documents)
- [ ] OAuth redirect URLs configured (if using Google OAuth)

## Deployment Steps

### Step 1: Choose Hosting Platform

This app works with any static hosting provider:
- **Vercel** (recommended - zero config)
- **Netlify** (great for static sites)
- **Cloudflare Pages** (fast global CDN)
- **Railway** (simple deployment)
- **GitHub Pages** (free for public repos)
- Any static host that supports Node.js build

### Step 2: Connect Repository

1. Push code to GitHub (already done)
2. Import repository in hosting platform
3. Platform should auto-detect Vite project

### Step 3: Configure Build Settings

**Build Command:**
```bash
npm run build
```

**Output Directory:**
```
dist
```

**Node Version:**
```
20
```

**Install Command (if needed):**
```bash
npm ci --legacy-peer-deps
```

### Step 4: Set Environment Variables

In your hosting platform's dashboard, add:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important:** 
- Use `VITE_` prefix (required for Vite)
- Set for Production environment
- Optionally set for Preview/Development if using branch deployments

### Step 5: Configure OAuth Redirects (if using Google OAuth)

In Supabase Dashboard → Authentication → URL Configuration:
- Add your production URL to "Redirect URLs"
- Format: `https://your-domain.com/auth/callback`

### Step 6: Deploy

1. Trigger deployment (push to main branch or manual deploy)
2. Wait for build to complete
3. Verify deployment URL

### Step 7: Post-Deployment Verification

1. **Test Authentication:**
   - [ ] Can sign up as landlord
   - [ ] Can sign up as tenant
   - [ ] Can sign in
   - [ ] OAuth works (if configured)

2. **Test Core Features:**
   - [ ] Landlord can create property
   - [ ] Landlord can add tenant
   - [ ] Tenant can submit maintenance request
   - [ ] Landlord can update maintenance status
   - [ ] Documents can be uploaded (if storage configured)

3. **Test PWA:**
   - [ ] App is installable
   - [ ] Manifest loads correctly
   - [ ] Service worker registers
   - [ ] Icons display correctly

4. **Test Security:**
   - [ ] Unauthenticated users redirected to login
   - [ ] Tenants cannot access landlord routes
   - [ ] Landlords cannot access tenant routes

## Provider-Specific Notes

### Vercel
- Auto-detects Vite projects
- Zero configuration needed
- Automatic HTTPS
- Preview deployments for PRs

### Netlify
- May need `netlify.toml` for SPA routing (see below)
- Automatic HTTPS
- Branch previews available

### Cloudflare Pages
- Fast global CDN
- Automatic HTTPS
- Free tier available

### Railway
- Simple deployment
- Automatic HTTPS
- Good for full-stack apps

## SPA Routing Configuration

For hosting providers that need explicit SPA routing configuration:

**Netlify (`netlify.toml`):**
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Cloudflare Pages (`_redirects` file in `public/`):**
```
/*    /index.html   200
```

**Vercel:** Handles SPA routing automatically, no config needed.

## Troubleshooting

### Build Fails
- Check Node.js version (should be 20)
- Verify all dependencies install correctly
- Check for TypeScript errors
- Ensure environment variables are set

### Environment Variables Not Working
- Verify `VITE_` prefix is used
- Check variable names match exactly
- Restart build after adding variables
- Check hosting platform's variable scope (Production vs Preview)

### Routing Issues (404 on refresh)
- Add SPA redirect configuration (see above)
- Verify `dist/index.html` is served for all routes

### PWA Not Installing
- Check HTTPS is enabled (required for PWA)
- Verify manifest is accessible at `/manifest.webmanifest`
- Check service worker is registered
- Test in Chrome DevTools → Application → Manifest

### Supabase Connection Issues
- Verify environment variables are set correctly
- Check Supabase project is active
- Verify RLS policies allow access
- Check browser console for specific errors

## Post-Deployment

### Monitoring
- Set up error tracking (optional - Sentry, LogRocket, etc.)
- Monitor build status
- Check deployment logs

### Updates
- Push to main branch triggers automatic deployment
- Preview deployments for pull requests
- Manual rollback available in hosting dashboard

## Security Checklist

- [x] No secrets in code
- [x] Environment variables secured
- [x] RLS policies active in Supabase
- [x] HTTPS enforced
- [x] CORS configured in Supabase (if needed)
- [ ] Rate limiting considered (Supabase handles this)
- [ ] OAuth redirects configured securely

## Performance

- [x] Build optimized (Vite handles this)
- [x] Assets minified
- [x] Code splitting enabled
- [x] PWA caching configured
- [ ] CDN enabled (automatic with most hosts)

