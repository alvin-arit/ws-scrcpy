# Use Node.js as the base image
FROM node:18-bullseye

# Install system dependencies including ADB and node-gyp requirements
RUN apt-get update && apt-get install -y \
    android-tools-adb \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Create directory for ADB keys and config
RUN mkdir -p /root/.android
RUN mkdir -p /app/data

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run dist

# Create a symbolic link for devices_config.json to persist it
RUN ln -sf /app/data/devices_config.json /app/dist/devices_config.json

# Expose the default port
EXPOSE 8000

# Create volumes for persistent data
VOLUME ["/root/.android", "/app/data"]

# Start the application
CMD ["npm", "start"] 