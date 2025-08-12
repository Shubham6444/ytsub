// app.js
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const CHANNEL_URL = process.env.CHANNEL_URL || 'https://www.youtube.com/channel/UCB4gLXUL3SvZ1mPM6tspOkA';

// Custom delay helper (compatible with all versions)
function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

const executablePath = '/usr/bin/chromium';  // Make sure Chromium is installed here in your container

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--start-maximized',
    ],
    defaultViewport: null,
  });

  try {
    const page = await browser.newPage();

    // Set a realistic user agent and viewport size
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    let videosPage = CHANNEL_URL;
    if (!videosPage.endsWith('/videos')) {
      videosPage = videosPage.replace(/\/$/, '') + '/videos';
    }

    console.log(`Navigating to videos page: ${videosPage}`);
    await page.goto(videosPage, { waitUntil: 'networkidle2' });

    // Handle cookie consent popup if it appears
    try {
      const consentButton = await page.$('button[aria-label="Accept all"]');
      if (consentButton) {
        console.log('Clicking consent button');
        await consentButton.click();
        await delay(3000);
      }
    } catch (e) {
      // Ignore if consent popup doesn't appear
    }

    // Wait some time for videos to load properly
    await delay(15000);

    // Scroll down multiple times to load more videos
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await delay(2000);
    }

    // Extract video URLs from the page thumbnails
    const videoUrls = await page.$$eval('a#thumbnail', anchors =>
      anchors
        .map(a => a.href)
        .filter(href => href.includes('watch'))
    );

    console.log(`Found ${videoUrls.length} videos.`);

    if (videoUrls.length === 0) {
      console.warn('No videos found after scrolling.');
      return;
    }

  // Helper delay function
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

for (const url of videoUrls) {
  console.log(`▶️ Playing video: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Wait for video element to load
  await page.waitForSelector('video');

  // Play the video and get duration
  const videoDuration = await page.evaluate(() => {
    const video = document.querySelector('video');
    if (!video) return 0;

    // Play video if paused
    if (video.paused) {
      video.play();
    }

    return video.duration * 1000; // duration in milliseconds
  });

  if (videoDuration > 0) {
    console.log(`⏳ Watching video for ${videoDuration / 1000} seconds...`);
    await delay(videoDuration + 1000); // add a small buffer of 1 sec
  } else {
    console.log('⚠️ Could not get video duration, waiting 10 seconds instead.');
    await delay(10000);
  }
}

console.log('✅ Finished playing all videos.');

}

run();
