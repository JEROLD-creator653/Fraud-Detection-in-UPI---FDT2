#!/bin/bash
# Kill frontend server on port 3000

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Killing frontend server (port 3000)...${NC}"

# Check if anything is running on port 3000
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    # Kill react-scripts process
    pkill -9 -f "react-scripts/scripts/start.js" 2>/dev/null || true
    
    # Kill by port to ensure clean shutdown
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    
    # Kill any remaining node processes related to frontend
    pkill -f "node.*react-scripts" 2>/dev/null || true
    
    sleep 1
    
    # Verify it's killed
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${RED}✗ Failed to kill frontend process${NC}"
        echo "  Try manually: lsof -ti:3000 | xargs kill -9"
        exit 1
    else
        echo -e "${GREEN}✓ Frontend server stopped${NC}"
    fi
else
    echo -e "${GREEN}✓ Port 3000 is already free${NC}"
fi
