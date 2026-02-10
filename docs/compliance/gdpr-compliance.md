# GDPR Compliance — uhome

## Overview

This document maps uhome features to GDPR (General Data Protection Regulation) requirements.

## GDPR Requirements Mapping

### Article 15: Right of Access

**Requirement:** Users must be able to access all their personal data.

**Implementation:**
- ✅ **Data Export Feature** (`src/pages/settings/data-export.tsx`)
  - Users can request a complete export of all their personal data
  - Export includes: profile, properties, tenants, leases, messages, documents, payments
  - Data provided in machine-readable format (JSON/ZIP)
  - Available via Settings → Data Export

### Article 17: Right to Erasure ("Right to be Forgotten")

**Requirement:** Users must be able to request deletion of their personal data.

**Implementation:**
- ✅ **Data Deletion Feature** (`src/pages/settings/data-deletion.tsx`)
  - Users can submit deletion requests
  - Admin approval workflow
  - 30-day retention period (configurable)
  - Cascading deletion: user → tenants → leases → messages
  - Soft delete with recovery window

### Article 20: Data Portability

**Requirement:** Users must be able to receive their data in a structured, commonly used format.

**Implementation:**
- ✅ **Data Export** provides JSON format
- ✅ All user data included in export
- ✅ Downloadable ZIP file with organized structure

### Article 7: Conditions for Consent

**Requirement:** Users must be able to withdraw consent at any time.

**Implementation:**
- ✅ **Email Preferences** (`email_preferences` table)
  - Users can opt-out of email notifications
  - Opt-out respected in all email sending
  - Preference stored and enforced

### Article 30: Records of Processing Activities

**Requirement:** Maintain records of data processing activities.

**Implementation:**
- ✅ **Compliance Audit Log** (`compliance_audit_log` table)
  - All compliance actions logged
  - Includes: deletions, exports, consent updates
  - Immutable audit trail
  - Timestamped and attributed

### Article 32: Security of Processing

**Requirement:** Implement appropriate technical and organizational measures.

**Implementation:**
- ✅ **Row Level Security (RLS)** on all tables
- ✅ **Encrypted data transmission** (HTTPS)
- ✅ **Access controls** (role-based permissions)
- ✅ **Audit logging** for sensitive operations

## Data Inventory

### Personal Data Collected

1. **User Account Data**
   - Email address
   - Role (landlord/tenant)
   - Authentication tokens

2. **Property Data**
   - Property names and addresses
   - Rent amounts
   - Property rules

3. **Tenant Data**
   - Move-in dates
   - Lease end dates
   - Phone numbers
   - Notes

4. **Communication Data**
   - Messages (lease-scoped)
   - Notifications

5. **Financial Data**
   - Rent records
   - Payment history (if Stripe enabled)

6. **Document Data**
   - Uploaded files
   - File metadata

### Data Storage Locations

- **Primary Database:** Supabase PostgreSQL
- **File Storage:** Supabase Storage buckets
- **Backups:** Supabase automated backups

### Data Retention

- **Active Users:** Data retained while account is active
- **Deleted Users:** 30-day retention period (configurable)
- **Audit Logs:** Retained indefinitely for compliance

## User Rights Implementation

| GDPR Right | Feature | Location |
|------------|---------|----------|
| Right of Access | Data Export | Settings → Data Export |
| Right to Erasure | Data Deletion | Settings → Data Deletion |
| Right to Data Portability | Data Export (JSON) | Settings → Data Export |
| Right to Object | Email Opt-out | Email Preferences |
| Right to Restrict Processing | Account Deletion | Settings → Data Deletion |

## Compliance Checklist

- [x] Data export functionality
- [x] Data deletion functionality
- [x] Consent management (email opt-out)
- [x] Audit logging
- [x] RLS policies on all tables
- [x] Data retention policies
- [x] User-facing compliance features
- [ ] Privacy policy page (content)
- [ ] Terms of service page (content)
- [ ] Cookie consent banner (if applicable)

## Notes

- All compliance features are feature-flagged (`ENABLE_GDPR_COMPLIANCE`)
- Admin approval required for data deletion (safety measure)
- 30-day retention period allows for recovery if deletion was accidental
- Audit logs are immutable (read-only) for compliance integrity
