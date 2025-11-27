# 🚀 AlFarm Resort - Quick Start Guide

Get up and running in 10 minutes!

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

# JWT Secret (Change this in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Application
NEXT_PUBLIC_APP_NAME=AlFarm Resort and Adventure Park
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

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

## 📚 Need More Help?

Check the full README.md for:
- Detailed setup instructions
- Complete feature list
- API documentation
- Deployment guide

---

Happy coding! 🎉
