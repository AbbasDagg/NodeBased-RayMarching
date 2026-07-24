// Dataset-automation driver.
//
// Boots the CRA dev server (or reuses one already running), then repeatedly:
//   1. generates a random union-only sphere/box scene (buildScene.js)
//   2. injects it into the running app via window.__loadDatasetGraph
//      (registered by src/NodeEditor.js — bypasses the file-import dialog)
//   3. screenshots the WebGL canvas
//   4. saves {nodes, edges, primitives, meta} JSON next to the screenshot
//
// Usage:
//   node scripts/dataset/capture.js [count] [--min N] [--max N] [--port N] [--headed]
//     [--rotation on|off] [--camera-distance N] [--bundled-chromium]
//
// --rotation on (default) randomizes each shape's rotation; --rotation off
// pins every shape to {0,0,0}. The two variants are written to SEPARATE
// folders (data/scenes|images/rotation/<batch> vs .../no-rotation/<batch>) so
// a training run can pick one without the other's samples mixed in.
//
// Launches your SYSTEM-INSTALLED Chrome (Playwright's `channel: 'chrome'`) by
// default, not Playwright's bundled Chromium. On at least one dev machine, the
// bundled build hit a reproducible headless WebGL/GPU driver stall (shader
// compile hiccup on load cascading into "GPU stall due to ReadPixels" /
// "Feedback loop formed between Framebuffer and active Texture", hanging the
// screenshot) that the system Chrome install did not — 8/8 clean captures
// after switching, 0/8 before. Requires Chrome to actually be installed; pass
// --bundled-chromium to use Playwright's own browser instead (requires
// `npx playwright install chromium`).
//
// Requires the "playwright" devDependency (npm install --save-dev playwright).

'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');
const { spawn, exec } = require('child_process');

const { generateRandomUnionScene } = require('./buildScene');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(REPO_ROOT, 'data');

function parseArgs(argv) {
  const args = { count: 20, min: 2, max: 6, port: 3000, headed: false, rotation: true, cameraDistance: 15, bundledChromium: false };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--min') args.min = parseInt(argv[++i], 10);
    else if (a === '--max') args.max = parseInt(argv[++i], 10);
    else if (a === '--port') args.port = parseInt(argv[++i], 10);
    else if (a === '--headed') args.headed = true;
    else if (a === '--bundled-chromium') args.bundledChromium = true;
    else if (a === '--rotation') args.rotation = argv[++i] !== 'off';
    else if (a === '--camera-distance') args.cameraDistance = parseFloat(argv[++i]);
    else rest.push(a);
  }
  if (rest.length && !Number.isNaN(parseInt(rest[0], 10))) {
    args.count = parseInt(rest[0], 10);
  }
  return args;
}

function isPortOpen(port, host = '127.0.0.1', timeoutMs = 800) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    const done = (ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

function waitForHttp(url, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) reject(new Error(`Timed out waiting for ${url}`));
        else setTimeout(attempt, 500);
      });
      req.setTimeout(2000, () => req.destroy());
    };
    attempt();
  });
}

// Starts `npm start` (CRA dev server) as a detached child, with the browser
// auto-open disabled. Returns { proc, stop } — stop() kills the whole process
// tree (CRA/webpack-dev-server spawns child node processes on all platforms).
function startDevServer(port) {
  const env = { ...process.env, BROWSER: 'none', PORT: String(port) };
  const isWin = process.platform === 'win32';
  // On Windows, npm resolves to npm.cmd, which spawn() can't exec directly
  // without a shell (fails with EINVAL) — shell:true routes it through cmd.exe.
  const proc = spawn('npm', ['start'], {
    cwd: REPO_ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: isWin,
  });

  proc.stdout.on('data', () => {}); // swallow CRA's dev-server chatter
  proc.stderr.on('data', (d) => process.stderr.write(`[dev-server] ${d}`));

  const stop = () =>
    new Promise((resolve) => {
      if (proc.exitCode !== null) return resolve();
      if (isWin) {
        exec(`taskkill /pid ${proc.pid} /T /F`, () => resolve());
      } else {
        proc.kill('SIGTERM');
        resolve();
      }
    });

  return { proc, stop };
}

function pad(n, width) {
  return String(n).padStart(width, '0');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!Number.isFinite(args.count) || args.count <= 0) {
    console.error('count must be a positive integer');
    process.exit(1);
  }

  let playwright;
  try {
    // eslint-disable-next-line global-require
    playwright = require('playwright');
  } catch (e) {
    console.error(
      'The "playwright" package is not installed. Run:\n' +
        '  npm install --save-dev playwright\n' +
        '  npx playwright install chromium\n'
    );
    process.exit(1);
  }

  const url = `http://localhost:${args.port}/`;
  let server = null;
  const alreadyRunning = await isPortOpen(args.port);
  if (alreadyRunning) {
    console.log(`Reusing dev server already listening on port ${args.port}.`);
  } else {
    console.log(`Starting dev server on port ${args.port} (this can take up to a minute)...`);
    server = startDevServer(args.port);
  }

  const rotationDir = args.rotation ? 'rotation' : 'no-rotation';
  const batchId = `run-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const jsonDir = path.join(DATA_DIR, 'scenes', rotationDir, batchId);
  const imgDir = path.join(DATA_DIR, 'images', rotationDir, batchId);
  fs.mkdirSync(jsonDir, { recursive: true });
  fs.mkdirSync(imgDir, { recursive: true });

  // (Re)establishes page state after a fresh goto/reload: waits for the canvas
  // and dataset hook, hides UI chrome, and applies the resolution/camera-zoom
  // capture settings. Needed both on first load AND after a recovery reload,
  // since a reload resets everything injected into the page.
  async function primePage(page) {
    await page.waitForSelector('#three-scene canvas', { timeout: 60000 });
    // Hide floating UI chrome (Settings button, fullscreen toggle, debug
    // overlays, resize handles) so screenshots show only the rendered scene —
    // these overlay the canvas in normal use and would otherwise bleed into
    // the corners of every training image. See data-render-chrome in App.js.
    await page.addStyleTag({
      content: '[data-render-chrome="true"], .resize-handle { display: none !important; }',
    });
    // Confirm the dataset hook (registered by NodeEditor.js) is actually present
    // before trusting it in the loop below — fail loudly instead of silently
    // no-op'ing on every iteration.
    await page.waitForFunction(() => typeof window.__loadDatasetGraph === 'function', {
      timeout: 30000,
    });
    // Render at full resolution for crisp screenshots — the interactive default
    // (0.6) trades sharpness for framerate, which doesn't matter for stills.
    await page.evaluate(() => window.__setRenderResolution?.(1.0));
    // Zoom in — the default camera distance (36) makes shapes look small/far
    // in a still screenshot even though they comfortably fit the 10x10 window.
    await page.evaluate((d) => window.__setCameraDistance?.(d), args.cameraDistance);
  }

  let browser;
  try {
    await waitForHttp(url, 120000);

    const launchOpts = { headless: !args.headed };
    if (!args.bundledChromium) launchOpts.channel = 'chrome';
    try {
      browser = await playwright.chromium.launch(launchOpts);
    } catch (e) {
      if (launchOpts.channel) {
        console.warn('Could not launch system Chrome (not installed?) — falling back to bundled Chromium.');
        console.warn(`  (${e.message.split('\n')[0]})`);
        browser = await playwright.chromium.launch({ headless: !args.headed });
      } else {
        throw e;
      }
    }
    const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    let page = await context.newPage();
    page.on('pageerror', (err) => console.error('[page error]', err));

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await primePage(page);

    const width = String(args.count).length;
    const manifest = [];
    const skipped = [];
    // Headless Chromium's software GL occasionally hits a one-off shader
    // recompile / framebuffer stall right after a fresh page load (observed:
    // a transient "MAX_ENTITIES array size 0" shader error on the very first
    // material build, sometimes cascading into a GPU stall that hangs the
    // screenshot). It's unrelated to scene content — reloading the page gives
    // a fresh WebGL context and reliably recovers, so retry there rather than
    // aborting the whole batch over a driver hiccup.
    const MAX_ATTEMPTS = 3;

    for (let i = 0; i < args.count; i++) {
      const scene = generateRandomUnionScene({ minShapes: args.min, maxShapes: args.max, randomizeRotation: args.rotation });
      const name = `scene_${pad(i + 1, Math.max(width, 4))}`;
      const imagePath = path.join(imgDir, `${name}.png`);

      let attempt = 0;
      let ok = false;
      let lastError = null;
      while (attempt < MAX_ATTEMPTS && !ok) {
        attempt += 1;
        try {
          const loadedCount = await page.evaluate(
            ([nodes, edges]) => window.__loadDatasetGraph(nodes, edges),
            [scene.nodes, scene.edges]
          );
          if (loadedCount !== scene.nodes.length) {
            throw new Error(`app only applied ${loadedCount}/${scene.nodes.length} nodes`);
          }

          // Safety margin beyond the two-rAF wait already done inside the page:
          // gives the 16ms render-loop interval in App.js a couple more ticks to
          // push the new uniforms/textures to the GPU before we capture.
          await page.waitForTimeout(300);

          const canvas = page.locator('#three-scene canvas');
          await canvas.screenshot({ path: imagePath, timeout: 10000 });
          ok = true;
        } catch (e) {
          lastError = e;
          console.warn(`  [${name}] attempt ${attempt}/${MAX_ATTEMPTS} failed (${e.message.split('\n')[0]}); reloading page and retrying...`);
          try {
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
            await primePage(page);
          } catch (reloadErr) {
            console.warn('  reload failed, recreating page:', reloadErr.message.split('\n')[0]);
            await page.close().catch(() => {});
            page = await context.newPage();
            page.on('pageerror', (err) => console.error('[page error]', err));
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await primePage(page);
          }
        }
      }

      if (!ok) {
        console.error(`  [${name}] gave up after ${MAX_ATTEMPTS} attempts — skipping. Last error: ${lastError?.message?.split('\n')[0]}`);
        skipped.push(name);
        continue;
      }

      const record = {
        nodes: scene.nodes,
        edges: scene.edges,
        primitives: scene.primitives,
        meta: {
          index: i + 1,
          shapeCount: scene.shapeCount,
          generatedAt: new Date().toISOString(),
          image: path.relative(DATA_DIR, imagePath).replace(/\\/g, '/'),
        },
      };
      const jsonPath = path.join(jsonDir, `${name}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(record, null, 2));
      manifest.push({ name, shapeCount: scene.shapeCount });

      console.log(`[${i + 1}/${args.count}] ${name}: ${scene.shapeCount} shape(s) -> saved.`);
    }

    if (skipped.length) {
      console.warn(`\n${skipped.length} scene(s) skipped after repeated capture failures: ${skipped.join(', ')}`);
    }

    fs.writeFileSync(
      path.join(jsonDir, '_manifest.json'),
      JSON.stringify(
        { batchId, count: args.count, min: args.min, max: args.max, rotation: args.rotation, cameraDistance: args.cameraDistance, samples: manifest, skipped },
        null,
        2
      )
    );

    console.log(`\nDone. ${manifest.length}/${args.count} samples (rotation: ${args.rotation ? 'on' : 'off'}) written to:`);
    console.log(`  JSON:   ${jsonDir}`);
    console.log(`  Images: ${imgDir}`);
  } finally {
    if (browser) await browser.close();
    if (server) {
      console.log('Stopping dev server we started...');
      await server.stop();
    }
  }
}

main().catch((err) => {
  console.error('Dataset capture failed:', err);
  process.exitCode = 1;
});
