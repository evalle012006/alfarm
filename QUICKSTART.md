# 🚀 AlFarm Resort - Quick Start Guide

Get up and running in 10 minutes!

## Prerequisites Check

- [ ] Node.js 18+ installed
- [ ] PostgreSQL 12+ installed and running
- [ ] Terminal/Command Prompt open

## Step-by-Step Setup

### 1️⃣ Install Dependencies (2 minutes)

```bash
cd alfarm-resort
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

Generate the password hash:

```bash
node scripts/generate-admin-hash.js
```

Copy the INSERT statement from the output and run it in your PostgreSQL database.

### 4️⃣ Configure Environment (1 minute)

Edit `.env.local`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD
DB_NAME=alfarm_resort
JWT_SECRET=your-random-secret-key-here
```

### 5️⃣ Start the Application (1 minute)

```bash
npm run dev
```

### 6️⃣ Access the Application (1 minute)

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
- ✅ Working admin login
- ✅ Guest registration system
- ✅ PostgreSQL database connected

## 🎯 What to Do Next

1. **Explore the Website**
   - Browse rooms at `/rooms`
   - Check activities at `/activities`
   - View gallery at `/gallery`

2. **Test Admin Features**
   - Login as admin
   - View dashboard
   - Check statistics

3. **Create a Guest Account**
   - Register at `/guest/register`
   - Login and view dashboard

4. **Customize**
   - Change colors in `tailwind.config.js`
   - Update content in page files
   - Add your own images

## 🐛 Quick Troubleshooting

**Can't connect to database?**
```bash
# Check if PostgreSQL is running
sudo service postgresql status

# Or on Windows
pg_ctl status
```

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
- Verify admin user was created in database
- Check password hash was generated correctly
- Ensure database connection works

## 📚 Need More Help?

Check the full README.md for:
- Detailed setup instructions
- Complete feature list
- API documentation
- Deployment guide

---

Happy coding! 🎉
