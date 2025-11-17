# Authentication System Documentation

## Overview

Curator uses a JWT-based authentication system with secure HTTP-only cookies for session management. This document outlines the complete authentication flow, API endpoints, and integration patterns.

## Architecture

### Components

1. **Backend (packages/api)**
   - Password hashing with bcrypt (cost factor: 10)
   - JWT token generation and verification
   - HTTP-only cookie-based session management
   - Authentication middleware for route protection

2. **Frontend (web)**
   - Auth utility functions for API interaction
   - Login/Register page
   - Protected route handling
   - Automatic authentication checks

### Security Features

- **Password Security**: Bcrypt hashing with salt rounds = 10
- **Token Security**: JWT with 7-day expiration, signed with secret key
- **Cookie Security**: HTTP-only, SameSite=Lax, Secure in production
- **Input Validation**: Email format, password strength (min 8 chars, letters + numbers)

## Database Schema

### User Model Updates

```prisma
model User {
  id             String   @id @default(uuid())
  email          String   @unique
  display_name   String
  password_hash  String?  // Nullable for OAuth-only accounts
  // ... other fields
}
```

**Migration Required**: Run `npx prisma migrate dev` to add `password_hash` field.

## API Endpoints

### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "display_name": "John Doe"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe",
    "avatar_url": null,
    "created_at": "2025-11-17T..."
  }
}
```

**Errors:**
- `400 Bad Request`: Invalid email, weak password, missing display name
- `409 Conflict`: Email already registered

**Side Effects:**
- Sets `curator_token` HTTP-only cookie
- Updates `last_login` timestamp

---

### POST /api/auth/login

Authenticate with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe",
    "last_login": "2025-11-17T..."
  }
}
```

**Errors:**
- `400 Bad Request`: Missing email or password
- `401 Unauthorized`: Invalid credentials

**Side Effects:**
- Sets `curator_token` HTTP-only cookie
- Updates `last_login` timestamp

---

### POST /api/auth/logout

Clear authentication session.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Side Effects:**
- Clears `curator_token` cookie

---

### GET /api/auth/me

Get current authenticated user.

**Headers:**
```
Cookie: curator_token=<jwt_token>
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe",
    "avatar_url": null,
    "created_at": "2025-11-17T...",
    "last_login": "2025-11-17T...",
    "oauth_providers": []
  }
}
```

**Errors:**
- `401 Unauthorized`: Not authenticated or invalid token

---

## Protected Routes

The following routes now require authentication:

- `POST /api/onboarding/profile` - Save onboarding preferences
- `POST /api/onboarding/connect/:provider` - Connect OAuth accounts
- `GET /api/gdpr/export` - Export user data (changed from `:userId` param)
- `DELETE /api/gdpr/delete` - Delete account (changed from `:userId` param)

**Changed GDPR endpoints:**
- Old: `GET /api/gdpr/export/:userId`, `DELETE /api/gdpr/delete/:userId`
- New: `GET /api/gdpr/export`, `DELETE /api/gdpr/delete`
- Security: Users can only access/delete their own data (enforced by auth middleware)

## Frontend Integration

### Auth Utility Functions

Location: `web/lib/auth.ts`

```typescript
import { register, login, logout, getCurrentUser } from '@/lib/auth';

// Register new user
const { user, error } = await register(email, password, displayName);

// Login
const { user, error } = await login(email, password);

// Logout
const { success } = await logout();

// Get current user
const { user, error } = await getCurrentUser();
```

### Authentication Flow

1. **User Registration/Login**: User navigates to `/auth`
2. **Cookie Set**: Backend sets `curator_token` HTTP-only cookie
3. **Protected Routes**: Frontend checks authentication before rendering
4. **API Calls**: Include `credentials: 'include'` in all fetch calls

### Example: Protected Page

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, type User } from '@/lib/auth';

export default function ProtectedPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { user, error } = await getCurrentUser();

      if (!user || error) {
        router.push('/auth');
        return;
      }

      setUser(user);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return <div>Welcome, {user?.display_name}!</div>;
}
```

### Example: API Call with Authentication

```typescript
const response = await fetch(`${API_URL}/api/onboarding/profile`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // IMPORTANT: Include cookies
  body: JSON.stringify({ interests, constraints }),
});
```

## Middleware Usage

### Backend: Protecting Routes

```typescript
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';

// Require authentication (returns 401 if not authenticated)
router.post('/protected', requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId; // Available from middleware
  const user = req.user;     // Full user object
  // ...
});

// Optional authentication (continues even if not authenticated)
router.post('/analytics', optionalAuth, async (req: AuthRequest, res) => {
  const userId = req.userId || null; // May be null for anonymous users
  // ...
});
```

### AuthRequest Type

```typescript
export interface AuthRequest extends Request {
  user?: User;      // Full Prisma User object
  userId?: string;  // User ID shortcut
}
```

## Environment Variables

### Required

```bash
# JWT Secret (change in production!)
JWT_SECRET=your-secure-random-secret-key

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# API URL for frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Production Recommendations

1. **JWT_SECRET**: Use a cryptographically secure random string (256+ bits)
2. **HTTPS**: Enable secure cookies only with HTTPS
3. **CORS**: Restrict FRONTEND_URL to your actual domain

## Testing

### Backend Tests

Location: `packages/api/src/routes/auth.test.ts`

Run tests:
```bash
cd packages/api
pnpm test
```

**Test Coverage:**
- User registration (success, duplicate email, validation)
- User login (success, wrong password, non-existent user)
- Current user endpoint (authenticated, unauthenticated, invalid token)
- Logout functionality
- Protected route access (authenticated vs. unauthenticated)

### E2E Tests

E2E tests need to be updated to use real authentication:

```typescript
// Example: Login before onboarding test
test('onboarding flow', async ({ page }) => {
  // First register/login
  await page.goto('/auth');
  await page.fill('#register-email', 'test@example.com');
  await page.fill('#register-password', 'password123');
  await page.fill('#register-name', 'Test User');
  await page.click('button[type="submit"]');

  // Wait for redirect to onboarding
  await page.waitForURL('/onboarding');

  // Continue with onboarding tests...
});
```

## Migration Guide

### For Existing Users

If you have existing users without password hashes:

1. **Option A**: Force password reset via email
2. **Option B**: Migrate OAuth-only users (keep password_hash null)
3. **Option C**: Create temporary passwords and notify users

### For New Installations

1. Run Prisma migration:
   ```bash
   npx prisma migrate dev --name add_password_hash
   ```

2. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

3. Set environment variables in `.env`

4. Start the API server:
   ```bash
   cd packages/api
   pnpm dev
   ```

5. Test authentication:
   ```bash
   # Register
   curl -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123","display_name":"Test User"}'

   # Login
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}' \
     -c cookies.txt

   # Get current user
   curl http://localhost:3001/api/auth/me -b cookies.txt
   ```

## Troubleshooting

### Cookies Not Being Set

**Issue**: JWT token not persisting
**Solutions:**
- Check CORS configuration allows `credentials: true`
- Verify `credentials: 'include'` in frontend fetch calls
- In development, ensure frontend and API are on same localhost
- Check browser console for CORS errors

### 401 Unauthorized on Protected Routes

**Issue**: Authentication failing despite login
**Solutions:**
- Verify cookie is present in browser DevTools > Application > Cookies
- Check JWT_SECRET matches between API restarts
- Ensure token hasn't expired (7-day expiry)
- Test `/api/auth/me` endpoint directly

### Password Validation Errors

**Issue**: Registration rejected
**Solutions:**
- Password must be at least 8 characters
- Password must contain both letters and numbers
- Email must be valid format

## Security Considerations

### Current Implementation

✅ **Implemented:**
- Password hashing with bcrypt
- HTTP-only cookies (XSS protection)
- SameSite cookies (CSRF protection)
- JWT expiration (7 days)
- Input validation
- Route-level authentication
- User can only access own data

⚠️ **Not Yet Implemented:**
- Rate limiting on auth endpoints
- Account lockout after failed attempts
- Email verification
- Password reset flow
- 2FA/MFA support
- Session revocation/management
- IP-based security

### Best Practices

1. **Never log passwords or tokens** in production
2. **Rotate JWT_SECRET** if compromised
3. **Use HTTPS** in production (required for secure cookies)
4. **Implement rate limiting** on `/auth/login` and `/auth/register`
5. **Monitor failed login attempts** for suspicious activity
6. **Regular security audits** of authentication code

## Future Enhancements

Planned features for future iterations:

1. **Email Verification**: Confirm email address after registration
2. **Password Reset**: Secure token-based password reset flow
3. **OAuth Providers**: Social login (already stubbed for Spotify, Google, etc.)
4. **Session Management**: View/revoke active sessions
5. **2FA**: Two-factor authentication support
6. **Account Recovery**: Security questions or backup codes
7. **Rate Limiting**: Prevent brute force attacks
8. **Audit Logging**: Track auth events for security monitoring

## Related Documentation

- [TECHNICAL_REPORT.md](../TECHNICAL_REPORT.md) - Complete system documentation
- [README.md](../README.md) - Project overview and setup
- [prisma/schema.prisma](../prisma/schema.prisma) - Database schema

---

**Last Updated**: 2025-11-17
**Auth Version**: 1.0
