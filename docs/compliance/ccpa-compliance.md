# CCPA Compliance — uhome

## Overview

This document maps uhome features to CCPA (California Consumer Privacy Act) requirements.

## CCPA Requirements Mapping

### Right to Know (Section 1798.100)

**Requirement:** Consumers have the right to know what personal information is collected, used, shared, or sold.

**Implementation:**
- ✅ **Data Export Feature** (`src/pages/settings/data-export.tsx`)
  - Complete export of all personal information
  - Includes all categories of data collected
  - Available via Settings → Data Export

### Right to Delete (Section 1798.105)

**Requirement:** Consumers have the right to request deletion of their personal information.

**Implementation:**
- ✅ **Data Deletion Feature** (`src/pages/settings/data-deletion.tsx`)
  - Users can request deletion
  - Admin approval workflow
  - Cascading deletion of all associated data
  - 30-day retention period

### Right to Opt-Out (Section 1798.120)

**Requirement:** Consumers have the right to opt-out of the sale of personal information.

**Implementation:**
- ✅ **Email Preferences** (`email_preferences` table)
  - Users can opt-out of marketing emails
  - Opt-out respected in all email sending
  - No sale of personal information (uhome does not sell data)

### Non-Discrimination (Section 1798.125)

**Requirement:** Businesses cannot discriminate against consumers who exercise their CCPA rights.

**Implementation:**
- ✅ **No discrimination** - All users have equal access to features regardless of privacy choices
- ✅ **Service continues** - Opting out of emails does not affect core functionality

## Personal Information Categories

### Categories Collected

1. **Identifiers**
   - Email address
   - User ID

2. **Commercial Information**
   - Property rental history
   - Payment records (if Stripe enabled)

3. **Internet Activity**
   - Messages and communications
   - Document uploads

4. **Geolocation Data**
   - Property addresses (if provided)

### Categories NOT Collected

- Biometric information
- Sensory data
- Professional/employment information (beyond property management context)
- Education information

## Data Sharing

**uhome does NOT sell personal information.**

Data is only shared with:
- **Supabase** (hosting and database services) - Service provider
- **Stripe** (if enabled) - Payment processing
- **Postal** (if enabled) - Email delivery

All service providers are bound by data processing agreements.

## Consumer Rights Implementation

| CCPA Right | Feature | Location |
|------------|---------|----------|
| Right to Know | Data Export | Settings → Data Export |
| Right to Delete | Data Deletion | Settings → Data Deletion |
| Right to Opt-Out | Email Preferences | Email Opt-out |
| Right to Non-Discrimination | Built-in | All features |

## Compliance Checklist

- [x] Data export functionality
- [x] Data deletion functionality
- [x] Opt-out mechanisms
- [x] No sale of personal information
- [x] Non-discrimination policy
- [x] Audit logging
- [ ] Privacy policy page (content)
- [ ] "Do Not Sell My Personal Information" page (if applicable)

## Notes

- All compliance features are feature-flagged (`ENABLE_CCPA_COMPLIANCE`)
- uhome does not sell personal information, so "Do Not Sell" opt-out is not applicable
- Email opt-out covers marketing communications
- Data deletion includes all personal information categories
