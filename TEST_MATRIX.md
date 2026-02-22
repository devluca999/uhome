# uhome Functional Verification Test Matrix

## 1. State Machines

### 1.1 Property Lifecycle

```
[Created] --default--> (Active)
  (Active) --toggle is_active=false--> (Inactive)
  (Inactive) --toggle is_active=true--> (Active)
```

- Boolean `is_active` field (no Draft or Archived states)
- Properties created as active by default
- Inactive properties excluded from financial calculations

### 1.2 Lease Lifecycle

```
[*] --landlord creates invite--> (Draft)
  (Draft) --tenant accepts, start_date <= today--> (Active)
  (Draft) --tenant accepts, start_date > today--> (Draft)  [stays draft]
  (Active) --lease_end_date passes OR batch_end--> (Ended)
  (Ended) --any mutation--> BLOCKED (trigger: prevent_ended_lease_updates)
```

- `Ended` is terminal and immutable (enforced by DB triggers)
- `auto_end_leases()` trigger fires on INSERT/UPDATE to auto-end expired leases
- `batch_end_expired_leases()` callable function for bulk expiration

### 1.3 Work Order Lifecycle

```
Tenant creates --> (Submitted)
Landlord creates --> (Scheduled)

Valid transitions (forward-only):
  (Submitted) --> Seen | Scheduled | InProgress | Resolved | Closed
  (Seen) --> Scheduled | InProgress | Resolved | Closed
  (Scheduled) --> InProgress | Resolved | Closed
  (InProgress) --> Resolved | Closed
  (Resolved) --> Closed  [tenant confirms resolution]
  (Closed) --> TERMINAL (no transitions)
```

- State machine enforced client-side in `canTransitionTo()`
- No server-side enforcement of transitions (DB accepts any valid status string)
- Tenant-specific action: `confirmResolution()` only available when status is `resolved`

### 1.4 Tenant Invite Lifecycle

```
[*] --landlord generates--> (Pending)
  (Pending) --tenant accepts--> (Accepted)  [accepted_at timestamp set]
  (Pending) --expires_at passes--> (Expired)
```

- Token format: `{timestamp}-{random}`, 30-day expiration
- Max 5 active invites per property (enforced by `enforce_invite_cap_trigger`)
- On accept: draft lease activated, tenant record created/linked, role updated

### 1.5 Onboarding Lifecycle

```
[*] --invite accepted, property has active template--> (NotStarted)
  (NotStarted) --tenant opens modal, enters field--> (InProgress)
  (InProgress) --tenant dismisses modal--> (InProgress)  [progress saved]
  (InProgress) --tenant refreshes/re-logs in--> (InProgress)  [progress restored from DB]
  (InProgress) --tenant completes all required fields + submits--> (Submitted)
  (Submitted) --landlord marks reviewed--> (Reviewed)
  (Submitted) --landlord reopens--> (Reopened)
  (Reopened) --tenant opens modal--> (InProgress)  [previous data pre-filled]
  (Reopened) --tenant resubmits--> (Submitted)
```

- `data` JSONB stores partial field values on dismiss/blur
- `completed_fields` / `total_fields` counters drive progress display
- Unique constraint `(tenant_id, template_id)` prevents duplicate submissions
- Reminder banner visible for: `not_started`, `in_progress`, `reopened`
- Reminder banner hidden for: `submitted`, `reviewed`

### 1.6 Auth Session

```
[*] --> (LoggedOut)
  (LoggedOut) --signIn/signUp/OAuth--> (LoggedIn)
  (LoggedIn) --signOut--> (LoggedOut)
  (LoggedIn) --JWT expires--> (SessionExpired)
  (SessionExpired) --token refresh--> (LoggedIn)
  (SessionExpired) --refresh fails--> (LoggedOut)
```

- Three roles: `admin`, `landlord`, `tenant`
- Role-based routing: admin -> `/admin/overview`, landlord -> `/landlord/dashboard`, tenant -> `/tenant/dashboard`
- Admin can switch viewMode to `landlord-demo` or `tenant-demo`

---

## 2. Test Matrix

### Tier 1 -- Critical Path (Must Pass)

#### Flow 1: Property Creation & Activation

**Preconditions:**
- Landlord user logged in
- No properties exist (clean state)

**Steps:**
1. Navigate to `/landlord/properties`
2. Click "Add Property"
3. Fill form: name, address, rent amount, due date
4. Submit
5. Navigate to property detail
6. Add recurring expense (category: utilities)
7. Toggle property to Active (should be active by default)

**Validation:**
- [ ] Property row exists in `properties` table
- [ ] Property appears in properties list
- [ ] Expense row created and linked to property via `property_id`
- [ ] Dashboard KPI cards reflect new property (property count, occupancy)
- [ ] Dashboard charts render without errors
- [ ] No console errors
- [ ] No duplicate DB rows for property or expense
- [ ] Refresh -> property persists in list
- [ ] Logout/Login -> property still visible

---

#### Flow 2: Tenant Invite & Join

**Preconditions:**
- Active property exists with rent amount set
- No tenants assigned

**Steps:**
1. Landlord: navigate to property detail -> Tenants tab
2. Click "Invite Tenant"
3. Fill invite form: email
4. Copy invite link
5. Open invite link (new browser context)
6. Sign up as tenant (or log in)
7. Accept invitation

**Validation:**
- [ ] `tenant_invites` row created with `status = pending`, `token` set, `expires_at` set
- [ ] `leases` row created with `status = 'draft'`
- [ ] After accept: `leases.tenant_id` set, `leases.status = 'active'` (if start_date <= today)
- [ ] After accept: `tenant_invites.accepted_at` set (non-null)
- [ ] `tenants` row exists with `user_id` matching new user
- [ ] Tenant dashboard populates: property name, rent info visible
- [ ] No duplicate `tenant_invites` rows for same token
- [ ] No duplicate `tenants` rows for same user
- [ ] Refresh -> tenant dashboard state persists
- [ ] Landlord sees tenant in property tenant list

---

#### Flow 3: Onboarding Lifecycle

**Preconditions:**
- Active property with onboarding template (5+ fields, some required)
- New tenant joins property

**Steps:**
1. Confirm onboarding submission row auto-created on invite accept
2. Login as tenant
3. Verify onboarding modal auto-opens (status = `not_started`)
4. Fill required fields
5. Upload image (if template has image field)
6. Submit

**Validation:**
- [ ] `onboarding_submissions` row created with `status = 'not_started'` on invite accept
- [ ] After submit: `status = 'submitted'`, `submitted_at` set
- [ ] Image stored in `onboarding-images` bucket
- [ ] `onboarding_submissions.data` JSONB contains all field values
- [ ] Landlord receives notification row in `notifications` table
- [ ] Tenant cannot submit twice (unique constraint + button disabled)
- [ ] Refresh -> submission persists with `status = 'submitted'`

**Negative Tests:**
- [ ] Submit without required field -> client-side validation error, status stays `in_progress`
- [ ] Refresh mid-upload -> no partial corruption
- [ ] Double-click submit -> only one `submitted_at` update, no duplicate rows

---

#### Flow 4: Work Order Lifecycle

**Preconditions:**
- Tenant joined property with active lease

**Steps:**
1. Tenant: navigate to `/tenant/maintenance`
2. Click "New Request"
3. Fill category + description
4. Submit
5. Landlord: navigate to `/landlord/operations`
6. Find work order, update status to `seen`
7. Update status to `in_progress`
8. Update status to `resolved`
9. Tenant: confirm resolution (transitions to `closed`)

**Validation:**
- [ ] `maintenance_requests` row created with `status = 'submitted'`, `created_by_role = 'tenant'`
- [ ] Each status transition reflects in DB immediately
- [ ] `canTransitionTo()` prevents backward transitions
- [ ] No duplicate `maintenance_requests` rows
- [ ] `closed` is terminal -- no further transitions allowed
- [ ] Refresh -> status persists at every step

**Negative Tests:**
- [ ] Double submission (rapid form submit) -> only 1 row created
- [ ] Invalid status transition (e.g., closed -> submitted) -> rejected by client-side validation
- [ ] Tenant cannot access landlord status controls

---

#### Flow 5: Onboarding Progress Persistence & Reminder Logic

**Preconditions:**
- Active property with onboarding template containing 10 required fields
- Tenant joined property (submission row auto-created with `status='not_started'`)

**Steps:**
1. Login as tenant -> verify onboarding modal auto-opens
2. Complete 3 of 10 required fields
3. Dismiss modal (click X or outside)
4. Verify reminder banner visible on dashboard: "3/10 items done"
5. Refresh page -> verify reminder banner still shows "3/10", modal does NOT auto-reopen
6. Logout, login again -> verify reminder banner persists with correct progress
7. Click "Continue" on banner -> verify modal opens with 3 fields pre-filled
8. Complete remaining 7 fields
9. Submit
10. Verify reminder banner disappears
11. Verify `status = 'submitted'` in DB

**Validation:**
- [ ] `onboarding_submissions.completed_fields` = 3 after step 3 (DB query)
- [ ] `onboarding_submissions.data` JSONB contains exactly 3 saved field values
- [ ] `onboarding_submissions.completed_fields` = 10 after step 9
- [ ] `onboarding_submissions.status` = 'submitted' after step 9
- [ ] `onboarding_submissions.submitted_at` is set after step 9
- [ ] No duplicate `onboarding_submissions` rows for `(tenant_id, template_id)`
- [ ] Landlord receives notification row in `notifications` table
- [ ] UI progress count matches `completed_fields` in DB at every checkpoint

**Negative Tests:**
- [ ] Submit with 7/10 fields -> validation error, status remains `in_progress`
- [ ] Double submission -> single update, button disabled on first click
- [ ] Template edited mid-progress (landlord adds field 11) -> tenant's in-progress retains original 10 fields
- [ ] Refresh mid-field-entry (don't blur/dismiss, hit F5) -> unsaved field NOT persisted, progress remains 3/10
- [ ] Reopen after submission (landlord sets `status='reopened'`) -> banner reappears, modal shows previous data

---

### Tier 2 -- Mutation & Edge Cases

| # | Scenario | Expected Outcome |
|---|----------|-----------------|
| 1 | Activate property without rent amount | Property activates, dashboard shows $0 rent, no error |
| 2 | Change rent amount mid-month | Updated in `properties` table, existing rent records unaffected |
| 3 | Deactivate property | `is_active = false`, excluded from financial KPIs, tenants still see property |
| 4 | Tenant removed from property (`unlinkTenant`) | `tenants.property_id` set to null, tenant record preserved, lease unaffected |
| 5 | Reopen onboarding after review | `status` -> `reopened`, reminder banner reappears, tenant can edit and resubmit |
| 6 | Edit onboarding template while tenant has in-progress submission | Tenant's submission retains snapshot of original fields; new version for future tenants |
| 7 | Multiple tenants onboarding simultaneously (same property) | Each has own submission row, no cross-contamination |
| 8 | Two tabs same user | No conflicting state; last-write-wins on progress save |
| 9 | Refresh mid-form / browser back after submission | No duplicate submissions, form state either restored or reset cleanly |

**Validation for all:**
- [ ] No data corruption
- [ ] No orphan rows (FK integrity maintained)
- [ ] No permission leaks
- [ ] No duplicate rows

---

### Tier 3 -- Permission Boundary Tests

| # | Actor | Attempt | Expected Result |
|---|-------|---------|----------------|
| 1 | Tenant | Access `/admin/overview` | Redirect to `/tenant/dashboard` |
| 2 | Tenant | Access `/landlord/properties` | Redirect to `/tenant/dashboard` |
| 3 | Tenant | Supabase: `properties.insert(...)` | RLS denial (no matching policy) |
| 4 | Tenant | Supabase: `properties.delete(...)` | RLS denial |
| 5 | Tenant | Supabase: `properties.update(...)` (modify rent) | RLS denial |
| 6 | Landlord A | Access Landlord B's property data via Supabase | RLS denial (owner_id mismatch) |
| 7 | Tenant A | Access Tenant B's rent records | RLS denial (tenant_id mismatch) |
| 8 | Tenant | Update onboarding submission for another tenant | RLS denial |

**Validation for all:**
- [ ] Proper authorization blocking (403 or redirect)
- [ ] No backend mutation occurs
- [ ] No data leakage in query results

---

## 3. Execution Log

Results populated during Phase 3 execution.

| Flow | Status | Console Errors | Network Failures | DB Integrity | Notes |
|------|--------|---------------|-----------------|-------------|-------|
| 1: Property Creation | | | | | |
| 2: Tenant Invite | | | | | |
| 3: Onboarding Lifecycle | | | | | |
| 4: Work Order Lifecycle | | | | | |
| 5: Onboarding Persistence | | | | | |
| Tier 2 Edge Cases | | | | | |
| Tier 3 Permissions | | | | | |
| Idempotency Checks | | | | | |
