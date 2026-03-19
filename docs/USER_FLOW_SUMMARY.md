# AlFarm Booking System — User Flow Summary

> Complete logic-level documentation of every user flow in the system.
> Last updated: 2026-03-19

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [Guest Booking Flow (Client)](#3-guest-booking-flow-client)
4. [PayMongo Payment Flow](#4-paymongo-payment-flow)
5. [Payment Confirmation (Dual Path)](#5-payment-confirmation-dual-path)
6. [Abandoned Booking Cleanup (Cron)](#6-abandoned-booking-cleanup-cron)
7. [Guest Account System](#7-guest-account-system)
8. [Admin Authentication & RBAC](#8-admin-authentication--rbac)
9. [Admin Booking Management](#9-admin-booking-management)
10. [Admin Payment Operations](#10-admin-payment-operations)
11. [Booking Status Lifecycle](#11-booking-status-lifecycle)
12. [Payment Status Lifecycle](#12-payment-status-lifecycle)
13. [Audit Trail](#13-audit-trail)
14. [API Route Map](#14-api-route-map)
15. [Environment Variables](#15-environment-variables)

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Next.js)                         │
│                                                                 │
│  Home Page ─► Results ─► Guest Info ─► Checkout ─► Success      │
│     (/)      (/booking   (/booking    (/booking   (/booking     │
│               /results)   /info)       /checkout)  /success/[id])│
└───────────────────────────────┬─────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │     API Layer          │
                    │  /api/bookings/*       │
                    │  /api/products/*       │
                    │  /api/availability     │
                    │  /api/webhooks/paymongo│
                    │  /api/cron/*           │
                    │  /api/admin/*          │
                    └───────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                  ▼
        ┌──────────┐    ┌────────────┐     ┌────────────┐
        │ PostgreSQL│    │  PayMongo  │     │  Mailtrap  │
        │ Database  │    │  API       │     │  (SMTP)    │
        └──────────┘    └────────────┘     └────────────┘
```

**Tech Stack:**
- **Framework:** Next.js 15.5.12 (App Router) + React 19
- **Language:** TypeScript
- **Database:** PostgreSQL (via `pg` pool)
- **Payments:** PayMongo REST API (card, GCash, GrabPay, Maya)
- **Auth:** JWT (jose library) — cookie-based for admin, localStorage for guests
- **Email:** Nodemailer + Mailtrap (SMTP)
- **Validation:** Zod schemas
- **Styling:** TailwindCSS
- **State:** React Context (BookingContext, AuthContext)

---

## 2. Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `users` | All users — admin staff, guests, and shadow accounts |
| `categories` | Product categories (Entrance Fee, Accommodation, Amenities, Rentals) |
| `products` | Bookable items with pricing, inventory, time slots |
| `bookings` | Booking header — guest info, dates, status, payment info |
| `booking_items` | Line items linking bookings to products with locked prices |
| `payment_transactions` | Ledger of all charges, refunds, and voids |
| `audit_logs` | Immutable log of all admin actions with before/after snapshots |

### Key Columns on `bookings`

| Column | Type | Purpose |
|--------|------|---------|
| `status` | CHECK | `pending`, `confirmed`, `checked_in`, `checked_out`, `completed`, `cancelled` |
| `payment_status` | CHECK | `unpaid`, `partial`, `paid`, `voided`, `refunded` |
| `payment_method` | CHECK | `paymongo` |
| `paid_amount` | DECIMAL | Running total of collected payments |
| `paymongo_checkout_session_id` | VARCHAR | Links to PayMongo checkout session |
| `paymongo_payment_id` | VARCHAR | Set when payment is confirmed |
| `qr_code_hash` | VARCHAR | UUID for QR check-in and IDOR prevention |

### Triggers

- `trg_users_updated_at` — auto-sets `updated_at` on every `UPDATE`
- `trg_products_updated_at` — same
- `trg_bookings_updated_at` — same

---

## 3. Guest Booking Flow (Client)

The booking flow is a 4-step wizard backed by `BookingContext` (sessionStorage-persisted).

### Step 1: Search — `/ (Home Page)`

**User action:** Select booking type, dates, and guest count.

**Logic:**
1. User picks **Day-use** or **Overnight**.
2. Selects check-in date (and check-out for overnight).
3. Sets adult/children count.
4. Entrance fee estimate is fetched from `GET /api/products/entrance-fees`.
5. On "Search", the context is reset and populated via `setSearch()`.
6. Navigates to `/booking/results?type=day&check_in=2026-03-20&adults=2&children=0`.

**Validations:**
- Check-in date required.
- Check-out required and must be after check-in for overnight.

### Step 2: Select Products — `/booking/results`

**User action:** Browse available products and add to cart.

**Logic:**
1. Fetches product catalog from `GET /api/products`.
2. Fetches real-time availability from `GET /api/availability?check_in=...&type=...&time_slot=...`.
3. Products are filtered by time slot (`day` items for day-use, `night` items for overnight, `any` for both).
4. Entrance Fee category is hidden (auto-added at checkout).
5. Cart quantities are capped at `remaining` inventory.
6. A sticky footer shows running total (product cost + entrance fees).
7. For overnight stays, `per_night` products are multiplied by number of nights.

**Availability Logic (SQL):**
- **Day bookings:** Counts items from active bookings on that exact date, including overnight bookings spanning that date.
- **Overnight bookings:** Counts items from active bookings whose date range overlaps `[check_in, check_out)`.
- Remaining = `inventory_count - booked`.

**Guard:** Redirects to `/` if no check-in date in context.

### Step 3: Guest Info — `/booking/info`

**User action:** Fill in contact details, adjust headcount, add special requests.

**Logic:**
1. Form fields: first name, last name, email, phone (all required).
2. Logged-in users can auto-fill via "Use my profile details" checkbox.
3. Adult/children counts are editable and sync back to `BookingContext.setSearch()`.
4. Special requests textarea (optional).
5. On submit, calls `setGuestInfo()` and `setSpecialRequests()`, then navigates to `/booking/checkout`.

**Validations:**
- All contact fields required.
- Email format check.
- Phone must have ≥7 digits.
- At least 1 adult.

**Guard:** Redirects to `/` if no check-in date, or to `/booking/results` if cart is empty.

### Step 4: Checkout — `/booking/checkout`

**User action:** Review order summary, accept terms, confirm booking.

**Logic:**
1. Displays all line items (cart products + entrance fees) with prices.
2. Payment method is fixed to PayMongo (online: Card / GCash / GrabPay / Maya).
3. User must check "I agree to house rules and cancellation policy".
4. Clicking "Place Booking" opens a confirmation modal.
5. On confirm, calls `POST /api/bookings/checkout-session` (see §4).
6. On success, `window.location.href` redirects to PayMongo's hosted checkout page.
7. Cart state is **not** cleared — if user cancels on PayMongo, they return to `/booking/checkout?cancelled=true` with cart intact.

**Guard:** Redirects if any prior step is incomplete (no dates, empty cart, no guest info).

**Cancelled return:** If `?cancelled=true` is present, shows "Payment was cancelled. You can try again." notification.

---

## 4. PayMongo Payment Flow

### Checkout Session Creation — `POST /api/bookings/checkout-session`

This is the core transactional endpoint. Everything happens inside a single DB transaction.

```
Client (checkout page)
  │
  ├─ POST /api/bookings/checkout-session
  │    │
  │    ├─ 1. Rate limit check
  │    ├─ 2. Validate payload (Zod: CheckoutSessionPayloadSchema)
  │    ├─ 3. BEGIN transaction
  │    ├─ 4. Lock products (SELECT ... FOR UPDATE) — prevents overselling
  │    ├─ 5. Check availability with date-overlap queries
  │    ├─ 6. Find/create user (atomic INSERT ... ON CONFLICT upsert)
  │    ├─ 7. Cancel any existing stale pending bookings for same user/date/type
  │    ├─ 8. Calculate pricing (per_night × nights, per_head, fixed)
  │    ├─ 9. INSERT bookings (status=pending, payment_status=unpaid, method=paymongo)
  │    ├─ 10. INSERT booking_items (price locked at booking time)
  │    ├─ 11. UPDATE bookings SET total_amount
  │    ├─ 12. Call PayMongo API: createCheckoutSession()
  │    │       └─ line_items, payment_method_types, success_url, cancel_url, metadata
  │    ├─ 13. Store paymongo_checkout_session_id on booking
  │    ├─ 14. COMMIT
  │    └─ 15. Return { checkout_url, booking_id, session_id }
  │
  └─ Browser redirects to checkout_url (PayMongo hosted page)
```

**Key safety mechanisms:**
- **Product locking:** `SELECT ... FOR UPDATE` serializes concurrent bookings.
- **Availability re-check:** After locking, queries for overlapping bookings to verify availability.
- **Idempotent user creation:** `INSERT ... ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id` — safe under concurrency.
- **Stale booking cleanup:** If the same user already has a pending/unpaid/paymongo booking for the same date+type, it's cancelled before creating a new one.

**PayMongo session parameters:**
- `payment_method_types`: `['card', 'gcash', 'grab_pay', 'paymaya']`
- `success_url`: `/booking/success/{id}?hash={qr_code_hash}`
- `cancel_url`: `/booking/checkout?cancelled=true`
- `metadata`: `{ booking_id, qr_code_hash }`

---

## 5. Payment Confirmation (Dual Path)

Payment confirmation has **two independent paths** that are serialized via `SELECT ... FOR UPDATE` row locking to prevent double-processing.

### Path A: Webhook — `POST /api/webhooks/paymongo`

**Trigger:** PayMongo sends `checkout_session.payment.paid` event to this endpoint.

**Logic:**
1. Verify `Paymongo-Signature` header using HMAC-SHA256.
2. Parse event, extract checkout session ID and payment ID.
3. `BEGIN` transaction.
4. `SELECT ... FROM bookings WHERE paymongo_checkout_session_id = $1 FOR UPDATE` — locks the row.
5. **Idempotency check:** If already `paid` + `confirmed`, ROLLBACK and return.
6. Update booking: `status='confirmed'`, `payment_status='paid'`, `paid_amount=total_amount`, `paymongo_payment_id=...`.
7. Insert `payment_transactions` record (type='charge').
8. `COMMIT`.
9. Send confirmation email (fire-and-forget, outside transaction).

**Also handles:** `payment.failed` — logs warning, booking stays pending for cron to auto-cancel.

### Path B: Verify-Payment Polling — `POST /api/bookings/verify-payment`

**Trigger:** Success page polls this endpoint up to 10 times (every 3 seconds) as a webhook fallback.

**Logic:**
1. Validate `booking_id` + `hash` (IDOR prevention).
2. `BEGIN` transaction.
3. `SELECT ... FROM bookings WHERE id = $1 AND qr_code_hash = $2 FOR UPDATE` — same row lock as webhook.
4. **Idempotency check:** If already `paid` + `confirmed`, return immediately.
5. Call PayMongo API: `retrieveCheckoutSession(session_id)`.
6. Check if session has a payment with `status='paid'`.
7. If paid: update booking (same as webhook), insert transaction, `COMMIT`, send email.
8. If not paid: ROLLBACK, return current status.
9. If session expired: return `verified: false` with message.

**Why both paths exist:** Webhooks require HTTPS (unavailable in dev). The polling fallback ensures payment is confirmed even without webhooks.

### Success Page — `/booking/success/[id]`

**Logic:**
1. Fetch booking via `GET /api/bookings/{id}?hash={qr_code_hash}`.
2. If `payment_method='paymongo'` and `payment_status != 'paid'`, trigger `verifyPayment()` polling.
3. Shows spinner with "Verifying Payment..." during polling.
4. On success: updates local state to `confirmed` + `paid`, shows "Booking Confirmed & Paid!".
5. If polling exhausts 10 attempts: shows warning about delayed processing.
6. Displays: visit details, reserved items, guest info, QR code for check-in.
7. QR value: `ALFARM-BK-{id}-{qr_code_hash}`.
8. Non-authenticated users see a "Register Now" CTA to claim their shadow account.

---

## 6. Abandoned Booking Cleanup (Cron)

**Endpoint:** `POST /api/cron/expire-bookings`  
**Schedule:** Every 5 minutes (external cron service).  
**Auth:** `Authorization: Bearer {CRON_SECRET}`.

**Logic:**
1. Query bookings where `status='pending'` AND `payment_method='paymongo'` AND `payment_status='unpaid'` AND `created_at < NOW() - 30 minutes`.
2. For each stale booking:
   - Call `expireCheckoutSession(session_id)` (best-effort — session may already be expired/paid).
   - `UPDATE bookings SET status='cancelled'` with timestamped note.
3. Return `{ expired: N, checked: M }`.

**Purpose:** Prevents inventory from being locked indefinitely by abandoned PayMongo checkouts.

---

## 7. Guest Account System

### Shadow Users

When a guest books without logging in, a **shadow user** is created:

```sql
INSERT INTO users (email, password, first_name, last_name, phone, role, is_shadow)
VALUES ($1, 'placeholder_hash', ..., 'guest', TRUE)
ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
RETURNING id
```

- `is_shadow = TRUE` indicates the account has no real password.
- The `ON CONFLICT` upsert handles concurrent bookings with the same email.
- If the email already belongs to a real user, the upsert returns that user's ID.

### Guest Registration (`/guest/register`)

- Guests can register with email + password.
- If a shadow account exists for that email, it's "claimed" (password set, `is_shadow = FALSE`).
- After registration, all past bookings linked to that user become visible in their dashboard.

### Guest Authentication

- **Login:** `POST /api/auth/login` — returns JWT stored in `localStorage`.
- **Token:** Sent as `Authorization: Bearer {token}` header.
- **Context:** `AuthContext` provides `user`, `token`, `isAuthenticated`, `login()`, `logout()`.
- **Booking access:** `GET /api/bookings/{id}` allows access via either:
  - `?hash={qr_code_hash}` (success page, no auth needed), or
  - JWT where `user_id` matches the booking's `user_id`.

---

## 8. Admin Authentication & RBAC

### Admin Login

- **Page:** `/admin/login`
- **Endpoint:** `POST /api/auth/admin/login`
- **Token:** JWT stored in `admin_token` HttpOnly cookie.
- **Middleware:** `middleware.ts` protects all `/admin/*` routes (except `/admin/login`).

### Roles

| Role | Description |
|------|-------------|
| `super_admin` | Full access to everything |
| `admin` | Manages bookings, staff, reports |
| `cashier` | Manages bookings, payments |

### Permission System

Permissions are defined in `lib/permissions.ts` as granular strings:

| Permission | Used By |
|------------|---------|
| `bookings:read` | View booking list and details |
| `bookings:create` | Create bookings on behalf of guests |
| `bookings:update` | Edit booking details and status |
| `bookings:cancel` | Cancel/soft-delete bookings |
| `payments:collect` | Record payment collection |
| `payments:void` | Void a payment |
| `payments:refund` | Issue refunds (including PayMongo API refund) |

**Enforcement:** Every admin API route calls `requirePermission(request, 'permission:name')` which:
1. Reads `admin_token` cookie.
2. Verifies JWT signature.
3. Looks up user in DB.
4. Checks `hasPermission(role, permission)`.
5. Returns `{ authorized: true, user }` or `{ authorized: false, response: 401/403 }`.

---

## 9. Admin Booking Management

### Booking List — `/admin/bookings`

- **API:** `GET /api/admin/bookings?status=...&date=...&search=...&page=...`
- **Features:** Pagination, status filter, date filter, search by guest name/email/phone.
- **Permission:** `bookings:read`

### Booking Detail — `/admin/bookings/[id]`

- **API:** `GET /api/admin/bookings/{id}`
- **Displays:** Guest info, booking dates, items, payment details (PaymentCard), special requests, staff notes, audit trail.
- **Actions:** Edit (via `BookingEditModal`), status changes, payment operations.
- **Permission:** `bookings:read`

### Create Booking — Admin POST

- **API:** `POST /api/admin/bookings`
- **Permission:** `bookings:create`
- **Validation:** `AdminBookingPayloadSchema` (Zod)
- **Default status:** `confirmed` (admin bookings skip pending).
- **Same transactional safety** as guest flow: product locking, availability check, atomic user upsert.
- **No PayMongo session** — admin bookings are created directly with payment handled offline or via Collect.

### Edit Booking — Admin PATCH

- **API:** `PATCH /api/admin/bookings/{id}`
- **Permission:** `bookings:update`
- **Editable fields:** status, payment_status, payment_method, guest details, dates, booking_type, notes, special_requests.
- **Status transition validation:**

```
pending     → confirmed, cancelled
confirmed   → checked_in, cancelled
checked_in  → checked_out, cancelled
checked_out → completed, cancelled
completed   → (none — terminal)
cancelled   → pending (reactivation)
```

Invalid transitions return a 400 error with explanation.

### Cancel Booking — Admin DELETE

- **API:** `DELETE /api/admin/bookings/{id}`
- **Permission:** `bookings:cancel`
- **Soft delete:** Sets `status='cancelled'`, does not remove the row.

---

## 10. Admin Payment Operations

**Endpoint:** `PATCH /api/admin/bookings/{id}/payment`

All operations go through a single endpoint with an `operation` field.

### Collect Payment

- **Operation:** `collect`
- **Permission:** `payments:collect`
- **When shown:** `payment_status` is `unpaid` or `partial`.
- **Logic:** Adds `amount` to `paid_amount`. If `paid_amount >= total_amount`, sets `payment_status='paid'`; otherwise `'partial'`.
- **UI:** Green "Collect Payment" button on `PaymentCard` component.

### Void Payment

- **Operation:** `void`
- **Permission:** `payments:void`
- **When shown:** `payment_status` is `paid` or `partial`.
- **Logic:** Sets `paid_amount=0`, `payment_status='voided'`.
- **Guards:** Cannot void if already voided or refunded.

### Refund Payment

- **Operation:** `refund`
- **Permission:** `payments:refund`
- **When shown:** `payment_status` is `paid` or `partial`.
- **Logic:**
  1. If `paymongo_payment_id` exists → calls PayMongo Refund API (`createRefund()`).
  2. Inserts `payment_transactions` record with `type='refund'` and `paymongo_refund_id`.
  3. Sets `paid_amount=0`, `payment_status='refunded'`.
- **Guards:** Cannot refund if unpaid, already refunded, or voided.

---

## 11. Booking Status Lifecycle

```
                    ┌──────────┐
           ┌───────►│ cancelled│◄────────────────────────────┐
           │        └─────┬────┘                             │
           │              │ reactivate                       │
           │              ▼                                  │
  create   │        ┌──────────┐   confirm    ┌───────────┐ │
  ────────►├───────►│ pending  │─────────────►│ confirmed │─┤
           │        └──────────┘              └─────┬─────┘ │
           │              ▲                         │       │
           │              │ (cron auto-cancel       │       │
           │              │  after 30 min)     check-in     │
           │                                        ▼       │
           │                                  ┌───────────┐ │
           ├──────────────────────────────────│checked_in │─┤
           │                                  └─────┬─────┘ │
           │                                        │       │
           │                                   check-out    │
           │                                        ▼       │
           │                                  ┌───────────┐ │
           ├──────────────────────────────────│checked_out│─┘
           │                                  └─────┬─────┘
           │                                        │
           │                                   complete
           │                                        ▼
           │                                  ┌───────────┐
           │                                  │ completed  │ (terminal)
           │                                  └───────────┘
```

**Notes:**
- Guest online bookings start as `pending` → auto-confirmed on payment.
- Admin-created bookings default to `confirmed`.
- `cancelled` can be reactivated to `pending` only.
- `completed` is a terminal state with no transitions out.

---

## 12. Payment Status Lifecycle

```
  ┌────────┐  collect   ┌─────────┐  collect   ┌──────┐
  │ unpaid │───────────►│ partial │───────────►│ paid │
  └────────┘            └─────────┘            └──┬───┘
                             │                    │
                             │ void               │ void
                             ▼                    ▼
                        ┌────────┐           ┌────────┐
                        │ voided │           │ voided │
                        └────────┘           └────────┘
                                                  │
                             ┌─────────────────────┘
                             │ refund (from paid)
                             ▼
                        ┌──────────┐
                        │ refunded │
                        └──────────┘
```

**Constraints:**
- Cannot collect on `paid` or `voided`.
- Cannot void if already `voided` or `refunded`.
- Cannot refund if `unpaid`, `voided`, or already `refunded`.

---

## 13. Audit Trail

**Table:** `audit_logs`

Every admin action is logged with:

| Field | Content |
|-------|---------|
| `actor_user_id` | Staff who performed the action |
| `actor_email` | Redundant copy for survivability |
| `action` | e.g., `booking.create`, `booking.update`, `payment.collect`, `payment.refund` |
| `entity_type` | `booking`, `payment`, `user` |
| `entity_id` | Affected record ID |
| `metadata` | JSONB with `before`/`after` snapshots, guest name, amounts, IP, user-agent |

**Implementation:** `logAuditWithRequest()` from `lib/audit.ts` — fire-and-forget (does not block the response).

---

## 14. API Route Map

### Public (Guest) Routes

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/products` | List all active products |
| `GET` | `/api/products/entrance-fees` | Get entrance fee products by time slot |
| `GET` | `/api/availability?check_in=&type=&time_slot=` | Real-time availability check |
| `POST` | `/api/bookings/checkout-session` | Create booking + PayMongo session |
| `GET` | `/api/bookings/{id}?hash=` | View booking (hash or JWT auth) |
| `POST` | `/api/bookings/verify-payment` | Webhook fallback: verify payment via API |

### Webhook

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/webhooks/paymongo` | PayMongo event handler (signature-verified) |

### Cron

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/cron/expire-bookings` | Auto-cancel stale unpaid bookings |

### Guest Auth

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/auth/login` | Guest login (JWT) |
| `POST` | `/api/auth/register` | Guest registration (claim shadow account) |
| `GET` | `/api/auth/me` | Get current user profile |
| `PATCH` | `/api/auth/profile` | Update profile |

### Admin Routes (RBAC-protected)

| Method | Path | Permission | Purpose |
|--------|------|------------|---------|
| `GET` | `/api/admin/bookings` | `bookings:read` | List bookings (paginated, filterable) |
| `POST` | `/api/admin/bookings` | `bookings:create` | Create booking for guest |
| `GET` | `/api/admin/bookings/{id}` | `bookings:read` | View booking detail |
| `PATCH` | `/api/admin/bookings/{id}` | `bookings:update` | Edit booking |
| `DELETE` | `/api/admin/bookings/{id}` | `bookings:cancel` | Cancel booking |
| `PATCH` | `/api/admin/bookings/{id}/payment` | `payments:*` | Collect, void, or refund |

---

## 15. Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes (prod) | Secret for signing JWTs |
| `PAYMONGO_SECRET_KEY` | Yes | PayMongo API secret key |
| `PAYMONGO_WEBHOOK_SECRET` | For webhooks | HMAC verification of PayMongo events |
| `NEXT_PUBLIC_APP_URL` | Yes | Base URL for success/cancel redirects |
| `CRON_SECRET` | Recommended | Auth token for cron endpoint |
| `SMTP_HOST` | For email | Mailtrap/SMTP host |
| `SMTP_PORT` | For email | SMTP port (default 2525) |
| `SMTP_USER` | For email | SMTP username |
| `SMTP_PASS` | For email | SMTP password |

---

## Appendix: Concurrency & Safety Guarantees

| Concern | Solution |
|---------|----------|
| Double booking (overselling) | `SELECT ... FOR UPDATE` on products within transaction |
| Duplicate payment processing | `FOR UPDATE` row lock on booking + idempotency check |
| Webhook + verify-payment race | Both paths lock the same booking row; first writer wins |
| Concurrent guest registrations | `INSERT ... ON CONFLICT (email)` atomic upsert |
| Stale checkout retry | Old pending booking for same user/date/type is cancelled before creating new one |
| Abandoned bookings blocking inventory | Cron job auto-cancels after 30 minutes |
| Invalid status transitions | Server-side allowedTransitions map enforced on PATCH |
| IDOR on booking access | Hash-based or JWT ownership check on `GET /api/bookings/{id}` |
| Input validation | Zod schemas on all write endpoints |
| Admin authorization | RBAC permission checks on every admin API route |
