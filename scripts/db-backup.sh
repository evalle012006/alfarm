#!/bin/bash
# =============================================================================
# AlFarm Resort - Database Backup Script
# Creates a timestamped backup of the PostgreSQL database
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

echo -e "${GREEN}=== AlFarm Database Backup ===${NC}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Load environment variables if .env exists
if [ -f "$PROJECT_DIR/.env" ]; then
    echo "Loading environment from .env..."
    export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

# Set defaults
DB_NAME="${POSTGRES_DB:-${DB_NAME:-alfarm}}"
DB_USER="${POSTGRES_USER:-${DB_USER:-alfarm}}"
CONTAINER_NAME="${CONTAINER_NAME:-alfarm_db}"

# Generate timestamp for backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.dump"

echo -e "Database: ${YELLOW}$DB_NAME${NC}"
echo -e "Backup file: ${YELLOW}$BACKUP_FILE${NC}"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}Error: Container '$CONTAINER_NAME' is not running.${NC}"
    echo "Start the stack first: docker compose up -d"
    exit 1
fi

# Create backup using pg_dump with custom format (compressed)
echo "Creating backup..."
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$BACKUP_FILE"

# Verify backup was created
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}Backup created successfully!${NC}"
    echo -e "File: $BACKUP_FILE"
    echo -e "Size: $BACKUP_SIZE"
else
    echo -e "${RED}Error: Backup file was not created.${NC}"
    exit 1
fi

# Optional: Remove backups older than 30 days
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
echo ""
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "*.dump" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

# List recent backups
echo ""
echo "Recent backups:"
ls -lh "$BACKUP_DIR"/*.dump 2>/dev/null | tail -5 || echo "No backups found"

echo ""
echo -e "${GREEN}=== Backup complete ===${NC}"
