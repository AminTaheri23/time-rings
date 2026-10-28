// Records the README demo: docs/demo.mp4 (with music), docs/demo.gif and docs/demo-music.ogg.
// tools/demo-video/timeline.json sets the beat: this script records the app acting on its bars (Playwright),
// tools/demo_music.py writes music to the same bars, and Remotion (tools/demo-video) lays the captions over both.
// Needs Node, Playwright with its Chromium, Python 3 with numpy, and ffmpeg; `npm ci` runs in tools/demo-video if needed.
// Usage: node tools/demo.cjs   (set REMOTION_BROWSER to a Chrome headless shell to skip Remotion's own download)
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function playwright() { // a local install, else the global one
  try { return require('playwright'); } catch (e) {
    const { createRequire } = require('module');
    return createRequire(execFileSync('npm', ['root', '-g']).toString().trim() + '/')('playwright');
  }
}
const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const VIDEO = path.join(__dirname, 'demo-video');
const PUB = path.join(VIDEO, 'public');
const APP = 'file://' + path.join(ROOT, 'index.html');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'demo-'));
const TL = JSON.parse(fs.readFileSync(path.join(VIDEO, 'timeline.json'), 'utf8'));
const W = 1280, H = 800, FPS = 30, PIP = 300;
const BAR = 240 / TL.bpm, FOOT = TL.footageAt, LEN = (TL.bars - FOOT) * BAR; // seconds of footage
const BASE = Date.parse('2026-10-27T15:40:20-04:00'); // a Tuesday afternoon in autumn
const STATE = { brief: false, hideOnboard: true, rings: { age: false, month: true, day: false, week: true, hour: true, min: false, sec: false } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: ['ignore', 'ignore', 'inherit'], ...opts });

function setup([store, state]) { // runs in the page: seed settings, and draw a cursor so viewers see where clicks go
  if (location.protocol !== 'file:') return;
  try { localStorage.setItem(store, state); } catch (e) { /* no storage */ }
  addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div');
    c.popover = 'manual'; // the top layer, so it can sit above open dialogs
    c.style.cssText = 'position:fixed;inset:auto;left:0;top:0;margin:-11px 0 0 -11px;padding:0;width:22px;height:22px;border-radius:50%;border:2px solid rgba(255,255,255,.92);background:rgba(255,255,255,.2);box-shadow:0 1px 6px rgba(0,0,0,.55);pointer-events:none;overflow:visible;transition:transform .1s;transform:translate(-99px,-99px)';
    document.body.append(c); c.showPopover();
    let x = -99, y = -99, s = 1;
    const put = () => { c.style.transform = `translate(${x}px,${y}px) scale(${s})`; };
    addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; put(); }, true);
    addEventListener('pointerdown', () => { s = 0.72; put(); }, true);
    addEventListener('pointerup', () => { s = 1; put(); }, true);
    window.__cursorTop = () => { c.hidePopover(); c.showPopover(); }; // after a dialog opens
  });
}
async function screencast(ctx, page, frames, size) {
  const cdp = await ctx.newCDPSession(page);
  cdp.on('Page.screencastFrame', (f) => {
    frames.push({ ts: f.metadata.timestamp || Date.now() / 1000, data: f.data });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: size[0], maxHeight: size[1] });
  return () => cdp.send('Page.stopScreencast').catch(() => {});
}

let mx = W - 60, my = H - 40;
const ease = (k) => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
async function glide(page, x, y, ms = 550) { // eased pointer move, so the cursor travels instead of jumping
  const steps = Math.max(5, Math.round(ms / 28)), x0 = mx, y0 = my; // each step also waits on the browser, about 28 ms in all
  for (let i = 1; i <= steps; i++) {
    const e = ease(i / steps);
    await page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e);
    await sleep(12);
  }
  mx = x; my = y;
}
async function click(page, sel, ms) {
  const b = await page.locator(sel).first().boundingBox();
  await glide(page, b.x + b.width / 2, b.y + b.height / 2, ms);
  await sleep(110); await page.mouse.down(); await sleep(70); await page.mouse.up();
}
const dial = (page) => page.$eval('#dial', el => { const r = el.getBoundingClientRect(); return { cx: r.x + r.width / 2, cy: r.y + r.height / 2, w: r.width }; });
const toXY = (d, r, f) => { const a = Math.PI / 2 + f * Math.PI * 2; return [d.cx + r * Math.cos(a), d.cy + r * Math.sin(a)]; }; // f = 0 at the bottom
const ORDER = ['Month of year', 'Day of week', 'Hours']; // the shown rings, outside in
function ringR(d, label) { // the app's relayout(): equal-width rings from the edge in, before any timer is added
  const R0 = d.w / 2 - Math.max(5, d.w * 0.012), minC = d.w * (d.w < 520 ? 0.16 : 0.2);
  const unit = Math.min(d.w * 0.068, (R0 - minC) / ORDER.length);
  return R0 - unit * (ORDER.indexOf(label) + 0.5);
}
async function hoverRing(page, label, f) { // glide onto a ring at fraction f; returns where it is
  const d = await dial(page), r = ringR(d, label);
  await glide(page, ...toXY(d, r, f), 520);
  const got = await page.$eval('#cLabel', el => el.textContent);
  if (got !== label) console.warn(`  expected to hover ${label}, got ${got}`);
  return { d, r };
}
async function sweepRing(page, label, f0, f1, ms) { // onto the ring, then run the pointer along it
  const g = await hoverRing(page, label, f0);
  const steps = Math.round(ms / 28);
  for (let i = 1; i <= steps; i++) {
    [mx, my] = toXY(g.d, g.r, f0 + (f1 - f0) * ease(i / steps));
    await page.mouse.move(mx, my);
    await sleep(12);
  }
}
const typeSlow = (page, s) => page.keyboard.type(s, { delay: 65 });

(async () => {
  const browser = await playwright().chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, colorScheme: 'dark', timezoneId: 'America/New_York', locale: 'en-US' });
  await ctx.addInitScript(setup, ['timeRings.v1', JSON.stringify(STATE)]);

  // the page's clock: real time, except for the time-lapse while the 25-minute timer runs down
  let sim = BASE, last = Date.now(), lapse = null, ticking = true;
  await ctx.clock.setFixedTime(sim);
  const ticker = (async () => {
    while (ticking) {
      const now = Date.now();
      let next = sim + (now - last);
      if (lapse) { // fast-forward so the timer ends right on its downbeat
        next = sim + (now - last) * Math.max(1, (lapse.end - sim) / Math.max(1, lapse.realEnd - now));
        if (next >= lapse.end || now >= lapse.realEnd) { next = Math.max(next, lapse.end); lapse = null; }
      }
      sim = next; last = now;
      await ctx.clock.setFixedTime(sim);
      await sleep(25);
    }
  })();

  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const main = [], pipFrames = [];
  const stopMain = await screencast(ctx, page, main, [W, H]);
  const t0 = Date.now() / 1000;
  const until = async (bar) => { // wait for a bar of the timeline (footage starts at bar FOOT)
    const w = (t0 + (bar - FOOT) * BAR) * 1000 - Date.now();
    if (w > 0) await sleep(w); else if (w < -200) console.warn(`  late for bar ${bar} by ${Math.round(-w)} ms`);
  };
  await page.goto(APP); // the rings sweep in on the first downbeat after the intro

  const T = new Date(new Date(BASE).toLocaleString('en-US', { timeZone: 'America/New_York' })), dayF = (T.getHours() + T.getMinutes() / 60) / 24; // the page's wall time
  await until(3.4); await glide(page, 1040, 610, 800);
  // see the day, the week and the year
  await until(4.0); await hoverRing(page, 'Hours', dayF);
  await until(4.67); await hoverRing(page, 'Day of week', (T.getDay() + dayF) / 7);
  await until(5.33); await hoverRing(page, 'Month of year', 299.6 / 365);
  // daylight from dawn to dusk, then the seasons
  await until(6.0); await sweepRing(page, 'Hours', 0.24, 0.84, BAR * 600);
  await until(7.0); await sweepRing(page, 'Month of year', 0.03, 0.93, BAR * 600);
  await until(7.85); await glide(page, 1040, 560, 500);

  // a 25-minute Focus timer, drawn as a disc
  await until(8.35); await click(page, '#addTimerBtn', 600);
  await sleep(250); await page.evaluate(() => window.__cursorTop && window.__cursorTop());
  await click(page, '#tLabel', 350); await typeSlow(page, 'Focus');
  await until(9.25); await click(page, '#tShape button[data-v="disc"]', 400);
  await until(9.62); await click(page, '#timerForm button[type=submit]', 400);
  await until(10.05);
  const endAt = await page.evaluate(() => JSON.parse(localStorage.getItem('timeRings.v1')).timers[0].endAt);
  await glide(page, 1030, 640, 500);
  await until(TL.cues.lapse[0]); lapse = { end: endAt, realEnd: (t0 + (TL.cues.lapse[1] - FOOT) * BAR) * 1000 };

  // pop the rings out over everything
  const opened = ctx.waitForEvent('page');
  await until(TL.cues.pop - 0.3); await click(page, '#popBtn', 450);
  const pip = await opened; // recorded at the page's size: its dial is drawn in the center square, cropped out below
  const stopPip = await screencast(ctx, pip, pipFrames, [W, H]);
  await sleep(500); await glide(page, 1060, 640, 600);

  await until(TL.bars + 0.05); // the timer ends on its downbeat; the outro plays over the glow
  await stopPip(); await stopMain();
  ticking = false; await ticker;
  await browser.close();
  if (errors.length) throw new Error(errors.join(' | '));

  // frames → steady 30 fps clips: the page from t0, the pop-out from its first frame
  const write = (list, dir) => { fs.mkdirSync(dir); return list.map((f, i) => { const p = path.join(dir, `${i}.jpg`); fs.writeFileSync(p, Buffer.from(f.data, 'base64')); return { ts: f.ts, p }; }); };
  const at = (list, t) => { let best = list[0]; for (const f of list) { if (f.ts <= t) best = f; else break; } return best; };
  function clip(list, from, to, file, vf = 'null') {
    const dir = path.join(TMP, 'clip-' + path.basename(file, '.mp4'));
    fs.mkdirSync(dir);
    let n = 0;
    for (let t = from; t < to; t += 1 / FPS) fs.copyFileSync(at(list, t).p, path.join(dir, String(n++).padStart(5, '0') + '.jpg'));
    run('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, '%05d.jpg'), '-vf', vf, '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', file]);
    return n;
  }
  fs.mkdirSync(PUB, { recursive: true });
  const mf = write(main, path.join(TMP, 'main')), pf = write(pipFrames, path.join(TMP, 'pip'));
  const frames = clip(mf, t0, t0 + LEN, path.join(PUB, 'screen.mp4'));
  const pipStart = pf[0].ts - t0;
  clip(pf, pf[0].ts, t0 + LEN, path.join(PUB, 'pip.mp4'), `crop=ih:ih,pad=iw*1.04:ih*1.04:(ow-iw)/2:(oh-ih)/2:color=0x090b10,scale=${PIP * 2}:${PIP * 2}:flags=lanczos`);
  fs.writeFileSync(path.join(PUB, 'footage.json'), JSON.stringify({ pipStart, pipEnd: LEN }));

  // music on the same bars, then Remotion puts it all together
  const wav = path.join(PUB, 'music.wav');
  run('python3', [path.join(__dirname, 'demo_music.py'), wav, path.join(VIDEO, 'timeline.json')]);
  if (!fs.existsSync(path.join(VIDEO, 'node_modules'))) run('npm', ['ci'], { cwd: VIDEO });
  const raw = path.join(TMP, 'demo.mp4');
  run('npx', ['remotion', 'render', 'src/index.ts', 'Demo', raw, '--props=public/footage.json', '--crf=20', '--audio-codec=aac', '--audio-bitrate=128k',
    ...(process.env.REMOTION_BROWSER ? ['--browser-executable=' + process.env.REMOTION_BROWSER] : [])], { cwd: VIDEO });
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-c', 'copy', '-movflags', '+faststart', path.join(DOCS, 'demo.mp4')]);
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libopus', '-b:a', '96k', path.join(DOCS, 'demo-music.ogg')]);
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(DOCS, 'demo.mp4'), '-vf',
    'fps=8,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff:max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle', path.join(DOCS, 'demo.gif')]);
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`wrote docs/demo.mp4, docs/demo.gif and docs/demo-music.ogg (${(TL.bars * BAR).toFixed(1)} s; ${frames} footage frames, pop-out from ${pipStart.toFixed(2)} s)`);
})().catch(e => { console.error(e); process.exit(1); });
