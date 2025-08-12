
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const CHANNEL_URL = process.env.CHANNEL_URL || 'https://www.youtube.com/channel/UCB4gLXUL3SvZ1mPM6tspOkA';

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}
 const executablePath = '/usr/bin/chromium';
async function run() {
  const browser = await puppeteer.launch({
   // headless: false,
     executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--start-maximized'
    ],
    defaultViewport: null,
  });

  try {
    const page = await browser.newPage();

    // Go to the Shorts tab URL (channel_url/shorts)
    let shortsUrl = CHANNEL_URL;
    if (!shortsUrl.endsWith('/shorts')) {
      shortsUrl = shortsUrl.replace(/\/$/, '') + '/shorts';
    }
    await page.goto(shortsUrl, { waitUntil: 'networkidle2' });

    // Scroll several times to load more Shorts videos
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await delay(2000); // wait for content to load
    }

    // Extract unique Shorts video URLs
    const shortsUrls = await page.evaluate(() => {
      // Try selecting Shorts thumbnails inside ytd-reel-video-renderer elements
      const anchors = Array.from(document.querySelectorAll('ytd-reel-video-renderer a#thumbnail'));
      let urls = [];
      if (anchors.length > 0) {
        urls = anchors
          .map(a => a.href)
          .filter(href => href && href.includes('/shorts/'));
      } else {
        // Fallback: find any anchor with /shorts/ in href
        urls = Array.from(document.querySelectorAll('a'))
          .map(a => a.href)
          .filter(href => href && href.includes('/shorts/'));
      }
      // Remove duplicates
      return [...new Set(urls)];
    });

    console.log(`Found ${shortsUrls.length} unique Shorts videos.`);

    if (shortsUrls.length === 0) {
      console.warn('No Shorts videos found. Try increasing scroll count or check selectors.');
    }

    // Play each Short video for 3 seconds
    for (const url of shortsUrls) {
      console.log(`▶️ Playing Short: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2' });
      await delay(30000); // wait for player to load

      // Shorts usually autoplay, but just in case, press play toggle
      try {
        await page.keyboard.press('k');
      } catch {}

      await delay(3000); // watch 3 seconds
    }

    console.log('✅ Finished playing all Shorts.');

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await browser.close();
  }
}

run();
