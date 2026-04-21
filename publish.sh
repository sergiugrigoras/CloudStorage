#!/usr/bin/env bash
set -e

# usage: ./publish.sh <version>
version=$1

if [ -z "$version" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

# Load config
if [ -f publish.env ]; then
  source publish.env
else
  echo "Config file publish.env not found!"
  exit 1
fi

# Ensure required variables are set
if [ -z "$APP_NAME" ] || [ -z "$REPO_NAME" ]; then
  echo "APP_NAME or REPO_NAME not set in publish.env"
  exit 1
fi

echo "Building $REPO_NAME/$APP_NAME:$version ..."
docker build -t "$APP_NAME:$version" .

echo "Tagging image..."
docker tag "$APP_NAME:$version" "$REPO_NAME/$APP_NAME:$version"
docker tag "$APP_NAME:$version" "$REPO_NAME/$APP_NAME:latest"

echo "Pushing to repo..."
docker push "$REPO_NAME/$APP_NAME:$version"
docker push "$REPO_NAME/$APP_NAME:latest"

echo "Done."