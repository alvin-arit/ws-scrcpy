#!/bin/bash

echo "Starting docker entrypoint script..."

echo "Using existing devices_config.json from volume"
cp /app/devices_config.json /app/dist/devices_config.json
echo "Copied devices_config.json to /app/dist/devices_config.json"

# Execute the main command
echo "Starting application..."
exec "$@" 