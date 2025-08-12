// youtube_auto_play_all.js
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const CHANNEL_URL = process.env.CHANNEL_URL || 'https://www.youtube.com/channel/UCB4gLXUL3SvZ1mPM6tspOkA';

// Delay helper
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
      '--start-maximized'
    ],
    defaultViewport: null,
  });

  try {
    const page = await browser.newPage();

    // Go to channel videos tab (add /videos to URL)
    let videosPage = CHANNEL_URL;
    if (!videosPage.endsWith('/videos')) {
      videosPage = videosPage.replace(/\/$/, '') + '/videos';
    }
    await page.goto(videosPage, { waitUntil: 'networkidle2' });

    // Scroll down to load more videos (optional, adjust times as needed)
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await delay(1500);
    }

    // Grab all video URLs on the page
    const videoUrls = await page.$$eval('a#thumbnail', anchors =>
      anchors
        .map(a => a.href)
        .filter(href => href.includes('watch'))
    );

    console.log(`Found ${videoUrls.length} videos.`);

    // Play each video for 3 seconds
    for (const url of videoUrls) {
      console.log(`▶️ Playing video: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle2' });
      await delay(2000); // wait for player to load

      // Attempt to play if paused
      try {
        await page.keyboard.press('k');
      } catch {}

      await delay(3000); // watch 3 seconds
    }

    console.log('✅ Finished playing all videos.');

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await browser.close();
  }
}

run();
youtube_auto_play_shorts_full.js
