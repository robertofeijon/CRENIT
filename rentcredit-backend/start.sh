#!/bin/bash

# RentCredit Backend Phase 1 - Quick Start Guide
# This script validates the environment and starts the backend

set -e  # Exit on any error

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║        RentCredit Backend - Phase 1 Quick Start                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Node.js
echo -e "${BLUE}✓ Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    npm_version=$(npm -v)
    echo -e "${GREEN}  Node.js: $NODE_VERSION${NC}"
    echo -e "${GREEN}  npm: $npm_version${NC}"
else
    echo -e "${RED}  ✗ Node.js not found${NC}"
    exit 1
fi
echo ""

# Check PostgreSQL
echo -e "${BLUE}✓ Checking PostgreSQL...${NC}"
if sudo systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}  PostgreSQL is running${NC}"
else
    echo -e "${YELLOW}  Starting PostgreSQL...${NC}"
    sudo systemctl start postgresql
    sleep 2
    echo -e "${GREEN}  PostgreSQL started${NC}"
fi
echo ""

# Verify database
echo -e "${BLUE}✓ Checking Database...${NC}"
DB_CHECK=$(sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'rentcredit';" 2>/dev/null || echo "")
if [ -n "$DB_CHECK" ]; then
    echo -e "${GREEN}  Database 'rentcredit' exists${NC}"
else
    echo -e "${RED}  ✗ Database 'rentcredit' not found${NC}"
    echo -e "${YELLOW}  Run setup first: see PHASE1_README.md${NC}"
    exit 1
fi
echo ""

# Check backend dependencies
echo -e "${BLUE}✓ Checking dependencies...${NC}"
cd "$(dirname "$0")"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}  Dependencies installed${NC}"
else
    echo -e "${YELLOW}  Installing dependencies...${NC}"
    npm install --silent
    echo -e "${GREEN}  Dependencies installed${NC}"
fi
echo ""

# Check if port is available
echo -e "${BLUE}✓ Checking port 3000...${NC}"
if lsof -i :3000 &>/dev/null; then
    echo -e "${YELLOW}  Port 3000 is in use, killing existing process...${NC}"
    kill $(lsof -t -i :3000) 2>/dev/null || true
    sleep 1
fi
echo -e "${GREEN}  Port 3000 is available${NC}"
echo ""

# Build backend
echo -e "${BLUE}✓ Building backend...${NC}"
npm run build > /dev/null 2>&1
echo -e "${GREEN}  Build complete${NC}"
echo ""

# Start backend
echo -e "${BLUE}✓ Starting RentCredit Backend...${NC}"
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  API Server starting on http://localhost:3000                  ║"
echo "║                                                                ║"
echo "║  Test endpoints:                                               ║"
echo "║  • curl http://localhost:3000/ (basic test)                   ║"
echo "║  • Run: ./test-api.sh (comprehensive test)                    ║"
echo "║                                                                ║"
echo "║  Press Ctrl+C to stop the server                               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Start the application
npm run start:dev
