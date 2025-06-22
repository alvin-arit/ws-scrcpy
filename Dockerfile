# Use Node.js as the base image
FROM ubuntu:latest

# Set noninteractive mode to avoid prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies including ADB and node-gyp requirements
RUN apt-get update && apt-get install -y \
    android-tools-adb \
    python3 \
    make \
    g++ \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Create the same user as the other container
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Create directory for ADB keys and config
RUN mkdir -p /app/data && \
    chown -R nextjs:nodejs /app/data

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

# Change ownership of built files
RUN chown -R nextjs:nodejs /app

# Expose the default port
EXPOSE 8000

# Add an entrypoint script to handle config file
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh && \
    chown nextjs:nodejs /docker-entrypoint.sh

USER nextjs

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "start"] 