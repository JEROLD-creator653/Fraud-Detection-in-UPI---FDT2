#!/bin/bash
# Azure VM Setup Script for FDT - Fraud Detection System
# Run this on your Ubuntu 22.04 Azure VM

set -e  # Exit on any error

echo "🚀 Starting FDT Azure Deployment Setup..."
echo "=========================================="

# Update system
echo "📦 Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
echo "👤 Adding user to docker group..."
sudo usermod -aG docker $USER

# Install Nginx
echo "🌐 Installing Nginx..."
sudo apt-get install -y nginx

# Install Certbot for SSL
echo "🔒 Installing Certbot (SSL)..."
sudo apt-get install -y certbot python3-certbot-nginx

# Create app directory
echo "📁 Creating app directory..."
sudo mkdir -p /opt/fdt
cd /opt/fdt

echo ""
echo "✅ System setup complete!"
echo ""
echo "Next steps:"
echo "1. Log out and log back in (for docker group changes)"
echo "2. Clone your repository: cd /opt/fdt && git clone <your-repo-url> ."
echo "3. Copy .env.production to .env and update values"
echo "4. Run: docker-compose up -d"
echo "5. Configure Nginx: sudo cp /opt/fdt/nginx/fdt.conf /etc/nginx/sites-available/"
echo "6. Enable site: sudo ln -s /etc/nginx/sites-available/fdt.conf /etc/nginx/sites-enabled/"
echo "7. Get SSL: sudo certbot --nginx -d fdt2-secureupi.tech"
echo ""
