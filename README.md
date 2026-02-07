# AlFarm Resort and Adventure Park

A full-stack resort management system with a beautiful public website built with Next.js, React, TypeScript, Tailwind CSS, and PostgreSQL.

> **Version:** 1.1 (Phase 3.5 - Deployment & Operations Hardening)  
> **Last Updated:** January 2026

![AlFarm Resort Logo](public/logo.png)

## 🌟 Features

### Public Website
- ✅ Beautiful, responsive design matching the AlFarm brand
- ✅ Home page with hero section and features
- ✅ About page with resort information
- ✅ Accommodations page with room types and pricing
- ✅ Activities page showcasing all adventures
- ✅ Photo gallery
- ✅ Contact page with inquiry form
- ✅ Mobile-responsive navigation

### Guest Features
- ✅ User registration and authentication (JWT-based)
- ✅ Shadow account claiming (link bookings made as guest)
- ✅ Personal dashboard
- ✅ Browse available rooms and pricing
- ✅ Check availability with real-time filtering (Day-use/Overnight)
- ✅ Availability selection with real-time remaining inventory (`/api/availability`)
- ✅ Cart system with live price estimation (persisted during booking flow)
- ✅ Step-based checkout flow: Select → Details → Payment → Confirmation
- ✅ View booking history API
- 🚧 Manage profile (to be implemented)

### Admin Features
- ✅ Secure admin login (role-based: admin/root)
- ✅ Admin dashboard with statistics (protected routes)
- ✅ Manage bookings API (CRUD operations)
- 🚧 Manage rooms (UI ready, backend API to be implemented)
- 🚧 Manage amenities (UI ready, backend API to be implemented)
- 🚧 View guest information (UI ready, backend API to be implemented)

### Email Notifications
- ✅ Booking confirmation emails (Mailtrap/SMTP)
- ✅ Booking status update emails

### Security & Hardening
- ✅ **Rate limiting** on public APIs (prevents abuse)
- ✅ **Row-level locking** (prevents overselling via `SELECT ... FOR UPDATE`)
- ✅ **Zod validation** (comprehensive input validation)
- ✅ **Standardized error responses** (consistent JSON error format)
- ✅ **JWT secret enforcement** (required in production, warning in dev)
- ✅ **bcrypt password hashing** (cost factor 10)
- ✅ **RBAC permission system** (role-based access control)
- ✅ **Audit logging** (tracks all admin actions)
- ✅ **Docker deployment** (production-ready containerization)

### Deployment
- ✅ **Docker & Docker Compose** for production deployment
- ✅ **PostgreSQL** with persistent volumes
- ✅ **Database backup/restore scripts**
- ✅ **Environment variable templates**
- 📖 See [Deployment Guide](docs/deployment-droplet-docker.md) for full instructions

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS with custom AlFarm theme
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL
- **Authentication**: JWT with bcryptjs
- **Validation**: Zod schemas
- **Email**: Nodemailer with Mailtrap (SMTP)
- **Icons**: React Icons

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js 18+ ([Download](https://nodejs.org/))
- PostgreSQL 12+ ([Download](https://www.postgresql.org/download/))
- npm or yarn package manager

## 🚀 Installation & Setup

### 1. Install Dependencies

```bash
cd alfarm
npm install
```

### 2. Setup PostgreSQL Database

#### Option A: Using psql command line

```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE alfarm_resort;

# Connect to the database
\c alfarm_resort

# Exit psql
\q

# Import the schema
psql -U postgres -d alfarm_resort -f database/schema.sql
```

#### Option B: Using pgAdmin

1. Open pgAdmin
2. Create a new database named `alfarm_resort`
3. Open the Query Tool for the new database
4. Copy and paste the contents of `database/schema.sql`
5. Execute the script

### 3. Create Admin User with Correct Password

The database schema includes a placeholder admin user with an **invalid password hash**. You need to generate a proper hash and update the database:

```bash
# Generate a valid password hash
node scripts/generate-admin-hash.js
```

This will output a hash for the password `admin123`. Copy the entire INSERT statement from the output and run it in your PostgreSQL database to replace the placeholder admin user.

**Note**: The admin user in `schema.sql` has a dummy hash that won't work for login. This step is required.

### 4. Setup Public Assets

Create a `public` folder in the project root and add your logo:

```bash
mkdir public
# Add your logo.png file to the public folder (recommended size: 512x512px)
```

If you don't have a logo, you can download a placeholder or the app will show a broken image icon.

### 5. Configure Environment Variables

Create a new file named `.env.local` in the project root with your PostgreSQL credentials:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=alfarm_resort

# JWT Secret (REQUIRED in production - app will not start without it!)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Email Configuration (Mailtrap for testing)
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_username
SMTP_PASS=your_mailtrap_password
SMTP_FROM=noreply@alfarm.com

# Application
NEXT_PUBLIC_APP_NAME=AlFarm Resort and Adventure Park
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔐 Default Login Credentials

### Admin/Root Access
- **URL**: http://localhost:3000/admin/login
- **Email**: `admin@alfarm.com`
- **Password**: `admin123`

### Guest Access
- **URL**: http://localhost:3000/guest/register
- Create a new account to access guest features

## 📁 Project Structure

```
alfarm/
├── app/                          # Next.js app directory
│   ├── (public pages)/
│   │   ├── page.tsx             # Home page
│   │   ├── about/               # About page
│   │   ├── rooms/               # Accommodations
│   │   ├── activities/          # Activities
│   │   ├── gallery/             # Photo gallery
│   │   └── contact/             # Contact page
│   ├── admin/                   # Admin section
│   │   ├── login/              # Admin login
│   │   └── dashboard/          # Admin dashboard
│   ├── guest/                   # Guest section
│   │   ├── login/              # Guest login
│   │   ├── register/           # Guest registration
│   │   └── dashboard/          # Guest dashboard
│   ├── booking/                 # Booking flow
│   │   ├── info/               # Guest info collection
│   │   ├── results/            # Availability selection
│   │   ├── checkout/           # Demo payment + final booking submission
│   │   └── confirmation/[id]/  # Confirmation screen
│   ├── api/                     # API routes
│   │   └── auth/               # Authentication endpoints
│   ├── globals.css             # Global styles
│   └── layout.tsx              # Root layout
├── components/
│   ├── ui/                     # UI components
│   ├── BookingStepper.tsx      # Booking flow stepper
│   ├── Navigation.tsx          # Main navigation
│   └── Footer.tsx              # Footer component
├── database/
│   └── schema.sql              # PostgreSQL schema
├── lib/
│   ├── db.ts                   # Database connection
│   ├── auth.ts                 # Authentication utilities
│   ├── AuthContext.tsx         # React auth context provider
│   ├── BookingContext.tsx      # Booking flow state (sessionStorage-backed)
│   ├── authMiddleware.ts       # API route auth middleware
│   └── email.ts                # Email service (Nodemailer)
├── public/
│   └── logo.png                # AlFarm logo
├── scripts/
│   └── generate-admin-hash.js  # Password hash generator
├── types/
│   └── index.ts                # TypeScript types
└── ...config files
```

## 🎨 Design Theme

The website uses AlFarm's brand colors:
- **Primary Blue**: #4A90A4 (from the logo's water element)
- **Secondary Green**: #6FB96F (from the logo's nature element)
- **Accent Navy**: #2C3E50 (from the logo's dark elements)

## 🔧 Database Schema

### Tables
- **users** - User accounts with `is_active` flag for enable/disable
- **categories** - Product categories (Accommodation, Entrance, Rental, etc.)
- **products** - Unified inventory (Rooms, Cottages, Fees, Equipment)
- **bookings** - Guest reservations with check-in/out tracking
- **booking_items** - Line items for each booking (linking products to bookings)
- **audit_logs** - Tracks all admin actions with metadata

### User Roles & Permissions
Roles are stored in `users.role` column. Permissions are defined in `lib/permissions.ts`:

| Role | Description | Key Permissions |
|------|-------------|----------------|
| `guest` | Public customers | Default for registrations |
| `cashier` | Front desk staff | bookings:*, payments:collect, check-in/out |
| `super_admin` | Full administrator | All permissions including staff:manage, audit:read |
| `admin`/`root` | Legacy admin roles | Full admin access |

> **Note**: Registration always creates `guest` accounts. Staff accounts are created via `/admin/staff` (super_admin only).

## 📝 API Endpoints

### Authentication
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/login` | POST | ❌ | User login (returns JWT). Body: `{email, password, role}` |
| `/api/auth/register` | POST | ❌ | User registration (supports shadow account claiming) |
| `/api/auth/me` | GET | ✅ | Get current user from token |

### Products & Inventory
| Endpoint | Method | Auth | Rate Limit | Description |
|----------|--------|------|------------|-------------|
| `/api/products` | GET | ❌ | - | Get all products (filter by category) |
| `/api/availability` | GET | ❌ | 60/min | Check availability for dates (Zod validated) |

### Guest Bookings
| Endpoint | Method | Auth | Rate Limit | Description |
|----------|--------|------|------------|-------------|
| `/api/bookings` | POST | ❌ | 10/min | Create reservation (row-level locking, Zod validated) |
| `/api/bookings/history` | GET | ✅ | - | Get authenticated user's booking history |

## 🧭 Direct Booking Flow (UI)

The booking flow is a multi-step process powered by a global booking state store (`BookingContext`) persisted in `sessionStorage`:

- `GET /` (Home) - choose booking type, dates, and guests
- `GET /booking/results` - select items and see remaining inventory
- `GET /booking/info` - enter guest details (auto-fill available if logged in)
- `GET /booking/checkout` - demo payment + final review, then submits `POST /api/bookings`
- `GET /booking/confirmation/[id]` - confirmation screen

**Important:** checkout totals include entrance fees pulled from the database. Ensure the schema seed data for the `Entrance Fee` category exists (Adult/Kid for Day/Night).

### Admin Bookings (Protected - requires admin/root role)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/admin/bookings` | GET | ✅ Admin | List all bookings with filters |
| `/api/admin/bookings` | POST | ✅ Admin | Create booking on behalf of guest |
| `/api/admin/bookings/[id]` | GET | ✅ Admin | Get single booking details |
| `/api/admin/bookings/[id]` | PATCH | ✅ Admin | Update booking status/payment |
| `/api/admin/bookings/[id]` | DELETE | ✅ Admin | Cancel booking (super_admin only) |
| `/api/admin/bookings/[id]/checkin` | POST | ✅ Admin | Check-in guest |
| `/api/admin/bookings/[id]/checkout` | POST | ✅ Admin | Check-out guest |
| `/api/admin/bookings/[id]/payment` | PATCH | ✅ Admin | Collect/void/refund payment |

### Staff Management (Protected - requires super_admin)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/admin/staff` | GET | ✅ super_admin | List all staff users |
| `/api/admin/staff` | POST | ✅ super_admin | Create new staff user |
| `/api/admin/staff/[id]` | GET | ✅ super_admin | Get staff user details |
| `/api/admin/staff/[id]` | PATCH | ✅ super_admin | Update staff (role, active, password) |

### Audit Logs (Protected - requires super_admin)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/admin/audit` | GET | ✅ super_admin | Query audit logs with filters |


## 🚧 Features to Implement

- [x] ~~Complete booking checkout (guest details & submission)~~
- [x] ~~Email notifications~~
- [x] ~~Rate limiting on public APIs~~
- [x] ~~Row-level locking (prevent overselling)~~
- [x] ~~Zod validation on all endpoints~~
- [x] ~~Standardized error responses~~
- [x] ~~JWT secret production enforcement~~
- [x] ~~RBAC permission system~~
- [x] ~~Audit logging~~
- [x] ~~Staff management~~
- [x] ~~Check-in/Check-out operations~~
- [x] ~~Docker deployment~~
- [x] ~~Database backup/restore scripts~~
- [ ] Payment integration (GCash, PayMaya, etc.)
- [ ] Image upload for rooms and gallery
- [ ] Reviews and ratings
- [ ] Search and filter functionality (Expanded)
- [ ] Admin reports and analytics
- [ ] Guest profile management
- [ ] Multi-language support
- [ ] QR code for booking check-in
- [ ] Redis-backed rate limiting (for distributed deployments)

## 🐛 Troubleshooting

### Cannot connect to database
- Verify PostgreSQL is running:
  - Linux/Mac: `sudo service postgresql status`
  - Windows: Check Services or run `pg_ctl status -D "C:\Program Files\PostgreSQL\[version]\data"`
- Check credentials in `.env.local`
- Ensure database `alfarm_resort` exists
- Verify `.env.local` file is in the project root (not in a subdirectory)

### Module not found errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### Port 3000 already in use
```bash
# Use a different port
npm run dev -- -p 3001
```

### Admin login not working
- Ensure you've run `node scripts/generate-admin-hash.js` and inserted the admin user
- The placeholder admin in schema.sql has an invalid hash - you MUST regenerate it
- Verify the email is `admin@alfarm.com` and password is `admin123`
- **Important:** Login requires POST with body `{"email", "password", "role": "admin"}`
- Check database connection and that `.env.local` is configured correctly
- Check browser console for error messages

### Getting 429 Too Many Requests
- Rate limiting is enabled on public APIs
- `/api/availability`: 60 requests per minute
- `/api/bookings`: 10 requests per minute
- Wait for the rate limit window to reset (check `Retry-After` header)

### JWT_SECRET warning in console
- Set `JWT_SECRET` in `.env.local` to suppress the warning
- In production (`NODE_ENV=production`), the app will **not start** without `JWT_SECRET`

### Checkout shows missing entrance fees
- Ensure your database has `Entrance Fee` products seeded (Adult/Kid for Day/Night)
- Re-run the schema seed (`database/schema.sql`) or insert the missing products manually

## � Security

### Production Requirements

| Requirement | Description |
|-------------|-------------|
| `JWT_SECRET` | **Required** - App throws fatal error if missing in production |
| `NODE_ENV=production` | Enables production security checks |
| Strong passwords | Use bcrypt-hashed passwords (cost factor 10) |

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/availability` | 60 requests | 1 minute |
| `/api/bookings` | 10 requests | 1 minute |

### Concurrency Protection

The booking system uses PostgreSQL row-level locking (`SELECT ... FOR UPDATE`) to prevent:
- Overselling inventory during concurrent bookings
- Race conditions when multiple users book the same product

### Input Validation

All API endpoints use Zod schemas for comprehensive input validation:
- Type checking
- Format validation (dates, emails, etc.)
- Business rule enforcement (check-out after check-in, etc.)

### Error Response Format

All errors follow a standardized JSON format:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [...]
  }
}
```

Error codes: `VALIDATION_ERROR`, `AUTHENTICATION_REQUIRED`, `UNAUTHORIZED`, `NOT_FOUND`, `CONFLICT`, `INSUFFICIENT_INVENTORY`, `RATE_LIMIT_EXCEEDED`, `INTERNAL_ERROR`

## �� Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Production Environment Variables

```env
# Required
JWT_SECRET=<generate-secure-random-value>
NODE_ENV=production

# Database
DB_HOST=your-production-db-host
DB_PORT=5432
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=alfarm_resort

# Email (production SMTP)
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@alfarm.com
```

## 🌐 Deployment

### Vercel (Recommended for Next.js)
1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Database Hosting
- **Supabase** (PostgreSQL hosting)
- **Railway** (PostgreSQL + App hosting)
- **Heroku** (PostgreSQL addon)
- **AWS RDS** (PostgreSQL)

## 📄 License

MIT License - feel free to use this project for your own purposes.

## 🤝 Support

For questions or issues:
- Check the troubleshooting section
- Review the code comments
- Create an issue in the repository

## 🎉 Credits

Built with ❤️ for AlFarm Resort and Adventure Park

---

**Happy Coding! 🚀**
