#!/bin/bash

# FDT Deployment Script for Firebase Hosting
# This script builds and prepares the application for Firebase deployment

echo "🔥 FDT Firebase Deployment Preparation"
echo "======================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Build Frontend
echo -e "\n${YELLOW}📦 Building React Frontend...${NC}"
cd /app/frontend
yarn build

if [ -d "build" ]; then
    echo -e "${GREEN}✅ Frontend built successfully${NC}"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi

# Step 2: Create firebase.json
echo -e "\n${YELLOW}🔧 Creating Firebase configuration...${NC}"
cat > /app/firebase.json << 'EOF'
{
  "hosting": {
    "public": "frontend/build",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/service-worker.js",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache"
          }
        ]
      }
    ]
  }
}
EOF

echo -e "${GREEN}✅ Firebase configuration created${NC}"

# Step 3: Create .firebaserc
echo -e "\n${YELLOW}🔧 Creating Firebase project configuration...${NC}"
cat > /app/.firebaserc << 'EOF'
{
  "projects": {
    "default": "fdt-fraud-detecction-upi"
  }
}
EOF

echo -e "${GREEN}✅ Firebase project configured${NC}"

# Step 4: Installation instructions
echo -e "\n${GREEN}======================================"
echo "✨ Deployment Preparation Complete!"
echo "======================================${NC}"
echo ""
echo "📋 Next Steps for Firebase Deployment:"
echo ""
echo "1. Install Firebase CLI (if not installed):"
echo "   npm install -g firebase-tools"
echo ""
echo "2. Login to Firebase:"
echo "   firebase login"
echo ""
echo "3. Deploy to Firebase:"
echo "   cd /app"
echo "   firebase deploy"
echo ""
echo "🌐 Your app will be deployed to:"
echo "   https://fdt-fraud-detecction-upi.web.app"
echo ""
echo "📝 Note: Backend API needs to be deployed separately to a cloud provider"
echo "   (e.g., Google Cloud Run, AWS Lambda, Heroku, DigitalOcean)"
echo ""
