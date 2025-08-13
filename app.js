const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));

// Serve UI form
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>YouTube Auto Play Single Video</title></head>
    <body>
      <h1>YouTube Auto Play Single Video</h1>
      <form id="form" method="POST" action="/start">
        <label>YouTube Video URL: </label>
        <input type="url" name="videoUrl" placeholder="https://youtu.be/..." style="width:400px" required>
        <button type="submit">Start Playing</button>
      </form>

      <h2>Logs:</h2>
      <pre id="log" style="background:#eee; height:300px; overflow:auto; padding:10px;"></pre>

      <script>
        const form = document.getElementById('form');
        const log = document.getElementById('log');

        form.addEventListener('submit', e => {
          e.preventDefault();
          log.textContent = '';

          const videoUrl = form.videoUrl.value;
          if (!videoUrl) return alert('Please enter a video URL');

          const evtSource = new EventSource('/logs');

          evtSource.onmessage = function(event) {
            log.textContent += event.data + '\\n';
            log.scrollTop = log.scrollHeight;
            if(event.data.includes('✅ Finished playing video.') || event.data.includes('❌ Error:')) {
              evtSource.close();
            }
          };

          fetch('/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'videoUrl=' + encodeURIComponent(videoUrl)
          });
        });
      </script>
    </body>
    </html>
  `);
});

// Store clients connected for SSE
const clients = [];

app.get('/logs', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();

  clients.push(res);

  req.on('close', () => {
    const index = clients.indexOf(res);
    if (index !== -1) clients.splice(index, 1);
  });
});

// Function to send logs to all clients
function sendLog(message) {
  clients.forEach(res => {
    res.write(`data: ${message}\n\n`);
  });
}

app.post('/start', async (req, res) => {
  const VIDEO_URL = req.body.videoUrl;
  if (!VIDEO_URL) return res.status(400).send('Video URL required');

  res.send('Started'); // immediate response

  function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  try {
    sendLog(`🚀 Starting Puppeteer for video: ${VIDEO_URL}`);
const executablePath = '/usr/bin/chromium';

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

    const page = await browser.newPage();

    sendLog(`⏳ Navigating to video: ${VIDEO_URL}`);
    await page.goto(VIDEO_URL, { waitUntil: 'networkidle2' });
    await delay(2000); // wait for player load

    // Play video from start
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const video = document.querySelector('video');
        if (!video) {
          resolve();
          return;
        }
        video.currentTime = 0;

        const tryPlay = () => {
          video.play().then(() => {
            if (!video.paused && !video.ended) {
              resolve();
            } else {
              setTimeout(tryPlay, 500);
            }
          }).catch(() => {
            setTimeout(tryPlay, 500);
          });
        };
        tryPlay();
      });
    });

    // Wait for ads to finish
    await page.evaluate(() => new Promise(resolve => {
      const checkAds = () => {
        if (!document.querySelector('.ad-showing')) resolve();
        else setTimeout(checkAds, 1000);
      };
      checkAds();
    }));

    // Wait for video to end
    await page.evaluate(() => new Promise(resolve => {
      const video = document.querySelector('video');
      if (!video) {
        setTimeout(resolve, 10000);
        return;
      }
      if (video.ended) {
        resolve();
        return;
      }
      video.addEventListener('ended', () => resolve());
    }));

    sendLog(`⏹️ Video ended: ${VIDEO_URL}`);
    sendLog('✅ Finished playing video.');

    await browser.close();
  } catch (err) {
    sendLog('❌ Error: ' + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
