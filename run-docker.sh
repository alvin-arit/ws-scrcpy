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

echo "Using container engine: $CONTAINER_ENGINE"

# Build the docker image
$CONTAINER_ENGINE build -t adb-admin .

Delete the container if it exists
$CONTAINER_ENGINE rm -f adb-admin

# Run the container with proper volume mounts and USB access
$CONTAINER_ENGINE run -d \
    --name adb-admin \
    --restart always \
    -p 8000:8000 \
    -v /opt/adb-admin/android:/home/nextjs/.android \
    -v /opt/adb-admin/config/config.json:/app/devices_config.json \
    adb-admin \

echo "Container started! Access the application at http://localhost:8000"

#!/bin/bash

# Check for container engine (docker or podman)
# if command -v podman >/dev/null 2>&1; then
#     CONTAINER_ENGINE="podman"
# elif command -v docker >/dev/null 2>&1; then
#     CONTAINER_ENGINE="docker"
# else
#     echo "Error: Neither Docker nor Podman is installed. Please install one of them to continue."
#     exit 1
# fi

# echo "Using container engine: $CONTAINER_ENGINE"

# # Build the docker image
# $CONTAINER_ENGINE build -t adb-scrcpy .

# # Delete the container if it exists
# $CONTAINER_ENGINE rm -f adb-scrcpy

# # Run the container with proper volume mounts and USB access
# $CONTAINER_ENGINE run -d \
#     --name adb-scrcpy \
#     --restart always \
#     -p 8000:8000 \
#     -v ~/.android:/home/nextjs/.android \
#     -v /Users/alvinrotteveel/Downloads/adb-admin/config/config.json:/app/devices_config.json \
#     adb-scrcpy

# echo "Container started! Access the application at http://localhost:8000"

