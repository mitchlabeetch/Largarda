/**
 * take-screenshots.mjs
 * Navigate headless Chrome to the previewer and capture all 3 animation states.
 * Usage: node scripts/take-screenshots.mjs
 */
import { writeFileSync } from 'fs';
import { mkdirSync } from 'fs';

const CDP_PORT = 9222;
const PREVIEWER_URL = 'http://localhost:5188/';
const OUT_DIR = '/tmp/previewer-screenshots';
const WAIT_MS = 4000; // wait for assets to load

async function cdpRequest(sessionId, method, params = {}) {
  const wsUrl = `ws://localhost:${CDP_PORT}/json`;
  // Use fetch for JSON API
  const res = await fetch(`http://localhost:${CDP_PORT}/json`);
  const tabs = await res.json();
  return tabs;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Use CDP via WebSocket
async function runCDP() {
  mkdirSync(OUT_DIR, { recursive: true });

  // Get list of targets
  const tabsRes = await fetch(`http://localhost:${CDP_PORT}/json`);
  const tabs = await tabsRes.json();
  console.log('Open tabs:', tabs.map(t => `${t.id}: ${t.url}`).join('\n'));

  // Find the previewer tab
  let target = tabs.find(t => t.url && t.url.includes('localhost:5188'));
  if (!target) {
    target = tabs.find(t => t.type === 'page' && !t.url.startsWith('chrome-extension'));
  }
  if (!target) {
    console.error('No page target found');
    process.exit(1);
  }
  console.log('Using target:', target.id, target.url);

  const wsUrl = target.webSocketDebuggerUrl;

  // Connect via WebSocket
  const { WebSocket } = await import('ws');
  const ws = new WebSocket(wsUrl);

  let msgId = 1;
  const pending = new Map();

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  });

  await new Promise(r => ws.on('open', r));
  console.log('WebSocket connected');

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  // Enable Page domain
  await send('Page.enable', {});

  // Navigate to previewer and wait for load
  const navPromise = new Promise(resolve => {
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.method === 'Page.loadEventFired') resolve();
    });
  });
  await send('Page.navigate', { url: PREVIEWER_URL });
  console.log('Navigated to', PREVIEWER_URL);
  await Promise.race([navPromise, sleep(5000)]);
  await sleep(WAIT_MS); // extra wait for PixiJS / texture load

  // Set viewport
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
  });

  const states = ['idle', 'working', 'sleeping'];

  for (const state of states) {
    // Click the state button via JS
    await send('Runtime.evaluate', {
      expression: `
        (function() {
          const btns = document.querySelectorAll('button');
          for (const b of btns) {
            if (b.textContent.includes('${state === 'idle' ? '空闲' : state === 'working' ? '工作' : '睡觉'}')) {
              b.click();
              return 'clicked ' + b.textContent.trim();
            }
          }
          return 'not found';
        })()
      `,
    });
    console.log(`Switched to state: ${state}`);
    await sleep(800);

    // Screenshot
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    const outPath = `${OUT_DIR}/${state}.png`;
    writeFileSync(outPath, Buffer.from(data, 'base64'));
    console.log(`Saved: ${outPath}`);
  }

  ws.close();
  console.log('Done. Screenshots in:', OUT_DIR);
}

runCDP().catch(e => { console.error(e); process.exit(1); });
