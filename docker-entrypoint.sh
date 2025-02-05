#!/bin/bash

# Check if devices_config.json exists in the volume
if [ -f "/app/data/devices_config.json" ]; then
    # If it exists in the volume, use it
    echo "Using existing devices_config.json from volume"
    cp /app/data/devices_config.json /app/dist/devices_config.json
else
    # If it doesn't exist in the volume, copy the default one
    echo "Initializing devices_config.json in volume"
    cp /app/devices_config.json /app/data/devices_config.json
    cp /app/devices_config.json /app/dist/devices_config.json
fi

# Create a symbolic link for future updates
ln -sf /app/data/devices_config.json /app/dist/devices_config.json

# Execute the main command
exec "$@" 