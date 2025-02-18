#!/bin/bash

# Check for container engine (docker or podman)
if command -v podman >/dev/null 2>&1; then
    CONTAINER_ENGINE="podman"
elif command -v docker >/dev/null 2>&1; then
    CONTAINER_ENGINE="docker"
else
    echo "Error: Neither Docker nor Podman is installed. Please install one of them to continue."
    exit 1
fi

mkdir -p /opt/scrcpy/android
mkdir -p /opt/scrcpy/data

echo "Using container engine: $CONTAINER_ENGINE"

# Build the docker image
$CONTAINER_ENGINE build -t scrcpy .

# Run the container with proper volume mounts and USB access
$CONTAINER_ENGINE run -d \
    --name scrcpy \
    --restart always \
    -p 8000:8000 \
    -v /opt/scrcpy/android:/root/.android \
    -v /opt/scrcpy/data:/app/data \
    scrcpy


echo "Container started! Access the application at http://localhost:8000"

