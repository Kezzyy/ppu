#!/bin/bash

# Define release filename
RELEASE_FILE="shimatsu-updater-release.zip"

echo "🧹 Cleaning up previous release..."
rm -f $RELEASE_FILE

echo "📦 Packaging application for CloudPanel deployment..."

# Zip the necessary files and directories
# Excludes node_modules to keep size down (Docker will install them)
# Excludes local storage and uploads
# Excludes .git history
zip -r $RELEASE_FILE \
    backend \
    frontend \
    prisma \
    Dockerfile \
    docker-compose.prod.yml \
    DEPLOYMENT.md \
    -x "**/node_modules/*" \
    -x "**/dist/*" \
    -x "**/.git/*" \
    -x "**/.env" \
    -x "**/storage/*" \
    -x "**/uploads/*" \
    -x "**/coverage/*"

echo "✅ Release package created: $RELEASE_FILE"
echo " "
echo "📝 Deployment Instructions:"
echo "1. Upload '$RELEASE_FILE' to your CloudPanel server (e.g., /home/shimatsu-updater)."
echo "2. Unzip it: unzip $RELEASE_FILE"
echo "3. Create .env file from template (or set env vars in CloudPanel)."
echo "4. Run: docker-compose -f docker-compose.prod.yml up -d --build"
