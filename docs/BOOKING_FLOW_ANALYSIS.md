# Booking & Admin Process — Flow Analysis

> **Date:** 2026-03-16
> **Scope:** Guest booking flow, Admin booking flow, shared APIs, data consistency

---

## 1. Flow Overview

### Guest Booking Flow (5 steps)

```
Homepage Search → /booking/results → /booking/info → /booking/checkout → /booking/success/[id]
     (dates)       (select products)   (guest info)    (review+pay)       (QR + confirmation)
```

**State management:** `BookingContext` (sessionStorage via `booking_flow_state_v1`)
**API submission:** `POST /api/bookings` (Zod-validated, row-level locking, rate-limited)

### Admin Booking Flow

```
/admin/bookings          → List all bookings (filter, search, paginate)
/admin/bookings/[id]     → Detail view (status actions, edit modal, audit trail)
/admin/bookings/new      → Create booking on behalf of guest
```

**State management:** Local component state (no shared context)
**API submission:** `POST /api/admin/bookings` (RBAC-gated, basic validation only)

### Booking Lifecycle (Status Machine)

```
pending → confirmed → checked_in → checked_out → completed
   ↓                                                 
cancelled ←──────────────────────────────────────────
```

---

## 2. Critical Issues (Bugs / Data Integrity Risks)

### 2.1 🔴 Admin booking creation lacks inventory locking

| | Guest API (`POST /api/bookings`) | Admin API (`POST /api/admin/bookings`) |
|---|---|---|
| **Zod validation** | ✅ Full schema | ❌ Manual `if (!guest_info)` only |
| **Row-level locking** | ✅ `SELECT ... FOR UPDATE` | ❌ None |
| **Availability check** | ✅ Date-overlap query | ❌ None |
| **Rate limiting** | ✅ Yes | ❌ None (relies on RBAC only) |
| **QR code generation** | ✅ `randomUUID()` | ❌ Not generated |

**Risk:** An admin can oversell a product because the admin POST endpoint does no availability check and no row-level locking. Two concurrent admin bookings could exceed inventory.

**Fix:** Share the same transactional inventory-check logic (or call a shared service function) from both endpoints.

### 2.2 🔴 `GET /api/bookings/[id]` is unauthenticated (IDOR)

```typescript
// app/api/bookings/[id]/route.ts — line 12
// "No authentication required — the booking ID acts as a reference number."
```

Anyone who guesses or enumerates a sequential integer booking ID can read full PII (name, email, phone) and booking details. This is an **Insecure Direct Object Reference** vulnerability.

**Fix:** Either:
- Require JWT authentication and verify ownership, or
- Use the `qr_code_hash` UUID as the lookup key instead of the numeric ID, or
- At minimum, return only non-PII fields on the public route.

### 2.3 🟡 Confirmation page uses wrong token key

```typescript
// app/booking/confirmation/[id]/page.tsx — line 65
const token = localStorage.getItem('token');
```

But `AuthContext` stores the token under `alfarm_token`:
```typescript
// lib/AuthContext.tsx
const TOKEN_KEY = 'alfarm_token';
```

**Result:** The confirmation page will **never** find the token, so booking details will never load for authenticated users. The fallback "You're all set!" card always appears instead of the rich confirmation.

### 2.4 🟡 Entrance fee calculation divergence between Results and Checkout

| Page | Entrance fee source |
|---|---|
| **Results** (`/booking/results`) | Dedicated `/api/products/entrance-fees` endpoint → structured `{ day: { adult, child }, night: { adult, child } }` |
| **Checkout** (`/booking/checkout`) | Re-fetches full `/api/products` list → matches by string `p.title.includes('Adult Entrance')` and `p.title.includes('(Day)')` |

**Risk:** If product names are changed or new entrance fee products are added, the checkout page may fail to match while the results page works correctly, causing a **price mismatch** between what the user sees and what they're charged.

**Fix:** Use the `/api/products/entrance-fees` endpoint consistently on both pages, or have the backend calculate entrance fees server-side at booking creation.

### 2.5 🟡 Admin PATCH endpoint has no audit logging

```typescript
// app/api/admin/bookings/[id]/route.ts — PATCH handler
// No call to logAuditWithRequest()
```

The check-in, check-out, payment, and guest-cancel endpoints all log audit entries. But the generic PATCH update (which can change status, guest info, dates, payment status, etc.) has **no audit trail**. This is the most powerful mutation endpoint and the one most in need of audit logging.

### 2.6 🟡 Admin DELETE cancellation has no audit logging

Same issue as above — `DELETE /api/admin/bookings/[id]` soft-cancels a booking but logs no audit entry, unlike the guest cancel route which does.

---

## 3. Logic Issues & Inconsistencies

### 3.1 `pricing_unit` vs `product.type` for per-night logic

The **frontend** (results page) uses `product.type === 'room'` to decide per-night multiplication:
```typescript
// app/booking/results/page.tsx — line 222
const isPerNight = product.type === 'room' && searchType === 'overnight';
```

But the **backend** and the **admin new-booking page** use `pricing_unit === 'per_night'`:
```typescript
// app/api/bookings/route.ts — line 315
if (pricingUnit === 'per_night' && booking_type === 'overnight') { ... }

// app/admin/bookings/new/page.tsx — line 181
const isPerNight = avail?.pricing_unit === 'per_night';
```

**Risk:** If a non-room product has `pricing_unit = 'per_night'`, or a room product doesn't, the guest-side total will differ from the API-calculated total. The **backend is authoritative** and correct; the frontend results page should use `pricing_unit` too.

### 3.2 Admin new-booking page doesn't send `credentials: 'include'`

```typescript
// app/admin/bookings/new/page.tsx — line 248
const res = await fetch('/api/admin/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
});
```

All other admin pages use `adminFetch` which sets `credentials: 'include'`. This page uses raw `fetch` — the admin session cookie **will not be sent**, and the RBAC check will fail with 401.

Similarly, the product and availability fetches on lines 88 and 125 use raw `fetch` (which is fine since those are public APIs), but the POST to the admin endpoint is broken.

### 3.3 Booking history status filter is incomplete

```typescript
// app/api/bookings/history/route.ts — line 62
if (status && ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled'].includes(status))
```

Missing: `checked_out`. A guest filtering by "checked_out" would get unfiltered results instead.

### 3.4 Cart not cleared on booking type change

When a user switches between "Day Use" and "Overnight" on the results page, the cart persists but product visibility changes. Items that are no longer visible (e.g., night-only products in day mode) remain in the cart and will be submitted. The availability API may catch this, but the UX is misleading.

### 3.5 `completed` status not in guest cancellation check

Guest cancel only allows cancellation of `pending` bookings. The admin detail page UI shows cancel buttons for other statuses too. This is fine from a permissions standpoint, but the admin cancel endpoint (`DELETE`) has **no status guard at all** — it can cancel an already-completed or checked-in booking.

---

## 4. UI/UX Issues & Improvements

### 4.1 Two separate "confirmation" pages create confusion

- `/booking/success/[id]` — Rich page with QR code, item breakdown, download button
- `/booking/confirmation/[id]` — Simpler page, tries to load from history API (broken token key)

The `BookingCard` component links to `/booking/confirmation/[id]` ("View Passport"), but the actual post-checkout redirect goes to `/booking/success/[id]`. These should be consolidated into one page.

### 4.2 Guest booking: no way to edit cart from checkout page

The checkout page shows the order summary as read-only. The "Back" button goes to `/booking/info` (guest details), not `/booking/results` (product selection). A user who wants to change their product selection must navigate back two steps.

**Suggestion:** Add a direct "Edit Selection" link from the checkout summary back to `/booking/results`.

### 4.3 No loading guard on checkout page while products load

The checkout page fetches `/api/products` to resolve product names and entrance fees. During loading, `lineItems` is empty and shows no items. The total shows ₱0 until products load. The "Place Booking" button is only disabled by `loadingProducts`, but a fast user could theoretically click through the confirmation modal before products are fully resolved.

### 4.4 Day-use bookings don't enforce item selection

```typescript
// app/booking/results/page.tsx — line 232
if (searchType === 'overnight' && totalItems === 0) { ... }
```

Day-use bookings allow proceeding with zero products. The API requires `items.min(1)` and will reject it, but the error only appears after the user has filled out guest info and reached checkout. Should validate earlier.

### 4.5 Admin booking detail: no "Mark as Completed" action

The status machine includes `completed`, but the admin detail page only has check-in and check-out action buttons. There's no UI to transition `checked_out → completed`. This can only be done via the generic PATCH/edit modal.

### 4.6 Mobile: Sticky footer on results page may overlap content

The fixed-bottom summary footer (`position: fixed; bottom: 0`) doesn't account for the `<Footer />` component. On mobile, the last product cards may be hidden behind the sticky bar. The page has `pb-32` on the section, but this may not be enough for all screen sizes.

---

## 5. Security Considerations

| Area | Status | Notes |
|---|---|---|
| **Guest booking rate limiting** | ✅ | `RateLimitPresets.booking` |
| **Availability rate limiting** | ✅ | `RateLimitPresets.availability` |
| **Cancellation rate limiting** | ✅ | `RateLimitPresets.cancellation` |
| **Admin API RBAC** | ✅ | `requirePermission()` on all admin endpoints |
| **SQL injection** | ✅ | Parameterized queries throughout |
| **XSS in search** | ✅ | `sanitizeSearch()` used in admin list |
| **Booking ID enumeration** | ❌ | Sequential IDs + unauthenticated GET = IDOR |
| **Shadow account password** | ⚠️ | Placeholder bcrypt hash is not a real hash — a clever attacker could attempt login with the known "password" |
| **Admin new-booking auth** | ❌ | Missing `credentials: 'include'` means it's currently broken |

---

## 6. Suggested Priority Actions

| Priority | Issue | Effort |
|---|---|---|
| **P0** | Fix admin new-booking to use `adminFetch` (currently broken) | 5 min |
| **P0** | Fix confirmation page token key (`'token'` → `'alfarm_token'`) | 1 min |
| **P1** | Add inventory locking to admin booking POST | Medium |
| **P1** | Add audit logging to admin PATCH and DELETE | Small |
| **P1** | Fix IDOR on `GET /api/bookings/[id]` | Medium |
| **P2** | Unify entrance fee calculation (use `/api/products/entrance-fees` everywhere) | Small |
| **P2** | Fix `pricing_unit` vs `type` check on results page | Small |
| **P2** | Add `checked_out` to history status filter | 1 min |
| **P2** | Consolidate confirmation/success pages | Medium |
| **P3** | Clear cart on booking type switch | Small |
| **P3** | Add "Mark as Completed" admin action | Small |
| **P3** | Day-use: validate at least one item earlier in flow | Small |

---

## 7. Data Flow Diagrams

### Guest Booking — Data Flow

```
┌──────────┐    URL params     ┌──────────────┐   sessionStorage   ┌─────────────┐
│ Homepage │ ──────────────→  │ /results     │ ──────────────→   │ /info       │
│ Search   │                  │ (select)     │  BookingContext    │ (guest info)│
└──────────┘                  └──────┬───────┘                   └──────┬──────┘
                                     │                                  │
                              /api/products                    setGuestInfo()
                              /api/availability                setSpecialRequests()
                              /api/products/entrance-fees              │
                                                               ┌──────▼──────┐
                                                               │ /checkout   │
                                                               │ (review)    │
                                                               └──────┬──────┘
                                                                      │
                                                              POST /api/bookings
                                                              (Zod + locking)
                                                                      │
                                                               ┌──────▼──────┐
                                                               │ /success/id │
                                                               │ (QR code)   │
                                                               └─────────────┘
```

### Admin Booking — Data Flow

```
┌──────────────┐          ┌──────────────────┐
│ /admin/      │  GET     │ /api/admin/      │
│ bookings     │ ───────→ │ bookings         │
│ (list)       │          │ (RBAC gated)     │
└──────┬───────┘          └──────────────────┘
       │
       ├──→ /admin/bookings/[id]  ──→  GET  /api/admin/bookings/[id]
       │         │                     POST /api/admin/bookings/[id]/checkin
       │         │                     POST /api/admin/bookings/[id]/checkout
       │         │                     PATCH /api/admin/bookings/[id]/payment
       │         │                     PATCH /api/admin/bookings/[id] (edit modal)
       │         │                     DELETE /api/admin/bookings/[id]
       │
       └──→ /admin/bookings/new   ──→  POST /api/admin/bookings ⚠️ (no adminFetch)
                                       GET  /api/products (public)
                                       GET  /api/availability (public)
```
