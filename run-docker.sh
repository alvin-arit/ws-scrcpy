#!/bin/bash

# Create docker volumes if they don't exist
docker volume create ws-scrcpy-adb
docker volume create ws-scrcpy-data

# Build the docker image
docker build -t ws-scrcpy .

# Run the container with proper volume mounts and USB access
docker run -d \
    --name ws-scrcpy \
    --restart always \
    -p 8000:8000 \
    --privileged \
    -v /dev/bus/usb:/dev/bus/usb \
    -v ws-scrcpy-adb:/root/.android \
    -v ws-scrcpy-data:/app/data \
    ws-scrcpy

echo "Container started! Access the application at http://localhost:8000"
echo "Your ADB keys are persisted in the 'ws-scrcpy-adb' volume"
echo "Your devices_config.json is persisted in the 'ws-scrcpy-data' volume" 