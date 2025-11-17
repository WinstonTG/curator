# Authentication Setup Guide

This guide will help you set up and test the newly implemented authentication system.

## Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL 14+ running
- Redis (for embeddings queue)

## Step 1: Environment Variables

Add the following to your `.env` file:

```bash
# Database (should already be configured)
DATABASE_URL="postgresql://user:password@localhost:5432/curator"

# API Configuration
PORT=3001
FRONTEND_URL=http://localhost:3000

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001

# Authentication (IMPORTANT: Change in production!)
JWT_SECRET=your-secure-secret-key-change-in-production

# Redis
REDIS_URL=redis://localhost:6379
```

**Important**: Generate a secure JWT_SECRET for production:
```bash
# Generate a random 256-bit secret
openssl rand -base64 32
```

## Step 2: Run Database Migration

The authentication system requires a new `password_hash` field in the User table.

```bash
# Make sure PostgreSQL is running
# Then run the migration
npx prisma migrate dev --name add_password_hash

# Generate Prisma client
npx prisma generate
```

**Expected Output:**
```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "curator_dev"

Applying migration `20251117_add_password_hash`

✔ Generated Prisma Client
```

## Step 3: Install Dependencies

Dependencies should already be installed from the previous step, but if needed:

```bash
# Root dependencies
pnpm install

# API dependencies (bcrypt, jsonwebtoken, cookie-parser)
cd packages/api
pnpm install
```

## Step 4: Start the Development Servers

```bash
# From project root
pnpm dev
```

This will start:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001

## Step 5: Test Authentication

### Option A: Using the Frontend

1. Open your browser to http://localhost:3000/auth
2. Register a new account:
   - Display Name: Your Name
   - Email: test@example.com
   - Password: password123 (min 8 chars with letters and numbers)
3. Click "Create Account"
4. You should be redirected to `/onboarding`
5. Complete the onboarding flow
6. Your authentication is now working!

### Option B: Using cURL

```bash
# 1. Register a new user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "display_name": "Test User"
  }' \
  -c cookies.txt -v

# Expected: 201 Created with Set-Cookie header

# 2. Login (if already registered)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' \
  -c cookies.txt -v

# Expected: 200 OK with Set-Cookie header

# 3. Get current user
curl http://localhost:3001/api/auth/me \
  -b cookies.txt -v

# Expected: 200 OK with user object

# 4. Test protected endpoint
curl -X POST http://localhost:3001/api/onboarding/profile \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "interests": [{"domain": "music", "value": "Jazz", "weight": 0.8, "source": "explicit"}],
    "constraints": []
  }'

# Expected: 201 Created

# 5. Logout
curl -X POST http://localhost:3001/api/auth/logout \
  -b cookies.txt -v

# Expected: 200 OK and cookie cleared
```

## Step 6: Run Tests

### Backend Tests

```bash
cd packages/api
pnpm test
```

**Expected Output:**
```
✓ Authentication API
  ✓ POST /api/auth/register
    ✓ should register a new user successfully
    ✓ should reject registration with duplicate email
    ✓ should reject registration with invalid email
    ✓ should reject registration with weak password
    ✓ should reject registration without display name
  ✓ POST /api/auth/login
    ✓ should login successfully with correct credentials
    ✓ should reject login with wrong password
    ✓ should reject login with non-existent email
    ✓ should reject login without email
  ✓ GET /api/auth/me
    ✓ should return current user when authenticated
    ✓ should return 401 when not authenticated
    ✓ should return 401 with invalid token
  ✓ POST /api/auth/logout
    ✓ should logout successfully
  ✓ Protected route with auth middleware
    ✓ should allow access to protected route when authenticated
    ✓ should deny access to protected route when not authenticated

Test Files  1 passed (1)
     Tests  15 passed (15)
```

### E2E Tests (To be updated)

The existing E2E tests in `e2e/onboarding-wizard.spec.ts` need to be updated to use real authentication:

```bash
# This will need to be updated
pnpm exec playwright test
```

## Troubleshooting

### Problem: "Can't reach database server"

**Solution:**
```bash
# Check PostgreSQL is running
# On macOS:
brew services list
brew services start postgresql@14

# On Linux:
sudo systemctl status postgresql
sudo systemctl start postgresql

# Test connection
psql -U your_user -d curator_dev
```

### Problem: "Module '@prisma/client' has no exported member 'PrismaClient'"

**Solution:**
```bash
npx prisma generate
```

### Problem: Cookies not being set in browser

**Symptoms:**
- Can register/login but immediately redirected back to auth page
- `/api/auth/me` returns 401

**Solutions:**
1. Check browser console for CORS errors
2. Verify `.env` has correct FRONTEND_URL and NEXT_PUBLIC_API_URL
3. Clear browser cookies and try again
4. Check Network tab > Response Headers for `Set-Cookie`

### Problem: CORS errors in browser console

**Error:**
```
Access to fetch at 'http://localhost:3001/api/auth/login' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solution:**
Check that the API CORS configuration includes:
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
```

### Problem: Tests failing with "P2025" error

**Error:**
```
PrismaClientKnownRequestError: Record not found
Code: P2025
```

**Solution:**
The database might not have been seeded or previous test data wasn't cleaned up:
```bash
# Reset database
npx prisma migrate reset

# Or just regenerate
npx prisma generate
```

## What Changed

### Backend Changes

1. **New Files:**
   - `packages/api/src/lib/auth.ts` - Password hashing and JWT utilities
   - `packages/api/src/middleware/auth.ts` - Auth middleware (requireAuth, optionalAuth)
   - `packages/api/src/routes/auth.ts` - Auth endpoints (register, login, logout, me)
   - `packages/api/src/routes/auth.test.ts` - Comprehensive auth tests

2. **Modified Files:**
   - `prisma/schema.prisma` - Added `password_hash` field to User model
   - `packages/api/src/index.ts` - Added cookie-parser middleware and auth router
   - `packages/api/src/routes/onboarding.ts` - Uses requireAuth, gets user from req.userId
   - `packages/api/src/routes/gdpr.ts` - Uses requireAuth, changed from `:userId` param to auth
   - `packages/api/src/routes/analytics.ts` - Uses optionalAuth for anonymous tracking
   - `packages/api/package.json` - Added bcrypt, jsonwebtoken, cookie-parser

### Frontend Changes

1. **New Files:**
   - `web/lib/auth.ts` - Frontend auth utility functions
   - `web/app/auth/page.tsx` - Combined login/register page

2. **Modified Files:**
   - `web/app/onboarding/page.tsx` - Checks authentication, uses real user ID
   - All API calls now include `credentials: 'include'`

### Documentation

1. **New Files:**
   - `docs/auth.md` - Complete authentication system documentation
   - `AUTH_SETUP.md` - This setup guide

## Next Steps

1. **Update E2E Tests**: Modify `e2e/onboarding-wizard.spec.ts` to use real authentication
2. **Add Rate Limiting**: Implement rate limiting on auth endpoints
3. **Email Verification**: Add email confirmation flow
4. **Password Reset**: Implement forgot password functionality
5. **Session Management**: Add UI for viewing/revoking active sessions
6. **2FA**: Add two-factor authentication support

## Resources

- [Authentication Documentation](docs/auth.md) - Complete auth system docs
- [Technical Report](TECHNICAL_REPORT.md) - Full system architecture
- [Prisma Schema](prisma/schema.prisma) - Database models

## Support

If you encounter any issues:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review the logs in your terminal
3. Check browser DevTools console and Network tab
4. Refer to [docs/auth.md](docs/auth.md) for detailed documentation

---

**Authentication System Version**: 1.0
**Last Updated**: 2025-11-17
