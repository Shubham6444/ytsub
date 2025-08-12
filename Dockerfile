# Use official Node.js image
FROM node:18-slim

# Install necessary dependencies for Chromium
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libgbm1 \
    libnss3 \
    libxshmfence1 \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json if you have (optional, faster builds)
COPY package*.json ./

# Install puppeteer-extra and stealth plugin
RUN npm install puppeteer-extra puppeteer-extra-plugin-stealth

# Copy your app.js script into container
COPY app.js .

# Puppeteer uses bundled Chromium automatically.
# But to reduce size, you can install Chromium explicitly or rely on bundled.

# Set environment variable to run Chromium with no sandbox (needed in many container environments)
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Install Chromium manually for execution path
RUN apt-get update && apt-get install -y chromium

# Expose no ports needed since this script just runs and exits

# Command to run your app.js script
CMD ["node", "app.js"]
