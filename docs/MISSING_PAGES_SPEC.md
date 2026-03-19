# AlFarm — Missing Pages & UI/UX Specification

**Date:** February 23, 2026  
**Purpose:** Detailed spec for every missing page, its expected content, and UI/UX instructions.  
**Design System Reference:** Tailwind CSS with custom brand colors (`primary: #4A90A4`, `secondary: #6FB96F`, `accent: #2C3E50`). Admin uses sidebar layout from `app/admin/layout.tsx`. Reusable components: `Modal`, `Pagination`, `StatusBadge`, `ProductModal`. All admin pages support dark mode via `dark:` variants. Rounded corners use `rounded-xl` / `rounded-2xl`. Cards use `bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800`.

---

## Design Conventions (Apply to ALL Pages Below)

- **Admin pages** render inside the existing sidebar layout (`app/admin/layout.tsx`). Do NOT add a separate nav or sidebar.
- **Client/guest pages** use `<Navigation />` at top and `<Footer />` at bottom.
- **Input fields:** `w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent`
- **Primary buttons:** `px-6 py-3 bg-gradient-to-r from-primary to-primary-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all`
- **Secondary/cancel buttons:** `px-6 py-3 rounded-xl border-2 border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-all`
- **Danger buttons:** `px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all`
- **Page headers:** `text-3xl font-bold text-accent dark:text-white` with a subtitle `text-sm text-gray-600 dark:text-gray-400 mt-1`
- **Card containers:** `bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800`
- **Table headers:** `bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700` with `text-xs font-semibold uppercase tracking-wider`
- **Status badges:** Use existing `<StatusBadge status={...} />` component.
- **Modals:** Use existing `<Modal>` component with `size="sm"|"md"|"lg"|"xl"`.
- **Pagination:** Use existing `<Pagination>` component.
- **Loading state:** Centered spinner `animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full` with text below.
- **Empty state:** Centered icon (emoji or SVG), heading, description, and CTA button.
- **Error state:** `bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl p-4`
- **All fetch calls on admin pages** must include `credentials: 'include'`.

---

## ADMIN-SIDE MISSING PAGES

---

### Page 1: Admin Booking Detail Page

**Route:** `/admin/bookings/[id]`  
**File:** `app/admin/bookings/[id]/page.tsx`  
**API:** `GET /api/admin/bookings/[id]` (exists)  
**Priority:** 🔴 High

#### Purpose
A dedicated full-page view for a single booking, replacing the current modal-only approach. Provides complete booking info, a status timeline, action buttons for check-in/check-out/payment, and the audit trail for that booking.

#### Expected Content

**Section 1 — Header Bar**
- Back button (`← Back to Bookings`) linking to `/admin/bookings`
- Booking ID displayed as `Booking #123`
- Current `<StatusBadge>` for booking status and payment status, side by side
- Action buttons row (right-aligned):
  - **Confirm** button (visible when status = `pending`). Calls `PATCH /api/admin/bookings/[id]` with `{ status: 'confirmed' }`
  - **Check In** button (visible when status = `confirmed`). Calls `POST /api/admin/bookings/[id]/checkin`
  - **Check Out** button (visible when status = `checked_in`). Calls `POST /api/admin/bookings/[id]/checkout`
  - **Cancel** button (visible when status ≠ `cancelled`, `completed`, `checked_out`). Calls `DELETE /api/admin/bookings/[id]`. Show confirmation modal first.
  - **Edit** button → opens edit modal (reuse existing edit modal from bookings list page)

**Section 2 — Two-Column Info Grid** (inside a card)
- **Left column — Guest Information:**
  - Full name (bold, large)
  - Email (clickable `mailto:`)
  - Phone (clickable `tel:`)
  - User ID (if linked to a registered user)
- **Right column — Booking Details:**
  - Booking type badge (`Day` or `Overnight`)
  - Booking date (formatted)
  - Check-out date (if overnight)
  - Booking time (if day-use)
  - Created at timestamp
  - QR code hash (display as monospace text; future: render as QR image)

**Section 3 — Booked Items Table** (inside a card)
- Table columns: Product Name | Category | Qty | Unit Price | Subtotal
- Footer row: **Total** in bold with `₱` formatted amount
- Use `text-primary font-bold` for total amount

**Section 4 — Payment Card**
- Current payment status badge + payment method
- Three action buttons in a row:
  - **Collect Payment** (green, visible when `payment_status` = `unpaid` or `partial`). Opens a small modal asking for amount (optional, defaults to full) and notes. Calls `PATCH /api/admin/bookings/[id]/payment` with `{ operation: 'collect', amount?, notes? }`
  - **Void Payment** (orange, visible when `payment_status` = `paid` or `partial`). Confirmation modal → calls with `{ operation: 'void' }`
  - **Refund** (red, visible when `payment_status` = `paid` or `partial`). Confirmation modal → calls with `{ operation: 'refund' }`
- Show success/error toast after each operation

**Section 5 — Special Requests & Notes** (inside a card)
- Special requests text (from guest, read-only, light background)
- Staff notes (editable textarea, yellow background `bg-yellow-50 dark:bg-yellow-900/20`). Save button to PATCH notes.

**Section 6 — Audit Trail** (inside a card, collapsible)
- Fetch from `GET /api/admin/audit?entity_type=booking&entity_id={id}`
- Display as a vertical timeline:
  - Each entry: timestamp | actor name | action description | expandable metadata
  - Use colored dots: green for check-in, blue for payment, red for cancel, gray for updates

#### UI/UX Instructions
- Use `space-y-6` between sections.
- All action buttons should show a loading spinner while the API call is in progress and disable themselves.
- After any successful action, refetch the booking data to update all sections.
- Use `useCallback` for the fetch function so it can be called from multiple places.
- Mobile: stack the two-column grid into single column. Action buttons should wrap.

---

### Page 2: Admin Booking Creation Form

**Route:** `/admin/bookings/new`  
**File:** `app/admin/bookings/new/page.tsx`  
**API:** `POST /api/admin/bookings` (exists)  
**Priority:** 🔴 High

#### Purpose
Allow admin/cashier to create a walk-in booking on behalf of a guest. This is the admin equivalent of the client-side booking flow, but condensed into a single form.

#### Expected Content

**Section 1 — Header**
- Title: "Create New Booking"
- Back button to `/admin/bookings`

**Section 2 — Guest Information Card**
- Fields: First Name*, Last Name*, Email*, Phone*
- Two-column grid on desktop, single column on mobile
- Note below: "If the email matches an existing guest, the booking will be linked to their account."

**Section 3 — Booking Details Card**
- Booking Type: radio buttons or toggle — `Day Use` | `Overnight`
- Booking Date (date picker)*
- Check-out Date (date picker, shown only when `Overnight` is selected)*
- Booking Time (time input, shown only when `Day Use` is selected)
- Special Requests (textarea, optional)

**Section 4 — Product Selection Card**
- Fetch products from `GET /api/products` (or future admin products API)
- Group products by category using collapsible sections or tabs: Entrance Fee | Accommodation | Amenities | Rentals
- Each product row: Name | Price | Pricing Unit | Quantity selector (number input, min 0)
- Only show products with `quantity > 0` in the summary
- Filter products by `time_slot` based on selected booking type (day → show `day` + `any`, overnight → show `night` + `any`)
- Live availability check: when date is selected, call `GET /api/availability?check_in=...&check_out=...&type=...` and show remaining inventory next to each product. Disable products with 0 remaining.

**Section 5 — Order Summary Card** (sticky on desktop, at bottom on mobile)
- List selected items with quantities and subtotals
- Calculate per_night items × number of nights for overnight bookings
- Show total amount in large bold text
- Payment status selector: `Unpaid` (default) | `Paid`
- Payment method selector: `Cash` | `GCash` | `PayMaya`
- Initial booking status selector: `Confirmed` (default) | `Pending`

**Section 6 — Submit**
- Large primary button: "Create Booking"
- On submit: validate all required fields, then `POST /api/admin/bookings`
- On success: redirect to `/admin/bookings/[new_id]` (the detail page)
- On error: show inline error message

#### UI/UX Instructions
- Use a multi-card layout with `space-y-6`.
- The order summary should use `sticky top-24` on desktop (sidebar offset) so it stays visible while scrolling through products.
- Quantity selectors should be `+`/`-` buttons flanking a number, not raw number inputs.
- When booking type changes, reset product selections that are incompatible with the new time slot.
- Show a confirmation modal before final submission summarizing the booking.

---

### Page 3: Admin Guest Management Page

**Route:** `/admin/guests`  
**File:** `app/admin/guests/page.tsx`  
**API needed:** `GET /api/admin/guests` (to be built)  
**Priority:** 🟡 Medium

#### Purpose
List all guest users, search/filter them, and view their booking history. Helps admin look up returning guests and their past stays.

#### Expected Content

**Section 1 — Header**
- Title: "Guest Management"
- Subtitle: "View and search guest accounts"
- Total guest count badge (right-aligned)

**Section 2 — Filters Bar** (inside a card)
- Search input: "Search by name, email, or phone..."
- Debounce search at 300ms
- Sort dropdown: "Newest First" | "Most Bookings" | "Alphabetical"

**Section 3 — Guest Table** (inside a card)
- Columns: Name | Email | Phone | Total Bookings | Last Booking Date | Registered | Actions
- Name column: bold full name
- Total Bookings: count badge
- Last Booking Date: formatted date or "Never" if no bookings
- Registered: date or "Shadow Account" badge (for guests created via guest checkout who never registered — identifiable by placeholder password hash)
- Actions: "View" button → opens guest detail modal or navigates to guest detail page

**Section 4 — Pagination**
- Use existing `<Pagination>` component
- 20 guests per page

#### Guest Detail Modal (or Page)
When "View" is clicked:
- Guest info card: name, email, phone, registration date, account type
- Booking history table: list all bookings for this guest
  - Columns: Booking ID (link to `/admin/bookings/[id]`) | Date | Type | Status | Payment | Amount
  - Sorted by most recent first
- Total spent: sum of all booking amounts

#### UI/UX Instructions
- Follow the same table pattern as the bookings page.
- Shadow accounts should have a subtle `bg-yellow-50` row highlight and a "Shadow" badge.
- The guest detail can be a modal (`size="lg"`) for quick viewing, with a "View Full Details" link to a dedicated page if needed later.

#### API Spec for `GET /api/admin/guests`
```
Query params: search, sort (newest|bookings|alpha), limit, offset
Response: {
  guests: [{ id, email, firstName, lastName, phone, role, isActive, createdAt, isShadow, totalBookings, lastBookingDate }],
  pagination: { total, limit, offset, hasMore }
}
```
Permission: `staff:read` or a new `guests:read` permission.

---

### Page 4: Admin Reports / Analytics Page

**Route:** `/admin/reports`  
**File:** `app/admin/reports/page.tsx`  
**API needed:** `GET /api/admin/reports/summary`, `GET /api/admin/reports/revenue`  
**Priority:** 🟡 Medium

#### Purpose
Provide revenue, occupancy, and booking trend reports with date range filtering.

#### Expected Content

**Section 1 — Header**
- Title: "Reports & Analytics"
- Date range picker: two date inputs (From / To) with preset buttons: "Today", "This Week", "This Month", "This Year"

**Section 2 — Summary Stats Row** (4 cards in a grid)
- **Total Revenue:** ₱ amount for selected period
- **Total Bookings:** count for selected period
- **Average Booking Value:** ₱ amount
- **Occupancy Rate:** percentage (booked units / total inventory for date range)
- Each card: large number, label below, trend indicator (↑/↓ vs previous period, if feasible)

**Section 3 — Revenue Breakdown Card**
- Table: Date | Day Bookings | Overnight Bookings | Revenue
- One row per day in the selected range (or grouped by week/month for longer ranges)
- Footer row: totals
- Future enhancement: bar chart visualization

**Section 4 — Top Products Card**
- Table: Product Name | Category | Times Booked | Revenue Generated
- Sorted by revenue descending
- Top 10 products for the selected period

**Section 5 — Booking Status Distribution Card**
- Show count and percentage for each status: Pending, Confirmed, Checked In, Checked Out, Completed, Cancelled
- Use colored bars or a horizontal stacked bar
- Use the same colors as `StatusBadge` for consistency

**Section 6 — Payment Status Distribution Card**
- Same layout as above for: Unpaid, Partial, Paid, Voided, Refunded

#### UI/UX Instructions
- Use `grid md:grid-cols-4 gap-6` for the summary stats row.
- Stats cards should have a subtle gradient background matching their theme (green for revenue, blue for bookings, etc.).
- Tables should be inside scrollable card containers.
- Date range picker should default to "This Month".
- Loading state: show skeleton placeholders for each card while data loads.
- All monetary values formatted with `₱` and `toLocaleString()`.

#### API Spec for `GET /api/admin/reports/summary`
```
Query params: start_date, end_date
Response: {
  totalRevenue, totalBookings, avgBookingValue, occupancyRate,
  statusBreakdown: { pending: n, confirmed: n, ... },
  paymentBreakdown: { unpaid: n, paid: n, ... },
  topProducts: [{ productId, name, category, timesBooked, revenue }],
  dailyRevenue: [{ date, dayBookings, overnightBookings, revenue }]
}
```
Permission: `audit:read` or a new `reports:read` permission.

---

### Page 5: Admin Staff Edit Modal / Detail

**Route:** N/A (modal on `/admin/staff` page)  
**File:** Modify `app/admin/staff/page.tsx`  
**API:** `PATCH /api/admin/staff/[id]` (exists), `GET /api/admin/staff/[id]` (exists)  
**Priority:** 🟡 Medium

#### Purpose
The current staff page only has enable/disable. This adds a full edit modal for role changes, name edits, and password resets.

#### Expected Content — Staff Edit Modal

Open when clicking an "Edit" button (to be added) on each staff row.

**Section 1 — Staff Info (read-only header)**
- Avatar circle with initials
- Email (read-only, grayed out)
- Created date

**Section 2 — Editable Fields**
- First Name (text input)
- Last Name (text input)
- Phone (text input)
- Role (select dropdown): Cashier | Super Admin
  - Show warning text when changing role: "Changing the role will immediately update this user's permissions."
  - Disable role change for the currently logged-in user (API enforces this too)

**Section 3 — Password Reset**
- Separate card/section with a warning border
- "Reset Password" heading
- New Password input (min 8 chars)
- Confirm Password input
- "Reset Password" danger-styled button
- This should be a separate action from the main save, calling `PATCH /api/admin/staff/[id]` with `{ password: newPassword }`

**Section 4 — Actions**
- Cancel button (secondary)
- Save Changes button (primary) — only sends changed fields
- Show confirmation modal before saving if role was changed

#### UI/UX Instructions
- Use `<Modal size="md">`.
- Password reset section should be visually separated with a `border-t` and `mt-6 pt-6`.
- Password fields should have a show/hide toggle.
- After successful save, close modal and refresh staff list.
- Show toast notification on success/error.

---

### Page 6: Admin Dashboard Stats (Enhanced)

**Route:** `/admin/dashboard` (existing, needs enhancement)  
**File:** Modify `app/admin/dashboard/page.tsx`  
**API needed:** `GET /api/admin/dashboard/stats` (to be built)  
**Priority:** 🟡 Medium

#### Purpose
Replace the current inefficient approach (fetching 1000 bookings client-side) with a dedicated stats API and add more useful dashboard widgets.

#### Expected Content Changes

**Replace current stats fetching** with a single call to `GET /api/admin/dashboard/stats`.

**Enhanced Stats Row** (keep existing 4-card grid, fix data):
- Total Bookings (from API, not client-side count)
- Confirmed Today (bookings with `booking_date = today` and `status = confirmed`)
- Pending Action (bookings needing attention: `status = pending` count)
- Today's Revenue (sum of `total_amount` for today's bookings where `payment_status = paid`)

**New Section — Today's Arrivals Card**
- Table of bookings with `booking_date = today` and `status IN (confirmed, pending)`
- Columns: Guest Name | Type | Items Summary | Amount | Status | Quick Actions (Check In button)
- Max 10 rows, "View All" link to bookings page filtered by today

**New Section — Recent Activity Feed**
- Last 10 audit log entries
- Each entry: timestamp, actor, action description (human-readable)
- "View All" link to `/admin/audit`

**New Section — Occupancy Snapshot**
- For today's date, show: Total inventory units | Booked units | Available units
- Simple progress bar showing occupancy percentage
- Grouped by category (Accommodation, Entrance, etc.)

#### API Spec for `GET /api/admin/dashboard/stats`
```
Response: {
  totalBookings, confirmedToday, pendingAction, todayRevenue,
  todayArrivals: [{ id, guestName, type, amount, status, items: [...] }],
  recentActivity: [{ id, actorName, action, entityType, entityId, createdAt }],
  occupancy: [{ category, total, booked, available }]
}
```
Permission: `bookings:read`

#### UI/UX Instructions
- Keep the existing gradient welcome banner.
- Stats cards should animate numbers counting up on load (optional polish).
- Today's Arrivals should have a prominent "Check In" button per row that calls the check-in API directly.
- Recent Activity should be a compact list, not a full table.

---

### Page 7: Admin Category Management

**Route:** `/admin/categories`  
**File:** `app/admin/categories/page.tsx`  
**API needed:** `GET/POST/PATCH/DELETE /api/admin/categories`  
**Priority:** 🟢 Low

#### Purpose
Manage product categories (currently hardcoded via SQL seed).

#### Expected Content

**Section 1 — Header**
- Title: "Categories"
- "Add Category" button (primary)

**Section 2 — Category List** (card-based, not table)
- Each category as a card in a `grid md:grid-cols-2 gap-4`:
  - Category name (bold)
  - Description (gray text)
  - Product count badge (number of products in this category)
  - Edit button (pencil icon) → opens inline edit or modal
  - Delete button (trash icon, only if product count = 0) → confirmation modal

**Section 3 — Add/Edit Modal**
- Fields: Name*, Description
- Save / Cancel buttons

#### UI/UX Instructions
- Simple page, minimal complexity.
- Prevent deletion of categories that have products (show error toast).
- After add/edit, refresh the list.

---

## CLIENT-SIDE MISSING PAGES

---

### Page 8: Guest Dashboard (Fix — Real Data)

**Route:** `/guest/dashboard` (exists, needs rewrite)  
**File:** Modify `app/guest/dashboard/page.tsx`  
**API:** `GET /api/bookings/history` (exists)  
**Priority:** 🔴 High

#### Purpose
Replace hardcoded mock data with real booking history from the API.

#### Expected Content Changes

**Remove** the `mockBookings` array entirely.

**On mount:**
1. Check auth (token in localStorage). Redirect to `/guest/login` if missing.
2. Call `GET /api/auth/me` to get fresh user data.
3. Call `GET /api/bookings/history` with the auth token in `Authorization: Bearer <token>` header.

**Booking Cards** — Replace `BookingCard` mock props with real data:
- Each card shows: Booking ID, booking date range, booking type, status badge, payment status badge, total amount, list of item names
- Clickable → navigates to `/booking/confirmation/[id]`

**Add Status Filter Tabs** above the booking list:
- All | Pending | Confirmed | Completed | Cancelled
- Call API with `?status=<filter>` when tab changes

**Add "Cancel Booking" button** on each card where `status = pending`:
- Confirmation modal: "Are you sure you want to cancel this booking?"
- Calls a new `PATCH /api/bookings/[id]/cancel` endpoint (to be built) or `DELETE` if appropriate
- On success: refresh list, show toast

**Empty state** (when no bookings):
- Icon: 📅
- "No bookings yet"
- "Book Now" CTA button linking to `/booking/info`

#### UI/UX Instructions
- Keep the existing `DashboardLayout` wrapper.
- Keep the welcome gradient banner.
- Booking cards should use the same card style as the rest of the site.
- Add pull-to-refresh or a manual refresh button.
- Loading state: show 3 skeleton card placeholders.

---

### Page 9: Guest Profile Page

**Route:** `/guest/profile`  
**File:** `app/guest/profile/page.tsx`  
**API needed:** `PATCH /api/auth/profile` (to be built)  
**Priority:** 🟡 Medium

#### Purpose
Allow guests to view and edit their profile information and change their password.

#### Expected Content

**Section 1 — Profile Header**
- Avatar circle with initials (first letter of first + last name)
- Full name (large, bold)
- Email (gray, read-only)
- Member since date

**Section 2 — Personal Information Card**
- Editable fields: First Name, Last Name, Phone
- Email shown as read-only (grayed out input with lock icon)
- "Save Changes" button (primary)
- Only sends changed fields to API

**Section 3 — Change Password Card**
- Current Password input
- New Password input (min 8 chars)
- Confirm New Password input
- "Change Password" button
- Calls `PATCH /api/auth/profile` with `{ currentPassword, newPassword }`
- Show success toast or inline error

**Section 4 — Booking Stats**
- Total bookings count
- Total amount spent
- Last booking date
- Fetched from `/api/bookings/history?limit=1` (use pagination total for count)

#### UI/UX Instructions
- Use `<Navigation />` and `<Footer />`.
- Wrap content in `DashboardLayout` or a similar centered container (`max-w-2xl mx-auto`).
- Password section visually separated with border and warning-style heading.
- Show/hide toggle on password fields.
- Disable "Save Changes" button when no fields have changed.
- Add link to this page from the guest dashboard (e.g., user icon in nav or a "My Profile" card).

#### API Spec for `PATCH /api/auth/profile`
```
Headers: Authorization: Bearer <token>
Body: { firstName?, lastName?, phone?, currentPassword?, newPassword? }
Response: { user: { id, email, firstName, lastName, phone } }
```
Validation: if `newPassword` is provided, `currentPassword` is required and must match.

---

### Page 10: Guest Booking Cancellation

**Route:** N/A (action on guest dashboard)  
**File:** Modify `app/guest/dashboard/page.tsx` + new API  
**API needed:** `POST /api/bookings/[id]/cancel` (to be built)  
**Priority:** 🔴 High

#### Purpose
Allow guests to cancel their own pending bookings.

#### Expected Content
This is not a standalone page but a feature added to the guest dashboard (Page 8).

**Cancel Button:**
- Shown on each booking card where `status = 'pending'`
- Red outline button: "Cancel Booking"
- On click: open a confirmation modal

**Cancellation Modal:**
- Title: "Cancel Booking #123?"
- Warning text: "This action cannot be undone. Your booking will be cancelled."
- Optional: Cancellation reason textarea
- Two buttons: "Keep Booking" (secondary) | "Yes, Cancel" (danger)

**After cancellation:**
- Close modal
- Show success toast: "Booking #123 has been cancelled"
- Refresh booking list
- The cancelled booking should now show a `Cancelled` status badge and no cancel button

#### API Spec for `POST /api/bookings/[id]/cancel`
```
Headers: Authorization: Bearer <token>
Body: { reason?: string }
Validation:
  - User must own the booking (user_id matches token)
  - Booking status must be 'pending' (only pending bookings can be cancelled by guests)
Response: { message: 'Booking cancelled', booking_id: number }
```

#### UI/UX Instructions
- The cancel button should be visually de-emphasized (outline/ghost style, not filled red) to avoid accidental clicks.
- The confirmation modal should require an explicit click — no keyboard shortcuts to confirm.
- After cancellation, optionally send a cancellation email to the guest (reuse email infrastructure).

---

### Page 11: Guest Booking Detail / Confirmation Page (Enhancement)

**Route:** `/booking/confirmation/[id]` (exists, needs enhancement)  
**File:** Modify `app/booking/confirmation/[id]/page.tsx`  
**API:** `GET /api/bookings/[id]` (exists)  
**Priority:** 🟡 Medium

#### Purpose
Enhance the existing confirmation page to serve as a full booking detail view accessible from the guest dashboard.

#### Expected Enhancements

**Add QR Code Display:**
- Use the `qr_code_hash` field from the booking
- Render as a QR code image using a library like `qrcode.react` or `next-qrcode`
- Display below the booking summary
- Label: "Show this QR code at check-in"
- Add a "Download QR" button that saves the QR as a PNG

**Add Status Timeline:**
- Visual timeline showing booking lifecycle:
  - Created → Confirmed → Checked In → Checked Out → Completed
  - Highlight the current step, gray out future steps
  - Show timestamps for completed steps

**Add Cancel Button:**
- Same cancel functionality as described in Page 10
- Only visible when `status = 'pending'`

**Add Print/Share:**
- "Print Booking" button → triggers `window.print()` with a print-friendly stylesheet
- "Share" button → copies booking URL to clipboard

#### UI/UX Instructions
- QR code should be centered, approximately 200×200px, inside a white card with padding.
- Timeline should be horizontal on desktop, vertical on mobile.
- Use step indicators: filled circle (completed), pulsing circle (current), empty circle (future).

---

## SIDEBAR NAVIGATION UPDATE

### File: `app/admin/layout.tsx`

Add new navigation items to the sidebar `navigation` array:

```
Current:
  Dashboard, Bookings, Products, Staff, Audit Logs

Updated:
  Dashboard, Bookings, Products, Guests, Staff, Reports, Audit Logs, Categories
```

Suggested icons:
- Guests: 👤
- Reports: 📈
- Categories: 🏷️

Only add items as the corresponding pages are built. Do not add dead links.

---

## SUMMARY TABLE

| # | Page | Route | Type | Priority | New API Needed? |
|---|------|-------|------|----------|----------------|
| 1 | Admin Booking Detail | `/admin/bookings/[id]` | Admin | 🔴 High | No |
| 2 | Admin Booking Creation | `/admin/bookings/new` | Admin | 🔴 High | No |
| 3 | Admin Guest Management | `/admin/guests` | Admin | 🟡 Medium | Yes |
| 4 | Admin Reports | `/admin/reports` | Admin | 🟡 Medium | Yes |
| 5 | Admin Staff Edit Modal | Modal on `/admin/staff` | Admin | 🟡 Medium | No |
| 6 | Admin Dashboard Enhancement | `/admin/dashboard` | Admin | 🟡 Medium | Yes |
| 7 | Admin Category Management | `/admin/categories` | Admin | 🟢 Low | Yes |
| 8 | Guest Dashboard (Fix) | `/guest/dashboard` | Client | 🔴 High | No |
| 9 | Guest Profile | `/guest/profile` | Client | 🟡 Medium | Yes |
| 10 | Guest Booking Cancellation | Action on dashboard | Client | 🔴 High | Yes |
| 11 | Guest Booking Detail Enhancement | `/booking/confirmation/[id]` | Client | 🟡 Medium | No |

**Total: 11 pages/features**  
- 4 require no new API (backend already exists)  
- 7 require new API endpoints  
- 4 are high priority  
- 5 are medium priority  
- 2 are low priority
