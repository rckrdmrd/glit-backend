# Security Setup Guide - GLIT Backend

## Overview
This document describes the security improvements implemented in the GLIT backend and how to configure the application securely.

## Completed Security Fixes (Phase 1)

### 1. Credentials Management

#### What was fixed:
- Removed `.env` file from Git repository and cleaned history
- Rotated all database and JWT credentials
- Created `.env.example` template without real credentials
- Updated `.gitignore` to prevent future credential leaks

#### Actions taken:
- Database password changed from `glit_secure_2024` to cryptographically secure password
- JWT secret changed to 44-character secure random string
- Git history cleaned using `git filter-branch`
- Backup created: `/home/isem/workspace/backups/glit_backend_before_history_clean_*.tar.gz`

### 2. Production Security Enforcement

#### Changes in `src/config/env.ts`:
```typescript
// JWT_SECRET is now REQUIRED in production (no default)
jwt: {
  secret: process.env.NODE_ENV === 'production'
    ? getEnv('JWT_SECRET')  // Will throw error if not set
    : getEnv('JWT_SECRET', 'dev_secret_not_for_production_use'),
  // ...
}

// Validation enforces minimum 32 characters in production
if (envConfig.nodeEnv === 'production') {
  if (envConfig.jwt.secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters in production. ' +
      'Generate with: openssl rand -base64 32'
    );
  }
}
```

### 3. Database Query Fixes

#### Fixed ML Coins Transaction Inserts
Three files were updated to include the `balance_before` field (which is NOT NULL in the database):

**Files modified:**
1. `src/modules/gamification/gamification.repository.ts` (lines 101, 288)
2. `src/modules/gamification/ranks.repository.ts` (line 314)

**Before:**
```typescript
INSERT INTO gamification_system.ml_coins_transactions (
  user_id, amount, transaction_type, balance_after
) VALUES ($1, $2, $3, $4)
// ❌ Missing balance_before - would fail with NOT NULL constraint
```

**After:**
```typescript
INSERT INTO gamification_system.ml_coins_transactions (
  user_id, amount, balance_before, balance_after, transaction_type, reason, reference_id
) VALUES ($1, $2, $3, $4, $5, $6, $7)
// ✅ Includes balance_before
```

## Setup Instructions

### For Development

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Generate secure credentials:
```bash
# Generate JWT secret
openssl rand -base64 32

# Generate database password
openssl rand -base64 24
```

3. Update `.env` with generated values:
```env
DB_PASSWORD=<your_secure_password>
JWT_SECRET=<your_jwt_secret>
```

### For Production

1. **NEVER** use default values or commit `.env` files

2. Set environment variables through your hosting platform:
   - AWS: Systems Manager Parameter Store / Secrets Manager
   - Heroku: Config Vars
   - Docker: Secrets or environment variables
   - Kubernetes: Secrets

3. Required variables:
```bash
NODE_ENV=production
DB_HOST=<production_db_host>
DB_PORT=5432
DB_NAME=glit_platform
DB_USER=glit_user
DB_PASSWORD=<strong_random_password>
JWT_SECRET=<min_32_chars_random_string>
CORS_ORIGIN=<production_frontend_url>
```

4. Validate configuration:
```bash
npm start
# Should see: ✓ Environment variables validated
```

## Database Updates

The database schema already contains all required columns:
- `gamification_system.user_stats.last_login_at` ✅
- `auth_management.profiles.user_id` ✅
- `gamification_system.ml_coins_transactions.balance_before` ✅

No migrations needed - only code fixes were required.

## Git History Cleanup

⚠️ **IMPORTANT:** The Git history was rewritten to remove credentials.

If you have local clones of this repository:
```bash
# Backup your local changes first!
git fetch origin
git reset --hard origin/master
```

If you need to force push to remote (coordinate with team first):
```bash
git push --force-with-lease origin master
```

## Security Checklist

- [x] `.env` removed from Git and added to `.gitignore`
- [x] Credentials rotated (DB password, JWT secret)
- [x] Git history cleaned of credentials
- [x] JWT_SECRET validation in production
- [x] Database queries fixed (balance_before included)
- [x] `.env.example` created without real secrets
- [ ] Team notified of credential rotation
- [ ] CI/CD updated with new credentials
- [ ] Production environment variables configured

## Next Steps (Phase 2)

See `/home/isem/workspace/docs/projects/glit-analisys/00-ANALISIS-CONSOLIDADO.md` for:
- API endpoint corrections (12 endpoints with 404 errors)
- Mock data removal (65+ files)
- Validation schema implementation
- Module integrations

## References

- Analysis Report: `/home/isem/workspace/docs/projects/glit-analisys/02-backend-mock-data-analysis.md`
- Database Analysis: `/home/isem/workspace/docs/projects/glit-analisys/07-database-backend-coherence-analysis.md`
- Master Plan: `/home/isem/workspace/docs/projects/glit-analisys/00-ANALISIS-CONSOLIDADO.md`

---

**Last Updated:** 2025-10-21
**Phase:** 1 - Security Critical (COMPLETED)
