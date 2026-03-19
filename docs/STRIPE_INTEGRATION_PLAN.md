# Stripe Integration Plan — AlFarm Booking System

## 1. Current Payment Architecture Review

### 1.1 Booking Creation Flow (Guest)

```
Guest Homepage → Search → Results → Info → Checkout → POST /api/bookings → Success Page
```

**Key observations:**
- Guest selects a `payment_method` on the checkout page: `cash`, `gcash`, or `paymaya`
- The value is stored in `BookingContext.state.paymentMethod` (persisted in `sessionStorage`)
- On submit, `POST /api/bookings` creates the booking with:
  - `status: 'pending'`
  - `payment_status: 'unpaid'` (DB default — no explicit set)
  - `payment_method`: whatever the guest selected
- **No actual payment is processed.** GCash and PayMaya are labeled "Demo payment" in the UI
- After booking creation, the guest is redirected to `/booking/success/[id]?hash=...`

### 1.2 Admin Payment Operations

**Endpoint:** `PATCH /api/admin/bookings/[id]/payment`

Three operations with RBAC permission gates:

| Operation | Permission | State Transitions | Notes |
|-----------|-----------|-------------------|-------|
| `collect` | `payments:collect` | unpaid→partial/paid | If `amount < total_amount` → partial, else → paid |
| `void` | `payments:void` | paid/partial→voided | Cannot void if already refunded |
| `refund` | `payments:refund` | paid/partial→refunded | Cannot refund if unpaid or voided |

**Admin UI:** `PaymentCard` component shows Total Amount, Paid Amount, Balance Due with buttons for Collect/Void/Refund. Collect opens a modal for amount + notes.

### 1.3 Database Schema (Payment Columns)

```sql
-- bookings table
payment_status VARCHAR(20) DEFAULT 'unpaid'
  CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'voided', 'refunded'))
payment_method VARCHAR(20) DEFAULT 'cash'
  CHECK (payment_method IN ('cash', 'gcash', 'paymaya'))
total_amount DECIMAL(10, 2) NOT NULL
```

**Missing columns (needed for Stripe):**
- No `paid_amount` column (the `PaymentCard` component receives `booking.paid_amount || 0` but the DB doesn't store it — it's always 0)
- No `stripe_payment_intent_id` or external reference
- No payment transaction log table

### 1.4 Payment State Machine

```
                    ┌──────────┐
                    │  unpaid  │ (default on creation)
                    └────┬─────┘
                         │ collect (partial)
                    ┌────▼─────┐     collect (full)    ┌──────┐
                    │ partial  │──────────────────────►│ paid │
                    └────┬─────┘                       └──┬───┘
                         │ void                           │ void
                    ┌────▼─────┐                     ┌────▼─────┐
                    │  voided  │                     │  voided  │
                    └──────────┘                     └──────────┘
                                                         │ refund
                                                    ┌────▼─────┐
                                                    │ refunded │
                                                    └──────────┘
```

### 1.5 Identified Issues in Current System

| # | Issue | Severity |
|---|-------|----------|
| 1 | **No `paid_amount` column in DB** — PaymentCard shows ₱0 always for paid amount; collect doesn't track accumulated amount | High |
| 2 | **GCash/PayMaya are non-functional** — labeled "Demo payment", no actual integration | Medium |
| 3 | **No payment transaction log** — only audit_logs with metadata JSON; no proper ledger for partial payments | Medium |
| 4 | **`payment_method` CHECK constraint** must be updated to include `'stripe'` | Required |
| 5 | **PaymentCard uses raw `fetch`** instead of `adminFetch` — same bug pattern as BookingDetailActions | Bug |

---

## 2. Stripe Integration Strategy

### 2.1 Approach: Stripe Checkout Sessions (Recommended)

Use **Stripe Checkout** (hosted payment page) rather than Stripe Elements (embedded form) because:

- **PCI compliance** — Stripe handles all card data; AlFarm never touches it
- **Minimal frontend changes** — redirect to Stripe, then back
- **Supports GCash natively** — Stripe supports GCash and PayMaya/Maya as payment methods in the Philippines
- **Mobile-optimized** — Stripe Checkout is responsive out of the box
- **Deposit/partial payment** — Can charge a portion upfront, rest on arrival

### 2.2 Payment Flow (Post-Integration)

```
Guest Checkout Page
  ├── Cash on Arrival → POST /api/bookings (existing flow, no change)
  │     └── status: pending, payment_status: unpaid
  │
  └── Pay Online (Stripe) → POST /api/bookings/checkout-session
        ├── 1. Create booking (status: pending, payment_status: unpaid)
        ├── 2. Create Stripe Checkout Session (amount = total_amount or deposit)
        ├── 3. Redirect guest to Stripe hosted page
        ├── 4a. SUCCESS → Stripe redirects to /booking/success/[id]?hash=...&session_id=...
        │     └── Webhook confirms payment → status: confirmed, payment_status: paid
        └── 4b. CANCEL → Stripe redirects to /booking/checkout?cancelled=true
              └── Booking remains pending/unpaid (auto-expires after TTL)
```

### 2.3 Admin Refund Flow (Post-Integration)

```
Admin PaymentCard
  ├── Cash bookings → existing collect/void/refund (manual, no Stripe)
  └── Stripe bookings → refund calls Stripe Refund API
        ├── Full refund → Stripe API + payment_status: refunded
        └── Partial refund → Stripe API + payment_status: partial
```

---

## 3. Implementation Plan

### Phase 1: Database & Config Preparation

#### 3.1.1 Schema Migration

```sql
-- 1. Add Stripe columns to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id VARCHAR(255);

-- 2. Expand payment_method CHECK constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_method_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_method_check
  CHECK (payment_method IN ('cash', 'gcash', 'paymaya', 'stripe'));

-- 3. Create payment_transactions ledger table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id BIGSERIAL PRIMARY KEY,
  booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('charge', 'refund', 'void')),
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  stripe_refund_id VARCHAR(255),
  notes TEXT,
  created_by INT REFERENCES users(id), -- NULL for webhook-created entries
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_tx_booking ON payment_transactions(booking_id);
CREATE INDEX idx_payment_tx_stripe ON payment_transactions(stripe_payment_intent_id);
```

#### 3.1.2 Environment Variables

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...          # Server-side only
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Client-side
STRIPE_WEBHOOK_SECRET=whsec_...        # For webhook signature verification
STRIPE_CURRENCY=php                    # Philippine Peso
```

#### 3.1.3 Dependencies

```bash
npm install stripe @stripe/stripe-js
```

- `stripe` — Server-side Node.js SDK (API calls, webhook verification)
- `@stripe/stripe-js` — Client-side loader (for redirectToCheckout)

---

### Phase 2: Backend API Routes

#### 3.2.1 Stripe Library Setup

**New file:** `lib/stripe.ts`

```typescript
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia', // pin API version
  typescript: true,
});
```

#### 3.2.2 Create Checkout Session Endpoint

**New file:** `app/api/bookings/checkout-session/route.ts`

```
POST /api/bookings/checkout-session
```

**Flow:**
1. Validate booking payload (reuse existing `BookingPayloadSchema`)
2. Create the booking in DB (reuse existing booking creation logic)
3. Create a Stripe Checkout Session:
   - `mode: 'payment'`
   - `payment_method_types: ['card', 'gcash']` (GCash via Stripe)
   - `line_items` built from booking items
   - `metadata: { booking_id, qr_code_hash }`
   - `success_url: /booking/success/{id}?hash={hash}&session_id={CHECKOUT_SESSION_ID}`
   - `cancel_url: /booking/checkout?cancelled=true`
   - `expires_after: 1800` (30 min session expiry)
4. Store `stripe_checkout_session_id` on the booking
5. Return `{ checkout_url: session.url }` to frontend

#### 3.2.3 Stripe Webhook Handler

**New file:** `app/api/webhooks/stripe/route.ts`

```
POST /api/webhooks/stripe
```

**Events to handle:**

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Set `payment_status: 'paid'`, `paid_amount: total`, `status: 'confirmed'`. Record `stripe_payment_intent_id`. Insert into `payment_transactions`. |
| `checkout.session.expired` | If booking still `pending` → set `status: 'cancelled'` (auto-expire unpaid). |
| `charge.refunded` | Set `payment_status: 'refunded'`, update `paid_amount`. Insert refund into `payment_transactions`. |

**Security:**
- Verify webhook signature using `STRIPE_WEBHOOK_SECRET`
- Use raw body (not parsed JSON) for signature verification
- Idempotent: check if already processed before updating

#### 3.2.4 Update Admin Payment Route

**Modify:** `app/api/admin/bookings/[id]/payment/route.ts`

Add Stripe-aware refund logic:

```typescript
case 'refund':
  // ... existing validation ...
  if (booking.stripe_payment_intent_id) {
    // Stripe refund via API
    const refund = await stripe.refunds.create({
      payment_intent: booking.stripe_payment_intent_id,
      amount: amount ? Math.round(amount * 100) : undefined, // partial or full
    });
    // Record in payment_transactions
  }
  newPaymentStatus = 'refunded';
  break;
```

---

### Phase 3: Frontend Changes

#### 3.3.1 BookingContext Updates

**Modify:** `lib/BookingContext.tsx`

```typescript
// Update type
export type PaymentMethod = 'cash' | 'gcash' | 'paymaya' | 'stripe';

// Note: gcash via Stripe uses payment_method='stripe' in DB,
// Stripe handles the GCash payment method selection on their page
```

#### 3.3.2 Checkout Page — Payment Method Selection

**Modify:** `app/booking/checkout/page.tsx`

Replace the three payment buttons with two primary options:

```
┌────────────────────┐  ┌────────────────────┐
│  💳 Pay Online     │  │  💰 Cash on Arrival│
│  Credit/Debit/     │  │  Pay when you      │
│  GCash via Stripe  │  │  arrive at AlFarm   │
│  (Secure checkout) │  │                    │
└────────────────────┘  └────────────────────┘
```

**Online payment flow:**
```typescript
const handlePlaceOrder = async () => {
  if (state.paymentMethod === 'stripe') {
    // Create checkout session (which also creates the booking)
    const res = await fetch('/api/bookings/checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ... },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    // Redirect to Stripe
    window.location.href = data.checkout_url;
  } else {
    // Existing cash flow — POST /api/bookings
    ...
  }
};
```

#### 3.3.3 Success Page — Handle Stripe Return

**Modify:** `app/booking/success/[id]/page.tsx`

On load, if `session_id` query param exists:
1. Optionally verify session status via `GET /api/bookings/verify-session?session_id=...`
2. Show "Payment confirmed" instead of "Payment pending"

#### 3.3.4 Admin PaymentCard — Stripe Awareness

**Modify:** `components/admin/PaymentCard.tsx`

- Show Stripe payment intent ID when `payment_method === 'stripe'`
- Refund button for Stripe bookings triggers the server-side Stripe refund
- Disable "Collect Payment" for Stripe-paid bookings (already collected)
- Link to Stripe Dashboard for the payment

#### 3.3.5 Admin Booking PATCH — Accept `'stripe'`

**Modify:** `app/api/admin/bookings/[id]/route.ts`

```typescript
const validPaymentMethods = ['cash', 'gcash', 'paymaya', 'stripe'];
```

---

### Phase 4: Admin Booking POST — Accept `'stripe'`

**Modify:** `app/api/admin/bookings/route.ts`

Admin-created bookings should also support `'stripe'` as a payment method for recording purposes, but admin bookings are typically cash/manual.

---

## 4. File Change Summary

### New Files

| File | Purpose |
|------|---------|
| `lib/stripe.ts` | Stripe SDK singleton |
| `app/api/bookings/checkout-session/route.ts` | Create Stripe Checkout Session + booking |
| `app/api/webhooks/stripe/route.ts` | Stripe webhook handler |
| `database/migrations/002_stripe_columns.sql` | Schema migration |

### Modified Files

| File | Changes |
|------|---------|
| `database/schema.sql` | Add `paid_amount`, `stripe_*` columns, `payment_transactions` table, update CHECK |
| `lib/BookingContext.tsx` | Update `DemoPaymentMethod` → `PaymentMethod`, add `'stripe'` |
| `app/booking/checkout/page.tsx` | Replace 3 payment buttons with 2 (Online / Cash), handle Stripe redirect |
| `app/booking/success/[id]/page.tsx` | Handle `session_id` param for Stripe return |
| `app/api/bookings/route.ts` | Add `'stripe'` to Zod schema `payment_method` enum |
| `app/api/admin/bookings/route.ts` | Add `'stripe'` to payment method validation |
| `app/api/admin/bookings/[id]/route.ts` | Add `'stripe'` to `validPaymentMethods` |
| `app/api/admin/bookings/[id]/payment/route.ts` | Add Stripe refund logic for online payments |
| `components/admin/PaymentCard.tsx` | Show Stripe info, fix `adminFetch`, conditionally disable collect |
| `.env.example` | Add Stripe env var placeholders |
| `package.json` | Add `stripe`, `@stripe/stripe-js` |

---

## 5. Sequencing & Dependencies

```
Phase 1 (DB + Config)     ← No code dependencies, can be done first
  │
  ├── 1a. Migration SQL
  ├── 1b. .env vars
  └── 1c. npm install stripe @stripe/stripe-js
  │
Phase 2 (Backend)         ← Requires Phase 1
  │
  ├── 2a. lib/stripe.ts
  ├── 2b. checkout-session route
  ├── 2c. webhook route
  └── 2d. Update admin payment route
  │
Phase 3 (Frontend)        ← Requires Phase 2
  │
  ├── 3a. BookingContext type update
  ├── 3b. Checkout page UI
  ├── 3c. Success page Stripe handling
  └── 3d. Admin PaymentCard
  │
Phase 4 (Testing)         ← Requires Stripe test keys
  │
  ├── 4a. Stripe CLI for local webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
  ├── 4b. Test card: 4242 4242 4242 4242
  ├── 4c. Test GCash: use Stripe test mode GCash flow
  └── 4d. Test refund from admin panel
```

---

## 6. Stripe Dashboard Configuration

1. **Create Stripe account** at https://dashboard.stripe.com
2. **Enable GCash** in Payment Methods settings (Settings → Payment methods → GCash)
3. **Set up webhook endpoint**: `https://your-domain.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`
4. **Copy keys** to `.env.local`:
   - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Secret key → `STRIPE_SECRET_KEY`
   - Webhook signing secret → `STRIPE_WEBHOOK_SECRET`

---

## 7. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Webhook spoofing | Verify signature with `stripe.webhooks.constructEvent()` |
| Double-payment | Idempotency key on Checkout Session creation; check `stripe_checkout_session_id` not already set |
| Booking without payment | Webhook is source of truth for payment confirmation, not client redirect |
| Amount tampering | Line items built server-side from DB prices, not from client |
| Key exposure | `STRIPE_SECRET_KEY` server-only; only publishable key exposed to client |
| Partial refund abuse | Refund permission gated by RBAC (`payments:refund`); audit logged |

---

## 8. Rollback Plan

Stripe integration is **additive** — it doesn't break existing cash flows:

- Cash bookings continue to work identically
- The `payment_method` column gains a new value (`'stripe'`) but existing rows are unaffected
- If Stripe goes down, guests can still book with "Cash on Arrival"
- Feature flag via `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — if not set, hide the "Pay Online" button

---

## 9. Cost Estimate (Stripe Philippines)

| Fee Type | Rate |
|----------|------|
| Cards (Visa/MC) | 3.5% + ₱15 per transaction |
| GCash | 2.5% per transaction |
| Refunds | Stripe fee is not returned |

For a ₱5,000 overnight booking paid by card: ₱175 + ₱15 = **₱190 fee** (3.8% effective).

---

## 10. Finalized v1 Decisions

1. **100% upfront.** Full booking amount collected online via Stripe Checkout. No deposits or partial payments in v1.
2. **Auto-confirm on webhook.** Booking moves `pending → confirmed` only after verified `checkout.session.completed` webhook. The client-side success redirect is NOT treated as proof of payment.
3. **30-minute expiry.** Unpaid Stripe checkout attempts expire after 30 minutes. The pending booking is cancelled and any held inventory is released.
4. **No admin payment links in v1.** Only guest self-service online checkout.
5. **Absorb Stripe fee.** Guests see a clean total with no surcharge. Business absorbs the processing fee.
6. **Stripe test mode** for development. Same implementation logic as live — only the API keys and payment methods differ.
