FROM node:18-slim

# Install Chromium and dependencies
RUN apt-get update && apt-get install -y \
  chromium \
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
RUN npm install

COPY . .

# Tell Puppeteer to use system-installed Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

CMD ["node", "app.js"]
