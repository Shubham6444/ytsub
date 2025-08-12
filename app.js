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

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    let videosPage = CHANNEL_URL;
    if (!videosPage.endsWith('/videos')) {
      videosPage = videosPage.replace(/\/$/, '') + '/videos';
    }

    console.log(`Navigating to videos page: ${videosPage}`);
    await page.goto(videosPage, { waitUntil: 'networkidle2' });

    // Handle consent popup if any
    try {
      const consentButton = await page.$('button[aria-label="Accept all"]');
      if (consentButton) {
        console.log('Clicking consent button');
        await consentButton.click();
        await delay(3000);
      }
    } catch {}

    // Wait longer for page content to load
    await page.waitForTimeout(20000);

    // Debug screenshot (optional)
    // await page.screenshot({ path: 'page.png', fullPage: true });

    // Check how many thumbnails
    const thumbnailsCount = await page.evaluate(() => document.querySelectorAll('a#thumbnail').length);
    console.log(`Thumbnails found after wait: ${thumbnailsCount}`);
    if (thumbnailsCount === 0) {
      console.warn('No thumbnails found after wait. Exiting.');
      return;
    }

    // Extract video URLs using robust selector
    const videoUrls = await page.$$eval('a#thumbnail', anchors =>
      anchors
        .map(a => a.href)
        .filter(href => href.includes('watch'))
    );

    console.log(`Found ${videoUrls.length} videos.`);

    if (videoUrls.length === 0) {
      console.warn('No videos found. Try increasing scroll count or check selectors.');
      return;
    }

    // Scroll to load more videos just in case
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await delay(2000);
    }

    for (const url of videoUrls) {
      console.log(`▶️ Playing video: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2' });
      await delay(2000);

      try {
        await page.keyboard.press('k');
      } catch {}

      await delay(3000);
    }

    console.log('✅ Finished playing all videos.');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await browser.close();
  }
}

run();
