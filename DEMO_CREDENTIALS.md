# 🔑 uhome Demo Credentials

**Use these credentials to log into the demo/preview deployment**

---

## Demo Accounts

### 👔 Landlord Account
```
Email:    demo-landlord@uhome.internal
Password: DemoLandlord2024!
```

**What you'll see:**
- Landlord dashboard
- Property portfolio
- Rent tracking and payments
- Tenant management
- Lease agreements
- Maintenance requests

---

### 🏠 Tenant Account
```
Email:    demo-tenant@uhome.internal
Password: DemoTenant2024!
```

**What you'll see:**
- Tenant dashboard
- Current lease details
- Rent payment history
- Maintenance request submission
- Household member management
- Document access

---

### 🔧 Admin Account
```
Email:    admin@uhome.internal
Password: DemoAdmin2024!
```

**What you'll see:**
- Admin dashboard
- System statistics
- User management
- Payment overview
- Security logs
- Platform administration

---

## Where These Work

**Environments:**
- ✅ Local development (`npm run dev`)
- ✅ Staging deployment
- ✅ Any deployment seeded with `npm run seed:demo`

**Safety:**
- ❌ These credentials are **blocked in production** (enforceNonProduction guard)
- ✅ Demo script hard-fails if pointed at production URLs
- ✅ Safe to share for demo/preview purposes

---

## Demo Data Included

When seeded, you'll see:
- 5 properties with realistic addresses
- Multiple leases (active, expired, pending)
- Rent payment history
- Maintenance requests
- Household members
- Document uploads
- Payment records
- Security audit logs

---

## Quick Login URLs

**Local:**
```
Landlord: http://localhost:3000/landlord/login
Tenant:   http://localhost:3000/tenant/login  
Admin:    http://localhost:3000/admin/login
```

**Staging/Preview:**
```
Replace localhost:3000 with your deployment URL
```

---

## Resetting Demo Data

To reseed with fresh demo data:

```bash
# Local Supabase
npm run db:reset
npm run seed:demo

# Remote staging (requires confirmation)
CONFIRM_STAGING_RESEED=yes npm run seed:demo
```

---

**Created:** March 23, 2025  
**Source:** `scripts/seed-production-demo.ts`

---

_These credentials are for demo/development only and are safe to share_
