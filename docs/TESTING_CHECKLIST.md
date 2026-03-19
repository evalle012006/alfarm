# AlFarm Resort — Testing Checklist

> Comprehensive manual testing guide covering all client-facing and admin features.
> Test each item on **desktop (1280px+)** and **mobile (375px)**. Verify **dark mode** where indicated.

---

## Prerequisites

### Database Migrations
Run these before testing:
```sql
-- From database/migrations/
004_add_performance_indexes.sql
005_add_is_shadow_column.sql
```

### Test Accounts
| Role | Email | Notes |
|------|-------|-------|
| Super Admin | *(your admin account)* | Has all permissions (`*`) |
| Cashier | *(create via Staff page)* | Limited permissions |
| Guest | *(register a new one)* | Standard guest account |

### Environment
- [ ] `.env` file has valid `DATABASE_URL`, `JWT_SECRET`, `SMTP_*` values
- [ ] `npm run dev` starts without build errors
- [ ] Database is seeded with products and categories

---

## A. Public Pages (No Auth Required)

### A1. Homepage (`/`)
- [ ] Page loads with hero section, featured products, and CTAs
- [ ] "Book Now" buttons link to `/booking/info`
- [ ] Navigation links work (About, Activities, Rooms, Gallery, Contact)
- [ ] Mobile: hamburger menu opens and closes correctly
- [ ] Dark mode: text and backgrounds render correctly

### A2. About Page (`/about`)
- [ ] Page loads with content and images
- [ ] Responsive layout on mobile

### A3. Activities Page (`/activities`)
- [ ] Page loads with activity listings
- [ ] Responsive layout on mobile

### A4. Rooms Page (`/rooms`)
- [ ] Page loads with room/accommodation listings
- [ ] Responsive layout on mobile

### A5. Gallery Page (`/gallery`)
- [ ] Page loads with image grid
- [ ] Images are responsive and don't overflow

### A6. Contact Page (`/contact`)
- [ ] Page loads with contact form and/or info
- [ ] Responsive layout on mobile

---

## B. Guest Booking Flow

### B1. Booking Info (`/booking/info`)
- [ ] Date picker works; can select check-in date
- [ ] Booking type toggle (Day Use / Overnight) works
- [ ] Overnight shows check-out date picker
- [ ] Day use shows time slot selector (Day / Night)
- [ ] "Check Availability" button navigates to results

### B2. Booking Results (`/booking/results`)
- [ ] Available products load based on selected dates/type
- [ ] Products show name, price, category, availability count
- [ ] Can add/remove products with quantity selectors
- [ ] Unavailable products are visually disabled
- [ ] Order summary updates in real-time (subtotals, total)
- [ ] "Proceed to Checkout" button works when items selected
- [ ] Error shown when no items selected

### B3. Checkout (`/booking/checkout`)
- [ ] Guest info form displays (name, email, phone)
- [ ] Form validation: required fields highlighted on submit
- [ ] Order summary with items, quantities, and total
- [ ] Special requests text area works
- [ ] Payment method selector works (Cash, GCash, PayMaya)
- [ ] Submit creates booking and redirects to success page
- [ ] Loading spinner shown during submission
- [ ] Error toast on API failure

### B4. Booking Success (`/booking/success/[id]`)
- [ ] Confirmation message displays with booking ID
- [ ] Booking details summary shown
- [ ] "View Booking" / "Go to Dashboard" links work

### B5. Booking Confirmation (`/booking/confirmation/[id]`)
- [ ] Booking details load (guest info, items, dates, amounts)
- [ ] **Status Timeline** displays correctly for non-cancelled bookings
- [ ] Timeline highlights current step
- [ ] **QR Code Hash** displays if present
- [ ] **Print button** opens print dialog (`window.print()`)
- [ ] **Cancel button** appears only for `pending` bookings
- [ ] Cancel confirmation dialog appears with reason field
- [ ] Successful cancellation updates status to "cancelled"
- [ ] Cancellation toast notification appears
- [ ] Cancelled bookings show "Booking Cancelled" heading (no timeline)
- [ ] **Rate limiting**: rapidly clicking cancel shows 429 error after 5 attempts

---

## C. Guest Authentication

### C1. Guest Registration (`/guest/register`)
- [ ] Form renders with all fields (first name, last name, email, phone, password, confirm)
- [ ] Validation: password mismatch shows error
- [ ] Validation: password < 8 chars shows error
- [ ] Validation: required fields enforced
- [ ] Successful registration redirects to `/guest/dashboard`
- [ ] **Shadow account claim**: registering with an email that was used for guest checkout shows "Account claimed!" message
- [ ] Already authenticated users are redirected to dashboard

### C2. Guest Login (`/guest/login`)
- [ ] Form renders with email and password fields
- [ ] Invalid credentials show error message
- [ ] Successful login redirects to `/guest/dashboard`
- [ ] Already authenticated users are redirected to dashboard
- [ ] Link to register page works

### C3. Token Expiry Handling
- [ ] After token expires, switching browser tabs triggers auto-logout
- [ ] User is redirected to `/login` with session expired indicator
- [ ] API calls with expired token return 401 (not generic error)

---

## D. Guest Dashboard & Profile

### D1. Guest Dashboard (`/guest/dashboard`)
- [ ] Requires authentication; unauthenticated users redirected to login
- [ ] Welcome banner shows user's name
- [ ] **Status filter tabs** work (All, Pending, Confirmed, Completed, Cancelled)
- [ ] Booking cards display with correct status badges, dates, amounts
- [ ] **Empty state**: "No bookings yet" with "Book Now" button linking to `/booking/info`
- [ ] **Cancel booking**: cancel button on pending bookings opens modal with reason field
- [ ] Cancel confirmation works; booking card updates to cancelled
- [ ] Refresh button reloads bookings
- [ ] Loading skeleton shows while data fetches
- [ ] Mobile: cards stack vertically, filter tabs scroll horizontally

### D2. Guest Profile (`/guest/profile`)
- [ ] Requires authentication
- [ ] Personal info form pre-filled with current user data
- [ ] Can update first name, last name, phone
- [ ] Save button disabled when no changes made
- [ ] Success toast on profile update
- [ ] **Password change section**: current password, new password, confirm
- [ ] Validation: new passwords must match
- [ ] Success toast on password change; fields clear
- [ ] Error toast on wrong current password
- [ ] Booking stats display (total bookings, total spent, last booking date)
- [ ] Logout button logs out and redirects to login

---

## E. Admin Authentication

### E1. Admin Login (`/admin/login`)
- [ ] Form renders with email and password
- [ ] Invalid credentials show error
- [ ] Guest account credentials show "Invalid credentials" (not "Please use admin login")
- [ ] Successful login redirects to `/admin/dashboard`
- [ ] Cookie-based auth (httpOnly cookie set by server)

### E2. Admin Layout
- [ ] Sidebar shows all navigation links: Dashboard, Bookings, Guests, Products, Categories, Reports, Staff, Audit Logs
- [ ] Active page highlighted in sidebar
- [ ] User info (name, email, avatar initial) in sidebar footer
- [ ] Logout button works; redirects to `/admin/login`
- [ ] "Back to Site" link navigates to `/`
- [ ] **Dark mode toggle** in header switches theme
- [ ] Dark mode preference persists in `localStorage` across page reloads
- [ ] **Breadcrumbs** appear on nested pages (e.g., `/admin/bookings/123`)
- [ ] Breadcrumbs show correct hierarchy with clickable links
- [ ] **Keyboard shortcut** `Ctrl+K` / `Cmd+K` focuses search input (on pages with search)
- [ ] **Keyboard shortcut** `N` navigates to new booking (on bookings list page)
- [ ] **Error boundary**: if a page crashes, friendly error card with "Try Again" shows instead of blank page
- [ ] Mobile: hamburger menu opens/closes sidebar
- [ ] Mobile: sidebar backdrop closes sidebar on tap
- [ ] Date display hidden on small screens (`hidden sm:block`)

---

## F. Admin Dashboard (`/admin/dashboard`)

- [ ] Stat cards display: Total Bookings, Confirmed, Revenue, Today's Revenue
- [ ] Quick action cards: New Booking, View Bookings
- [ ] Today's Arrivals table loads with correct data
- [ ] Recent Activity section shows latest audit log entries
- [ ] Loading spinner while data fetches
- [ ] Empty states for no arrivals / no activity

---

## G. Admin Bookings

### G1. Bookings List (`/admin/bookings`)
- [ ] Table loads with bookings data
- [ ] **TableSkeleton** shows animated skeleton rows while loading (not a spinner)
- [ ] **Clickable Booking IDs**: ID column links to `/admin/bookings/[id]`
- [ ] IDs show short uppercase format (e.g., `#A1B2C3`)
- [ ] **"Create New" button** in header links to `/admin/bookings/new`
- [ ] **Search**: debounced search by name, email, phone, ID
- [ ] **Status filter**: dropdown filters by booking status
- [ ] **Date filter**: date picker filters by booking date
- [ ] Filters reset page to 1
- [ ] **Pagination** works (next/prev, page numbers)
- [ ] **View link** navigates to booking detail page
- [ ] **Edit button** opens inline edit modal
- [ ] Edit modal: can change status, payment status, payment method, guest info, dates, notes
- [ ] Edit confirmation dialog appears before saving
- [ ] Successful edit shows updated data; error shows error message
- [ ] Mobile: table scrolls horizontally

### G2. Booking Detail (`/admin/bookings/[id]`)
- [ ] **Breadcrumbs** show: Dashboard > Bookings > #ABC123
- [ ] Header shows booking ID, status badges, action buttons
- [ ] Guest info section: name, email, phone, QR hash
- [ ] Booking details: dates, type, time, created date
- [ ] **Booked items table**: product name, category, qty, unit price, subtotal
- [ ] **Payment card**: total amount, payment status, payment method
- [ ] Payment card actions: void, refund (with ConfirmDialog, not `confirm()`)
- [ ] **Special requests** section (if present)
- [ ] **Staff notes**: editable text area with save button
- [ ] **Audit trail**: collapsible timeline of all changes
- [ ] **Actions**: Check In, Check Out, Cancel (with ConfirmDialog)
- [ ] **Edit button** opens edit modal
- [ ] Back to Bookings link works
- [ ] Loading state with spinner while fetching
- [ ] 404: redirects to bookings list with toast if booking not found

### G3. New Booking (`/admin/bookings/new`)
- [ ] **Guest info form**: first name, last name, email, phone (all required)
- [ ] **Booking details**: type toggle (Day/Overnight), date pickers, time slot
- [ ] Overnight: check-out date appears
- [ ] **Product selection**: grouped by category, collapsible sections
- [ ] Availability check runs automatically on date/type change
- [ ] Quantity selectors respect available inventory
- [ ] Unavailable products disabled
- [ ] **Order summary** (right column): selected items, subtotals, total
- [ ] **Status/Payment selectors**: status, payment status, payment method
- [ ] **Special requests** text area
- [ ] **Validation**: error toasts for missing guest info or no products
- [ ] **Confirm modal** before final submission
- [ ] Successful creation redirects to booking detail page with toast
- [ ] Mobile: summary collapses below form (responsive grid)

---

## H. Admin Guests (`/admin/guests`)

- [ ] Guest table loads with: name, email, phone, bookings count, total spent, joined date
- [ ] **Shadow badge**: shadow accounts show "Shadow" badge, registered show "Registered"
- [ ] **Search**: debounced search by name, email, phone
- [ ] **Sort**: newest, alphabetical, most bookings
- [ ] **Pagination** works
- [ ] **Click guest row**: opens detail modal
- [ ] Detail modal: guest info, stats (bookings, total spent, last stay), booking history table
- [ ] Booking history entries link to booking detail page
- [ ] "View All Activity" button navigates to bookings filtered by guest email
- [ ] Mobile: table scrolls horizontally

---

## I. Admin Products (`/admin/products`)

- [ ] Products table loads with real data from API
- [ ] **Search**: debounced search by product name
- [ ] **Category filter**: dropdown populated from categories API
- [ ] **Pagination** works
- [ ] **"New Product" button** opens create modal
- [ ] **Create modal**: name, category (dynamic dropdown), description, capacity, price, pricing unit, time slot, inventory, image URL, active toggle
- [ ] Validation: product name required
- [ ] Success toast on create; table refreshes
- [ ] **Edit**: click product row opens pre-filled edit modal
- [ ] Success toast on update; table refreshes
- [ ] **Deactivate** (delete): ConfirmDialog appears (not `confirm()`)
- [ ] Products with active bookings **cannot** be deactivated (error toast with count)
- [ ] Success toast on deactivation; table refreshes
- [ ] Active/inactive status shown with badge
- [ ] Mobile: table scrolls horizontally

---

## J. Admin Categories (`/admin/categories`)

- [ ] Categories grid loads with name, description, product count
- [ ] **"New Category" button** opens create modal
- [ ] Create modal: name (required), description
- [ ] Duplicate category name shows error (409 conflict)
- [ ] Success toast on create; grid refreshes
- [ ] Empty state displayed when no categories exist
- [ ] Loading state with spinner

---

## K. Admin Reports (`/admin/reports`)

- [ ] Page loads with date range selector (7, 30, 90, 365 days)
- [ ] **Summary cards**: total bookings, cancelled, total revenue, avg booking value, unique guests
- [ ] **Daily revenue chart**: bar chart with correct scaling
- [ ] **Booking status breakdown**: colored bars with counts
- [ ] **Payment methods**: method name, count, total
- [ ] **Top products**: product name, category, times booked, revenue
- [ ] Changing date range refreshes all data
- [ ] Loading state while fetching
- [ ] Error toast on API failure

---

## L. Admin Staff (`/admin/staff`)

- [ ] Staff table loads with: name, email, role, status, created date
- [ ] **"Add Staff" button** opens create modal
- [ ] Create modal: first name, last name, email, password (min 8), role, phone
- [ ] Mobile: form fields stack to single column (`grid-cols-1 sm:grid-cols-2`)
- [ ] Success toast on create
- [ ] **Edit staff**: opens edit modal with pre-filled data
- [ ] Can update name, phone, role
- [ ] **Password reset section**: new password + confirm (mobile-responsive grid)
- [ ] **Enable/Disable toggle** for staff accounts
- [ ] RBAC: only users with `staff:manage` permission see management options

---

## M. Admin Audit Logs (`/admin/audit`)

- [ ] Audit log table loads with: timestamp, actor, action, entity, details
- [ ] **Filters**: action type, entity type, actor email
- [ ] **Pagination** works
- [ ] Action entries are color-coded (green for check-in, red for cancel, blue for create)
- [ ] Expandable metadata/details for each entry
- [ ] Access denied page shown for users without `audit:read` permission

---

## N. Cross-Cutting Concerns

### N1. Error Handling
- [ ] All API error responses follow format: `{ error: { code, message, details? } }`
- [ ] No raw stack traces exposed in production (`handleUnexpectedError`)
- [ ] Toast notifications show on API errors (not silent failures)
- [ ] Error boundary catches render errors in admin pages

### N2. Authentication & Security
- [ ] Admin routes return 401/403 for unauthenticated/unauthorized requests
- [ ] Guest API routes require valid JWT Bearer token
- [ ] Admin API routes require valid httpOnly cookie
- [ ] RBAC permissions enforced on all admin API routes
- [ ] Rate limiting on booking creation and cancellation APIs
- [ ] Search inputs sanitized (trimmed, max 200 chars)

### N3. Dark Mode
- [ ] Admin: toggle button in header switches between light/dark
- [ ] All admin pages render correctly in dark mode (no white-on-white or black-on-black text)
- [ ] Preference persists in `localStorage` (`admin_theme`)
- [ ] Falls back to system preference if no stored value
- [ ] Guest pages: respect system `prefers-color-scheme`

### N4. Mobile Responsiveness
- [ ] Admin sidebar collapses to hamburger menu on mobile
- [ ] All admin tables have `overflow-x-auto` for horizontal scroll
- [ ] Staff create/edit modals: form grids collapse to single column on mobile
- [ ] Admin booking creation: right-column summary collapses below on mobile
- [ ] Guest dashboard: booking cards stack vertically
- [ ] Booking flow pages: forms are usable on 375px width

### N5. Pagination
- [ ] All paginated APIs accept both `limit/offset` and `page/per_page`
- [ ] Response always includes: `{ pagination: { total, page, perPage, totalPages, hasMore } }`
- [ ] Frontend pagination component shows correct page numbers
- [ ] Page resets to 1 when filters change

### N6. Email Notifications
- [ ] Booking confirmation email sent on booking creation
- [ ] Cancellation email sent when guest cancels (check Mailtrap inbox)
- [ ] Status update email sent on admin status changes
- [ ] Emails don't block the API response (fire-and-forget)

---

## O. Database Migrations

### O1. Migration 004 — Performance Indexes
- [ ] Run `004_add_performance_indexes.sql` without errors
- [ ] Verify indexes exist: `idx_users_name`, `idx_users_email`, `idx_bookings_date_status`, `idx_audit_entity`, `idx_bookings_user`

### O2. Migration 005 — Shadow Account Column
- [ ] Run `005_add_is_shadow_column.sql` without errors
- [ ] Existing shadow accounts have `is_shadow = TRUE`
- [ ] Guests API returns `isShadow` field correctly
- [ ] New guest registrations have `is_shadow = FALSE`

---

## Test Completion Sign-Off

| Section | Tester | Date | Pass/Fail | Notes |
|---------|--------|------|-----------|-------|
| A. Public Pages | | | | |
| B. Booking Flow | | | | |
| C. Guest Auth | | | | |
| D. Guest Dashboard | | | | |
| E. Admin Auth | | | | |
| F. Admin Dashboard | | | | |
| G. Admin Bookings | | | | |
| H. Admin Guests | | | | |
| I. Admin Products | | | | |
| J. Admin Categories | | | | |
| K. Admin Reports | | | | |
| L. Admin Staff | | | | |
| M. Admin Audit Logs | | | | |
| N. Cross-Cutting | | | | |
| O. DB Migrations | | | | |
