FROM node:18-slim

# Install necessary dependencies for Chromium + chromium itself
RUN apt-get update && apt-get install -y \
    chromium \
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

WORKDIR /usr/src/app

COPY package*.json ./

# Install your dependencies and pm2 globally
RUN npm install puppeteer-extra puppeteer-extra-plugin-stealth
RUN npm install pm2 -g

COPY app.js .

# Puppeteer config
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Start app with pm2 (app name "ytsub")
CMD ["pm2-runtime", "start", "app.js", "--name", "ytsub", "--no-daemon"]
