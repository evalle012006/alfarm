# PayMongo Migration Plan: Stripe → PayMongo

## Background

Stripe does not support businesses operating in the Philippines as merchants. PayMongo is the leading local payment processor for PH businesses and supports the same checkout-session-based flow with native support for GCash, GrabPay, Maya (PayMaya), cards, and more.

---

## Key Differences: Stripe vs PayMongo

| Aspect | Stripe | PayMongo |
|--------|--------|----------|
| **SDK** | `stripe` npm package (typed) | No official Node SDK — uses REST API with Basic Auth (base64-encoded secret key) |
| **Auth** | Secret key in SDK constructor | HTTP Basic Auth: `Authorization: Basic base64(sk_...)` (secret key as username, empty password) |
| **Checkout Session** | `stripe.checkout.sessions.create()` | `POST https://api.paymongo.com/v1/checkout_sessions` |
| **Amounts** | In smallest currency unit (centavos) | In smallest currency unit (centavos) — same as Stripe |
| **Line items** | `line_items[].price_data` with `unit_amount` | `line_items[].amount` (total for that line, in centavos), `name`, `quantity`, `currency`, `description` |
| **Success/Cancel URLs** | `success_url` + `cancel_url` | `success_url` only (no `cancel_url` — user closes tab or navigates back) |
| **Checkout expiry** | `expires_at` (Unix timestamp) | No built-in expiry on create; use `POST /v1/checkout_sessions/{id}/expire` to manually expire |
| **Webhook events** | `checkout.session.completed`, `checkout.session.expired` | `checkout_session.payment.paid`, `payment.paid`, `payment.failed` |
| **Webhook verification** | `stripe.webhooks.constructEvent()` with signing secret | Manual HMAC-SHA256: `Paymongo-Signature` header contains `t=timestamp,te=test_sig,li=live_sig`; compute `HMAC-SHA256(webhook_secret, "timestamp.rawBody")` |
| **Webhook creation** | Dashboard or CLI | One-time API call: `POST /v1/webhooks` with `url` and `events[]` — **do NOT create in code** |
| **Refunds** | `stripe.refunds.create({ payment_intent })` | `POST /v1/refunds` with `{ data: { attributes: { amount, payment_id, reason } } }` |
| **Refund reasons** | Free text | Enum: `duplicate`, `fraudulent`, `requested_by_customer`, `others` |
| **Payment ID** | `payment_intent_id` | `payment_id` (from webhook `payments[0].id`) |
| **Metadata** | `metadata: { key: value }` on checkout session | `metadata: { key: value }` on checkout session — same concept |
| **Env vars** | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | `PAYMONGO_SECRET_KEY`, `NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY`, `PAYMONGO_WEBHOOK_SECRET` |
| **Test mode** | `sk_test_...` / `pk_test_...` keys | `sk_test_...` / `pk_test_...` keys — same convention |
| **No expired session webhook** | N/A | PayMongo has no automatic `checkout_session.expired` webhook event — must implement expiry via cron or polling |

---

## Architectural Decisions (Carried Forward from Stripe v1)

These decisions remain unchanged:
1. **100% upfront payment** collected online via PayMongo Checkout
2. **Auto-confirm bookings** only after verified webhook confirms payment
3. **Expire unpaid checkout sessions** after 30 minutes (now via cron since PayMongo has no auto-expire webhook)
4. **No admin-generated payment links** in v1
5. **Absorb payment processor fees** — do not surcharge guests
6. **Use test mode** keys for development

---

## Migration Phases

### Phase 1: Dependencies & Environment

| Task | Details |
|------|---------|
| **1a. Remove Stripe packages** | `npm uninstall stripe @stripe/stripe-js` |
| **1b. No new package needed** | PayMongo uses plain REST API — no SDK to install. We'll use `fetch()` directly. |
| **1c. Update `.env.example`** | Replace Stripe vars with PayMongo vars |
| **1d. Update `.env.local`** | Set actual PayMongo test keys |

**New env vars:**
```
# PayMongo
PAYMONGO_SECRET_KEY=sk_test_...
NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_...
PAYMONGO_WEBHOOK_SECRET=whsec_...
```

---

### Phase 2: Backend — Library & API Routes

#### 2a. Replace `lib/stripe.ts` → `lib/paymongo.ts`

Create a PayMongo utility module with:
- `paymongoFetch(endpoint, options)` — wrapper that adds Basic Auth header
- `createCheckoutSession(params)` — typed helper for creating checkout sessions
- `createRefund(params)` — typed helper for creating refunds
- `verifyWebhookSignature(rawBody, signatureHeader, secret)` — HMAC-SHA256 verification
- Constants: `PAYMONGO_CURRENCY`, `PAYMONGO_CHECKOUT_EXPIRY_MINUTES`

**Key implementation notes:**
- Basic Auth: `Authorization: Basic ${Buffer.from(secretKey + ':').toString('base64')}`
- All amounts in centavos (multiply PHP by 100)
- PayMongo API base: `https://api.paymongo.com/v1`

#### 2b. Replace `app/api/bookings/checkout-session/route.ts`

Replace Stripe SDK calls with PayMongo REST API calls:

```
Stripe:  stripe.checkout.sessions.create({ ... })
PayMongo: POST /v1/checkout_sessions
```

**PayMongo Create Checkout Session body:**
```json
{
  "data": {
    "attributes": {
      "line_items": [
        {
          "name": "Product Name",
          "description": "Description",
          "amount": 150000,
          "currency": "PHP",
          "quantity": 1
        }
      ],
      "payment_method_types": ["card", "gcash", "grab_pay", "paymaya"],
      "description": "AlFarm Booking #123",
      "send_email_receipt": true,
      "show_description": true,
      "show_line_items": true,
      "success_url": "https://yoursite.com/booking/success/{id}?hash={hash}",
      "metadata": {
        "booking_id": "123"
      }
    }
  }
}
```

**Changes from Stripe version:**
- No `cancel_url` — PayMongo doesn't support it (user just closes tab)
- No `expires_at` on create — we'll handle expiry separately
- Line items use `amount` (total for line) not `unit_amount` × `quantity`
- `payment_method_types` lists PH-native methods
- Store `checkout_session_id` (e.g., `cs_...`) in DB instead of Stripe session ID

**DB column rename:**
- `stripe_checkout_session_id` → `paymongo_checkout_session_id`
- `stripe_payment_intent_id` → `paymongo_payment_id`

#### 2c. Replace `app/api/webhooks/stripe/route.ts` → `app/api/webhooks/paymongo/route.ts`

**Webhook event mapping:**
| Stripe Event | PayMongo Event | Action |
|-------------|---------------|--------|
| `checkout.session.completed` | `checkout_session.payment.paid` | Confirm booking, mark paid, record payment transaction |
| `checkout.session.expired` | *(no equivalent)* | Handled by cron job instead (Phase 2f) |

**Webhook signature verification:**
```
Stripe:  stripe.webhooks.constructEvent(body, sig, secret)
PayMongo: Manual HMAC-SHA256 verification
```

PayMongo sends `Paymongo-Signature` header:
```
t=1496734173,te=abc123...,li=def456...
```

Verification steps:
1. Parse header: extract `t` (timestamp), `te` (test sig), `li` (live sig)
2. Build string: `${t}.${rawBody}`
3. Compute: `HMAC-SHA256(webhook_secret, string)`
4. Compare with `te` (test mode) or `li` (live mode)

**Webhook payload differences:**
- Stripe: `event.data.object` is the checkout session directly
- PayMongo: `event.data.attributes.data` is the checkout session, with `payments[]` array containing payment details
- Payment ID: `event.data.attributes.data.attributes.payments[0].id`
- Payment intent ID: `event.data.attributes.data.attributes.payment_intent.id`

#### 2d. Update `app/api/admin/bookings/[id]/payment/route.ts`

Replace Stripe refund call with PayMongo refund:

```
Stripe:  stripe.refunds.create({ payment_intent: '...', amount: centavos })
PayMongo: POST /v1/refunds { data: { attributes: { amount, payment_id, reason } } }
```

**Key difference:** PayMongo uses `payment_id` (not `payment_intent_id`) for refunds. The `reason` field must be one of: `duplicate`, `fraudulent`, `requested_by_customer`, `others`.

#### 2e. Update payment_method references

Replace all `'stripe'` references with `'paymongo'`:
- `app/api/bookings/route.ts` — Zod enum
- `app/api/admin/bookings/[id]/route.ts` — `validPaymentMethods`
- `lib/BookingContext.tsx` — `PaymentMethod` type

#### 2f. Implement booking expiry cron (NEW — required for PayMongo)

Since PayMongo has no `checkout.session.expired` webhook, we need a periodic job to:
1. Query bookings where `status = 'pending'` AND `payment_method = 'paymongo'` AND `created_at < NOW() - INTERVAL '30 minutes'`
2. For each: call `POST /v1/checkout_sessions/{id}/expire` to expire the PayMongo session
3. Update booking `status = 'cancelled'` and `payment_status = 'voided'`

**Options:**
- **Option A: Next.js API route + external cron** (e.g., Vercel Cron, `cron-job.org`, or system crontab) hitting `POST /api/cron/expire-bookings`
- **Option B: Check on page load** — when loading the checkout page, check if any pending PayMongo bookings are expired

Recommend **Option A** for reliability.

---

### Phase 3: Database Migration

#### 3a. New migration: `003_paymongo_rename.sql`

```sql
-- Rename Stripe columns to PayMongo
ALTER TABLE bookings RENAME COLUMN stripe_checkout_session_id TO paymongo_checkout_session_id;
ALTER TABLE bookings RENAME COLUMN stripe_payment_intent_id TO paymongo_payment_id;

-- Update payment_method CHECK constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_method_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_method_check
  CHECK (payment_method IN ('cash', 'gcash', 'paymaya', 'paymongo'));

-- Update any existing 'stripe' payment methods (shouldn't exist in production)
UPDATE bookings SET payment_method = 'paymongo' WHERE payment_method = 'stripe';
```

#### 3b. Update `database/schema.sql`

Replace `stripe_*` column names with `paymongo_*`, update CHECK constraint.

---

### Phase 4: Frontend Updates

#### 4a. Update `lib/BookingContext.tsx`

Replace `'stripe'` with `'paymongo'` in the `PaymentMethod` type.

#### 4b. Update `app/booking/checkout/page.tsx`

- Change `stripeEnabled` to `paymongoEnabled` (checks `NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY`)
- Update payment button label: "Pay Online" (keep generic — PayMongo checkout shows all methods)
- Update `paymentMethod === 'stripe'` checks to `'paymongo'`
- Remove cancelled URL check (PayMongo has no `cancel_url` — user just returns to page)
- API endpoint stays the same: `POST /api/bookings/checkout-session`

#### 4c. Update `app/booking/success/[id]/page.tsx`

- Replace `'stripe'` with `'paymongo'` in `paymentMethodLabel` and `isStripePaid` logic
- Rename `isStripePaid` → `isOnlinePaid`

#### 4d. Update `components/admin/PaymentCard.tsx`

- Replace `isStripe` with `isPaymongo` (checks `paymentMethod === 'paymongo'`)
- Update badge label
- Replace `stripePaymentIntentId` prop with `paymongoPaymentId`

#### 4e. Update `app/admin/bookings/[id]/page.tsx`

- Pass `paymongoPaymentId` prop instead of `stripePaymentIntentId`

---

### Phase 5: Webhook Setup

Unlike Stripe (which uses CLI for local testing), PayMongo webhooks are created via a one-time API call:

```bash
curl -X POST https://api.paymongo.com/v1/webhooks \
  -u "sk_test_YOUR_KEY:" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "attributes": {
        "url": "https://your-domain.com/api/webhooks/paymongo",
        "events": ["checkout_session.payment.paid", "payment.paid", "payment.failed", "payment.refunded"]
      }
    }
  }'
```

The response includes `secret_key` — save this as `PAYMONGO_WEBHOOK_SECRET`.

**For local testing:** Use `ngrok` or similar tunnel to expose `localhost:3000/api/webhooks/paymongo`.

---

### Phase 6: Testing

| Test | Method |
|------|--------|
| **Card payment** | Use test card `4343434343434343` (Visa), any future expiry, any CVC |
| **GCash test** | PayMongo test mode auto-approves GCash |
| **Failed payment** | Use test card `4444333322221111` to simulate decline |
| **Refund** | Refund via admin panel — note: **refunds only work in live mode** on PayMongo; test mode refund API will return an error |
| **Webhook** | Use ngrok + registered test webhook |
| **Expiry** | Create booking, wait 30+ min (or adjust cron interval), verify cancellation |

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `lib/stripe.ts` | **Delete** | Remove Stripe singleton |
| `lib/paymongo.ts` | **Create** | PayMongo REST client, HMAC verification, helpers |
| `app/api/bookings/checkout-session/route.ts` | **Modify** | Replace Stripe SDK calls with PayMongo REST API |
| `app/api/webhooks/stripe/route.ts` | **Delete** | Remove Stripe webhook handler |
| `app/api/webhooks/paymongo/route.ts` | **Create** | PayMongo webhook handler with HMAC-SHA256 verification |
| `app/api/admin/bookings/[id]/payment/route.ts` | **Modify** | Replace Stripe refund with PayMongo refund API |
| `app/api/cron/expire-bookings/route.ts` | **Create** | Cron endpoint to expire stale PayMongo bookings |
| `app/api/bookings/route.ts` | **Modify** | Replace `'stripe'` with `'paymongo'` in Zod enum |
| `app/api/admin/bookings/[id]/route.ts` | **Modify** | Replace `'stripe'` with `'paymongo'` in validation |
| `lib/BookingContext.tsx` | **Modify** | Replace `'stripe'` with `'paymongo'` in type |
| `app/booking/checkout/page.tsx` | **Modify** | Update env var check, payment method value, labels |
| `app/booking/success/[id]/page.tsx` | **Modify** | Replace `'stripe'` with `'paymongo'` in labels/logic |
| `components/admin/PaymentCard.tsx` | **Modify** | Replace Stripe references with PayMongo |
| `app/admin/bookings/[id]/page.tsx` | **Modify** | Pass `paymongoPaymentId` prop |
| `database/migrations/003_paymongo_rename.sql` | **Create** | Rename columns, update constraints |
| `database/schema.sql` | **Modify** | Update column names and constraints |
| `.env.example` | **Modify** | Replace Stripe vars with PayMongo vars |
| `package.json` | **Modify** | Remove `stripe`, `@stripe/stripe-js` |
| `docs/STRIPE_INTEGRATION_PLAN.md` | **Archive/Update** | Mark as superseded by PayMongo |

---

## Estimated Effort

The migration is largely mechanical — the checkout-session flow is architecturally identical. The main new work is:
1. **HMAC-SHA256 webhook verification** (replacing Stripe's built-in method)
2. **Booking expiry cron** (replacing Stripe's automatic `checkout.session.expired` webhook)
3. **PayMongo REST client** (replacing Stripe SDK typed methods with `fetch()` + types)

Total: ~6 phases, similar scope to original Stripe implementation.
