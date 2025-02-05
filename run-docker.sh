#!/bin/bash

# Check for container engine (docker or podman)
if command -v docker >/dev/null 2>&1; then
    CONTAINER_ENGINE="docker"
elif command -v podman >/dev/null 2>&1; then
    CONTAINER_ENGINE="podman"
else
    echo "Error: Neither Docker nor Podman is installed. Please install one of them to continue."
    exit 1
fi

echo "Using container engine: $CONTAINER_ENGINE"

# Create docker volumes if they don't exist
$CONTAINER_ENGINE volume create ws-scrcpy-adb
$CONTAINER_ENGINE volume create ws-scrcpy-data

# Build the docker image
$CONTAINER_ENGINE build -t ws-scrcpy .

# Run the container with proper volume mounts and USB access
$CONTAINER_ENGINE run -d \
    --name ws-scrcpy \
    --restart always \
    -p 8000:8000 \
    --privileged \
    -v /dev/bus/usb:/dev/bus/usb \
    -v ws-scrcpy-adb:/root/.android \
    -v ws-scrcpy-data:/app/data \
    ws-scrcpy

echo "Container started! Access the application at http://localhost:8000"
echo "Your ADB keys are persisted in the '${CONTAINER_ENGINE}-volume ws-scrcpy-adb' volume"
echo "Your devices_config.json is persisted in the '${CONTAINER_ENGINE}-volume ws-scrcpy-data' volume" 