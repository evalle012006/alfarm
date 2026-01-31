# AlFarm Resort - Docker Deployment Guide

This guide covers deploying AlFarm Resort to a DigitalOcean Droplet using Docker and Docker Compose.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Setup](#server-setup)
3. [Deployment Steps](#deployment-steps)
4. [Security Hardening](#security-hardening)
5. [Database Management](#database-management)
6. [Maintenance & Updates](#maintenance--updates)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Server Requirements
- DigitalOcean Droplet (Ubuntu 22.04 LTS recommended)
- Minimum: 1 vCPU, 1GB RAM, 25GB SSD
- Recommended: 2 vCPU, 2GB RAM, 50GB SSD

### Domain (Optional but Recommended)
- A domain name pointing to your Droplet's IP
- DNS A record configured

---

## Server Setup

### 1. Initial Server Configuration

SSH into your droplet:
```bash
ssh root@your-droplet-ip
```

Update the system:
```bash
apt update && apt upgrade -y
```

Create a non-root user (recommended):
```bash
adduser deploy
usermod -aG sudo deploy
```

### 2. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Add user to docker group
usermod -aG docker deploy

# Install Docker Compose plugin
apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### 3. Configure Firewall (UFW)

```bash
# Enable UFW
ufw enable

# Allow SSH (IMPORTANT: do this first!)
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Block PostgreSQL from public access (it's internal only)
# No rule needed - it's blocked by default

# Check status
ufw status
```

**Expected output:**
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

---

## Deployment Steps

### 1. Clone the Repository

```bash
# Switch to deploy user
su - deploy

# Clone the repo
git clone https://github.com/your-org/alfarm.git
cd alfarm
```

### 2. Configure Environment Variables

```bash
# Copy the production template
cp .env.production.example .env

# Edit with your values
nano .env
```

**Critical variables to change:**

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | Database password | Strong random password |
| `DB_PASSWORD` | Same as above | Same as POSTGRES_PASSWORD |
| `JWT_SECRET` | Auth token secret | Generate with command below |
| `NEXT_PUBLIC_APP_URL` | Your domain | `https://alfarm.com` |

**Generate a secure JWT secret:**
```bash
openssl rand -base64 32
```

### 3. Start the Stack

```bash
# Build and start containers
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### 4. Initialize the Database

The database schema is automatically applied on first start via the `docker-entrypoint-initdb.d` mount. However, if you need to reinitialize:

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Run initialization
./scripts/db-init.sh
```

### 5. Verify Deployment

```bash
# Check if web is responding
curl http://localhost:3000

# Check container health
docker compose ps

# Check logs for errors
docker compose logs web
docker compose logs db
```

### 6. Access the Application

- **Without SSL:** `http://your-droplet-ip:3000`
- **With reverse proxy:** `https://your-domain.com`

---

## Security Hardening

### Database Security

✅ **PostgreSQL is NOT exposed publicly** - It only listens on the Docker internal network.

If you need to access the database for admin tasks:

```bash
# Option 1: Use docker exec
docker exec -it alfarm_db psql -U alfarm -d alfarm

# Option 2: SSH tunnel (from your local machine)
ssh -L 5432:localhost:5432 deploy@your-droplet-ip
# Then connect locally to localhost:5432
```

### Cookie Security

The application automatically sets secure cookies when `NODE_ENV=production`:
- `httpOnly: true` - Prevents XSS access
- `secure: true` - HTTPS only
- `sameSite: 'lax'` - CSRF protection

### JWT Secret

⚠️ **CRITICAL:** Always use a strong, randomly generated JWT_SECRET in production.

```bash
# Generate a secure secret
openssl rand -base64 32
# or
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### SSL/TLS (HTTPS)

For production, you should add SSL. Options:

1. **Nginx reverse proxy with Let's Encrypt** (recommended)
2. **Cloudflare proxy** (easiest)
3. **DigitalOcean Load Balancer with managed SSL**

Example Nginx configuration (create `nginx/nginx.conf`):

```nginx
events {
    worker_connections 1024;
}

http {
    upstream web {
        server web:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        location / {
            proxy_pass http://web;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

---

## Database Management

### Backup

Create a backup:
```bash
./scripts/db-backup.sh
```

Backups are stored in `./backups/` with timestamps:
- Format: `alfarm_YYYYMMDD_HHMMSS.dump`
- Compressed using pg_dump custom format

### Automated Backups

Add a cron job for daily backups:
```bash
crontab -e
```

Add this line (runs at 2 AM daily):
```
0 2 * * * cd /home/deploy/alfarm && ./scripts/db-backup.sh >> /var/log/alfarm-backup.log 2>&1
```

### Restore

Restore from a backup:
```bash
./scripts/db-restore.sh backups/alfarm_20240101_120000.dump
```

⚠️ **Warning:** This will DROP the existing database!

### Manual Database Access

```bash
# Connect to database
docker exec -it alfarm_db psql -U alfarm -d alfarm

# Run a query
docker exec alfarm_db psql -U alfarm -d alfarm -c "SELECT COUNT(*) FROM users;"
```

---

## Maintenance & Updates

### Updating the Application

```bash
cd /home/deploy/alfarm

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose up -d --build

# Check logs
docker compose logs -f web
```

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f web
docker compose logs -f db

# Last 100 lines
docker compose logs --tail=100 web
```

### Restarting Services

```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart web

# Full rebuild
docker compose down
docker compose up -d --build
```

### Checking Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker system df
```

### Cleaning Up

```bash
# Remove unused images
docker image prune -a

# Remove all unused data (careful!)
docker system prune -a
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs web

# Common issues:
# - Missing environment variables
# - Database not ready (check db health)
# - Port already in use
```

### Database Connection Failed

```bash
# Check if db is healthy
docker compose ps

# Check db logs
docker compose logs db

# Verify environment variables
docker compose exec web env | grep DB_
```

### Application Errors

```bash
# Check web logs
docker compose logs -f web

# Enter container for debugging
docker compose exec web sh
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a

# Clean old backups
find ./backups -name "*.dump" -mtime +30 -delete
```

### Reset Everything

⚠️ **Warning:** This deletes all data!

```bash
# Stop and remove everything
docker compose down -v

# Remove images
docker rmi $(docker images -q)

# Start fresh
docker compose up -d --build
./scripts/db-init.sh
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Start stack | `docker compose up -d` |
| Stop stack | `docker compose down` |
| View logs | `docker compose logs -f` |
| Rebuild | `docker compose up -d --build` |
| Backup DB | `./scripts/db-backup.sh` |
| Restore DB | `./scripts/db-restore.sh <file>` |
| DB shell | `docker exec -it alfarm_db psql -U alfarm -d alfarm` |
| App shell | `docker compose exec web sh` |

---

## Support

For issues specific to this deployment:
1. Check the logs first
2. Review this documentation
3. Check the main README.md for application-specific help
