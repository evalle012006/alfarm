# Authentication & Session Audit

> **Phase 0 Audit** | Last Updated: January 2026

This document summarizes the current authentication and session management implementation in the AlFarm Resort codebase.

---

## 1. JWT Creation & Verification

### Location
- **File**: `lib/auth.ts`

### Implementation
- **Library**: `jsonwebtoken` (jwt)
- **Hashing**: `bcryptjs` (cost factor 10)
- **Token Expiry**: 7 days (`{ expiresIn: '7d' }`)
- **Secret**: `JWT_SECRET` environment variable
  - **Production**: Required (fatal error if missing)
  - **Development**: Falls back to insecure default with console warning

### Functions
| Function | Purpose |
|----------|---------|
| `hashPassword(password)` | Hash password with bcrypt |
| `verifyPassword(password, hash)` | Compare password against hash |
| `generateToken(user)` | Create JWT with `{id, email, role}` payload |
| `verifyToken(token)` | Verify and decode JWT |

### Token Payload
```typescript
{
  id: number;
  email: string;
  role: string;
}
```

---

## 2. Token Storage & Transport

### Guest Pages/APIs

| Aspect | Implementation |
|--------|----------------|
| **Storage** | `localStorage` (client-side) |
| **Keys** | `alfarm_token` (JWT), `user` (user object JSON) |
| **Transport** | `Authorization: Bearer <token>` header |
| **Context** | `lib/AuthContext.tsx` manages state |

### Admin Pages/APIs

| Aspect | Implementation |
|--------|----------------|
| **Storage** | Same as guest (`localStorage`) |
| **Transport** | Same as guest (`Authorization` header) |
| **Context** | Same `AuthContext` used |

**Finding**: Guest and Admin use identical auth mechanisms. No cookie-based auth exists currently.

---

## 3. `/api/auth/me` Implementation

### Location
- **File**: `app/api/auth/me/route.ts`

### Flow
1. Calls `authenticateRequest(request)` from `lib/authMiddleware.ts`
2. Extracts JWT from `Authorization` header
3. Verifies token with `verifyToken()`
4. Fetches fresh user data from database by `user.id`
5. Returns user object (id, email, firstName, lastName, phone, role)

### Key Behavior
- Role is fetched from **database**, not just trusted from token
- Returns 401 if token invalid/missing
- Returns 404 if user not found in DB

---

## 4. Admin Route Protection

### Current Mechanisms

#### 4.1 Client-Side Protection
- **File**: `components/ProtectedRoute.tsx`
- **Usage**: Wraps admin pages (e.g., `app/admin/dashboard/page.tsx`)
- **Mechanism**: 
  - Checks `useAuth()` context for `isAuthenticated` and `user.role`
  - Redirects to `/admin/login` if not authenticated
  - Redirects based on role if authenticated but wrong role

#### 4.2 API Route Protection
- **File**: `lib/authMiddleware.ts`
- **Functions**:
  - `authenticateRequest(request)` - Extracts and verifies JWT
  - `requireAuth(request)` - Returns 401 if not authenticated
  - `requireRole(request, allowedRoles)` - Returns 401/403 if not authorized

#### 4.3 Admin API Usage
- **Files**: `app/api/admin/bookings/route.ts`, `app/api/admin/bookings/[id]/route.ts`
- **Pattern**: `requireRole(request, ['admin', 'root'])`

### No Server-Side Middleware
- **Finding**: No `middleware.ts` file exists at project root
- Admin routes are NOT protected at the Next.js middleware level
- Protection relies on:
  1. Client-side `ProtectedRoute` component (can be bypassed)
  2. API-level `requireRole()` checks (secure for data)

---

## 5. Role Handling Analysis

### Current Role Values in Database
| Role | Description | Used By |
|------|-------------|---------|
| `guest` | Public customers | Registration, guest checkout |
| `root` | Super admin (legacy) | Seeded admin user |
| `admin` | Admin (legacy) | Potentially in DB |

### Role Comparison Locations

| File | Pattern | Notes |
|------|---------|-------|
| `lib/authMiddleware.ts` | `allowedRoles: ('admin' \| 'guest' \| 'root')[]` | Type definition |
| `lib/AuthContext.tsx` | `role: 'admin' \| 'guest' \| 'root'` | Type definition |
| `components/ProtectedRoute.tsx` | `allowedRoles?: ('admin' \| 'guest' \| 'root')[]` | Type definition |
| `app/admin/login/page.tsx` | `user.role === 'admin' \|\| user.role === 'root'` | String comparison |
| `app/admin/dashboard/page.tsx` | `allowedRoles={['admin', 'root']}` | Prop value |
| `app/api/admin/bookings/route.ts` | `requireRole(request, ['admin', 'root'])` | Function call |
| `app/api/admin/bookings/[id]/route.ts` | `requireRole(request, ['admin', 'root'])` | Function call |
| `components/Navigation.tsx` | `user.role === 'guest'` | Dashboard routing |

### Role Trust Analysis

| Context | Trusted From | Secure? |
|---------|--------------|---------|
| Login | Client sends `role` in body, DB lookup uses it | ⚠️ Partial - role from client selects which user type to query |
| Registration | Was accepting client `role` | ❌ Fixed in Phase 0 |
| API Auth | JWT payload (signed) | ✅ Yes |
| `/api/auth/me` | Database lookup | ✅ Yes |
| Client display | localStorage (from login response) | ⚠️ Display only |

### Login Role Handling (Current)
```typescript
// app/api/auth/login/route.ts
const { email, password, role } = await request.json();
// ...
const result = await pool.query(
  'SELECT * FROM users WHERE email = $1 AND role = $2',
  [email, role || 'guest']
);
```

**Finding**: Login uses client-provided `role` to filter DB query. This is intentional (allows same email for different role types) but means:
- Client must know/specify the role to login as
- Admin login page tries `root` first, then `admin`

---

## 6. Security Observations

### Strengths
1. JWT is properly signed and verified
2. API routes use `requireRole()` for authorization
3. `/api/auth/me` fetches role from DB (not just token)
4. Password hashing uses bcrypt with reasonable cost factor

### Weaknesses (to address in Phase 1)
1. **No server-side middleware** - Admin routes accessible client-side until API call
2. **localStorage for admin tokens** - Vulnerable to XSS
3. **No CSRF protection** - Not using cookies, so less critical
4. **Login role from client** - Intentional but unusual pattern
5. **No rate limiting on login** - Could add brute force protection

---

## 7. Files Reference

| File | Purpose |
|------|---------|
| `lib/auth.ts` | JWT/password utilities |
| `lib/authMiddleware.ts` | API auth helpers |
| `lib/AuthContext.tsx` | Client auth state |
| `lib/roles.ts` | Role constants (NEW - Phase 0) |
| `app/api/auth/login/route.ts` | Login endpoint |
| `app/api/auth/register/route.ts` | Registration endpoint |
| `app/api/auth/me/route.ts` | Current user endpoint |
| `components/ProtectedRoute.tsx` | Client route guard |
| `app/admin/login/page.tsx` | Admin login UI |
| `app/admin/dashboard/page.tsx` | Admin dashboard (protected) |

---

## 8. Phase 1 Implications

Based on this audit, Phase 1 should:

1. **Add `middleware.ts`** at project root for server-side admin route protection
2. **Implement admin cookie auth** (httpOnly, secure) instead of localStorage
3. **Remove `role` from login request body** - determine from DB lookup
4. **Add `/api/admin/me`** endpoint for admin-specific user fetch
5. **Update role comparisons** to use `lib/roles.ts` constants
6. **Add rate limiting** to login endpoint

See `docs/phase-1-checklist.md` for implementation details.
