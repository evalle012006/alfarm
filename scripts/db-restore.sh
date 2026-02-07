#!/bin/bash
# =============================================================================
# AlFarm Resort - Database Restore Script
# Restores the PostgreSQL database from a backup file
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== AlFarm Database Restore ===${NC}"

# Load environment variables if .env exists
if [ -f "$PROJECT_DIR/.env" ]; then
    echo "Loading environment from .env..."
    export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

# Set defaults
DB_NAME="${POSTGRES_DB:-${DB_NAME:-alfarm}}"
DB_USER="${POSTGRES_USER:-${DB_USER:-alfarm}}"
CONTAINER_NAME="${CONTAINER_NAME:-alfarm_db}"

# Check for backup file argument
BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo -e "${YELLOW}Usage: $0 <backup_file>${NC}"
    echo ""
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/*.dump 2>/dev/null || echo "No backups found in $BACKUP_DIR"
    echo ""
    echo "Example: $0 backups/alfarm_20240101_120000.dump"
    exit 1
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    # Try with backup directory prefix
    if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
        BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
    else
        echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
        exit 1
    fi
fi

echo -e "Database: ${YELLOW}$DB_NAME${NC}"
echo -e "Backup file: ${YELLOW}$BACKUP_FILE${NC}"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}Error: Container '$CONTAINER_NAME' is not running.${NC}"
    echo "Start the stack first: docker compose up -d"
    exit 1
fi

# Confirm restore (destructive operation)
echo ""
echo -e "${RED}WARNING: This will DROP and recreate the database '$DB_NAME'.${NC}"
echo -e "${RED}All existing data will be lost!${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo "Stopping web application..."
docker stop alfarm_web 2>/dev/null || true

echo "Dropping existing database..."
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"

echo "Creating fresh database..."
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

echo "Restoring from backup..."
docker exec -i "$CONTAINER_NAME" pg_restore -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges < "$BACKUP_FILE"

echo "Restarting web application..."
docker start alfarm_web 2>/dev/null || true

echo ""
echo -e "${GREEN}=== Database restore complete ===${NC}"
echo "Verify the application is working correctly."
