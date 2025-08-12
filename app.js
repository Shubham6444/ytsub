const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const CHANNEL_URL = process.env.CHANNEL_URL || 'https://www.youtube.com/@shubhamfreestyle';

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

const executablePath = '/usr/bin/chromium';  // Your system chromium path

async function run() {
  const browser = await puppeteer.launch({
    // Set to true if you want no browser UI
    headless: true,

    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--start-maximized',
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

    console.log(`Navigating to Shorts URL: ${shortsUrl}`);
    await page.goto(shortsUrl, { waitUntil: 'networkidle2' });

    // Scroll multiple times to load more Shorts videos
    for (let i = 0; i < 15; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await delay(2500);
    }

    // Optional: screenshot to debug page content during development
    // await page.screenshot({ path: 'shorts_page.png', fullPage: true });

    // Extract unique Shorts video URLs with improved selector logic
    const shortsUrls = await page.evaluate(() => {
      // Try to get all anchors with href containing '/shorts/'
      const anchors = Array.from(document.querySelectorAll('a'));
      const urls = anchors
        .map(a => a.href)
        .filter(href => href && href.includes('/shorts/'));

      return [...new Set(urls)]; // Remove duplicates
    });

    console.log(`Found ${shortsUrls.length} unique Shorts videos.`);

    if (shortsUrls.length === 0) {
      console.warn('No Shorts videos found. Try increasing scroll count or check selectors.');
      return;
    }

    // Play each Short video for about 3 seconds
    for (const url of shortsUrls) {
      console.log(`▶️ Playing Short: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2' });
      await delay(3000); // wait for player to load and play

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
