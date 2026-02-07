#!/bin/bash
# =============================================================================
# AlFarm Resort - Database Initialization Script
# Runs schema.sql to initialize the database
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== AlFarm Database Initialization ===${NC}"
echo -e "${YELLOW}Warning:${NC} schema.sql will seed products. Re-running on an existing DB may duplicate products."

# Load env safely if present
if [ -f "$PROJECT_DIR/.env" ]; then
  echo "Loading environment from .env..."
  set -a
  # shellcheck disable=SC1090
  source "$PROJECT_DIR/.env"
  set +a
fi

DB_NAME="${POSTGRES_DB:-alfarm}"
DB_USER="${POSTGRES_USER:-alfarm}"

# Ensure db service is running
DB_CONTAINER="$(docker compose ps -q db)"
if [ -z "$DB_CONTAINER" ]; then
  echo -e "${RED}Error:${NC} db container is not running. Start it with: docker compose up -d db"
  exit 1
fi

echo "Executing schema.sql inside DB container..."
docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -f /docker-entrypoint-initdb.d/schema.sql

echo -e "${GREEN}=== Database initialization complete ===${NC}"

