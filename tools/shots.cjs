// Regenerates the README screenshots in docs/screenshots/.
// Needs Node, Playwright with its Chromium (npm i -g playwright && npx playwright install chromium) and Python 3 with Pillow.
// Usage: node tools/shots.cjs            all screenshots
//        node tools/shots.cjs pop-out    only the named ones
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
const OUT = path.join(ROOT, 'docs', 'screenshots');
const APP = 'file://' + path.join(ROOT, 'index.html');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'shots-'));
const STORE = 'timeRings.v1';
const NOW = Date.parse('2026-10-27T15:40:27-04:00'); // a Tuesday afternoon in New York, so every run looks the same
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// sample data: a fictional birthdate, two timers and three custom rings
const ALL_RINGS = { sec: true, min: true, hour: true, week: true, day: true, month: true, age: true };
const ALL_MARKERS = Object.fromEntries(['quarter', 'noon', 'sun', 'work', 'night', 'weekend', 'midMonth', 'seasons', 'qyear', 'birthday', 'milestones', 'life'].map(k => [k, true]));
const focus = (extra) => Object.assign({ id: 'focus', label: 'Focus', color: '#2dd4bf', type: 'duration', total: 25 * 60000, endAt: NOW + 852000, remaining: 25 * 60000, running: true, done: false }, extra);
const tea = (extra) => Object.assign({ id: 'tea', label: 'Tea', color: '#fb923c', type: 'duration', total: 4 * 60000, endAt: NOW + 60000, remaining: 4 * 60000, running: true, done: false, shape: 'disc' }, extra);
const work = { id: 'work', label: 'Work', color: '#fb923c', type: 'daily', from: 9 * 60, dur: 8 * 60, days: [1, 2, 3, 4, 5], total: 8 * 3600000 };
const sleepRing = { id: 'sleep', label: 'Sleep', color: '#a78bfa', type: 'daily', from: 23 * 60, dur: 8 * 60, days: [0, 1, 2, 3, 4, 5, 6], total: 8 * 3600000 };
const trip = { id: 'trip', label: 'Trip', color: '#60a5fa', type: 'span', start: Date.parse('2026-10-20T08:00:00-04:00'), endAt: Date.parse('2026-11-03T20:00:00-05:00') };
trip.total = trip.endAt - trip.start;
const BASE = { brief: false, birthdate: '1990-05-12', hideOnboard: true };

// fake extension APIs, so the bookmarks bar has something to show
function mockChrome() {
  const L = (id, title, url) => ({ id, title, url });
  const bar = [L('b1', 'GitHub', 'https://github.com/'), L('b2', 'Wikipedia', 'https://www.wikipedia.org/'), L('b3', 'Calendar', 'https://calendar.example.com/'),
    { id: 'f1', title: 'Reading', children: [L('r1', 'The Life of a Typical American', 'https://waitbutwhy.com/'), L('r2', 'Time zones explained', 'https://www.timeanddate.com/'), L('r3', 'NOAA solar calculator', 'https://gml.noaa.gov/grad/solcalc/')] },
    { id: 'f2', title: 'Projects', children: [L('p1', 'Time Rings', 'https://github.com/AminTaheri23/time-rings'), L('p2', 'Notes', 'https://notes.example.com/')] },
    L('b4', 'Weather', 'https://weather.example.com/'), L('b5', 'News', 'https://news.example.com/')];
  const ev = { addListener() {} };
  Object.defineProperty(window, 'chrome', { configurable: true, writable: true, value: {
    runtime: { id: 'demo', getURL: (p) => 'https://favicons.invalid' + p },
    bookmarks: { getTree: (cb) => cb([{ id: '0', children: [{ id: '1', title: 'Bookmarks bar', children: bar }, { id: '2', title: 'Other bookmarks', children: [] }] }]),
      onCreated: ev, onRemoved: ev, onChanged: ev, onMoved: ev, onChildrenReordered: ev, onImportEnded: ev },
    topSites: { get: (cb) => cb([]) },
  } });
}
function favicon(route) { // a colored letter per site
  const page = new URL(route.request().url()).searchParams.get('pageUrl') || '';
  let host = 'x'; try { host = new URL(page).hostname.replace(/^www\./, ''); } catch (e) { /* keep x */ }
  const hue = [...host].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="hsl(${hue} 60% 48%)"/><text x="16" y="22" font-family="Inter, sans-serif" font-size="18" font-weight="700" fill="#fff" text-anchor="middle">${host[0].toUpperCase()}</text></svg>`;
  return route.fulfill({ contentType: 'image/svg+xml', body: svg });
}

// Python + Pillow: downscale the 2x capture, and frame the pop-out window
function py(code, ...args) { execFileSync('python3', ['-c', code, ...args], { stdio: 'inherit' }); }
const RESIZE = `import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
im.resize((int(sys.argv[3]), int(sys.argv[4])), Image.LANCZOS).save(sys.argv[2], optimize=True)`;
const FRAME = `import sys
from PIL import Image, ImageDraw, ImageFilter
page = Image.open(sys.argv[1]).convert('RGBA')
win = Image.open(sys.argv[2]).convert('RGBA')
s = page.width / 1200                      # the page was captured at 2x
win = win.resize((round(240 * s), round(290 * s)), Image.LANCZOS)
r = round(12 * s)
mask = Image.new('L', win.size, 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, win.width - 1, win.height - 1], r, fill=255)
x, y = page.width - win.width - round(40 * s), round(84 * s)   # in the empty space right of the dial
shadow = Image.new('RGBA', page.size, (0, 0, 0, 0))
ImageDraw.Draw(shadow).rounded_rectangle([x, y + round(10 * s), x + win.width, y + win.height + round(10 * s)], r, fill=(0, 0, 0, 150))
page = Image.alpha_composite(page, shadow.filter(ImageFilter.GaussianBlur(round(18 * s))))
page.paste(win, (x, y), mask)
edge = Image.new('RGBA', page.size, (0, 0, 0, 0))  # drawn on its own layer so the faint outline blends instead of overwriting
ImageDraw.Draw(edge).rounded_rectangle([x, y, x + win.width - 1, y + win.height - 1], r, outline=(255, 255, 255, 60), width=max(1, round(s)))
Image.alpha_composite(page, edge).convert('RGB').save(sys.argv[3])`;

async function capture(browser, name, o) {
  const vp = o.viewport || { width: 1200, height: 750 };
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, colorScheme: o.theme || 'dark', timezoneId: 'America/New_York', locale: 'en-US', isMobile: !!o.mobile, hasTouch: !!o.mobile });
  if (o.init) await ctx.addInitScript(o.init);
  await ctx.addInitScript(([k, s]) => { try { if (location.protocol === 'file:') localStorage.setItem(k, s); } catch (e) { /* no storage here */ } }, [STORE, JSON.stringify(Object.assign({}, BASE, o.state))]);
  await ctx.route('https://favicons.invalid/**', favicon);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.clock.setFixedTime(NOW);
  await page.goto(APP);
  await sleep(2400); // let the rings sweep in
  if (o.act) await o.act(page, ctx);
  const raw = path.join(TMP, name + '.png'), out = path.join(OUT, name + '.png');
  await page.screenshot({ path: raw });
  const [w, h] = o.size || [1200, 750];
  if (o.popout) { const fr = path.join(TMP, name + '-framed.png'); py(FRAME, raw, o.popout, fr); py(RESIZE, fr, out, w, h); }
  else py(RESIZE, raw, out, w, h);
  await ctx.close();
  if (errors.length) throw new Error(`${name}: ${errors.join(' | ')}`);
  console.log('wrote', path.relative(ROOT, out));
}

async function hoverRing(page, label, f) { // point at fraction f of a ring (zero at the bottom), sweeping inward until it answers
  const b = await page.$eval('#dial', el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width }; });
  const a = Math.PI / 2 + f * Math.PI * 2, cx = b.x + b.w / 2, cy = b.y + b.w / 2;
  for (let r = b.w / 2 - 2; r > 20; r -= 3) {
    await page.mouse.move(cx + r * Math.cos(a), cy + r * Math.sin(a));
    if (await page.$eval('#cLabel', el => el.textContent) === label) return;
  }
  throw new Error('ring not found: ' + label);
}

const SHOTS = {
  'everything-dark': { state: { rings: ALL_RINGS, markers: ALL_MARKERS, timers: [focus(), work] } },
  'new-user': { state: { birthdate: '' } },
  'meaning-colors': { state: { rings: ALL_RINGS } },
  'life-ring': { state: { rings: ALL_RINGS }, act: async (p) => { await hoverRing(p, 'Age', 0.215); await sleep(900); } },
  'timer-alarm': {
    state: { timers: [tea({ shape: undefined, endAt: NOW + 2000 })] },
    act: async (p) => { await p.clock.setFixedTime(NOW + 5000); await sleep(2100); }, // the glow peaks about 1.8 s into its breath
  },
  'daily-briefing': {
    theme: 'light', state: { rings: ALL_RINGS, brief: true, lastBrief: '', timers: [focus({ color: '#a78bfa' })] },
    act: async (p) => { await sleep(3000); await p.mouse.move(5, 5); },
  },
  'bookmarks': {
    init: mockChrome, state: { shortcuts: 'bar' },
    act: async (p) => { await p.click('.bm-item:has-text("Reading")'); await sleep(500); },
  },
  'light-colorblind': { theme: 'light', state: { colorblind: true, rings: ALL_RINGS, markers: ALL_MARKERS, timers: [focus(), work] } },
  'mobile': {
    viewport: { width: 390, height: 700 }, mobile: true, size: [600, 1077],
    state: { rings: { week: true, hour: true, month: true, day: true, age: true }, timers: [work, focus()] },
  },
  'custom-rings': {
    state: { ringOrder: ['month', 'week', 'hour', 't:work', 't:sleep', 't:trip'], timers: [work, sleepRing, trip] },
    act: async (p) => { await p.hover('#readout .card:has(.nm:text-is("Work"))'); await sleep(800); },
  },
  'custom-ring-dialog': {
    state: { timers: [work] },
    act: async (p) => {
      await p.click('#readout .card.add:has-text("Add ring")');
      await sleep(300);
      await p.fill('#rLabel', 'Gym');
      await p.fill('#rFrom', '18:00');
      await p.click('#rEnds button[data-v="dur"]');
      await p.fill('#rH', '1'); await p.fill('#rM', '30');
      for (const d of ['Sunday', 'Saturday']) await p.click(`#rDays .chip[aria-label="${d}"]`);
      await p.click('#rSwatches button:nth-child(3)');
      await p.mouse.move(5, 5);
      await sleep(500);
    },
  },
  'disc-timer': { theme: 'light', state: { timers: [tea()] } },
  'rings-only': { state: { minimal: 2, timers: [tea({ endAt: NOW + 150000 })] } },
  'pop-out': {
    state: { timers: [focus(), work] },
    act: async (p, ctx) => {
      const opened = ctx.waitForEvent('page');
      await p.click('#readout .card:has(.nm:text-is("Focus")) .tb[data-act="pop"]');
      const pip = await opened;
      await pip.setViewportSize({ width: 240, height: 290 });
      await sleep(800);
      SHOTS['pop-out'].popout = path.join(TMP, 'pip.png');
      await pip.screenshot({ path: SHOTS['pop-out'].popout });
      await p.hover('#readout .card:has(.nm:text-is("Focus")) .nm'); // spotlight the popped-out timer on the dial
      await sleep(600);
    },
  },
};

(async () => {
  const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SHOTS);
  const browser = await playwright().chromium.launch();
  try {
    for (const n of names) {
      if (!SHOTS[n]) throw new Error('unknown screenshot: ' + n);
      await capture(browser, n, SHOTS[n]);
    }
  } finally {
    await browser.close();
    fs.rmSync(TMP, { recursive: true, force: true });
  }
})().catch(e => { console.error(e); process.exit(1); });
