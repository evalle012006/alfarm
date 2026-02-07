# 🚀 AlFarm Resort - Quick Start Guide

Get up and running in 10 minutes!

> **Last Updated:** January 2026  
> **Version:** 1.1 (Phase 3.5 - Deployment & Operations Hardening)

## Prerequisites Check

- [ ] Node.js 18+ installed
- [ ] PostgreSQL 12+ installed and running
- [ ] Terminal/Command Prompt open

## Step-by-Step Setup

### 1️⃣ Install Dependencies (2 minutes)

```bash
cd alfarm
npm install
```

Wait for all packages to install...

### 2️⃣ Setup PostgreSQL Database (3 minutes)

Open your PostgreSQL client (psql or pgAdmin) and run:

```sql
CREATE DATABASE alfarm_resort;
```

Then import the schema:

**Using psql:**
```bash
psql -U postgres -d alfarm_resort -f database/schema.sql
```

**Using pgAdmin:**
- Open Query Tool
- Load `database/schema.sql`
- Execute

### 3️⃣ Create Admin User (2 minutes)

The database schema includes a placeholder admin user with an **invalid password hash**. Generate a valid one:

```bash
node scripts/generate-admin-hash.js
```

Copy the INSERT statement from the output and run it in your PostgreSQL database to replace the placeholder.

### 4️⃣ Setup Public Assets (1 minute)

Create a `public` folder and add your logo:

```bash
mkdir public
# Add your logo.png file to the public folder (or use a placeholder)
```

### 5️⃣ Configure Environment (1 minute)

Create a new file named `.env.local` in the project root:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD
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

**Note:** Get Mailtrap credentials from [mailtrap.io](https://mailtrap.io) → Email Testing → SMTP Settings

### 6️⃣ Start the Application (1 minute)

```bash
npm run dev
```

### 7️⃣ Access the Application (1 minute)

Open your browser:

**Public Website:**
- http://localhost:3000

**Admin Login:**
- http://localhost:3000/admin/login
- Email: `admin@alfarm.com`
- Password: `admin123`

**Guest Registration:**
- http://localhost:3000/guest/register

## ✅ You're Done!

The application is now running with:
- ✅ Beautiful public website
- ✅ Working admin login (role-based protection)
- ✅ Guest registration with shadow account claiming
- ✅ PostgreSQL database connected
- ✅ Booking system with date-range support
- ✅ Step-based checkout flow (Select → Details → Payment → Confirmation)
- ✅ Email notifications (if Mailtrap configured)
- ✅ **Rate limiting** on public APIs (prevents abuse)
- ✅ **Row-level locking** (prevents overselling)
- ✅ **Zod validation** (input validation on all endpoints)
- ✅ **Standardized error responses** (consistent API errors)
- ✅ **RBAC permission system** (granular role-based access)
- ✅ **Audit logging** (tracks all admin actions)
- ✅ **Staff management** (create/manage staff accounts)
- ✅ **Check-in/Check-out** (operational booking management)

### User Roles
| Role | Description | Permissions |
|------|-------------|-------------|
| `guest` | Public customers | Default for registrations |
| `cashier` | Front desk staff | Bookings, check-in/out, payments |
| `super_admin` | Full administrator | All permissions + staff management |
| `admin`/`root` | Legacy admin roles | Full admin access |

> Role constants and permissions are defined in `lib/roles.ts` and `lib/permissions.ts`.

## 🎯 What to Do Next

1. **Explore the Website**
   - Browse rooms at `/rooms`
   - Check activities at `/activities`
   - View gallery at `/gallery`

2. **Test the Booking Flow**
   - Select Day Use or Overnight on homepage
   - Pick dates and search availability
   - Add items to cart and checkout
   - Complete demo payment and view confirmation page
   - Check your email (Mailtrap inbox)

   **Note:** Checkout totals include entrance fees pulled from your database (`Entrance Fee` category). Ensure your seed data exists (Adult/Kid for Day/Night) by importing `database/schema.sql`.

3. **Test Admin Features**
   - Login as admin at `/admin/login`
   - View protected dashboard
   - Manage bookings at `/admin/bookings`
   - Manage staff at `/admin/staff` (super_admin only)
   - View audit logs at `/admin/audit` (super_admin only)

4. **Create a Guest Account**
   - Register at `/guest/register`
   - If you booked as guest before, your account will be linked!
   - View booking history

5. **Customize**
   - Change colors in `tailwind.config.js`
   - Update content in page files
   - Add your own images

## 🐛 Quick Troubleshooting

**Can't connect to database?**
```bash
# Linux/Mac - Check if PostgreSQL is running
sudo service postgresql status

# Windows - Check Services or run:
pg_ctl status -D "C:\Program Files\PostgreSQL\[version]\data"
```

**Missing .env.local file?**
- Make sure you created it in the project root (not in a subdirectory)
- File should be named exactly `.env.local` (note the leading dot)

**Module errors?**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Port 3000 in use?**
```bash
npm run dev -- -p 3001
```

**Admin login fails?**
- The placeholder admin in schema.sql has an invalid hash - you MUST run `node scripts/generate-admin-hash.js`
- Verify you inserted the generated admin user into the database
- Check that `.env.local` is configured correctly
- Ensure database connection works
- Check browser console for error messages
- **Important:** Login requires POST method with `{"email", "password", "role"}` in body

**Getting 429 Too Many Requests?**
- Rate limiting is enabled: 60 req/min on `/api/availability`, 10 req/min on `/api/bookings`
- Wait for the rate limit window to reset (check `Retry-After` header)

**JWT_SECRET warning in console?**
- Set `JWT_SECRET` in `.env.local` to suppress the warning
- In production, the app will **not start** without `JWT_SECRET`

## 🐳 Docker Deployment (Production)

For production deployment using Docker:

```bash
# Copy production environment template
cp .env.production.example .env

# Edit .env with your production values
# IMPORTANT: Generate a secure JWT_SECRET!
openssl rand -base64 32

# Build and start
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f web
```

### Database Management

```bash
# Initialize database (first time only)
./scripts/db-init.sh

# Create backup
./scripts/db-backup.sh

# Restore from backup
./scripts/db-restore.sh backups/alfarm_YYYYMMDD_HHMMSS.dump
```

📖 **Full deployment guide:** [docs/deployment-droplet-docker.md](docs/deployment-droplet-docker.md)

## 📚 Need More Help?

Check the full README.md for:
- Detailed setup instructions
- Complete feature list
- API documentation
- Deployment guide

## 🔒 Security Notes

- **JWT_SECRET**: Required in production. App throws fatal error if missing.
- **Rate Limiting**: Public APIs are protected (availability: 60/min, bookings: 10/min)
- **Row-Level Locking**: Prevents concurrent bookings from overselling inventory
- **Input Validation**: All endpoints use Zod schemas for payload validation
- **Password Hashing**: bcrypt with cost factor 10
- **RBAC**: Granular permission system for admin operations
- **Audit Logging**: All admin mutations are logged with actor, action, and metadata
- **Secure Cookies**: HttpOnly, Secure (in production), SameSite=Lax

---

Happy coding! 🎉
