# AlFarm — Full Implementation Plan

**Date:** March 2, 2026  
**References:** `docs/MISSING_PAGES_SPEC.md`, `docs/IMPLEMENTATION_REVIEW.md`  
**Scope:** All remaining work — bug fixes, unimplemented spec items, and improvements beyond the original spec.

---

## Execution Phases

| Phase | Focus | Estimated Tasks | Priority |
|-------|-------|----------------|----------|
| **Phase 1** | Critical Bug Fixes | 8 tasks | 🔴 Immediate |
| **Phase 2** | Complete Partially-Implemented Pages | 6 tasks | 🔴 High |
| **Phase 3** | Build Missing Pages & APIs | 12 tasks | 🟡 Medium |
| **Phase 4** | Frontend Improvements & Polish | 14 tasks | 🟡 Medium |
| **Phase 5** | Backend / Logic Improvements | 10 tasks | 🟢 Low-Medium |

---

## Phase 1: Critical Bug Fixes

> **Goal:** Fix all bugs that cause runtime failures, broken features, or auth bypasses. These should be done before any new feature work.

---

### Task 1.1 — Add `credentials: 'include'` to All Admin Fetch Calls

**Why:** Admin pages use httpOnly cookie auth. Without `credentials: 'include'`, the browser won't send the `admin_token` cookie, causing all admin API calls to return 401 Unauthorized in production.

**Files to modify:**

| File | Lines | Action |
|------|-------|--------|
| `app/admin/bookings/[id]/page.tsx` | ~39 | Add `{ credentials: 'include' }` to `fetch(/api/admin/bookings/${id})` |
| `components/admin/BookingDetailActions.tsx` | ~25 | Add `credentials: 'include'` to the `fetch` options object |
| `components/admin/PaymentCard.tsx` | ~34 | Add `credentials: 'include'` to the `fetch` options object |
| `components/admin/StaffNotes.tsx` | ~19 | Add `credentials: 'include'` to the `fetch` options object |
| `components/admin/AuditTrail.tsx` | ~35 | Add `credentials: 'include'` to the `fetch` options object |
| `app/admin/bookings/new/page.tsx` | ~88, ~125, ~248 | Add to all three fetch calls (products, availability, POST booking) |

**Pattern to apply everywhere:**
```typescript
// Before
const res = await fetch(`/api/admin/...`);

// After
const res = await fetch(`/api/admin/...`, { credentials: 'include' });

// For POST/PATCH requests that already have options:
const res = await fetch(`/api/admin/...`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',  // ADD THIS
  body: JSON.stringify(body)
});
```

**Improvement — Create a helper:**
Instead of manually adding `credentials` everywhere, create a utility:

```typescript
// lib/adminFetch.ts
export async function adminFetch(url: string, options?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: 'include',
  });
}
```

Then replace all admin `fetch()` calls with `adminFetch()`. This prevents future developers from forgetting `credentials: 'include'`.

---

### Task 1.2 — Fix AuditTrail Props in Booking Detail Page

**File:** `app/admin/bookings/[id]/page.tsx`  
**Line:** ~260

**Current (broken):**
```tsx
<AuditTrail bookingId={booking.id} />
```

**Fix:**
```tsx
<AuditTrail entityId={booking.id} entityType="booking" />
```

The `AuditTrail` component's interface expects `entityId` and `entityType`, not `bookingId`. This is a TypeScript compilation error if strict mode is on, and at runtime the component receives `undefined` for both required props, so the audit trail never loads data.

---

### Task 1.3 — Fix StaffNotes API Endpoint

**File:** `components/admin/StaffNotes.tsx`  
**Line:** ~19

**Current (calls non-existent route):**
```typescript
const res = await fetch(`/api/admin/bookings/${bookingId}/notes`, {
  method: 'PATCH',
  ...
});
```

**Fix — Option A (preferred, no backend changes):**
```typescript
const res = await fetch(`/api/admin/bookings/${bookingId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ notes }),
});
```

The existing `PATCH /api/admin/bookings/[id]` route already accepts `notes` in the request body.

**Fix — Option B (create dedicated endpoint):**
Create `app/api/admin/bookings/[id]/notes/route.ts` with a focused PATCH handler for notes only. This is cleaner but unnecessary since the existing route handles it.

---

### Task 1.4 — Fix Edit Modal in Booking Detail Page

**File:** `app/admin/bookings/[id]/page.tsx`  
**Lines:** ~262-267

**Current (opens wrong modal):**
```tsx
<ProductModal
  isOpen={isEditModalOpen}
  onClose={() => setIsEditModalOpen(false)}
  product={null}
/>
```

This opens the Product CRUD modal which has completely unrelated fields (capacity, pricing_unit, etc.). The Edit button is effectively non-functional.

**Fix — Create a `BookingEditModal` component:**

Create `components/admin/BookingEditModal.tsx` that:
1. Accepts the booking object and an `onSave` callback
2. Pre-fills fields: guest name, email, phone, dates, booking type, status, payment status, notes
3. On submit calls `PATCH /api/admin/bookings/${id}` with only changed fields
4. Calls `onRefresh()` on success

**Fields in the modal:**
- Guest first name, last name, email, phone (two-column grid)
- Booking date, check-out date (conditional on type)
- Status dropdown: pending / confirmed / checked_in / checked_out / completed / cancelled
- Payment status dropdown: unpaid / partial / paid / voided / refunded
- Payment method: cash / gcash / paymaya
- Staff notes textarea

**Then update the booking detail page:**
```tsx
<BookingEditModal
  isOpen={isEditModalOpen}
  onClose={() => setIsEditModalOpen(false)}
  booking={booking}
  onSave={fetchBooking}
/>
```

---

### Task 1.5 — Fix QR Hash Display

**File:** `app/admin/bookings/[id]/page.tsx`  
**Line:** ~176

**Current:**
```tsx
{booking.id}
```

**Fix:**
```tsx
{booking.qr_code_hash || booking.id}
```

Falls back to `booking.id` if `qr_code_hash` is null.

---

### Task 1.6 — Fix Cancel Button to Use Styled Modal (Admin Booking Detail)

**File:** `components/admin/BookingDetailActions.tsx`  
**Line:** ~87-91

**Current (uses browser `confirm()`):**
```typescript
if (confirm('Are you sure you want to cancel this booking?')) {
  handleAction('cancelled', 'DELETE', `/api/admin/bookings/${bookingId}`);
}
```

**Fix:**
1. Add a `useState` for `showCancelConfirm`
2. Render a `<Modal size="sm">` with styled warning text and two buttons (Keep / Cancel)
3. On confirm, call the cancel action
4. Use the same visual pattern as the guest cancellation modal

---

### Task 1.7 — Fix Guest Profile "Member Since" Date

**File:** `app/guest/profile/page.tsx`  
**Line:** ~201

**Current (hardcoded):**
```tsx
Member since 2024
```

**Fix — Two steps:**

**Step A: API change** — Add `created_at` to the `/api/auth/me` response:
```typescript
// app/api/auth/me/route.ts — in the SELECT query, add u.created_at
// In the response object, add: createdAt: user.created_at
```

**Step B: Frontend** — Update `AuthContext.tsx` `User` interface to include `createdAt?: string`, then:
```tsx
Member since {user.createdAt ? new Date(user.createdAt).getFullYear() : '—'}
```

---

### Task 1.8 — Add Navigation Link to Guest Profile

**Files to modify:**
1. **Guest Dashboard** (`app/guest/dashboard/page.tsx`) — Add a "My Profile" card in the quick actions section, or a user icon button in the welcome banner
2. **Navigation component** (`components/Navigation.tsx`) — If a user is logged in, show a profile icon/link in the nav bar pointing to `/guest/profile`
3. **DashboardLayout** (`components/layouts/DashboardLayout.tsx`) — If it has a header/nav, add a profile link there

---

## Phase 2: Complete Partially-Implemented Pages

> **Goal:** Bring the three partially-implemented pages (Guest Management, Dashboard, Booking Creation) to full spec compliance.

---

### Task 2.1 — Connect Guest Management Page to Real API

**File:** `app/admin/guests/page.tsx`

**Steps:**
1. **Remove mock import:** Delete `import { mockGuests, type MockGuest } from '@/lib/mockData/adminMockData';`
2. **Create a proper Guest interface** matching the API response:
   ```typescript
   interface Guest {
     id: number;
     email: string;
     firstName: string;
     lastName: string;
     phone: string | null;
     role: string;
     isActive: boolean;
     createdAt: string;
     isShadow: boolean;
     totalBookings: number;
     lastBookingDate: string | null;
     totalSpent: number;
   }
   ```
3. **Replace `fetchGuests`** with a real API call:
   ```typescript
   const res = await fetch(
     `/api/admin/guests?search=${search}&sort=${sort}&limit=${limit}&offset=${(page - 1) * limit}`,
     { credentials: 'include' }
   );
   const data = await res.json();
   setGuests(data.guests);
   setTotalCount(data.pagination.total);
   ```
4. **Add debounce** on search input (300ms) to avoid excessive API calls
5. **Reset page to 1** when search or sort changes

---

### Task 2.2 — Add Booking History Table to Guest Detail Modal

**File:** `app/admin/guests/page.tsx` (inside the `<Modal>`)

**Steps:**
1. When the modal opens for a guest, fetch their bookings:
   ```typescript
   const res = await fetch(
     `/api/admin/bookings?search=${guest.email}&limit=10`,
     { credentials: 'include' }
   );
   ```
2. Replace the "Phase 4" placeholder with a booking history table:
   - Columns: Booking ID (link to `/admin/bookings/[id]`) | Date | Type | Status | Payment | Amount
   - Sorted by most recent first
   - Max 10 rows with "View All" link to bookings page filtered by email
3. Show the "Total Spent" value from the API data (already available in `guest.totalSpent`)

---

### Task 2.3 — Make "View All Activity" Button Functional

**File:** `app/admin/guests/page.tsx`  
**Line:** ~315-319

**Current:** Shows a toast saying "Navigating to full audit log..."

**Fix:** Navigate to audit log filtered by this user:
```typescript
onClick={() => {
  setIsDetailModalOpen(false);
  router.push(`/admin/audit?actor_email=${selectedGuest.email}`);
}}
```

Requires `useRouter` import (add at top of component).

---

### Task 2.4 — Enhance Admin Dashboard with Stats API

**New API file:** `app/api/admin/dashboard/stats/route.ts`

**API Implementation:**
```
GET /api/admin/dashboard/stats
Permission: bookings:read

Response: {
  totalBookings: number,
  confirmedToday: number,
  pendingAction: number,
  todayRevenue: number,
  totalProducts: number,
  todayArrivals: [{id, guestName, type, amount, status, items}],
  recentActivity: [{id, actorName, action, entityType, entityId, createdAt}],
  occupancy: [{category, total, booked, available}]
}
```

**SQL queries inside the route:**
1. **Stats**: Single query using conditional aggregation:
   ```sql
   SELECT 
     COUNT(*) as total_bookings,
     COUNT(*) FILTER (WHERE booking_date = CURRENT_DATE AND status = 'confirmed') as confirmed_today,
     COUNT(*) FILTER (WHERE status = 'pending') as pending_action,
     COALESCE(SUM(total_amount) FILTER (WHERE booking_date = CURRENT_DATE AND payment_status = 'paid'), 0) as today_revenue
   FROM bookings
   ```
2. **Total Products**: `SELECT COUNT(*) FROM products WHERE is_active = true`
3. **Today's Arrivals**: `SELECT ... FROM bookings WHERE booking_date = CURRENT_DATE AND status IN ('confirmed','pending') ORDER BY created_at DESC LIMIT 10`
4. **Recent Activity**: `SELECT ... FROM audit_logs ORDER BY created_at DESC LIMIT 10` joined with users for actor name
5. **Occupancy**: For each category, total inventory vs booked units for today

**Frontend changes to `app/admin/dashboard/page.tsx`:**
1. Replace `fetch('/api/admin/bookings?limit=1000')` with `fetch('/api/admin/dashboard/stats', { credentials: 'include' })`
2. Add "Today's Arrivals" card below the stats grid — table with Check In buttons
3. Add "Recent Activity" card — compact list with timestamps
4. Add "Occupancy Snapshot" card — progress bars per category
5. Fix `totalProducts` to use the API value instead of hardcoded 0

---

### Task 2.5 — Fix Booking Creation Availability Params

**File:** `app/admin/bookings/new/page.tsx`  
**Lines:** ~112-123

**Current issue:** Uses `date` param which the availability API doesn't expect. Also sends `check_in` redundantly.

**Fix — align with the availability API's expected params:**
```typescript
const params = new URLSearchParams({
  check_in: bookingDetails.booking_date,
  type: bookingDetails.booking_type,
});
if (bookingDetails.booking_type === 'overnight' && bookingDetails.check_out_date) {
  params.set('check_out', bookingDetails.check_out_date);
}
if (bookingDetails.booking_type === 'day') {
  params.set('time_slot', bookingDetails.booking_time);
}
```

Review `app/api/availability/route.ts` to confirm exact param names before implementing.

---

### Task 2.6 — Add Adults/Children Fields to Booking Creation

**File:** `app/admin/bookings/new/page.tsx`

**Steps:**
1. Add to `bookingDetails` state: `adults: 1, children: 0`
2. Add number inputs in the Guest Information or Booking Details card
3. Include in the POST body: `adults: bookingDetails.adults, children: bookingDetails.children`
4. Show in the confirmation modal summary

This data is displayed in the booking detail page (line 218) and may be expected by the booking creation API.

---

## Phase 3: Build Missing Pages & APIs

> **Goal:** Implement the 4 spec items that were never started, plus critical supporting infrastructure.

---

### Task 3.1 — Admin Products CRUD API

**New files:**
- `app/api/admin/products/route.ts` — `GET` (list with filters, pagination) + `POST` (create)
- `app/api/admin/products/[id]/route.ts` — `GET` (single) + `PATCH` (update) + `DELETE` (deactivate)

**GET /api/admin/products:**
```
Query params: search, category, is_active, limit, offset
Permission: bookings:read (or new products:read)
Response: {
  products: [{ id, name, categoryId, categoryName, description, capacity, price, pricingUnit, timeSlot, inventoryCount, imageUrl, isActive, createdAt }],
  pagination: { total, limit, offset }
}
```

**POST /api/admin/products:**
```
Permission: staff:manage (or new products:manage)
Body: { name, categoryId, description, capacity, price, pricingUnit, timeSlot, inventoryCount, imageUrl, isActive }
Validation: Zod schema
Audit: log product creation
```

**PATCH /api/admin/products/[id]:**
```
Permission: staff:manage
Body: any subset of create fields
Audit: log with before/after snapshot
```

**DELETE /api/admin/products/[id]:**
```
Permission: staff:manage
Soft delete: SET is_active = false (or hard delete if no booking_items reference it)
Audit: log deactivation
```

---

### Task 3.2 — Connect Admin Products Page to Real API

**File:** `app/admin/products/page.tsx`

**Steps:**
1. Remove `import { mockProducts } from '@/lib/mockData/adminMockData'`
2. Replace setTimeout mock with real `fetch('/api/admin/products?...', { credentials: 'include' })`
3. Connect `ProductModal` submit to `POST /api/admin/products` (create) or `PATCH /api/admin/products/[id]` (update)
4. Connect delete button to `DELETE /api/admin/products/[id]` with confirmation modal (replace `confirm()`)
5. Add `credentials: 'include'` to all calls
6. Refresh list after create/edit/delete operations
7. Add toast notifications for success/error

---

### Task 3.3 — Admin Reports Page + API

**New API file:** `app/api/admin/reports/route.ts`

**New page file:** `app/admin/reports/page.tsx`

**API — `GET /api/admin/reports`:**
```
Query params: start_date, end_date
Permission: audit:read (or new reports:read)

SQL Queries:
1. Revenue summary: SUM(total_amount) WHERE booking_date BETWEEN dates AND status != 'cancelled'
2. Booking count by status: COUNT(*) GROUP BY status
3. Payment breakdown: COUNT(*) GROUP BY payment_status  
4. Top products: JOIN booking_items with products, SUM quantity, SUM (unit_price * quantity), GROUP BY product
5. Daily breakdown: GROUP BY booking_date ORDER BY date

Response: {
  totalRevenue, totalBookings, avgBookingValue,
  statusBreakdown: { pending: n, confirmed: n, ... },
  paymentBreakdown: { unpaid: n, paid: n, ... },
  topProducts: [{ productId, name, category, timesBooked, revenue }],
  dailyRevenue: [{ date, dayBookings, overnightBookings, revenue }]
}
```

**Page layout:**
1. **Header** with date range picker (two date inputs + presets: Today, This Week, This Month, This Year)
2. **4-card stats row**: Total Revenue, Total Bookings, Avg Booking Value, Occupancy Rate
3. **Revenue Breakdown Table**: date | day bookings | overnight bookings | revenue — one row per day
4. **Top Products Card**: table sorted by revenue descending, top 10
5. **Booking Status Distribution**: horizontal bar segments using StatusBadge colors
6. **Payment Status Distribution**: same layout

**Styling notes:**
- Use `grid md:grid-cols-4 gap-6` for stats row
- Cards: `bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800`
- Date range default: current month
- Loading state: skeleton placeholders per card
- All amounts formatted with `₱` and `toLocaleString()`

---

### Task 3.4 — Add Reports to Admin Sidebar

**File:** `app/admin/layout.tsx`  
**Line:** ~24-31

Add to the `navigation` array after Staff:
```typescript
{ name: 'Reports', href: '/admin/reports', icon: '📈' },
```

**Only add this after Task 3.3 is complete** to avoid dead links.

---

### Task 3.5 — Admin Category Management Page + API

**New API files:**
- `app/api/admin/categories/route.ts` — `GET` (list) + `POST` (create)
- `app/api/admin/categories/[id]/route.ts` — `PATCH` (update) + `DELETE` (delete, only if product count = 0)

**New page file:** `app/admin/categories/page.tsx`

**GET /api/admin/categories:**
```
Permission: bookings:read
Response: {
  categories: [{ id, name, description, productCount }]
}
SQL: SELECT c.*, COUNT(p.id) as product_count FROM categories c LEFT JOIN products p ON c.id = p.category_id GROUP BY c.id
```

**Page layout (simple, card-based):**
- Header: "Categories" title + "Add Category" button
- Grid (`md:grid-cols-2 gap-4`) of cards, each showing: name (bold), description, product count badge, edit pencil, delete trash (disabled if count > 0)
- Add/Edit modal: Name input + Description textarea + Save/Cancel

---

### Task 3.6 — Add Categories to Admin Sidebar

**File:** `app/admin/layout.tsx`

Add after Audit Logs:
```typescript
{ name: 'Categories', href: '/admin/categories', icon: '🏷️' },
```

**Only add after Task 3.5 is complete.**

---

### Task 3.7 — Guest Booking Detail Enhancement (QR Code + Timeline)

**File:** `app/booking/confirmation/[id]/page.tsx`

**Step A — QR Code Display:**
1. Install `qrcode.react`: `npm install qrcode.react`
2. Import `QRCodeSVG` from `qrcode.react`
3. Below the booking summary, add:
   ```tsx
   <div className="bg-white rounded-2xl p-8 border text-center">
     <QRCodeSVG value={booking.qr_code_hash || String(booking.id)} size={200} />
     <p className="text-sm text-gray-500 mt-4">Show this QR code at check-in</p>
     <button onClick={downloadQR} className="...">Download QR</button>
   </div>
   ```
4. Implement `downloadQR` using canvas to export as PNG

**Step B — Status Timeline:**
```tsx
const STEPS = [
  { key: 'pending', label: 'Booked' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'checked_in', label: 'Checked In' },
  { key: 'checked_out', label: 'Checked Out' },
  { key: 'completed', label: 'Completed' },
];
```
- Render horizontal on desktop (`flex`), vertical on mobile (`flex-col`)
- Each step: filled circle (completed), pulsing (current), empty (future)
- If status is `cancelled`, show a red X over the timeline

**Step C — Cancel Button:**
- Show "Cancel Booking" button if `status === 'pending'`
- Reuse the same cancel modal pattern from guest dashboard
- Call `POST /api/bookings/[id]/cancel`

**Step D — Print/Share:**
- "Print" button: `window.print()` with `@media print` stylesheet hiding nav/footer
- "Share" button: copy `window.location.href` to clipboard with `navigator.clipboard.writeText()`

---

### Task 3.8 — New Permissions for New Features

**File:** `lib/permissions.ts`

Add new permissions:
```typescript
// Products
'products:read',
'products:manage',

// Reports
'reports:read',

// Guests
'guests:read',

// Categories
'categories:read',
'categories:manage',
```

Update `ROLE_PERMISSIONS`:
- `super_admin`: already has `FULL_ACCESS` ('*'), no change needed
- `cashier`: add `products:read`, `guests:read`
- Keep `reports:read` restricted to `super_admin` only

---

## Phase 4: Frontend Improvements & Polish

> **Goal:** Improve UX, consistency, and robustness of existing pages.

---

### Task 4.1 — Create `adminFetch` Utility

**New file:** `lib/adminFetch.ts`

```typescript
export async function adminFetch(
  url: string, 
  options?: RequestInit
): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}
```

Then refactor all admin-side fetch calls to use `adminFetch`. This makes auth handling automatic and prevents the `credentials` bug from recurring.

---

### Task 4.2 — Replace All `confirm()` Dialogs with Styled Modals

**Affected files:**
- `components/admin/BookingDetailActions.tsx` (cancel confirmation)
- `components/admin/PaymentCard.tsx` (void and refund confirmations)
- `app/admin/products/page.tsx` (delete confirmation)

**Action:** Create a shared `ConfirmDialog` component:
```typescript
// components/admin/ConfirmDialog.tsx
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}
```
- `danger`: red confirm button (cancel, delete, refund)
- `warning`: orange confirm button (void)
- `info`: primary confirm button

Replace all `confirm()` usages with `<ConfirmDialog>`.

---

### Task 4.3 — Unified Loading & Empty State Components

**New components:**
- `components/admin/LoadingState.tsx` — centered spinner with text
- `components/admin/EmptyState.tsx` — icon + heading + description + optional CTA

**Current problem:** Every page reimplements loading spinners and empty states with slightly different markup. Standardize into reusable components.

```typescript
// Usage:
<LoadingState text="Loading bookings..." />
<EmptyState 
  icon={<Calendar className="w-12 h-12" />}
  title="No bookings found"
  description="Try adjusting your filters"
  action={{ label: "Create Booking", href: "/admin/bookings/new" }}
/>
```

---

### Task 4.4 — Add Error Boundaries to Admin Pages

**New file:** `components/admin/ErrorBoundary.tsx`

Wrap each admin page in an error boundary that:
1. Catches render errors
2. Displays a friendly error card with "Retry" button
3. Logs the error to console

**Also add to:** `app/admin/layout.tsx` as a global fallback.

---

### Task 4.5 — Guest Dashboard — Link "Book Now" to `/booking/info`

**File:** `app/guest/dashboard/page.tsx`  
**Line:** ~210-216

Change the empty state CTA from `href="/"` to `href="/booking/info"` so guests go directly to the booking flow, not the homepage.

---

### Task 4.6 — Add Toast Notifications to Admin Products Page

**File:** `app/admin/products/page.tsx`

Currently, delete just logs to console. Add:
1. Import `toast` from `sonner`
2. Success toast after create/edit/delete
3. Error toast on failures

---

### Task 4.7 — Improve Admin Bookings List — Add "New Booking" Button

**File:** `app/admin/bookings/page.tsx`

Add a prominent "New Booking" button in the header next to the title:
```tsx
<Link href="/admin/bookings/new" className="px-6 py-3 bg-primary text-white font-bold rounded-xl ...">
  + New Booking
</Link>
```

This provides quick access from the bookings list, in addition to the dashboard quick action.

---

### Task 4.8 — Booking Detail — Clickable Booking ID Links in Bookings Table

**File:** `app/admin/bookings/page.tsx`

In the bookings table, make the Booking ID column clickable:
```tsx
<Link href={`/admin/bookings/${booking.id}`} className="text-primary hover:underline font-bold">
  #{String(booking.id).slice(-6).toUpperCase()}
</Link>
```

This allows navigating to the detail page from the list without opening a modal first.

---

### Task 4.9 — Mobile Responsiveness Audit

Review and fix these known mobile issues:

| Page | Issue | Fix |
|------|-------|-----|
| Booking Detail | Two-column info grid may overflow on small screens | Already has `md:grid-cols-2`, verify items table scrolls properly |
| Booking Creation | Right-column summary overlaps on tablet | Ensure `lg:col-span-1` collapses to full width below `lg` |
| Guest Management Table | 6 columns may be too wide on mobile | Add horizontal scroll or hide less-important columns on mobile |
| Staff Edit Modal | Two-column grid in password section may be tight | Stack to single column on mobile |

---

### Task 4.10 — Standardize the `StatusBadge` Usage

**Problem:** Two different `StatusBadge` components exist:
- `components/admin/StatusBadge.tsx` — used in admin pages (takes `status` prop)
- `components/ui/StatusBadge.tsx` — used in guest BookingCard (takes `variant` + `children` props)

**Fix — Unify into one:**
1. Merge the status color mappings from both
2. Make it work in both admin and client contexts
3. Export from a single location
4. Update all imports

---

### Task 4.11 — Add Keyboard Shortcuts to Admin

**File:** `app/admin/layout.tsx` or a new `hooks/useAdminShortcuts.ts`

Useful shortcuts:
- `Ctrl+K` / `Cmd+K`: Focus search (if on a page with search)
- `N`: Create new (booking/product/staff depending on current page)
- `Esc`: Close any open modal

---

### Task 4.12 — Skeleton Loading for Tables

**New component:** `components/admin/TableSkeleton.tsx`

Replace the simple spinner in tables (bookings, staff, products, guests) with animated skeleton rows that match the table structure:
```tsx
<TableSkeleton columns={6} rows={5} />
```

Each row shows pulsing gray bars matching expected column widths.

---

### Task 4.13 — Admin Breadcrumbs

**New component:** `components/admin/Breadcrumbs.tsx`

Add breadcrumb navigation to nested pages:
- `/admin/bookings/123` → `Dashboard / Bookings / #ABC123`
- `/admin/bookings/new` → `Dashboard / Bookings / New`

Place below the sticky header, above the page content.

---

### Task 4.14 — Dark Mode Toggle

**File:** `app/admin/layout.tsx`

Add a dark mode toggle button in the admin header. Currently dark mode is only driven by system preference (`class` strategy in Tailwind config). A manual toggle allows admins to switch.

Store preference in `localStorage` and apply `dark` class to `<html>` element.

---

## Phase 5: Backend / Logic Improvements

> **Goal:** Improve security, performance, data integrity, and developer experience.

---

### Task 5.1 — Guest Token Expiry Handling

**File:** `lib/AuthContext.tsx`

**Problem:** If a guest's JWT expires while they're on the dashboard, API calls silently fail or show generic errors.

**Fix:**
1. In `AuthContext`, add a `refreshUser` function that calls `/api/auth/me` and validates the token is still valid
2. If the token is expired (401 response), auto-logout and redirect to login with a toast: "Session expired. Please log in again."
3. Call `refreshUser` on page focus (window `focus` event) to detect expired tokens quickly

---

### Task 5.2 — Rate Limiting for Guest Cancellation API

**File:** `app/api/bookings/[id]/cancel/route.ts`

The booking creation route has rate limiting, but the cancellation route doesn't. Add a rate limiter to prevent abuse:
- 5 cancellation requests per hour per user
- Return 429 Too Many Requests if exceeded

---

### Task 5.3 — Send Cancellation Email

**File:** `app/api/bookings/[id]/cancel/route.ts`

After successful cancellation:
```typescript
// Non-blocking email (fire and forget)
sendBookingCancellationEmail({
  guestEmail: booking.guest_email,
  bookingId,
  reason,
}).catch(console.error);
```

Create `sendBookingCancellationEmail` in `lib/email.ts` alongside the existing `sendBookingConfirmationEmail`.

---

### Task 5.4 — Admin Product API — Prevent Deletion with Active Bookings

**File:** `app/api/admin/products/[id]/route.ts` (Task 3.1)

Before deleting/deactivating a product:
```sql
SELECT COUNT(*) FROM booking_items bi
JOIN bookings b ON bi.booking_id = b.id
WHERE bi.product_id = $1
AND b.status IN ('pending', 'confirmed', 'checked_in')
```

If count > 0, return 400 with: "Cannot deactivate product with active bookings."

---

### Task 5.5 — Shadow Account Detection Improvement

**File:** `app/api/admin/guests/route.ts`

**Current fragile approach:** Compares password hash to a hardcoded placeholder string.

**Better approach:** Add a `is_shadow` boolean column to the `users` table:
```sql
ALTER TABLE users ADD COLUMN is_shadow BOOLEAN DEFAULT FALSE;
```

Set to `true` when creating shadow accounts in the booking flow, and to `false` when the user registers/claims. Then the API query simplifies to `u.is_shadow`.

---

### Task 5.6 — Consistent API Error Response Format

**Problem:** Some API routes return `{ error: "message" }`, others return `{ error: { message: "...", details: [...] } }`. Frontend code has to check both formats.

**Fix:** Standardize all error responses through the existing `ErrorResponses` utility in `lib/apiErrors.ts`:
```typescript
{ error: string, details?: any[], statusCode: number }
```

Audit all routes and ensure they all use `ErrorResponses.*` or `handleUnexpectedError`.

---

### Task 5.7 — Database Indexes for Performance

Add missing indexes for common query patterns:

```sql
-- Guest management: search by name/email
CREATE INDEX idx_users_name ON users (first_name, last_name);
CREATE INDEX idx_users_email ON users (email);

-- Bookings: filter by date and status
CREATE INDEX idx_bookings_date_status ON bookings (booking_date, status);

-- Audit logs: filter by entity
CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id);

-- Bookings by user (for guest dashboard)
CREATE INDEX idx_bookings_user ON bookings (user_id, booking_date DESC);
```

---

### Task 5.8 — Pagination Consistency

**Problem:** Some APIs use `limit`/`offset`, others use `page`/`per_page`. Frontend components use `page` numbers.

**Fix:** Standardize all APIs to accept both formats:
- `limit` + `offset` (raw)
- `page` + `per_page` (convenience, converted to limit/offset internally)

And always return:
```json
{
  "pagination": {
    "total": 150,
    "page": 1,
    "perPage": 20,
    "totalPages": 8,
    "hasMore": true
  }
}
```

---

### Task 5.9 — Input Sanitization on Search Fields

**Files:** All API routes that accept `search` query params

Ensure search inputs are sanitized:
- Trim whitespace
- Limit length (max 200 chars)
- The current `ILIKE` usage with `%${search}%` is safe from SQL injection via parameterized queries, but ensure no regex characters cause issues

---

### Task 5.10 — Cleanup Mock Data Files

**After Phase 2 and 3 are complete:**

**File to delete:** `lib/mockData/adminMockData.ts`

Once both the Products page (Task 3.2) and Guests page (Task 2.1) are connected to real APIs, the mock data file is no longer needed. Remove it to prevent future confusion.

Check for any remaining imports of mock data across the codebase before deleting.

---

## Implementation Order (Recommended Sprint Sequence)

### Sprint 1 (Days 1-2): Bug Fixes
- Tasks 1.1 through 1.8
- **Outcome:** All existing features work correctly

### Sprint 2 (Days 3-4): Data Connectivity  
- Tasks 2.1, 2.2, 2.3 (Guest management → real data)
- Tasks 3.1, 3.2 (Products CRUD API + connect page)
- Task 4.1 (adminFetch utility)
- **Outcome:** No more mock data on any page

### Sprint 3 (Days 5-7): Dashboard + Reports
- Tasks 2.4 (Dashboard stats API + enhanced dashboard)
- Tasks 3.3, 3.4 (Reports page + API + sidebar link)
- **Outcome:** Admin has real-time analytics

### Sprint 4 (Days 8-9): Remaining Features
- Tasks 2.5, 2.6 (Booking creation fixes)
- Task 3.5, 3.6 (Category management)
- Task 3.7 (Guest booking detail: QR, timeline, print)
- Task 3.8 (New permissions)
- **Outcome:** All spec items complete

### Sprint 5 (Days 10-12): Polish & Infrastructure
- Tasks 4.2 through 4.14 (UI improvements)
- Tasks 5.1 through 5.10 (Backend improvements)
- Task 5.10 (Clean up mock data)
- **Outcome:** Production-ready quality

---

## Definition of Done (Per Task)

- [ ] Feature works on both desktop and mobile
- [ ] Dark mode renders correctly
- [ ] All fetch calls use `credentials: 'include'` (admin) or `Authorization: Bearer` (guest)
- [ ] Toast notifications for success and error states
- [ ] Loading and empty states handled
- [ ] No TypeScript errors
- [ ] No console errors or warnings
- [ ] RBAC permissions enforced on new API routes
- [ ] Audit logging for all write operations
