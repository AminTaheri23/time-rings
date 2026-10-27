// Records the README demo: docs/demo.mp4 (with music), docs/demo.gif and docs/demo-music.ogg.
// Needs Node, Playwright with its Chromium, Python 3 with numpy and Pillow, and ffmpeg.
// Usage: node tools/demo.cjs
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
const APP = 'file://' + path.join(ROOT, 'index.html');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'demo-'));
const W = 1280, H = 800, FPS = 30, TEA_S = 10;
const STATE = { brief: false, birthdate: '1990-05-12', hideOnboard: true, rings: { age: true, month: true, day: true, week: true, hour: true, min: true, sec: false } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'ignore', 'inherit'] });

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
async function screencast(ctx, page, frames) {
  const cdp = await ctx.newCDPSession(page);
  cdp.on('Page.screencastFrame', (f) => {
    frames.push({ ts: f.metadata.timestamp || Date.now() / 1000, data: f.data });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H });
  return () => cdp.send('Page.stopScreencast').catch(() => {});
}

let mx = W / 2, my = H / 2;
async function glide(page, x, y, ms = 550) { // eased pointer move, so the cursor travels instead of jumping
  const steps = Math.max(5, Math.round(ms / 28)), x0 = mx, y0 = my; // each step also waits on the browser, about 28 ms in all
  for (let i = 1; i <= steps; i++) {
    const k = i / steps, e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    await page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e);
    await sleep(12);
  }
  mx = x; my = y;
}
async function hover(page, sel, ms) {
  const el = page.locator(sel).first();
  await el.scrollIntoViewIfNeeded();
  const b = await el.boundingBox();
  await glide(page, b.x + b.width / 2, b.y + b.height / 2, ms);
}
async function click(page, sel, ms) {
  await hover(page, sel, ms);
  await sleep(110); await page.mouse.down(); await sleep(70); await page.mouse.up();
}
async function hoverRing(page, label, f) { // glide in from the edge at fraction f (zero at the bottom) until the ring answers
  const b = await page.$eval('#dial', el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width }; });
  const a = Math.PI / 2 + f * Math.PI * 2, cx = b.x + b.w / 2, cy = b.y + b.w / 2;
  await glide(page, cx + (b.w / 2 + 30) * Math.cos(a), cy + (b.w / 2 + 30) * Math.sin(a), 500);
  for (let r = b.w / 2; r > 20; r -= 6) {
    await page.mouse.move(cx + r * Math.cos(a), cy + r * Math.sin(a)); mx = cx + r * Math.cos(a); my = cy + r * Math.sin(a);
    await sleep(16);
    if (await page.$eval('#cLabel', el => el.textContent) === label) return;
  }
}
const typeSlow = (page, s) => page.keyboard.type(s, { delay: 65 });

// Python + Pillow: lay the pop-out window over the page frames
const COMPOSE = `import sys, json, shutil
from PIL import Image, ImageDraw, ImageFilter
m = json.load(open(sys.argv[1]))
W, H = m['size']
ww, wh = 240, 290
x, y, r = W - ww - 44, 96, 12
mask = Image.new('L', (ww, wh), 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, ww - 1, wh - 1], r, fill=255)
shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(shadow).rounded_rectangle([x, y + 10, x + ww, y + wh + 10], r, fill=(0, 0, 0, 150))
shadow = shadow.filter(ImageFilter.GaussianBlur(18))
edge = Image.new('RGBA', (W, H), (0, 0, 0, 0))  # its own layer, so the faint outline blends
ImageDraw.Draw(edge).rounded_rectangle([x, y, x + ww - 1, y + wh - 1], r, outline=(255, 255, 255, 60), width=1)
prev, last = None, None
for i, (a, b) in enumerate(m['frames']):
    out = '%s/%05d.jpg' % (m['out'], i)
    if (a, b) == prev:
        shutil.copyfile(last, out)
    else:
        im = Image.open(a).convert('RGB').resize((W, H))
        if b:
            im = Image.alpha_composite(im.convert('RGBA'), shadow)
            win = Image.open(b).convert('RGBA').resize((ww, wh), Image.LANCZOS)
            im.paste(win, (x, y), mask)
            im = Image.alpha_composite(im, edge).convert('RGB')
        im.save(out, quality=92)
    prev, last = (a, b), out`;

(async () => {
  const browser = await playwright().chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, colorScheme: 'dark', timezoneId: 'America/New_York', locale: 'en-US' });
  await ctx.addInitScript(setup, ['timeRings.v1', JSON.stringify(STATE)]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const main = [], pipFrames = [];
  const stopMain = await screencast(ctx, page, main);
  await page.goto(APP);
  const t0 = Date.now() / 1000;
  const cursorTop = () => page.evaluate(() => window.__cursorTop && window.__cursorTop());

  await sleep(2600); // the rings sweep in
  await hoverRing(page, 'Month of year', 0.62); await sleep(1100);
  await hover(page, '#readout .card[data-key="age"] .nm', 600); await sleep(1500); // the life data fans out

  // a custom ring: Work, weekdays 09:00–17:00
  await click(page, '#readout .card.add:has-text("Add ring")', 600); await sleep(300); await cursorTop();
  await click(page, '#rLabel', 300); await typeSlow(page, 'Work');
  await click(page, '#rDays .chip[aria-label="Sunday"]', 350);
  await click(page, '#rDays .chip[aria-label="Saturday"]', 350);
  await sleep(400); await click(page, '#rSave', 350); await sleep(1400);

  // a short timer, drawn as a disc
  await click(page, '#addTimerBtn', 500); await sleep(300); await cursorTop();
  await click(page, '#tLabel', 300); await typeSlow(page, 'Tea');
  await click(page, '#tM', 300); await page.keyboard.press('Control+A'); await typeSlow(page, '0');
  await click(page, '#tS', 250); await page.keyboard.press('Control+A'); await typeSlow(page, String(TEA_S));
  await click(page, '#tShape button[data-v="disc"]', 300); await sleep(250);
  await click(page, '#timerForm button[type=submit]', 300);
  const teaEnd = Date.now() + TEA_S * 1000;
  await sleep(1100);

  // pop it out
  const pop = '#readout .card:has(.nm:text-is("Tea")) .tb[data-act="pop"]';
  const opened = ctx.waitForEvent('page');
  await click(page, pop, 500);
  const pip = await opened;
  await pip.setViewportSize({ width: 240, height: 290 });
  const stopPip = await screencast(ctx, pip, pipFrames);
  await sleep(3000);
  await click(page, pop, 300);
  const pipEnd = Date.now() / 1000;
  await stopPip();
  await sleep(300);

  // rings only, until the tea is done; a click stops the alarm, M brings everything back
  await glide(page, W - 170, H / 2 + 120, 500);
  await page.keyboard.press('m'); await sleep(900); await page.keyboard.press('m');
  while (Date.now() < teaEnd + 2200) await sleep(100);
  await sleep(110); await page.mouse.down(); await sleep(70); await page.mouse.up();
  await sleep(800); await page.keyboard.press('m'); await sleep(1900);
  await stopMain();
  await browser.close();
  if (errors.length) throw new Error(errors.join(' | '));

  // frames → a steady 30 fps sequence, with the pop-out laid over while it was open
  const write = (list, dir) => { fs.mkdirSync(dir); return list.map((f, i) => { const p = path.join(dir, `${i}.jpg`); fs.writeFileSync(p, Buffer.from(f.data, 'base64')); return { ts: f.ts, p }; }); };
  const mf = write(main.filter(f => f.ts >= t0), path.join(TMP, 'main')), pf = write(pipFrames, path.join(TMP, 'pip'));
  const at = (list, t) => { let best = null; for (const f of list) { if (f.ts <= t) best = f; else break; } return best; };
  const start = mf[0].ts, end = mf[mf.length - 1].ts, dur = end - start;
  const frames = [];
  for (let t = start; t <= end; t += 1 / FPS) {
    const p = pf.length && t >= pf[0].ts && t < pipEnd ? at(pf, t) : null;
    frames.push([at(mf, t).p, p ? p.p : null]);
  }
  const out = path.join(TMP, 'out'); fs.mkdirSync(out);
  fs.writeFileSync(path.join(TMP, 'm.json'), JSON.stringify({ size: [W, H], out, frames }));
  run('python3', ['-c', COMPOSE, path.join(TMP, 'm.json')]);

  const wav = path.join(TMP, 'music.wav');
  run('python3', [path.join(__dirname, 'demo_music.py'), wav, dur.toFixed(2)]);
  run('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(out, '%05d.jpg'), '-i', wav,
    '-c:v', 'libx264', '-crf', '22', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', path.join(DOCS, 'demo.mp4')]);
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libopus', '-b:a', '96k', path.join(DOCS, 'demo-music.ogg')]);
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(DOCS, 'demo.mp4'), '-vf',
    'fps=10,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff:max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle', path.join(DOCS, 'demo.gif')]);
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`wrote docs/demo.mp4, docs/demo.gif and docs/demo-music.ogg (${dur.toFixed(1)} s, ${frames.length} frames)`);
})().catch(e => { console.error(e); process.exit(1); });
