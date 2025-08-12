const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const CHANNEL_URL = process.env.CHANNEL_URL || 'https://www.youtube.com/channel/UCB4gLXUL3SvZ1mPM6tspOkA';

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

const executablePath = '/usr/bin/chromium'; // Change if your chromium path differs

async function run() {
  const browser = await puppeteer.launch({
    headless: true, // Run headless for no GUI (needed for most containers)
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
      '--disable-software-rasterizer',
      '--headless=new', // Use new headless mode; or '--headless' for older Puppeteer
      '--start-maximized',
    ],
    defaultViewport: null,
  });

  try {
    const page = await browser.newPage();

    // Construct the Shorts URL from the base channel URL
    let shortsUrl = CHANNEL_URL;
    if (!shortsUrl.endsWith('/shorts')) {
      shortsUrl = shortsUrl.replace(/\/$/, '') + '/shorts';
    }

    console.log(`Navigating to Shorts URL: ${shortsUrl}`);
    await page.goto(shortsUrl, { waitUntil: 'networkidle2' });

    // Wait explicitly for Shorts thumbnails to appear
    await page.waitForSelector('a#thumbnail[href*="/shorts/"]', { timeout: 10000 }).catch(() => {
      console.warn('Warning: Shorts thumbnails did not appear within 10 seconds.');
    });

    // Scroll multiple times to load more Shorts videos
    for (let i = 0; i < 20; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await delay(3000);
    }

    // Extract unique Shorts URLs from anchors that have /shorts/ in href
    const shortsUrls = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a#thumbnail[href*="/shorts/"]'));
      if (anchors.length > 0) {
        return [...new Set(anchors.map(a => a.href))];
      }
      // Fallback if above fails: all anchors containing /shorts/
      const fallbackAnchors = Array.from(document.querySelectorAll('a'))
        .filter(a => a.href.includes('/shorts/'));
      return [...new Set(fallbackAnchors.map(a => a.href))];
    });

    console.log(`Found ${shortsUrls.length} unique Shorts videos.`);

    if (shortsUrls.length === 0) {
      console.warn('No Shorts videos found. Try increasing scroll count or check selectors.');
      return;
    }

    // Play each Short video for 3 seconds
    for (const url of shortsUrls) {
      console.log(`▶️ Playing Short: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2' });
      await delay(3000); // wait for player to load and autoplay

      // Shorts usually autoplay, but press 'k' to toggle play/pause just in case
      try {
        await page.keyboard.press('k');
      } catch (e) {
        // Ignore errors here
      }

      await delay(3000); // watch for 3 seconds
    }

    console.log('✅ Finished playing all Shorts.');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await browser.close();
  }
}

run();
