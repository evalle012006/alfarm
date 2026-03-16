# Implementation Review: MISSING_PAGES_SPEC.md

**Date:** March 2, 2026  
**Scope:** Line-by-line comparison of each spec item against the actual implementation by the frontend developer.  
**Reference:** `docs/MISSING_PAGES_SPEC.md`

---

## Summary Scorecard

| # | Spec Item | Status | Score | Key Issues |
|---|-----------|--------|-------|------------|
| 1 | Admin Booking Detail (`/admin/bookings/[id]`) | ✅ Implemented | 8/10 | Missing `credentials: 'include'` on fetch calls; AuditTrail receives wrong props; Edit modal reuses ProductModal instead of a BookingEditModal |
| 2 | Admin Booking Creation (`/admin/bookings/new`) | ✅ Implemented | 9/10 | Excellent. Minor: `credentials: 'include'` missing on POST; no adults/children fields sent |
| 3 | Admin Guest Management (`/admin/guests`) | ⚠️ Partially Implemented | 4/10 | **Page uses mock data** — API exists but page imports `mockGuests` from `adminMockData.ts` instead of calling it. Booking history table in modal is a placeholder. |
| 4 | Admin Reports (`/admin/reports`) | ❌ Not Implemented | 0/10 | No page, no API created |
| 5 | Admin Staff Edit Modal | ✅ Implemented | 9/10 | Thorough. Role change confirmation, password reset, audit trail all present |
| 6 | Admin Dashboard Enhancement | ⚠️ Partially Implemented | 3/10 | UI polished, but still fetches 1000 bookings client-side. No stats API. No Today's Arrivals, no Activity Feed, no Occupancy Snapshot. |
| 7 | Admin Category Management (`/admin/categories`) | ❌ Not Implemented | 0/10 | No page, no API |
| 8 | Guest Dashboard (Real Data) | ✅ Implemented | 9/10 | Mock data removed. Real API calls. Status filters. Cancel flow. Refresh button. |
| 9 | Guest Profile (`/guest/profile`) | ✅ Implemented | 9/10 | Personal info edit, password change, booking stats. Uses `DashboardLayout`. |
| 10 | Guest Booking Cancellation | ✅ Implemented | 10/10 | Full flow: API + frontend modal + reason textarea + audit logging. Exact match to spec. |
| 11 | Guest Booking Detail Enhancement | ❌ Not Implemented | 0/10 | No QR code display, no status timeline, no print/share. Confirmation page unchanged. |

**Overall: 7 of 11 items implemented (4 fully, 3 partially). 4 items not started.**

---

## Detailed Review Per Spec Item

---

### Page 1: Admin Booking Detail (`/admin/bookings/[id]`)

**File:** `app/admin/bookings/[id]/page.tsx` (271 lines)  
**New Components:** `BookingDetailActions.tsx`, `PaymentCard.tsx`, `StaffNotes.tsx`, `AuditTrail.tsx`  
**Status:** ✅ Implemented  
**Score:** 8/10

#### What Was Implemented Correctly

| Spec Requirement | Implemented? | Notes |
|-----------------|-------------|-------|
| Back button to `/admin/bookings` | ✅ Yes | Uses `<Link>` with `ArrowLeft` icon |
| Booking ID display | ✅ Yes | Shows `Booking #` with last 6 chars uppercased |
| Status + Payment badges | ✅ Yes | Uses `<StatusBadge>` side by side |
| Confirm button (pending) | ✅ Yes | In `BookingDetailActions` component |
| Check In button (confirmed) | ✅ Yes | Calls `POST /api/admin/bookings/[id]/checkin` |
| Check Out button (checked_in) | ✅ Yes | Calls `POST /api/admin/bookings/[id]/checkout` |
| Cancel button with confirmation | ✅ Yes | Uses `confirm()` dialog, calls DELETE |
| Edit button | ✅ Yes | Present, opens modal |
| Guest info (name, email, phone, user ID) | ✅ Yes | Clickable mailto/tel links |
| Booking details (type, dates, time, created_at) | ✅ Yes | Well formatted with icons |
| QR code hash display | ✅ Yes | Displayed as monospace text |
| Booked Items table | ✅ Yes | Full table with product, category, qty, price, subtotal |
| Total amount in footer | ✅ Yes | Bold, styled as grand total |
| Payment Card (collect/void/refund) | ✅ Yes | Dedicated `PaymentCard` component with modal for collect |
| Special Requests (read-only) | ✅ Yes | Blue background, italic |
| Staff Notes (editable + save) | ✅ Yes | Dedicated `StaffNotes` component with yellow bg |
| Audit Trail (collapsible) | ✅ Yes | Dedicated `AuditTrail` component with timeline |
| Loading spinner with `useCallback` | ✅ Yes | `fetchBooking` wrapped in `useCallback` |
| Buttons disable during loading | ✅ Yes | `disabled={!!isLoading}` pattern used |
| Refetch after actions | ✅ Yes | `onRefresh={fetchBooking}` passed to all action components |

#### Bugs & Issues Found

| # | Severity | Issue | Location | Details |
|---|----------|-------|----------|---------|
| 1 | 🔴 **Critical** | **Missing `credentials: 'include'`** on all admin fetch calls | `page.tsx:39`, `BookingDetailActions.tsx:25`, `PaymentCard.tsx:34`, `StaffNotes.tsx:19`, `AuditTrail.tsx:35` | The spec requires all admin fetch calls to include `credentials: 'include'` for the httpOnly cookie auth. Without this, these calls will **fail in production** when the middleware checks for the `admin_token` cookie. The browser won't send the cookie unless `credentials: 'include'` is set. |
| 2 | 🟡 **Medium** | **AuditTrail receives wrong props** | `page.tsx:260` | `<AuditTrail bookingId={booking.id} />` but the component expects `entityId` and `entityType` props. This is a **TypeScript error** that would cause the audit trail to never load. Should be `<AuditTrail entityId={booking.id} entityType="booking" />`. |
| 3 | 🟡 **Medium** | **Edit modal reuses ProductModal** | `page.tsx:263-267` | The edit button opens `ProductModal` which is designed for product CRUD, not booking editing. The comment says "Future: adjust ProductModal to handle bookings or use a dedicated BookingModal" — this means the Edit button is **non-functional** for its intended purpose. Should reuse the booking edit modal from the bookings list page. |
| 4 | 🟡 **Medium** | **StaffNotes calls non-existent API** | `StaffNotes.tsx:19` | Calls `PATCH /api/admin/bookings/${bookingId}/notes` — this route does **not exist**. The notes update should go through `PATCH /api/admin/bookings/${bookingId}` with `{ notes: "..." }` in the body. |
| 5 | 🟢 **Low** | **QR hash shows booking ID instead of actual hash** | `page.tsx:176` | Displays `{booking.id}` instead of `{booking.qr_code_hash}`. The spec says to display the QR code hash field. |
| 6 | 🟢 **Low** | **Cancel uses `confirm()` instead of custom modal** | `BookingDetailActions.tsx:88` | Spec called for a styled confirmation modal. Current implementation uses the browser's native `confirm()` dialog which is unstyled and inconsistent with the design system. |

---

### Page 2: Admin Booking Creation (`/admin/bookings/new`)

**File:** `app/admin/bookings/new/page.tsx` (750 lines)  
**New Components:** `QuantitySelector.tsx`  
**Status:** ✅ Implemented  
**Score:** 9/10

#### What Was Implemented Correctly

| Spec Requirement | Implemented? | Notes |
|-----------------|-------------|-------|
| Header with back button | ✅ Yes | Clean layout |
| Guest info form (first, last, email, phone) | ✅ Yes | Two-column grid, all required |
| Account linking note | ✅ Yes | Italic helper text below form |
| Booking type toggle (Day/Overnight) | ✅ Yes | Styled toggle buttons, not radio |
| Date pickers | ✅ Yes | Dynamic labels based on type |
| Check-out date (overnight only) | ✅ Yes | Min date validation included |
| Booking time (day use only) | ✅ Yes | Radio buttons: Day 8AM-5PM / Night 6PM-7AM |
| Special requests textarea | ✅ Yes | Present |
| Product selection by category | ✅ Yes | Collapsible category sections with chevron icons |
| Time slot filtering | ✅ Yes | Filters products by relevant time slots |
| Live availability check | ✅ Yes | Calls `/api/availability`, shows remaining count per product |
| Disable unavailable products | ✅ Yes | Grayed out with `opacity-50` |
| +/- Quantity selectors | ✅ Yes | Dedicated `QuantitySelector` component with `Plus`/`Minus` buttons |
| Sticky order summary | ✅ Yes | `sticky top-24` on right column |
| Per-night calculation | ✅ Yes | Multiplies by `numNights` for overnight per_night items |
| Live total amount | ✅ Yes | Updates in real-time |
| Status selector (Confirmed/Pending) | ✅ Yes | Styled button toggles |
| Payment status & method selectors | ✅ Yes | Dropdowns for unpaid/paid and cash/gcash/paymaya |
| Confirmation modal before submit | ✅ Yes | Full summary review modal with guest/stay/items details |
| Redirect to detail page on success | ✅ Yes | `router.push(/admin/bookings/${data.booking_id})` |
| Validation before submit | ✅ Yes | Checks required fields and item selection |
| Toast notifications | ✅ Yes | Success and error toasts via `sonner` |

#### Bugs & Issues Found

| # | Severity | Issue | Location | Details |
|---|----------|-------|----------|---------|
| 1 | 🔴 **Critical** | **Missing `credentials: 'include'`** on POST submit | `page.tsx:248-252` | The `POST /api/admin/bookings` call does not include `credentials: 'include'`. The admin cookie won't be sent, causing a **401 Unauthorized** response. |
| 2 | 🟡 **Medium** | **Availability API params mismatch** | `page.tsx:112-123` | Uses `date` param but the availability API expects `check_in`. Also sends `check_in` redundantly in some branches. May cause incorrect availability results depending on API validation. |
| 3 | 🟢 **Low** | **No adults/children count fields** | `page.tsx` | The booking creation API may expect `adults` and `children` counts (used in the booking detail items table line 218), but the form doesn't collect these. The backend may handle this, but it's a data gap. |

---

### Page 3: Admin Guest Management (`/admin/guests`)

**File:** `app/admin/guests/page.tsx` (330 lines)  
**API:** `app/api/admin/guests/route.ts` (100 lines) — **created**  
**Status:** ⚠️ Partially Implemented  
**Score:** 4/10

#### What Was Implemented

| Spec Requirement | Implemented? | Notes |
|-----------------|-------------|-------|
| Header with total count | ✅ Yes | Badge shows total count |
| Search by name/email/phone | ✅ Yes | Debounced search input |
| Sort (Newest/Most Bookings/Alpha) | ✅ Yes | Dropdown with 3 options |
| Guest table with columns | ✅ Yes | Name, Contact, Bookings, Last Stay, Registration, Actions |
| Shadow account highlight | ✅ Yes | Yellow row bg + "Shadow Account" label |
| Avatar initials | ✅ Yes | Colored circle with first+last initials |
| View Details button | ✅ Yes | Opens modal |
| Guest Detail Modal | ✅ Yes | Profile header, stats widgets, close/view activity buttons |
| Pagination | ✅ Yes | Uses `<Pagination>` component, 20 per page |
| Backend API (`GET /api/admin/guests`) | ✅ Yes | Full query with search, sort, pagination, shadow detection, booking stats |

#### Critical Problem

| # | Severity | Issue | Details |
|---|----------|-------|---------|
| 1 | 🔴 **Critical** | **Page uses mock data instead of the real API** | `page.tsx:23` imports `mockGuests` from `@/lib/mockData/adminMockData`. The `fetchGuests` function at line 40-71 filters/sorts mock data with a `setTimeout` delay to simulate an API call. **The real API at `/api/admin/guests` is never called.** This is the exact same problem that was identified in the original analysis for the Products page — the API exists but the frontend doesn't use it. |
| 2 | 🟡 **Medium** | **Guest detail modal has no booking history table** | The spec called for a booking history table inside the detail modal with columns: Booking ID (linked), Date, Type, Status, Payment, Amount. Instead, a placeholder blue box says "Full booking ledger and loyalty analytics coming in Phase 4." |
| 3 | 🟡 **Medium** | **"View All Activity" button is non-functional** | `page.tsx:315-319` just shows a toast saying "Navigating to full audit log..." but doesn't navigate anywhere. |

---

### Page 4: Admin Reports (`/admin/reports`)

**Status:** ❌ Not Implemented  
**Score:** 0/10

No page file, no API endpoint, no navigation link created. The spec called for:
- Revenue/occupancy reports with date range filtering
- Summary stats (revenue, bookings, avg value, occupancy rate)
- Revenue breakdown table
- Top products card
- Status/payment distribution
- `GET /api/admin/reports/summary` API

**None of this was built.**

---

### Page 5: Admin Staff Edit Modal

**File:** Modified `app/admin/staff/page.tsx` (792 lines, up from 412)  
**Status:** ✅ Implemented  
**Score:** 9/10

#### What Was Implemented Correctly

| Spec Requirement | Implemented? | Notes |
|-----------------|-------------|-------|
| Edit button per staff row | ✅ Yes | Pencil icon button added to actions column |
| Staff info header (avatar, email, created date) | ✅ Yes | Styled header with initials, email, date |
| Editable fields (first name, last name, phone) | ✅ Yes | Input fields with phone icon |
| Role dropdown (Cashier/Super Admin) | ✅ Yes | Select element |
| Disable role change for self | ✅ Yes | `disabled={isSelf}` with warning message |
| Role change warning text | ✅ Yes | Orange confirmation box appears on role change |
| Password reset section (separate card) | ✅ Yes | Red-themed section with border, visually separated |
| New + Confirm password fields | ✅ Yes | Both present |
| Show/hide password toggle | ✅ Yes | Eye/EyeOff icons |
| Separate password reset action | ✅ Yes | "Force Password Reset" button, calls API independently |
| Save only changed fields | ✅ Yes | Compares formData vs original staff, builds diff |
| Confirmation for role change | ✅ Yes | Inline orange warning box |
| Toast notifications | ✅ Yes | Success/error toasts |
| Refresh staff list after save | ✅ Yes | Calls `onSuccess → fetchStaff()` |
| Uses `<Modal>` component | ✅ Yes | Wraps content in `<Modal>` |

#### Bonus: Audit Trail in Edit Modal

The developer added an `<AuditTrail entityId={staffId} entityType="user" />` component inside the edit modal. This was **not in the spec** but is a valuable addition showing the staff member's action history.

#### Issues Found

| # | Severity | Issue | Details |
|---|----------|-------|---------|
| 1 | 🟢 **Low** | **No confirmation modal before save (when role changed)** | Spec said "Show confirmation modal before saving if role was changed." Current implementation shows an inline warning when the role dropdown changes, but doesn't block the Save button — the user can save without explicit confirmation. The inline warning approach is arguably better UX, so this is minor. |
| 2 | 🟢 **Low** | **Prevent self-deactivation not visible** | The disable/enable button correctly prevents self-targeting via `disabled={currentUser?.email === member.email}` with `opacity-30`, but there's no tooltip explaining why. |

---

### Page 6: Admin Dashboard Enhancement

**File:** Modified `app/admin/dashboard/page.tsx` (233 lines, up from 194)  
**Status:** ⚠️ Partially Implemented  
**Score:** 3/10

#### What Was Changed

| Change | Details |
|--------|---------|
| UI polish | Cards redesigned with hover effects, gradients, Lucide icons, `rounded-3xl` |
| Management cards | 3-card grid linking to Bookings, Products, Staff |
| Quick Actions section | Links to View Website, Audit Logs, **New Booking** (correctly links to `/admin/bookings/new`) |
| Sonner `<Toaster>` added | Added to admin layout for toast notifications |

#### What's Still Missing (From Spec)

| Spec Requirement | Implemented? | Notes |
|-----------------|-------------|-------|
| **Dedicated stats API** (`GET /api/admin/dashboard/stats`) | ❌ No | Still fetches 1000 bookings client-side to calculate stats |
| **Today's Arrivals card** | ❌ No | Not present |
| **Recent Activity Feed** (last 10 audit entries) | ❌ No | Not present |
| **Occupancy Snapshot** (progress bars by category) | ❌ No | Not present |
| **Fix product count** (still shows 0) | ❌ No | `totalProducts: 0` hardcoded at line 60 |
| Confirmed Today (instead of total confirmed) | ❌ No | Still shows all-time confirmed count |
| Today's Revenue (instead of total revenue) | ❌ No | Still shows all-time revenue |

The dashboard got a visual refresh but none of the data/logic improvements from the spec were implemented.

---

### Page 7: Admin Category Management (`/admin/categories`)

**Status:** ❌ Not Implemented  
**Score:** 0/10

No page, no API. Low priority per spec, so this is acceptable for now.

---

### Page 8: Guest Dashboard (Real Data)

**File:** Rewritten `app/guest/dashboard/page.tsx` (323 lines, up from 192)  
**Status:** ✅ Implemented  
**Score:** 9/10

#### What Was Implemented Correctly

| Spec Requirement | Implemented? | Notes |
|-----------------|-------------|-------|
| **Remove mock data** | ✅ Yes | `mockBookings` array completely removed |
| **Call `/api/bookings/history`** | ✅ Yes | Real API call with `Authorization: Bearer` header |
| **Auth check on mount** | ✅ Yes | Uses `useAuth()` hook, redirects to login if unauthenticated |
| **Fresh user data** | ✅ Yes | Uses `user` from `AuthContext` |
| **Booking cards with real data** | ✅ Yes | Passes real props to `BookingCard` |
| **Status filter tabs** | ✅ Yes | All/Pending/Confirmed/Completed/Cancelled tabs, calls API with `?status=` |
| **Cancel button on pending bookings** | ✅ Yes | `onCancel` prop passed to `BookingCard` |
| **Cancellation modal** | ✅ Yes | Custom modal with warning icon, reason textarea, Keep/Cancel buttons |
| **Cancel reason textarea** | ✅ Yes | Optional, sent in API body |
| **Post-cancel refresh** | ✅ Yes | Calls `fetchBookings()` after successful cancel |
| **Empty state** | ✅ Yes | Calendar icon, "No bookings yet", "Book Now" CTA |
| **Loading skeletons** | ✅ Yes | 3 skeleton card placeholders |
| **Refresh button** | ✅ Yes | Spinning RefreshCw icon |
| **Welcome banner** | ✅ Yes | Gradient banner with user's first name |
| **Quick actions (Rooms/Activities)** | ✅ Yes | Two explore cards |

#### Issues Found

| # | Severity | Issue | Details |
|---|----------|-------|---------|
| 1 | 🟢 **Low** | **Filter change doesn't refetch** | When `activeFilter` changes, `fetchBookings` is memoized with `activeFilter` in deps, but the `useEffect` that calls it depends on `fetchBookings` which changes. This works but could cause unnecessary re-renders. A cleaner approach would be to call `fetchBookings(filter)` directly on tab click. |
| 2 | 🟢 **Low** | **"Book Now" links to `/` instead of `/booking/info`** | `page.tsx:211` empty state CTA links to homepage. Spec suggested linking to `/booking/info` for direct booking flow. |

---

### Page 9: Guest Profile (`/guest/profile`)

**File:** New `app/guest/profile/page.tsx` (418 lines)  
**API:** New `app/api/auth/profile/route.ts` (158 lines)  
**Status:** ✅ Implemented  
**Score:** 9/10

#### What Was Implemented Correctly

| Spec Requirement | Implemented? | Notes |
|-----------------|-------------|-------|
| Avatar with initials | ✅ Yes | Large rounded square with initials |
| Full name display | ✅ Yes | Bold, uppercase |
| Email (read-only) | ✅ Yes | With lock icon, grayed out |
| Member since date | ✅ Yes | Badge (hardcoded "2024" — should use real date) |
| Editable: First Name, Last Name, Phone | ✅ Yes | Form inputs using `FormInput` component |
| Save only changed fields | ✅ Yes | `hasProfileChanges` memo disables button when unchanged |
| Password change (current + new + confirm) | ✅ Yes | Separate form section |
| Show/hide toggles on passwords | ✅ Yes | Eye/EyeOff per field |
| Password validation | ✅ Yes | Frontend match check + backend 8-char minimum |
| Booking stats (total, spent, last date) | ✅ Yes | 3-card grid, fetched from `/api/bookings/history` |
| Uses `DashboardLayout` | ✅ Yes | Wrapped properly |
| Toast notifications | ✅ Yes | Success/error via sonner |
| Logout button | ✅ Yes | Sign Out button in profile header |
| **API: PATCH /api/auth/profile** | ✅ Yes | Zod validation, password verification, audit logging, transaction |

#### API Review: `PATCH /api/auth/profile`

The API implementation is **excellent**:
- Zod schema with refinement (currentPassword required if newPassword provided)
- Database transaction with `BEGIN`/`COMMIT`/`ROLLBACK`
- Password verified via `verifyPassword()` before allowing change
- Audit logging with before/after snapshots
- Only updates provided fields
- Proper error handling with Zod error responses

#### Issues Found

| # | Severity | Issue | Details |
|---|----------|-------|---------|
| 1 | 🟡 **Medium** | **"Member since" is hardcoded** | `page.tsx:201` shows `Member since 2024` instead of using the user's actual `created_at` date from the database. The `/api/auth/me` endpoint doesn't return `created_at` — would need to add it. |
| 2 | 🟢 **Low** | **No link to profile from guest dashboard or nav** | The spec mentions "Add link to this page from the guest dashboard." No navigation link was added to reach `/guest/profile`. Users can only access it by typing the URL directly. |

---

### Page 10: Guest Booking Cancellation

**File:** Integrated into `app/guest/dashboard/page.tsx`  
**API:** New `app/api/bookings/[id]/cancel/route.ts` (92 lines)  
**Status:** ✅ Implemented  
**Score:** 10/10

#### Full Spec Compliance

| Spec Requirement | Implemented? | Notes |
|-----------------|-------------|-------|
| Cancel button on pending bookings | ✅ Yes | Passed as `onCancel` prop to `BookingCard` |
| Confirmation modal | ✅ Yes | Custom styled modal, not browser `confirm()` |
| Warning text | ✅ Yes | "This action will release your reserved dates and cannot be undone." |
| Cancellation reason textarea | ✅ Yes | Optional, labeled "Reason for Cancellation" |
| "Keep Booking" secondary button | ✅ Yes | Closes modal |
| "Yes, Cancel" danger-styled button | ✅ Yes | Red outline style (de-emphasized as spec requested) |
| Post-cancel toast | ✅ Yes | "Booking cancelled successfully" |
| Post-cancel refresh | ✅ Yes | Calls `fetchBookings()` |

#### API Review: `POST /api/bookings/[id]/cancel`

The API implementation is **exact match to spec**:
- Validates booking ID
- Authenticates user via Bearer token
- Verifies ownership (`user_id` matches token)
- Only allows cancellation of `pending` bookings
- Accepts optional reason in body
- Updates status to `cancelled`
- Audit logging with reason, previous/new status metadata
- Proper error codes (400, 401, 403, 404)

---

### Page 11: Guest Booking Detail Enhancement

**File:** `app/booking/confirmation/[id]/page.tsx` — **unchanged**  
**Status:** ❌ Not Implemented  
**Score:** 0/10

| Spec Requirement | Implemented? |
|-----------------|-------------|
| QR code display using `qr_code_hash` | ❌ No |
| "Download QR" button | ❌ No |
| Status timeline visualization | ❌ No |
| Cancel button for pending | ❌ No |
| Print/Share buttons | ❌ No |

The confirmation page was not modified at all.

---

## Sidebar Navigation Update

**File:** `app/admin/layout.tsx` (184 lines)

| Spec Requirement | Implemented? | Notes |
|-----------------|-------------|-------|
| Add "Guests" to sidebar | ✅ Yes | `{ name: 'Guests', href: '/admin/guests', icon: '👤' }` added |
| Add "Reports" to sidebar | ❌ No | Reports page doesn't exist yet |
| Add "Categories" to sidebar | ❌ No | Categories page doesn't exist yet |
| Add `<Toaster>` from sonner | ✅ Yes | Added at line 70 for toast support |

---

## New Components Created

| Component | File | Quality | Notes |
|-----------|------|---------|-------|
| `BookingDetailActions` | `components/admin/BookingDetailActions.tsx` | ✅ Good | Clean action button component with loading states. Missing `credentials: 'include'`. Cancel uses `confirm()` instead of modal. |
| `PaymentCard` | `components/admin/PaymentCard.tsx` | ✅ Good | Full collect/void/refund flow. Collect modal with amount + notes. Missing `credentials: 'include'`. |
| `StaffNotes` | `components/admin/StaffNotes.tsx` | ⚠️ Has bug | Calls non-existent `/api/admin/bookings/[id]/notes` endpoint. Missing `credentials: 'include'`. |
| `AuditTrail` | `components/admin/AuditTrail.tsx` | ✅ Good | Collapsible timeline with color-coded dots, before/after snapshots. Missing `credentials: 'include'`. |
| `QuantitySelector` | `components/admin/QuantitySelector.tsx` | ✅ Excellent | Clean +/- component with min/max/disabled support. |
| `FormInput` | `components/ui/FormInput.tsx` | ✅ Good | Reusable form input used in guest profile. |

---

## New API Routes Created

| Route | File | Quality | Notes |
|-------|------|---------|-------|
| `GET /api/admin/guests` | `app/api/admin/guests/route.ts` | ✅ Good | RBAC, search, sort, pagination, shadow detection, booking stats via JOIN. One concern: shadow detection relies on comparing password to a hardcoded placeholder hash string — fragile if the hash format changes. |
| `PATCH /api/auth/profile` | `app/api/auth/profile/route.ts` | ✅ Excellent | Zod validation with refinement, transaction, password verification, audit logging, proper error handling. |
| `POST /api/bookings/[id]/cancel` | `app/api/bookings/[id]/cancel/route.ts` | ✅ Excellent | Ownership check, status validation, optional reason, audit logging. |

---

## Cross-Cutting Issue: Missing `credentials: 'include'`

This is the **most widespread bug** across the implementation. Every admin-side `fetch()` call must include `credentials: 'include'` to send the `admin_token` httpOnly cookie. Without it, the middleware returns 401.

**Affected files (all admin-side):**

| File | Lines Missing `credentials` |
|------|-----------------------------|
| `app/admin/bookings/[id]/page.tsx` | Line 39 (GET booking) |
| `components/admin/BookingDetailActions.tsx` | Line 25 (all action calls) |
| `components/admin/PaymentCard.tsx` | Line 34 (payment operations) |
| `components/admin/StaffNotes.tsx` | Line 19 (PATCH notes) |
| `components/admin/AuditTrail.tsx` | Line 35 (GET audit) |
| `app/admin/bookings/new/page.tsx` | Line 88 (GET products), Line 125 (GET availability), Line 248 (POST booking) |
| `app/admin/guests/page.tsx` | N/A — uses mock data, but when switched to real API will need it |

**Client-side pages correctly use `Authorization: Bearer` header** (guest dashboard, profile) — no issue there.

---

## Remaining Work Summary

### Must Fix (Bugs in Existing Implementation)

1. **Add `credentials: 'include'`** to all admin fetch calls (~10 locations)
2. **Fix AuditTrail props** in booking detail: `bookingId` → `entityId` + `entityType`
3. **Fix StaffNotes API endpoint**: `/api/admin/bookings/[id]/notes` → `/api/admin/bookings/[id]` with `{ notes }` body
4. **Connect Guest Management page to real API** — replace mock data import with `fetch('/api/admin/guests?...')`
5. **Fix QR hash display** in booking detail: `booking.id` → `booking.qr_code_hash`
6. **Fix "Member since" hardcoded date** in guest profile

### Not Yet Implemented (From Spec)

| Item | Priority | Effort |
|------|----------|--------|
| Admin Reports page + API | 🟡 Medium | Large |
| Admin Dashboard stats API + Today's Arrivals + Activity Feed + Occupancy | 🟡 Medium | Medium |
| Admin Category Management page + API | 🟢 Low | Small |
| Guest Booking Detail Enhancement (QR, timeline, print) | 🟡 Medium | Medium |
| Replace Edit modal in booking detail (currently opens ProductModal) | 🟡 Medium | Small |
| Add navigation link to Guest Profile from dashboard/nav | 🟢 Low | Tiny |
