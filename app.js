const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const CHANNEL_URL = process.env.CHANNEL_URL || 'https://www.youtube.com/channel/UCB4gLXUL3SvZ1mPM6tspOkA';

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

const executablePath = '/usr/bin/chromium';  // Your chromium executable in container

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--start-maximized',
      '--disable-dev-shm-usage',
    ],
    defaultViewport: null,
  });

  try {
    const page = await browser.newPage();

    // Set user agent to a modern Chrome on Windows (helps avoid bot detection)
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

    // Set viewport size (important in headless)
    await page.setViewport({ width: 1280, height: 800 });

    // Prepare URL for videos tab
    let videosPage = CHANNEL_URL;
    if (!videosPage.endsWith('/videos')) {
      videosPage = videosPage.replace(/\/$/, '') + '/videos';
    }

    console.log(`Navigating to videos page: ${videosPage}`);
    await page.goto(videosPage, { waitUntil: 'networkidle2' });

    // Wait for thumbnails to appear (timeout after 15 seconds)
    await page.waitForSelector('a#thumbnail', { timeout: 15000 });

    // Scroll down multiple times to load more videos
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await delay(2500);
    }

    // Debug: count how many thumbnails found
    const count = await page.evaluate(() => document.querySelectorAll('a#thumbnail').length);
    console.log(`Number of thumbnails found on page: ${count}`);

    // Extract all video URLs with 'watch' in href
    const videoUrls = await page.$$eval('a#thumbnail', anchors =>
      anchors
        .map(a => a.href)
        .filter(href => href.includes('watch'))
    );

    console.log(`Found ${videoUrls.length} videos.`);

    if (videoUrls.length === 0) {
      console.warn('No videos found. Try increasing scroll count or checking selectors.');
      return;
    }

    // Play each video for about 3 seconds
    for (const url of videoUrls) {
      console.log(`▶️ Playing video: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2' });
      await delay(2000); // wait for player to load

      // Attempt to toggle play/pause (some videos auto play, some don't)
      try {
        await page.keyboard.press('k');
      } catch (e) {
        // ignore error
      }

      await delay(3000); // watch for 3 seconds
    }

    console.log('✅ Finished playing all videos.');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await browser.close();
  }
}

run();
