# Phase 1 Implementation Checklist

> **Target**: Admin Access Hardening  
> **Prerequisites**: Phase 0 completed (auth audit, role standardization)

This checklist describes exactly what Phase 1 will implement based on the Phase 0 audit findings.

---

## 1. Login Endpoint Changes

### File: `app/api/auth/login/route.ts`

- [ ] **Remove `role` from request body** - Login should not require client to specify role
- [ ] **Implement role detection logic**:
  ```typescript
  // Instead of: WHERE email = $1 AND role = $2
  // Use: WHERE email = $1
  // Then check if user.role is admin type
  ```
- [ ] **For admin login**: Set httpOnly cookie instead of returning token in body
- [ ] **For guest login**: Keep current behavior (token in response body)
- [ ] **Add rate limiting** using existing `checkRateLimit()` pattern

### New Behavior
| Login Type | Token Storage | Response |
|------------|---------------|----------|
| Guest (`/guest/login`) | localStorage (via response body) | `{ token, user }` |
| Admin (`/admin/login`) | httpOnly cookie | `{ user }` (no token in body) |

---

## 2. Admin Cookie Implementation

### New File: `lib/adminAuth.ts` (or extend `lib/auth.ts`)

- [ ] **Create cookie helper functions**:
  ```typescript
  export function setAdminCookie(response: NextResponse, token: string): void
  export function getAdminCookie(request: NextRequest): string | null
  export function clearAdminCookie(response: NextResponse): void
  ```

### Cookie Configuration
```typescript
{
  name: 'alfarm_admin_token',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/admin',
  maxAge: 60 * 60 * 24 * 7 // 7 days
}
```

---

## 3. Middleware Implementation

### New File: `middleware.ts` (project root)

- [ ] **Create Next.js middleware** for server-side route protection
- [ ] **Protect `/admin/*` routes** (except `/admin/login`)
- [ ] **Check admin cookie** and verify JWT
- [ ] **Redirect to `/admin/login`** if not authenticated

### Implementation Pattern
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';
import { isAdminRole } from './lib/roles';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip login page
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }
  
  // Protect /admin/* routes
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('alfarm_admin_token')?.value;
    
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    
    const decoded = verifyToken(token);
    if (!decoded || !isAdminRole(decoded.role)) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*']
};
```

---

## 4. New Admin Endpoint

### New File: `app/api/admin/me/route.ts`

- [ ] **Create `/api/admin/me`** endpoint
- [ ] **Read token from cookie** (not Authorization header)
- [ ] **Verify admin role**
- [ ] **Return user data**

### Implementation
```typescript
export async function GET(request: NextRequest) {
  const token = request.cookies.get('alfarm_admin_token')?.value;
  
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  const decoded = verifyToken(token);
  if (!decoded || !isAdminRole(decoded.role)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }
  
  // Fetch fresh user data from DB...
}
```

---

## 5. Update Existing Admin API Routes

### Files to Update
- `app/api/admin/bookings/route.ts`
- `app/api/admin/bookings/[id]/route.ts`

### Changes
- [ ] **Update `requireRole()`** to also check cookie (not just Authorization header)
- [ ] **Use role constants** from `lib/roles.ts`:
  ```typescript
  // Before: requireRole(request, ['admin', 'root'])
  // After:  requireRole(request, ALL_ADMIN_ROLES)
  ```

---

## 6. Update Auth Middleware

### File: `lib/authMiddleware.ts`

- [ ] **Add cookie extraction** for admin routes
- [ ] **Update type definitions** to use `lib/roles.ts` types
- [ ] **Add helper for admin-specific auth**:
  ```typescript
  export function authenticateAdminRequest(request: NextRequest): AuthResult {
    // Check cookie first, then fall back to header
    const cookieToken = request.cookies.get('alfarm_admin_token')?.value;
    const headerToken = request.headers.get('authorization')?.replace('Bearer ', '');
    
    const token = cookieToken || headerToken;
    // ... verify and return
  }
  ```

---

## 7. Update Admin Login Page

### File: `app/admin/login/page.tsx`

- [ ] **Remove role from login call** (backend determines role)
- [ ] **Update login flow**:
  ```typescript
  // Before: await login(email, password, 'root')
  // After:  await adminLogin(email, password) // New function
  ```
- [ ] **Handle cookie-based auth** (no token in response)
- [ ] **Update redirect logic**

---

## 8. Update Admin Context/State

### Option A: Separate Admin Context
- [ ] Create `lib/AdminAuthContext.tsx` for admin-specific auth state
- [ ] Use cookie-based session checking

### Option B: Extend Existing Context
- [ ] Update `lib/AuthContext.tsx` to handle both patterns
- [ ] Add `adminLogin()` function that doesn't store token in localStorage

---

## 9. Update Role Comparisons

### Files to Update
| File | Current | Target |
|------|---------|--------|
| `lib/authMiddleware.ts` | `'admin' \| 'guest' \| 'root'` | Import from `lib/roles.ts` |
| `lib/AuthContext.tsx` | `'admin' \| 'guest' \| 'root'` | Import from `lib/roles.ts` |
| `components/ProtectedRoute.tsx` | `'admin' \| 'guest' \| 'root'` | Import from `lib/roles.ts` |
| `app/admin/login/page.tsx` | `user.role === 'admin' \|\| user.role === 'root'` | `isAdminRole(user.role)` |
| `app/admin/dashboard/page.tsx` | `['admin', 'root']` | `ALL_ADMIN_ROLES` |
| `components/Navigation.tsx` | `user.role === 'guest'` | `isGuestRole(user.role)` |

---

## 10. Rate Limiting

### File: `app/api/auth/login/route.ts`

- [ ] **Add rate limiting** to login endpoint:
  ```typescript
  import { checkRateLimit, RateLimitPresets } from '@/lib/rateLimit';
  
  // Add preset for login
  // Suggested: 5 attempts per minute per IP
  ```

### File: `lib/rateLimit.ts`

- [ ] **Add login preset**:
  ```typescript
  export const RateLimitPresets = {
    // ... existing
    login: { limit: 5, windowMs: 60000 }
  };
  ```

---

## 11. Testing Checklist

After implementation, verify:

- [ ] Guest can register (role always = 'guest')
- [ ] Guest can login via `/guest/login` (token in localStorage)
- [ ] Guest cannot access `/admin/*` routes
- [ ] Admin can login via `/admin/login` (token in httpOnly cookie)
- [ ] Admin can access `/admin/dashboard`
- [ ] Admin API routes work with cookie auth
- [ ] Middleware redirects unauthenticated users from `/admin/*`
- [ ] Logout clears appropriate storage (localStorage for guest, cookie for admin)
- [ ] Rate limiting blocks excessive login attempts

---

## 12. Migration Notes

### Database
- No schema changes required
- Existing `root` and `admin` roles continue to work via `normalizeRole()`
- Future: Consider migrating DB values to `super_admin`/`cashier`

### Backward Compatibility
- Guest auth unchanged (localStorage + Authorization header)
- Admin auth migrates to cookies (breaking change for admin sessions)
- Admin users will need to re-login after deployment

---

## Files Summary

### New Files
- `middleware.ts` - Server-side route protection
- `app/api/admin/me/route.ts` - Admin user endpoint
- `lib/adminAuth.ts` (optional) - Admin cookie helpers

### Modified Files
- `app/api/auth/login/route.ts` - Remove role from body, add cookie for admin
- `lib/authMiddleware.ts` - Add cookie support, use role constants
- `lib/AuthContext.tsx` - Add admin login function (or separate context)
- `app/admin/login/page.tsx` - Update login flow
- `app/admin/dashboard/page.tsx` - Use role constants
- `components/ProtectedRoute.tsx` - Use role constants
- `components/Navigation.tsx` - Use role helpers
- `app/api/admin/bookings/route.ts` - Use role constants
- `app/api/admin/bookings/[id]/route.ts` - Use role constants
- `lib/rateLimit.ts` - Add login preset

### Already Done (Phase 0)
- ✅ `lib/roles.ts` - Role constants and utilities
- ✅ `app/api/auth/register/route.ts` - Ignore client role, always use 'guest'
- ✅ `docs/auth-audit.md` - Auth system documentation
