(function () {
'use strict';

/* ---------- constants ---------- */
const $ = (s) => document.querySelector(s);
const TAU = Math.PI * 2;
const STORE = 'timeRings.v1';
const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const darkMQ = window.matchMedia('(prefers-color-scheme: dark)');
const FONT = 'ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const DAY = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAY3 = DAY.map(d => d.slice(0, 3));
const MON = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MON3 = MON.map(m => m.slice(0, 3));

// speed: 0 = fastest ... 6 = slowest. Palette colors are picked by speed, so color always means "how fast".
const RINGS = {
  sec:   { name: 'Seconds',       short: 'SEC',   speed: 0, cycle: '1-minute cycle' },
  min:   { name: 'Minutes',       short: 'MIN',   speed: 1, cycle: '1-hour cycle' },
  hour:  { name: 'Hours',         short: 'HOUR',  speed: 2, cycle: '1-day cycle' },
  week:  { name: 'Day of week',   short: 'WEEK',  speed: 3, cycle: '1-week cycle' },
  day:   { name: 'Day of month',  short: 'DAY',   speed: 4, cycle: '1-month cycle' },
  month: { name: 'Month of year', short: 'MONTH', speed: 5, cycle: '1-year cycle' },
  age:   { name: 'Age',           short: 'AGE',   speed: 6, cycle: '100-year cycle' },
};
const RING_IDS = Object.keys(RINGS);
const ORDERS = {
  slowOut: ['age','month','day','week','hour','min','sec'],
  sketch:  ['month','age','day','week','hour','min','sec'],
  fastOut: ['sec','min','hour','week','day','month','age'],
};
const MARKERS = [
  { id: 'quarter',    label: 'Quarter marks :15 :30 :45', where: 'Seconds and minutes rings', glyph: '▼' },
  { id: 'noon',       label: 'Midnight and noon',        where: 'Hours ring',                glyph: '▼' },
  { id: 'sun',        label: 'Sunrise and sunset',       where: 'Hours ring · from your location', glyph: '◆' },
  { id: 'work',       label: 'Work hours 9–17',          where: 'Hours ring · dashed band',  glyph: '╍' },
  { id: 'night',      label: 'Night 22–06',              where: 'Hours ring · dotted band',  glyph: '┈' },
  { id: 'weekend',    label: 'Weekends',                 where: 'Week and day rings · dashed band', glyph: '╍' },
  { id: 'midMonth',   label: 'Mid-month and last day',   where: 'Day of month ring',         glyph: '●' },
  { id: 'seasons',    label: 'Solstices and equinoxes',  where: 'Month ring',                glyph: '◆' },
  { id: 'qyear',      label: 'Quarters Q1–Q4',           where: 'Month ring',                glyph: '▮' },
  { id: 'birthday',   label: 'Birthday',                 where: 'Month and day rings',       glyph: '★' },
  { id: 'milestones', label: 'Your life milestones',     where: 'Age ring · the ages you list above', glyph: '●' },
  { id: 'life',       label: 'Typical life data (US)',   where: 'Age ring · driving, voting, marriage, first child, life expectancy…', glyph: '○' },
];
const PALETTES = {
  heat:     { name: 'Heat', desc: 'Temperature scale: fast rings run hot (red, orange), slow rings run cold (blue, violet).', c: ['#ff3b30','#ff7a1a','#ffc21a','#9be33a','#22d3ee','#3b82f6','#8b5cf6'] },
  spectrum: { name: 'Light spectrum', desc: 'Like light frequency: fast rings are high-frequency violet, slow rings are low-frequency red.', c: ['#a855f7','#6366f1','#3b82f6','#22c55e','#eab308','#f97316','#ef4444'] },
  viridis:  { name: 'Viridis', desc: 'Perceptually even steps: fast rings are bright yellow, slow rings fade to deep blue.', c: ['#fde725','#b5de2b','#6ece58','#35b779','#1f9e89','#26828e','#3e4989'] },
};
const CB = { name: 'Okabe–Ito', desc: 'Color-blind safe set. Still warm = fast and cool = slow; ring names stay visible and markers differ by shape and dash pattern.', c: ['#D55E00','#E69F00','#F0E442','#009E73','#56B4E9','#0072B2','#CC79A7'] };
const TIMER_COLORS = ['#2dd4bf','#fb923c','#60a5fa','#facc15','#a78bfa','#f472b6']; // first = default for a new timer
const TIMER_COLORS_CB = ['#009e73','#e69f00','#56b4e9','#f0e442','#d55e00','#cc79a7'];
const MAX_TIMER_RINGS = 6;

// "Meaning colors": a ring colored by what each part of it means, instead of by speed
const MEANING = {
  week:  { name: 'Day of week',  what: 'Weekends stand out' },
  day:   { name: 'Day of month', what: 'Weekends stand out' },
  hour:  { name: 'Hours',        what: 'Night, twilight and daylight from sunrise and sunset' },
  month: { name: 'Month',        what: 'The four seasons (flipped south of the equator)' },
  age:   { name: 'Age',          what: 'Life stages, as in “The Life of a Typical American”' },
};
// "The Life of a Typical American" (Wait But Why), with its numbers updated to the latest US data
const LIFE = {
  stages: [ // [from age, to age, color key, name, short name]
    [0, 5.5, 'early', 'Early years', 'Early'],
    [5.5, 11.5, 'elem', 'Elementary school', 'Elem.'],
    [11.5, 14.5, 'middle', 'Middle school', 'Middle'],
    [14.5, 18.5, 'high', 'High school', 'High'],
    [18.5, 22.5, 'college', 'College', 'Coll.'],
    [22.5, 62, 'career', 'Career', 'Career'],
    [62, 100, 'retire', 'Retirement', 'Retired'],
  ],
  points: [ // [age, full label (hover), short label (callouts)]
    [14, 'Learner’s permit in South Dakota', 'Permit (S. Dakota)'],
    [16, 'Can drive in most US states', 'Drive'],
    [18, 'Can vote, smoke, enlist, be tried as an adult', 'Vote · enlist'],
    [21, 'Can legally drink (US)', 'Drink'],
    [22.8, 'Men’s first marriage in 1960', 'Men marry (1960)'],
    [27.6, 'Average age at first child (mothers, 2024)', 'First child'],
    [28.4, 'Women’s first marriage (median, 2025)', 'Women marry'],
    [30.8, 'Men’s first marriage (median, 2025)', 'Men marry'],
    [62, 'Life expectancy in Sierra Leone (2024)', 'Sierra Leone life exp.'],
    [76.5, 'US life expectancy: men (2024)', 'Life exp. men'],
    [81.4, 'US life expectancy: women (2024)', 'Life exp. women'],
  ],
  bands: [ // [from, to, label] — durations shown as dashed spans
    [22.5, 24.5, 'Graduate school (if applicable)'],
    [30.8, 38.8, 'A first marriage that ends in divorce lasts ~8 yrs (median)'],
  ],
  jobYears: 3.9, // median tenure with current employer (BLS, Jan 2024); drawn from your age today
};
const MC_KEYS = {
  weekend: 'Weekend', night: 'Night', twilight: 'Twilight', horizon: 'Sunrise / sunset', day: 'Day',
  winter: 'Winter', spring: 'Spring', summer: 'Summer', autumn: 'Autumn',
  early: 'Early years', elem: 'Elementary', middle: 'Middle school', high: 'High school', college: 'College', career: 'Career', retire: 'Retirement',
};
const MC_DEF = {
  normal: { weekend: '#ff4d4f', night: '#3b47a8', twilight: '#8b5cf6', horizon: '#ff7a3d', day: '#ffd23f', winter: '#7cc4ff', spring: '#5fd068', summer: '#ffd23f', autumn: '#ff8a2a',
            early: '#8fc3f7', elem: '#2f9c9c', middle: '#6fcf63', high: '#f2e04f', college: '#f7a94f', career: '#f26b6b', retire: '#a98ad8' },
  cb:     { weekend: '#d55e00', night: '#0072b2', twilight: '#cc79a7', horizon: '#e69f00', day: '#f0e442', winter: '#56b4e9', spring: '#009e73', summer: '#f0e442', autumn: '#e69f00',
            early: '#56b4e9', elem: '#0072b2', middle: '#009e73', high: '#f0e442', college: '#e69f00', career: '#d55e00', retire: '#cc79a7' },
};
const SEASONS = ['winter', 'spring', 'summer', 'autumn'];
// rough location per time zone, only used for sunrise/sunset and hemisphere (lat, lon)
const TZ_LL = {
  'America/St_Johns':[47.56,-52.71],'America/Halifax':[44.65,-63.57],'America/Glace_Bay':[46.2,-59.96],'America/Moncton':[46.09,-64.78],'America/Goose_Bay':[53.3,-60.4],
  'America/Toronto':[43.65,-79.38],'America/Montreal':[45.5,-73.57],'America/New_York':[40.71,-74.01],'America/Detroit':[42.33,-83.05],'America/Indiana/Indianapolis':[39.77,-86.16],
  'America/Chicago':[41.88,-87.63],'America/Winnipeg':[49.9,-97.14],'America/Regina':[50.45,-104.6],'America/Edmonton':[53.55,-113.49],'America/Denver':[39.74,-104.99],
  'America/Boise':[43.62,-116.2],'America/Phoenix':[33.45,-112.07],'America/Vancouver':[49.28,-123.12],'America/Los_Angeles':[34.05,-118.24],'America/Anchorage':[61.22,-149.9],
  'America/Juneau':[58.3,-134.42],'America/Adak':[51.88,-176.66],'America/Whitehorse':[60.72,-135.06],'America/Yellowknife':[62.45,-114.37],'America/Iqaluit':[63.75,-68.52],
  'America/Nuuk':[64.18,-51.72],'America/Godthab':[64.18,-51.72],'America/Mexico_City':[19.43,-99.13],'America/Cancun':[21.16,-86.85],'America/Tijuana':[32.51,-117.04],
  'America/Monterrey':[25.69,-100.32],'America/Guatemala':[14.63,-90.51],'America/El_Salvador':[13.69,-89.22],'America/Costa_Rica':[9.93,-84.08],'America/Panama':[8.98,-79.52],
  'America/Havana':[23.11,-82.37],'America/Jamaica':[18.0,-76.8],'America/Puerto_Rico':[18.47,-66.11],'America/Santo_Domingo':[18.49,-69.93],'America/Bogota':[4.71,-74.07],
  'America/Caracas':[10.48,-66.9],'America/Lima':[-12.05,-77.04],'America/Guayaquil':[-2.17,-79.92],'America/La_Paz':[-16.5,-68.15],'America/Santiago':[-33.45,-70.67],
  'America/Argentina/Buenos_Aires':[-34.6,-58.38],'America/Buenos_Aires':[-34.6,-58.38],'America/Montevideo':[-34.9,-56.16],'America/Asuncion':[-25.26,-57.58],
  'America/Sao_Paulo':[-23.55,-46.63],'America/Manaus':[-3.12,-60.02],'America/Fortaleza':[-3.73,-38.52],'America/Recife':[-8.05,-34.9],'America/Bahia':[-12.97,-38.5],'America/Belem':[-1.46,-48.5],
  'Pacific/Honolulu':[21.31,-157.86],'Atlantic/Reykjavik':[64.15,-21.94],'Atlantic/Azores':[37.74,-25.67],'Atlantic/Canary':[28.12,-15.43],'Atlantic/Bermuda':[32.29,-64.78],
  'Europe/London':[51.51,-0.13],'Europe/Dublin':[53.35,-6.26],'Europe/Lisbon':[38.72,-9.14],'Europe/Madrid':[40.42,-3.7],'Europe/Paris':[48.86,2.35],'Europe/Brussels':[50.85,4.35],
  'Europe/Amsterdam':[52.37,4.9],'Europe/Luxembourg':[49.61,6.13],'Europe/Berlin':[52.52,13.4],'Europe/Zurich':[47.37,8.54],'Europe/Rome':[41.9,12.5],'Europe/Vienna':[48.21,16.37],
  'Europe/Prague':[50.08,14.44],'Europe/Warsaw':[52.23,21.01],'Europe/Stockholm':[59.33,18.07],'Europe/Oslo':[59.91,10.75],'Europe/Copenhagen':[55.68,12.57],'Europe/Helsinki':[60.17,24.94],
  'Europe/Athens':[37.98,23.73],'Europe/Istanbul':[41.01,28.98],'Europe/Bucharest':[44.43,26.1],'Europe/Sofia':[42.7,23.32],'Europe/Budapest':[47.5,19.04],'Europe/Belgrade':[44.79,20.45],
  'Europe/Zagreb':[45.81,15.98],'Europe/Kyiv':[50.45,30.52],'Europe/Kiev':[50.45,30.52],'Europe/Minsk':[53.9,27.57],'Europe/Moscow':[55.76,37.62],'Europe/Riga':[56.95,24.11],
  'Europe/Vilnius':[54.69,25.28],'Europe/Tallinn':[59.44,24.75],'Europe/Samara':[53.2,50.15],
  'Asia/Tehran':[35.69,51.39],'Asia/Dubai':[25.2,55.27],'Asia/Baghdad':[33.31,44.36],'Asia/Riyadh':[24.71,46.68],'Asia/Qatar':[25.29,51.53],'Asia/Kuwait':[29.38,47.98],
  'Asia/Muscat':[23.59,58.41],'Asia/Jerusalem':[31.77,35.21],'Asia/Beirut':[33.89,35.5],'Asia/Amman':[31.95,35.93],'Asia/Damascus':[33.51,36.29],'Asia/Baku':[40.41,49.87],
  'Asia/Tbilisi':[41.72,44.79],'Asia/Yerevan':[40.18,44.51],'Asia/Kabul':[34.53,69.17],'Asia/Karachi':[24.86,67.0],'Asia/Tashkent':[41.3,69.24],'Asia/Almaty':[43.24,76.89],
  'Asia/Kolkata':[22.57,88.36],'Asia/Calcutta':[22.57,88.36],'Asia/Kathmandu':[27.72,85.32],'Asia/Colombo':[6.93,79.86],'Asia/Dhaka':[23.81,90.41],'Asia/Yangon':[16.87,96.2],
  'Asia/Bangkok':[13.76,100.5],'Asia/Ho_Chi_Minh':[10.82,106.63],'Asia/Jakarta':[-6.21,106.85],'Asia/Singapore':[1.35,103.82],'Asia/Kuala_Lumpur':[3.14,101.69],
  'Asia/Manila':[14.6,120.98],'Asia/Shanghai':[31.23,121.47],'Asia/Hong_Kong':[22.32,114.17],'Asia/Taipei':[25.03,121.57],'Asia/Seoul':[37.57,126.98],'Asia/Tokyo':[35.68,139.69],
  'Asia/Yekaterinburg':[56.84,60.6],'Asia/Novosibirsk':[55.01,82.93],'Asia/Vladivostok':[43.12,131.89],
  'Africa/Cairo':[30.04,31.24],'Africa/Casablanca':[33.57,-7.59],'Africa/Algiers':[36.75,3.06],'Africa/Tunis':[36.81,10.18],'Africa/Tripoli':[32.89,13.19],'Africa/Lagos':[6.52,3.38],
  'Africa/Accra':[5.6,-0.19],'Africa/Abidjan':[5.36,-4.01],'Africa/Dakar':[14.72,-17.47],'Africa/Addis_Ababa':[9.03,38.74],'Africa/Khartoum':[15.5,32.56],'Africa/Nairobi':[-1.29,36.82],
  'Africa/Kampala':[0.35,32.58],'Africa/Dar_es_Salaam':[-6.79,39.21],'Africa/Kinshasa':[-4.44,15.27],'Africa/Luanda':[-8.84,13.23],'Africa/Johannesburg':[-26.2,28.05],
  'Africa/Maputo':[-25.97,32.57],'Africa/Harare':[-17.83,31.05],'Africa/Windhoek':[-22.56,17.08],
  'Australia/Sydney':[-33.87,151.21],'Australia/Melbourne':[-37.81,144.96],'Australia/Brisbane':[-27.47,153.03],'Australia/Perth':[-31.95,115.86],'Australia/Adelaide':[-34.93,138.6],
  'Australia/Darwin':[-12.46,130.84],'Australia/Hobart':[-42.88,147.33],'Pacific/Auckland':[-36.85,174.76],'Pacific/Fiji':[-18.14,178.44],'Pacific/Guam':[13.44,144.79],
  'Indian/Maldives':[4.18,73.51],'Indian/Mauritius':[-20.16,57.5],
};
const stageAt = (age) => LIFE.stages.find(s => age < s[1]) || LIFE.stages[LIFE.stages.length - 1];
const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } })();
const tzCity = (tz) => (tz.split('/').pop() || tz).replace(/_/g, ' ');

const pick = (ids) => Object.fromEntries(RING_IDS.map(k => [k, ids.includes(k)]));
const pickM = (ids) => Object.fromEntries(MARKERS.map(m => [m.id, ids.includes(m.id)]));
const PRESETS = [
  { id: 'default', name: 'Default',    rings: pick(['week','hour','month']), markers: pickM(['noon','sun','work','weekend','seasons','birthday','milestones','life']) },
  { id: 'minimal', name: 'Minimal',    rings: pick(['hour','week']), markers: pickM(['sun','weekend']) },
  { id: 'clock',   name: 'Clock',      rings: pick(['sec','min','hour']), markers: pickM(['quarter','noon','sun','work','night']) },
  { id: 'life',    name: 'Life',       rings: pick(['week','day','month','age']), markers: pickM(['weekend','midMonth','seasons','qyear','birthday','milestones','life']) },
  { id: 'all',     name: 'Everything', rings: pick(RING_IDS), markers: pickM(MARKERS.map(m => m.id)) },
];
const DEFAULTS = {
  birthdate: '',
  milestones: '13 Teen, 18 Adult, 30, 40, 50 Halfway, 65 Retirement, 80',
  rings: Object.assign({}, PRESETS[0].rings),
  markers: Object.assign({}, PRESETS[0].markers),
  theme: 'auto', palette: 'heat', colorblind: false, labels: true, smooth: true,
  style: 'arcs', start: 'bottom', hour12: false, weekStart: 0,
  ringOrder: ORDERS.slowOut.slice(), // outside → inside; holds ring ids and timer keys ('t:<id>')
  secDigits: true, shortcuts: 'bar',
  minimal: 0, // 0 off · 1 only the dial and the clock · 2 only the dial
  brief: true, lastBrief: '', // daily briefing on/off, and the local date it last played
  meaning: { week: true, day: true, hour: true, month: true, age: true }, // color rings by meaning
  mcol: {},             // custom meaning colors, e.g. { weekend: '#ff0000' }; empty = defaults
  lat: null, lon: null, // custom location for sunrise; null = estimated from the time zone
  timers: [], hideOnboard: false,
};

/* ---------- state + storage ---------- */
const clone = (o) => JSON.parse(JSON.stringify(o));
// keep ringOrder complete: every ring once, every live timer once, nothing stale
function normOrder(s) {
  const tk = s.timers.map(t => 't:' + t.id);
  const o = (Array.isArray(s.ringOrder) ? s.ringOrder : []).filter((k, i, a) => (k in RINGS || tk.includes(k)) && a.indexOf(k) === i);
  for (const k of ORDERS.slowOut) if (!o.includes(k)) o.push(k);
  for (const k of tk) if (!o.includes(k)) o.push(k); // new timers start innermost
  s.ringOrder = o;
}
function load() {
  const d = clone(DEFAULTS);
  let s = {};
  try { s = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { s = {}; }
  const out = Object.assign(d, s, {
    rings: Object.assign({}, d.rings, s.rings),
    markers: Object.assign({}, d.markers, s.markers),
    meaning: Object.assign({}, d.meaning, s.meaning),
    mcol: (s.mcol && typeof s.mcol === 'object') ? Object.fromEntries(Object.entries(s.mcol).filter(([k, v]) => k in MC_KEYS && /^#[0-9a-f]{6}$/i.test(v))) : {},
    timers: Array.isArray(s.timers) ? s.timers.filter(t => t && t.id && t.total > 0 && (t.type !== 'daily' || (Array.isArray(t.days) && t.days.length))) : [],
  });
  if (!Array.isArray(s.ringOrder)) out.ringOrder = (ORDERS[s.order] || ORDERS.slowOut).slice(); // migrate the old preset-only order
  delete out.order;
  normOrder(out);
  if (!['off','bar','top'].includes(out.shortcuts)) out.shortcuts = DEFAULTS.shortcuts;
  out.secDigits = out.secDigits !== false;
  out.minimal = out.minimal === true ? 1 : [1, 2].includes(out.minimal) ? out.minimal : 0; // was a plain on/off
  const okNum = (v, m) => typeof v === 'number' && isFinite(v) && Math.abs(v) <= m;
  if (!okNum(out.lat, 90) || !okNum(out.lon, 180)) { out.lat = null; out.lon = null; }
  if (!PALETTES[out.palette]) out.palette = DEFAULTS.palette;
  if (!['arcs','dot'].includes(out.style)) out.style = DEFAULTS.style;
  if (!['auto','light','dark'].includes(out.theme)) out.theme = 'auto';
  if (!['top','bottom'].includes(out.start)) out.start = DEFAULTS.start;
  out.weekStart = out.weekStart === 1 ? 1 : 0;
  return out;
}
let S = load();
let saveT = 0, dirty = false;
function persist() { dirty = false; try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { /* storage unavailable: keep in memory */ } }
function save() { dirty = true; clearTimeout(saveT); saveT = setTimeout(persist, 120); }
// only flush unsaved changes on close, so an old tab never overwrites what a newer tab saved
window.addEventListener('pagehide', () => { if (dirty) persist(); });

/* ---------- small helpers ---------- */
const pad = (n) => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();
const ease = (c, t, rate, dt) => RM ? t : c + (t - c) * (1 - Math.exp(-rate * dt));
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const rel = (n, unit) => n === 0 ? 'now' : n > 0 ? `in ${plural(n, unit)}` : `${plural(-n, unit)} ago`;
const relDays = (n) => n === 0 ? 'today' : n === 1 ? 'tomorrow' : n === -1 ? 'yesterday' : n > 0 ? `in ${n} days` : `${-n} days ago`;
const relMonths = (n) => n === 0 ? 'this month' : n === 1 ? 'next month' : n === -1 ? 'last month' : n > 0 ? `in ${n} months` : `${-n} months ago`;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function fmtClock(d) { const h = d.getHours(), m = d.getMinutes(); return S.hour12 ? `${(h % 12) || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}` : `${pad(h)}:${pad(m)}`; }
function fmtDur(ms) {
  let s = Math.ceil(ms / 1000);
  const d = Math.floor(s / 86400); s %= 86400;
  const h = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60); s %= 60;
  if (d) return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
  if (h) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}
function fmtHour(h) { // 7.68 → "07:41" (or "7:41 AM")
  h = ((h % 24) + 24) % 24;
  let H = Math.floor(h), M = Math.round((h - H) * 60);
  if (M === 60) { H = (H + 1) % 24; M = 0; }
  return S.hour12 ? `${(H % 12) || 12}:${pad(M)} ${H < 12 ? 'AM' : 'PM'}` : `${pad(H)}:${pad(M)}`;
}
const fmtSpan = (h) => { const m = Math.max(0, Math.round(h * 60)); return m >= 60 ? `${Math.floor(m / 60)} h ${pad(m % 60)} m` : `${m} min`; };

/* ---------- location + sun (for the daylight hour ring and hemisphere seasons) ---------- */
function autoLoc() {
  if (TZ_LL[TZ]) return { lat: TZ_LL[TZ][0], lon: TZ_LL[TZ][1], name: tzCity(TZ), exact: true };
  // unknown zone: longitude from the standard UTC offset, latitude a rough guess for the hemisphere
  const y = new Date().getFullYear();
  const std = -Math.max(new Date(y, 0, 1).getTimezoneOffset(), new Date(y, 6, 1).getTimezoneOffset());
  const south = /^(Australia|Antarctica)\/|^Pacific\/(Auckland|Chatham|Fiji|Tongatapu|Apia|Noumea|Efate)|^America\/(Argentina|Sao_Paulo|Santiago|Montevideo|Asuncion|La_Paz|Lima|Punta_Arenas)|^Africa\/(Johannesburg|Maputo|Harare|Windhoek|Lusaka|Gaborone|Maseru|Mbabane|Blantyre|Lubumbashi)|^Indian\/(Mauritius|Reunion|Antananarivo)/.test(TZ);
  return { lat: south ? -30 : 40, lon: clamp(std / 4, -180, 180), name: TZ ? tzCity(TZ) : 'your time zone', exact: false };
}
const AUTO_LOC = autoLoc();
const loc = () => (S.lat != null && S.lon != null) ? { lat: S.lat, lon: S.lon, name: 'custom', custom: true } : AUTO_LOC;
let sunMemo = { key: '', v: null };
function sunInfo(T) { // NOAA sunrise equation; hours are local hours from today's midnight (may be <0 or >24)
  const L = loc(), key = `${T.y}-${T.mo}-${T.dt}|${L.lat}|${L.lon}`;
  if (sunMemo.key === key) return sunMemo.v;
  const rad = Math.PI / 180, mid = new Date(T.y, T.mo, T.dt).getTime();
  const n = Math.round(Date.UTC(T.y, T.mo, T.dt, 12) / 864e5 + 2440587.5 - 2451545 + 0.0008);
  const Js = n - L.lon / 360;
  const M = ((357.5291 + 0.98560028 * Js) % 360 + 360) % 360, Mr = M * rad;
  const C = 1.9148 * Math.sin(Mr) + 0.02 * Math.sin(2 * Mr) + 0.0003 * Math.sin(3 * Mr);
  const lam = ((M + C + 180 + 102.9372) % 360) * rad;
  const Jt = 2451545 + Js + 0.0053 * Math.sin(Mr) - 0.0069 * Math.sin(2 * lam);
  const dec = Math.asin(Math.sin(lam) * Math.sin(23.4397 * rad));
  const phi = clamp(L.lat, -89.9, 89.9) * rad;
  const toH = (J) => ((J - 2440587.5) * 864e5 - mid) / 36e5;
  const hourAngle = (alt) => { // degrees; Infinity = sun always above alt, -Infinity = never
    const c = (Math.sin(alt * rad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
    return c < -1 ? Infinity : c > 1 ? -Infinity : Math.acos(c) / rad;
  };
  const w0 = hourAngle(-0.833), w6 = hourAngle(-6);
  const v = { noon: toH(Jt), polarDay: w0 === Infinity, polarNight: w0 === -Infinity, whiteNight: w6 === Infinity, darkDay: w6 === -Infinity };
  if (isFinite(w0)) { v.rise = toH(Jt - w0 / 360); v.set = toH(Jt + w0 / 360); }
  if (isFinite(w6)) { v.dawn = toH(Jt - w6 / 360); v.dusk = toH(Jt + w6 / 360); }
  sunMemo = { key, v };
  return v;
}
function phaseAt(h, s) { // 'Daylight' | 'Twilight' | 'Night' for local hour h
  if (s.polarDay) return 'Daylight';
  const within = (a, b) => [h, h + 24, h - 24].some(x => x >= a && x < b);
  if (s.rise != null && within(s.rise, s.set)) return 'Daylight';
  if (s.whiteNight) return 'Twilight';
  if (s.dawn != null && (within(s.dawn, s.rise ?? s.noon) || within(s.set ?? s.noon, s.dusk))) return 'Twilight';
  return 'Night';
}
function fmtDurCalm(ms) { // minute precision, for when seconds digits are off
  const t = Math.ceil(ms / 60000), d = Math.floor(t / 1440), h = Math.floor(t % 1440 / 60), m = t % 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h} h ${pad(m)} m`;
  return `${m} min`;
}
const fmtTimer = (ms) => S.secDigits ? fmtDur(ms) : fmtDurCalm(ms);
function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const wd = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - wd);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y0) / 864e5 + 1) / 7);
}
const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

/* ---------- color ---------- */
function hex2rgb(h) {
  h = String(h).trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return isNaN(n) ? [128, 128, 128] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lum(c) { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); }
const mix = (a, b, t) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t));
const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const onColor = (c) => lum(c) > 0.36 ? [16, 18, 24] : [255, 255, 255];
let isDark = false, BG = [244, 246, 250], FG = [20, 24, 33];
const RC = {};
function adapt(hex) { // keep ring colors readable on the current background
  let c = hex2rgb(hex); const L = lum(c);
  if (!isDark) { if (L > 0.55) c = mix(c, [0, 0, 0], 0.36); else if (L > 0.33) c = mix(c, [0, 0, 0], 0.2); }
  else if (L < 0.06) c = mix(c, [255, 255, 255], 0.35);
  return c;
}
const pal = () => S.colorblind ? CB : (PALETTES[S.palette] || PALETTES.heat);
const MIN_NAMES = ['off', 'rings + clock', 'rings only'];
const nextMinimal = () => { S.minimal = (S.minimal + 1) % 3; changed(); }; // M and the corner button: off → rings + clock → rings only → off
function applyMinimal() { document.body.classList.toggle('minimal', S.minimal > 0); document.body.classList.toggle('bare', S.minimal === 2); }
function applyTheme() {
  const root = document.documentElement;
  if (S.theme === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', S.theme);
  isDark = S.theme === 'dark' || (S.theme === 'auto' && darkMQ.matches);
  const cs = getComputedStyle(root);
  BG = hex2rgb(cs.getPropertyValue('--bg') || '#f4f6fa');
  FG = hex2rgb(cs.getPropertyValue('--fg') || '#141821');
  const p = pal().c;
  for (const k of RING_IDS) RC[k] = adapt(p[RINGS[k].speed]);
}

/* ---------- meaning colors: per-segment colors (week, day, month) or a sky gradient (hours) ---------- */
const mcHex = (name) => S.mcol[name] || MC_DEF[S.colorblind ? 'cb' : 'normal'][name];
const mc = (name) => adapt(mcHex(name));
function seasonIndex(month) { // 0 winter … 3 autumn, meteorological seasons, hemisphere-aware
  const m = loc().lat < 0 ? (month + 6) % 12 : month;
  return { s: Math.floor(((m + 1) % 12) / 3), pos: (m + 1) % 3 };
}
function seasonColor(month) { // blend into neighbours at the edges so the year flows
  const { s, pos } = seasonIndex(month), c = mc(SEASONS[s]);
  if (pos === 0) return mix(c, mc(SEASONS[(s + 3) % 4]), 0.28);
  if (pos === 2) return mix(c, mc(SEASONS[(s + 1) % 4]), 0.18);
  return c;
}
function daylightKeys(s, C) { // [hour, color] key points through the day
  const N = s.whiteNight ? mix(C.night, C.tw, 0.6) : C.night, pts = [];
  if (s.polarDay) return { pts, night: C.day };
  if (s.rise != null) {
    if (s.dawn != null) pts.push([s.dawn - 0.4, N], [s.dawn, mix(N, C.tw, 0.6)]);
    pts.push([s.rise - 0.25, C.tw], [s.rise + 0.1, C.hz]);
    if (s.set - s.rise > 2.4) pts.push([s.rise + 1.1, C.day], [s.set - 1.1, C.day]);
    else pts.push([s.noon, mix(C.hz, C.day, clamp((s.set - s.rise) / 2.4, 0, 1))]);
    pts.push([s.set - 0.1, C.hz], [s.set + 0.25, C.tw]);
    if (s.dusk != null) pts.push([s.dusk, mix(N, C.tw, 0.6)], [s.dusk + 0.4, N]);
  } else if (s.dawn != null) { // polar night: only a twilight around noon
    pts.push([s.dawn - 0.4, N], [s.dawn, mix(N, C.tw, 0.6)], [s.noon, C.tw], [s.dusk, mix(N, C.tw, 0.6)], [s.dusk + 0.4, N]);
  }
  for (let i = 1; i < pts.length; i++) if (pts[i][0] <= pts[i - 1][0]) pts[i][0] = pts[i - 1][0] + 0.01;
  return { pts, night: N };
}
function daylightAt(h, K) {
  const P = K.pts;
  if (!P.length) return K.night;
  for (const x of [h, h + 24, h - 24]) {
    if (x < P[0][0] || x > P[P.length - 1][0]) continue;
    for (let i = 1; i < P.length; i++) if (x <= P[i][0]) return mix(P[i - 1][1], P[i][1], (x - P[i - 1][0]) / (P[i][0] - P[i - 1][0]));
  }
  return K.night;
}
let LAST_T = null;
const paintMemo = {};
function paint(k, T) { // null = plain speed color
  if (!T || !(k in MEANING) || !S.meaning[k]) return null;
  const base = k === 'hour' && S.hour12 && T.h >= 12 ? 12 : 0;
  const key = `${ver}|${T.y}-${T.mo}-${T.dt}|${base}|${isDark}|${S.colorblind}|${S.hour12}`;
  const memo = paintMemo[k];
  if (memo && memo.key === key) return memo.p;
  let p;
  if (k === 'week') {
    const we = mc('weekend');
    p = { seg: Array.from({ length: 7 }, (_, i) => { const d = (i + S.weekStart) % 7; return d === 0 || d === 6 ? we : RC.week; }) };
  } else if (k === 'day') {
    const we = mc('weekend');
    p = { seg: Array.from({ length: T.dim }, (_, i) => { const d = new Date(T.y, T.mo, i + 1).getDay(); return d === 0 || d === 6 ? we : RC.day; }) };
  } else if (k === 'month') {
    p = { seg: Array.from({ length: 12 }, (_, i) => seasonColor(i)) };
  } else if (k === 'age') {
    p = { spans: LIFE.stages.map(([a, b, key]) => [a / 100, b / 100, mc(key)]) };
  } else {
    const span = S.hour12 ? 12 : 24, n = span * 6; // a color every 10 minutes
    const K = daylightKeys(sunInfo(T), { night: mc('night'), tw: mc('twilight'), hz: mc('horizon'), day: mc('day') });
    p = { grad: Array.from({ length: n + 1 }, (_, j) => daylightAt(base + j * span / n, K)) };
  }
  paintMemo[k] = { key, p };
  return p;
}
function paintAt(p, f) {
  if (p.spans) { for (const s of p.spans) if (f < s[1]) return s[2]; return p.spans[p.spans.length - 1][2]; }
  const a = p.seg || p.grad;
  if (p.seg) return a[clamp(Math.floor(f * a.length), 0, a.length - 1)];
  const x = clamp(f, 0, 1) * (a.length - 1), i = Math.floor(x);
  return i >= a.length - 1 ? a[a.length - 1] : mix(a[i], a[i + 1], x - i);
}
function ringColorNow(k) { // what a ring's card, dot and labels use: the color at "now"
  const p = paint(k, LAST_T);
  return p && CUR[k] ? paintAt(p, clamp(CUR[k].p, 0, 0.9999)) : colorOf(k);
}

/* ---------- timers (and custom rings, which live in the same list) ---------- */
const ghosts = {}; // removed timers kept briefly so their ring can fade out
const timerByKey = (k) => S.timers.find(t => 't:' + t.id === k) || ghosts[k] || null;
const colorOf = (k) => RC[k] || (timerByKey(k) ? adapt(timerByKey(k).color) : FG);
const isRingT = (t) => !!t && (t.type === 'daily' || t.type === 'span'); // custom ring: every day in a time window, or once between two dates
const tName = (t) => t.label || (isRingT(t) ? 'Ring' : 'Timer');
const tRemain = (t, now) => t.running ? Math.max(0, t.endAt - now) : Math.max(0, t.remaining || 0);
function fmtWhen(ms, now) { // "14:30" today, "Mon 14:30" later this week, else "Oct 3, 14:30"
  const e = new Date(ms), n = new Date(now);
  const days = Math.round((new Date(e.getFullYear(), e.getMonth(), e.getDate()) - new Date(n.getFullYear(), n.getMonth(), n.getDate())) / 864e5);
  if (days === 0) return fmtClock(e);
  if (days > 0 && days < 7) return `${DAY3[e.getDay()]} ${fmtClock(e)}`;
  return `${MON3[e.getMonth()]} ${e.getDate()}, ${fmtClock(e)}`;
}
function timerInfo(t, now) {
  if (isRingT(t)) return ringInfo(t, now);
  const rem = tRemain(t, now);
  const p = t.total > 0 ? rem / t.total : 0;
  let sub;
  if (t.done) sub = 'Finished';
  else if (!t.running) sub = 'Paused';
  else sub = 'Ends ' + fmtWhen(t.endAt, now);
  return { p: t.done ? 1 : p, main: t.done ? 'Done' : fmtTimer(rem), sub, pct: t.done ? '✓' : Math.floor(p * 100) + '%' };
}
const occAt = (t, b, i) => { // start of a daily ring's window i days from b, or null when that weekday is off
  const d = new Date(b.getFullYear(), b.getMonth(), b.getDate() + i, Math.floor(t.from / 60), t.from % 60);
  return t.days.includes(d.getDay()) ? d.getTime() : null;
};
function ringInfo(t, now) { // custom rings fill up as their window passes, like the built-in rings
  let s0 = null, e0 = null, next = null; // the current or last window, and the next start
  if (t.type === 'span') { s0 = t.start; e0 = t.endAt; }
  else {
    const b = new Date(now);
    for (let i = 0; i >= -7 && s0 == null; i--) { const s = occAt(t, b, i); if (s != null && s <= now) s0 = s; }
    for (let i = 0; i <= 8 && next == null; i++) { const s = occAt(t, b, i); if (s != null && s > now) next = s; }
    if (s0 != null) e0 = s0 + t.dur * 60000;
  }
  if (s0 != null && now >= s0 && now < e0) {
    const p = (now - s0) / (e0 - s0);
    return { p, main: fmtTimer(e0 - now), sub: 'Ends ' + fmtWhen(e0, now), pct: Math.floor(p * 100) + '%' };
  }
  // a daily window stays full for the rest of the day it ended, then empties until it starts again
  if (s0 != null && now >= e0 && (t.type === 'span' || new Date(e0).toDateString() === new Date(now).toDateString()))
    return { p: 1, main: 'Done', sub: next != null ? 'Next ' + fmtWhen(next, now) : 'Ended ' + fmtWhen(e0, now), pct: '✓' };
  const st = t.type === 'span' ? s0 : next;
  return { p: 0, main: 'in ' + fmtTimer(st - now), sub: 'Starts ' + fmtWhen(st, now), pct: '0%' };
}

/* ---------- audio + title alerts ---------- */
let actx = null;
function ensureAudio() {
  try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) { actx = null; }
}
let chimeBus = null; // all notes of the current alarm go through one gain, so a click can silence them
function chime(rounds = 1) {
  if (!actx) return;
  stopChime();
  const bus = actx.createGain();
  bus.connect(actx.destination); chimeBus = bus;
  const t0 = actx.currentTime + 0.02;
  for (let r = 0; r < rounds; r++) {
    [880, 1108.7, 1318.5].forEach((fq, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), at = t0 + r * 1.3 + i * 0.22;
      o.type = 'sine'; o.frequency.value = fq;
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.22, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
      o.connect(g); g.connect(bus); o.start(at); o.stop(at + 0.55);
    });
  }
}
function stopChime() {
  const bus = chimeBus;
  chimeBus = null;
  if (!bus || !actx) return;
  try { bus.gain.setTargetAtTime(0, actx.currentTime, 0.03); setTimeout(() => bus.disconnect(), 400); } catch (e) { /* already gone */ }
}

/* ---------- alarm glow: the page background slowly breathes in the timer's color until a click ---------- */
const alarmEl = document.getElementById('alarm');
let alarmOn = false, swallowClick = false;
function startAlarm(hex) {
  const c = hex2rgb(hex);
  alarmEl.style.background = `radial-gradient(120% 95% at 50% 42%, ${rgba(c, isDark ? 0.28 : 0.22)}, ${rgba(c, isDark ? 0.12 : 0.09)})`;
  alarmEl.style.transition = 'none'; alarmEl.style.opacity = '';
  alarmEl.classList.remove('on'); void alarmEl.offsetWidth; alarmEl.classList.add('on');
  alarmOn = true;
}
function dismissAlarm() {
  if (!alarmOn) return;
  alarmOn = false;
  stopChime(); clearTitle();
  const o = getComputedStyle(alarmEl).opacity; // fade out from wherever the pulse is
  alarmEl.style.transition = 'none'; alarmEl.style.opacity = o;
  alarmEl.classList.remove('on'); void alarmEl.offsetWidth;
  alarmEl.style.transition = 'opacity 1s ease'; alarmEl.style.opacity = '0';
}
const BASE_TITLE = document.title;
const clearTitle = () => { if (document.title !== BASE_TITLE) document.title = BASE_TITLE; };

/* ---------- time snapshot ---------- */
function snap(now) {
  const d = new Date(now);
  const y = d.getFullYear(), mo = d.getMonth(), dt = d.getDate();
  const h = d.getHours(), mi = d.getMinutes(), s = d.getSeconds(), ms = d.getMilliseconds();
  const diy = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365;
  return {
    d, y, mo, dt, dow: d.getDay(), h, mi, s, ms,
    dayF: (h * 3600 + mi * 60 + s + ms / 1000) / 86400,
    dim: daysIn(y, mo), diy,
    doy: Math.round((new Date(y, mo, dt) - new Date(y, 0, 1)) / 864e5) + 1,
    wk: isoWeek(d),
  };
}
let AI = null; // age info for this frame
function ageInfo(now) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(S.birthdate || '');
  if (!m) return null;
  const by = +m[1], bm = +m[2] - 1, bd = +m[3];
  const birth = new Date(by, bm, bd);
  if (isNaN(birth.getTime()) || birth.getTime() > now) return null;
  const d = new Date(now);
  let y = d.getFullYear(), last = new Date(y, bm, bd);
  if (last.getTime() > now) { y--; last = new Date(y, bm, bd); }
  const next = new Date(y + 1, bm, bd);
  const years = (y - by) + (now - last) / (next - last);
  const isBday = d.getMonth() === bm && d.getDate() === bd;
  const today0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const daysTo = isBday ? 0 : Math.round((next - today0) / 864e5);
  return { years, by, bm, bd, daysTo, isBday };
}
let MS = [];
function parseMS() {
  MS = String(S.milestones || '').split(',').map(x => x.trim()).filter(Boolean).map(x => {
    const m = /^(\d{1,3}(?:\.\d+)?)\s*[:\-–]?\s*(.*)$/.exec(x);
    if (!m) return null;
    const a = +m[1];
    if (!(a > 0 && a <= 100)) return null;
    return { a, name: m[2] || 'Milestone' };
  }).filter(Boolean).sort((p, q) => p.a - q.a);
}

/* ---------- ring specs: units, labels, markers ---------- */
let ver = 0;
const bump = () => { ver++; };
const specCache = {};
function spec(k, T) {
  const key = `${ver}|${T.y}-${T.mo}-${T.dt}|${T.h >= 12}|${AI ? AI.bm + '-' + AI.bd : ''}`;
  const c = specCache[k];
  if (c && c.key === key) return c.sp;
  const sp = buildSpec(k, T);
  specCache[k] = { key, sp };
  return sp;
}
function hourBands(h0, h1, name, dash, round, span, base) {
  const segs = h0 < h1 ? [[h0, h1]] : [[h0, 24], [0, h1]];
  const out = [];
  for (const [a, b] of segs) {
    const lo = Math.max(a, base), hi = Math.min(b, base + span);
    if (hi > lo) out.push({ f0: (lo - base) / span, f1: (hi - base) / span, name, dash, round });
  }
  return out;
}
function buildSpec(k, T) {
  const M = S.markers;
  const sp = { units: 0, discrete: false, labels: [], bands: [], points: [], short: RINGS[k].short };
  switch (k) {
    case 'sec': case 'min': {
      sp.units = 60;
      for (let i = 0; i < 60; i += 5) sp.labels.push({ f: i / 60, t: String(i) });
      if (M.quarter) [[0, k === 'sec' ? 'Top of the minute' : 'Top of the hour'], [15, 'Quarter past'], [30, 'Half past'], [45, 'Quarter to']]
        .forEach(([i, n]) => sp.points.push({ f: i / 60, name: n, shape: 'tri' }));
      break;
    }
    case 'hour': {
      const span = S.hour12 ? 12 : 24, base = S.hour12 ? (T.h >= 12 ? 12 : 0) : 0;
      sp.units = span;
      if (S.hour12) for (let i = 0; i < 12; i++) sp.labels.push({ f: i / 12, t: String(i === 0 ? 12 : i) });
      else for (let i = 0; i < 24; i += 2) sp.labels.push({ f: i / 24, t: String(i) });
      if (M.noon) {
        if (S.hour12) sp.points.push({ f: 0, name: base ? 'Noon' : 'Midnight', shape: 'tri' });
        else { sp.points.push({ f: 0, name: 'Midnight', shape: 'tri' }); sp.points.push({ f: 0.5, name: 'Noon', shape: 'tri' }); }
      }
      if (M.work) sp.bands.push(...hourBands(9, 17, 'Work hours', [4, 2.5], false, span, base));
      if (M.night) sp.bands.push(...hourBands(22, 6, 'Night', [0.01, 2.6], true, span, base));
      if (M.sun) {
        const s = sunInfo(T);
        for (const [h, n] of [[s.rise, 'Sunrise'], [s.set, 'Sunset']]) {
          if (h == null) continue;
          const f = (((h % 24) + 24) % 24 - base) / span;
          if (f >= 0 && f < 1) sp.points.push({ f, name: `${n} ≈ ${fmtHour(h)}`, shape: 'diamond' });
        }
      }
      break;
    }
    case 'week': {
      sp.units = 7; sp.discrete = true;
      for (let i = 0; i < 7; i++) {
        const dow = (i + S.weekStart) % 7;
        sp.labels.push({ f: (i + 0.5) / 7, t: DAY3[dow], t1: DAY[dow][0] });
        if (M.weekend && (dow === 0 || dow === 6)) sp.bands.push({ f0: i / 7, f1: (i + 1) / 7, name: 'Weekend', dash: [4, 2.5] });
      }
      break;
    }
    case 'day': {
      const n = T.dim; sp.units = n; sp.discrete = true;
      [1, 5, 10, 15, 20, 25, 30].filter(d => d <= n).forEach(d => sp.labels.push({ f: (d - 0.5) / n, t: String(d) }));
      if (M.weekend) for (let d = 1; d <= n; d++) {
        const dow = new Date(T.y, T.mo, d).getDay();
        if (dow === 0 || dow === 6) sp.bands.push({ f0: (d - 1) / n, f1: d / n, name: 'Weekend', dash: [4, 2.5] });
      }
      if (M.midMonth) { sp.points.push({ f: 14.5 / n, name: 'Mid-month', shape: 'dot' }); sp.points.push({ f: (n - 0.5) / n, name: 'Last day of the month', shape: 'dot' }); }
      if (M.birthday && AI && AI.bm === T.mo) sp.points.push({ f: (Math.min(AI.bd, n) - 0.5) / n, name: 'Your birthday', shape: 'star' });
      break;
    }
    case 'month': {
      sp.units = 12; sp.discrete = true;
      for (let i = 0; i < 12; i++) sp.labels.push({ f: (i + 0.5) / 12, t: MON3[i], t1: MON[i][0] });
      const pos = (mo, d) => (mo + (d - 0.5) / daysIn(T.y, mo)) / 12;
      if (M.seasons) [[2, 20, 'March equinox'], [5, 21, 'June solstice'], [8, 22, 'September equinox'], [11, 21, 'December solstice']]
        .forEach(([mo, d, n]) => sp.points.push({ f: pos(mo, d), name: `${n} (≈${MON3[mo]} ${d})`, shape: 'diamond' }));
      if (M.qyear) ['Q1', 'Q2', 'Q3', 'Q4'].forEach((q, i) => sp.points.push({ f: i / 4, name: `${q} begins`, shape: 'bar' }));
      if (M.birthday && AI) sp.points.push({ f: pos(AI.bm, Math.min(AI.bd, daysIn(T.y, AI.bm))), name: 'Your birthday', shape: 'star' });
      break;
    }
    case 'age': {
      sp.units = 100;
      const stages = S.meaning.age;
      // with life stages on, stage names win and decade numbers fill the gaps (pri = placement priority)
      for (let a = 0; a < 100; a += 10) sp.labels.push({ f: a / 100, t: String(a), pri: stages ? 1 : undefined });
      if (stages) for (const [a, b, , name, short] of LIFE.stages) sp.labels.push({ f: (a + b) / 200, t: name, t1: short, w: (b - a) / 100, pri: 2, stage: true });
      if (M.milestones) MS.forEach(ms => sp.points.push({ f: Math.min(ms.a, 99.999) / 100, name: ms.name === 'Milestone' ? `Milestone ${ms.a}` : ms.name, short: ms.name === 'Milestone' ? '' : ms.name, shape: 'dot', age: ms.a, mine: true }));
      if (M.life) {
        for (const [a, name, short] of LIFE.points) sp.points.push({ f: a / 100, name, short, shape: 'ring', age: a });
        for (const [a, b, name] of LIFE.bands) sp.bands.push({ f0: a / 100, f1: b / 100, name, dash: [4, 2.5] });
        if (AI) sp.bands.push({ f0: AI.years / 100, f1: Math.min(1, (AI.years + LIFE.jobYears) / 100), name: `A typical job lasts ${LIFE.jobYears} yrs (median) — from today`, dash: [0.01, 2.6], round: true, inner: true });
      }
      break;
    }
  }
  return sp;
}
function markerNames(sp, f) {
  const u = sp.units || 0, out = [];
  for (const b of sp.bands) if (f >= b.f0 && f < b.f1) out.push(b.name);
  if (u) { const i = Math.floor(f * u); for (const p of sp.points) if (Math.floor(p.f * u + 1e-9) === i) out.push(p.name); }
  return [...new Set(out)];
}

/* ---------- live values per ring ---------- */
const CUR = {};
function current(k, T) {
  const pct = (p) => Math.floor(p * 100) + '%';
  switch (k) {
    case 'sec': {
      const p = (S.smooth ? T.s + T.ms / 1000 : T.s) / 60;
      if (!S.secDigits) return { p, main: '—', sub: 'Digits off · ring keeps running', pct: '' };
      return { p, main: pad(T.s), sub: `${60 - T.s} s to the next minute`, pct: pct(p) };
    }
    case 'min': {
      const p = (T.mi + (T.s + T.ms / 1000) / 60) / 60, rs = 3600 - (T.mi * 60 + T.s);
      const sub = S.secDigits ? `${Math.floor(rs / 60)} m ${pad(rs % 60)} s to the hour` : `${Math.ceil(rs / 60)} min to the hour`;
      return { p, main: pad(T.mi), sub, pct: pct(p) };
    }
    case 'hour': {
      const hv = T.dayF * 24, rs = Math.round(86400 * (1 - T.dayF));
      let left = `${Math.floor(rs / 3600)} h ${pad(Math.floor(rs % 3600 / 60))} m left today`;
      if (S.meaning.hour || S.markers.sun) { // next sunrise or sunset instead
        const s = sunInfo(T);
        if (s.polarDay) left = 'Sun up all day';
        else if (s.polarNight) left = 'No sunrise today';
        else if (hv < s.rise) left = `Sunrise ${fmtHour(s.rise)} · in ${fmtSpan(s.rise - hv)}`;
        else if (hv < s.set) left = `Sunset ${fmtHour(s.set)} · in ${fmtSpan(s.set - hv)}`;
        else left = `Sunrise ≈ ${fmtHour(s.rise)} tomorrow`;
      }
      if (S.hour12) return { p: (hv % 12) / 12, main: `${(T.h % 12) || 12}:${pad(T.mi)} ${T.h < 12 ? 'AM' : 'PM'}`, sub: left, pct: pct(T.dayF) };
      return { p: hv / 24, main: `${pad(T.h)}:${pad(T.mi)}`, sub: left, pct: pct(T.dayF) };
    }
    case 'week': {
      const idx = (T.dow - S.weekStart + 7) % 7, p = (idx + T.dayF) / 7;
      let sub;
      if (T.dow === 0 || T.dow === 6) sub = 'It’s the weekend';
      else { const n = 6 - T.dow; sub = n === 1 ? 'Weekend starts tomorrow' : `${n} days to the weekend`; }
      return { p, main: DAY[T.dow], sub, pct: pct(p) };
    }
    case 'day': {
      const p = (T.dt - 1 + T.dayF) / T.dim, left = T.dim - T.dt;
      return { p, main: `${MON3[T.mo]} ${T.dt}`, sub: left === 0 ? 'Last day of the month' : `${plural(left, 'day')} left in ${MON[T.mo]}`, pct: pct(p) };
    }
    case 'month': {
      const p = (T.mo + (T.dt - 1 + T.dayF) / T.dim) / 12;
      return { p, main: MON[T.mo], sub: `Day ${T.doy} of ${T.diy} · week ${T.wk}`, pct: pct((T.doy - 1 + T.dayF) / T.diy) };
    }
    case 'age': {
      if (!AI) return { p: 0, main: '—', sub: 'Add your birthdate in settings', pct: '' };
      let sub;
      if (AI.isBday) sub = 'Happy birthday!';
      else if (AI.daysTo <= 30) sub = `Birthday in ${plural(AI.daysTo, 'day')}`;
      else {
        const nx = MS.find(m => m.a > AI.years);
        sub = nx ? `Next: ${nx.a}${nx.name !== 'Milestone' ? ' ' + nx.name : ''} in ${(nx.a - AI.years).toFixed(1)} yrs` : `${(100 - AI.years).toFixed(1)} yrs to 100`;
      }
      if (S.meaning.age && !AI.isBday) sub = stageAt(AI.years)[3] + ' · ' + sub.replace(/^Next: /, 'next ');
      return { p: Math.min(1, AI.years / 100), main: AI.years.toFixed(2), long: AI.years.toFixed(S.secDigits ? 7 : 5), sub, pct: Math.floor(AI.years) + '%' }; // 7 decimals tick every ~3 s; 5 every ~5 min
    }
  }
}
function atInfo(k, f, T) { // what lives at a pointer position on a ring
  const sp = spec(k, T), u = sp.units, i = clamp(Math.floor(f * u), 0, u - 1);
  let main = '', sub = '';
  switch (k) {
    case 'sec': main = ':' + pad(i); sub = rel(i - T.s, 'second'); break;
    case 'min': main = `${S.hour12 ? ((T.h % 12) || 12) : pad(T.h)}:${pad(i)}`; sub = rel(i - T.mi, 'minute'); break;
    case 'hour': {
      const H = (S.hour12 ? (T.h >= 12 ? 12 : 0) : 0) + i;
      main = S.hour12 ? `${(H % 12) || 12} ${H < 12 ? 'AM' : 'PM'}` : `${pad(H)}:00`;
      sub = rel(H - T.h, 'hour');
      if (S.meaning.hour) sub += ' · ' + phaseAt(H + 0.5, sunInfo(T));
      break;
    }
    case 'week': { const dow = (i + S.weekStart) % 7, cur = (T.dow - S.weekStart + 7) % 7; main = DAY[dow]; sub = relDays(i - cur); break; }
    case 'day': { const d = i + 1; main = `${MON3[T.mo]} ${d}`; sub = `${DAY[new Date(T.y, T.mo, d).getDay()]} · ${relDays(d - T.dt)}`; break; }
    case 'month': {
      main = MON[i]; sub = relMonths(i - T.mo);
      if (S.meaning.month) { const n = SEASONS[seasonIndex(i).s]; sub += ' · ' + n[0].toUpperCase() + n.slice(1); }
      break;
    }
    case 'age': {
      main = `Age ${i}`;
      if (!AI) sub = 'Add your birthdate in settings';
      else { const cur = Math.floor(AI.years), yr = AI.by + i; sub = i === cur ? `You are here · ${yr}–${yr + 1}` : `${yr} · ${rel(i - cur, 'year')}`; }
      if (S.meaning.age) sub += ' · ' + stageAt(f * 100)[3];
      break;
    }
  }
  const names = markerNames(sp, f);
  if (names.length) sub += ' · ' + names.join(', ');
  return { main, sub };
}

/* ---------- canvas + layout ---------- */
const cv = $('#dial'), ctx = cv.getContext('2d');
const wrap = $('#dialWrap'), centerEl = $('#center'), cLabel = $('#cLabel'), cMain = $('#cMain'), cSub = $('#cSub');
let size = 0, cx = 0, cy = 0, dpr = 1, firstLayout = true;
const vis = {}; // animated state per ring key
let activeSet = new Set();
let hover = null, hoverAmt = 0;
function discKey() { // the one timer drawn as a filled disc in the center, if it's showing
  const t = S.timers.find(x => x.shape === 'disc' && !x.hidden && !isRingT(x));
  return t ? 't:' + t.id : null;
}
function activeKeys() { // rings drawn on the dial, outside → inside, in the user's order
  const dk = discKey(); // the disc sits in the center and takes no ring slot
  const shown = S.timers.filter(t => !t.hidden && 't:' + t.id !== dk); // custom rings don't count toward the timer limit
  const live = new Set(shown.filter(isRingT).concat(shown.filter(t => !isRingT(t)).slice(0, MAX_TIMER_RINGS)).map(t => 't:' + t.id));
  return S.ringOrder.filter(k => k in RINGS ? !!S.rings[k] : live.has(k));
}
const bigRing = (k) => k in RINGS || isRingT(timerByKey(k)); // full ring width; timers are thinner
const targetStart = () => S.start === 'top' ? -Math.PI / 2 : Math.PI / 2;
let startA = targetStart();
const ang = (f) => startA + f * TAU;
function arcP(r, f0, f1) { ctx.beginPath(); ctx.arc(cx, cy, Math.max(0.1, r), ang(f0), ang(f1)); }

function resize() {
  const w = Math.round(wrap.getBoundingClientRect().width);
  const nd = Math.min(window.devicePixelRatio || 1, 2.5);
  if (!w || (w === size && nd === dpr)) return;
  size = w; dpr = nd; cx = cy = size / 2;
  cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr);
  relayout();
}
function relayout() {
  if (!size) return;
  const keys = activeKeys();
  activeSet = new Set(keys);
  const R0 = size / 2 - Math.max(5, size * 0.012);
  const minC = size * (size < 520 ? 0.16 : 0.2);
  const w = keys.map(k => (bigRing(k) ? 1 : 0.6));
  const W = w.reduce((a, b) => a + b, 0);
  const unit = W ? Math.min(size * 0.068, (R0 - minC) / W) : 0;
  const tp = performance.now();
  let r = R0;
  keys.forEach((k, i) => {
    const slot = unit * w[i];
    const tr = r - slot / 2, tth = slot * (bigRing(k) ? 0.76 : 0.64);
    let v = vis[k];
    if (!v) v = vis[k] = { r: tr, th: 0, a: 0, hl: 0, disp: 0, flash: 0, born: tp + (firstLayout ? i * 90 : 0) };
    v.tr = tr; v.tth = tth; v.ta = 1; v.slot = slot; v.disc = false;
    r -= slot;
  });
  for (const k in vis) if (!activeSet.has(k)) vis[k].ta = 0;
  const centerR = keys.length ? Math.max(minC * 0.85, r - 3) : size * 0.24; // all rings hidden: keep the clock modest
  centerEl.style.setProperty('--cs', (centerR * 2 * 0.9).toFixed(1) + 'px');
  centerRad = centerR * 0.9;
  const dk = discKey();
  if (dk) { // r 0 and a slot as wide as the center, so hovering anywhere on the disc finds it
    activeSet.add(dk);
    const v = vis[dk] || (vis[dk] = { r: 0, th: 0, a: 0, hl: 0, disp: 0, flash: 0, born: tp });
    Object.assign(v, { disc: true, tr: 0, tth: 0, ta: 1, slot: centerRad * 2 });
  }
  firstLayout = false;
}
let centerRad = 100;

/* ---------- drawing ---------- */
function textOnRing(t, a, r) {
  const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
  let rot = a + Math.PI / 2;
  if (Math.sin(a) > 0.02) rot -= Math.PI; // keep text upright on the lower half
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillText(t, 0, 0.5); ctx.restore();
}
function drawArc(r, th, p, c) {
  if (p <= 0.0004) return;
  const a0 = ang(0), a1 = ang(p);
  let stroke = rgba(c, 1);
  if (ctx.createConicGradient) {
    const cap = (th / 2) / r;
    const g = ctx.createConicGradient(a0 - cap, cx, cy);
    const end = clamp((p * TAU + cap) / TAU, 0.002, 1);
    g.addColorStop(0, rgba(mix(c, BG, 0.24), 1));
    g.addColorStop(end, rgba(c, 1));
    if (end < 1) g.addColorStop(1, rgba(c, 1));
    stroke = g;
  }
  ctx.lineCap = 'round'; ctx.lineWidth = th; ctx.strokeStyle = stroke;
  ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke();
  ctx.lineCap = 'butt';
  const hx = cx + r * Math.cos(a1), hy = cy + r * Math.sin(a1);
  ctx.save();
  ctx.shadowColor = isDark ? rgba(c, 0.75) : rgba(mix(c, [0, 0, 0], 0.4), 0.35);
  ctx.shadowBlur = th * 0.9;
  ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.arc(hx, hy, th / 2, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawDot(r, th, p, c) {
  const trail = Math.min(p, 0.09), N = 16;
  ctx.lineWidth = th * 0.5; ctx.lineCap = 'butt';
  for (let i = 0; i < N; i++) {
    const f1 = p - trail * i / N, f0 = p - trail * (i + 1) / N;
    if (f1 <= 0) break;
    ctx.strokeStyle = rgba(c, 0.85 * (1 - i / N));
    arcP(r, Math.max(0, f0), f1); ctx.stroke();
  }
  const a = ang(p), x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
  ctx.save(); ctx.shadowColor = rgba(c, 0.9); ctx.shadowBlur = th * 1.1;
  ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.arc(x, y, th * 0.56, 0, TAU); ctx.fill(); ctx.restore();
  ctx.fillStyle = rgba(onColor(c), 0.92); ctx.beginPath(); ctx.arc(x, y, th * 0.17, 0, TAU); ctx.fill();
}
function strokePaint(pt, r, f0, f1, alpha) { // stroke part of a ring in its meaning colors
  if (pt.spans) {
    for (const [s0, s1, c] of pt.spans) {
      const a = Math.max(f0, s0), b = Math.min(f1, s1);
      if (b > a) { ctx.strokeStyle = rgba(c, alpha); arcP(r, a, b); ctx.stroke(); }
    }
    return;
  }
  if (pt.grad && ctx.createConicGradient) {
    const g = ctx.createConicGradient(startA, cx, cy), a = pt.grad, n = a.length - 1;
    for (let j = 0; j <= n; j++) g.addColorStop(j / n, rgba(a[j], alpha));
    ctx.strokeStyle = g; arcP(r, f0, f1); ctx.stroke();
    return;
  }
  const a = pt.seg || pt.grad, n = pt.seg ? a.length : a.length - 1;
  for (let i = 0; i < n; i++) {
    const s0 = Math.max(f0, i / n), s1 = Math.min(f1, (i + 1) / n);
    if (s1 <= s0) continue;
    ctx.strokeStyle = rgba(a[i], alpha); arcP(r, s0, s1); ctx.stroke();
  }
}
function drawPaintArc(pt, r, th, p) {
  if (p <= 0.0004) return;
  ctx.lineWidth = th; ctx.lineCap = 'butt';
  strokePaint(pt, r, 0, p, 1);
  const a1 = ang(p), c1 = paintAt(pt, Math.min(p, 0.9999)); // flat start at zero, so the ring's name stays readable
  ctx.save();
  ctx.shadowColor = isDark ? rgba(c1, 0.75) : rgba(mix(c1, [0, 0, 0], 0.4), 0.35);
  ctx.shadowBlur = th * 0.9;
  ctx.fillStyle = rgba(c1, 1); ctx.beginPath(); ctx.arc(cx + r * Math.cos(a1), cy + r * Math.sin(a1), th / 2, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawTicks(k, sp, r, th, p, cAt, arcs) {
  const u = sp.units;
  if (!u || (S.minimal && !sp.discrete)) return; // minimal: no tick marks, but day/month gaps are part of the shape
  if (sp.discrete) { // cut real gaps between days / months
    ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.strokeStyle = '#000';
    ctx.lineWidth = clamp(th * 0.09, 1, 2.4); ctx.beginPath();
    for (let i = 0; i < u; i++) {
      const a = ang(i / u), co = Math.cos(a), si = Math.sin(a);
      ctx.moveTo(cx + (r - th / 2 - 2) * co, cy + (r - th / 2 - 2) * si);
      ctx.lineTo(cx + (r + th / 2 + 2) * co, cy + (r + th / 2 + 2) * si);
    }
    ctx.stroke(); ctx.restore();
    return;
  }
  const major = k === 'age' ? 10 : k === 'hour' ? (S.hour12 ? 3 : 6) : 5;
  ctx.lineWidth = clamp(th * 0.07, 1, 1.8); ctx.lineCap = 'butt';
  const groups = new Map(); // batch ticks by color: light/dark on the fill, muted on the track
  for (let i = 0; i < u; i++) {
    const f = i / u, style = arcs && f <= p ? rgba(onColor(cAt(f)), 0.55) : rgba(FG, 0.3);
    if (!groups.has(style)) groups.set(style, []);
    groups.get(style).push(i);
  }
  for (const [style, idx] of groups) {
    ctx.beginPath();
    for (const i of idx) {
      const a = ang(i / u), co = Math.cos(a), si = Math.sin(a);
      const r0 = r - th / 2 + th * 0.1, r1 = r - th / 2 + th * (i % major === 0 ? 0.32 : 0.2);
      ctx.moveTo(cx + r0 * co, cy + r0 * si); ctx.lineTo(cx + r1 * co, cy + r1 * si);
    }
    ctx.strokeStyle = style; ctx.stroke();
  }
}
function drawLabels(sp, r, th, p, cAt, arcs) {
  const lab = S.labels && !S.minimal; // tick labels; minimal display drops them (ring names stay in color-blind mode)
  const showNames = lab || S.colorblind;
  if (!showNames) return;
  const fs = Math.min(13, th * 0.5);
  if (fs < 6) return;
  const circ = TAU * r;
  const on = (f) => rgba(onColor(cAt(f)), 0.95), off = rgba(FG, 0.62);
  const fontL = `600 ${fs.toFixed(2)}px ${FONT}`, fontN = `800 ${(fs * 0.9).toFixed(2)}px ${FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = fontN;
  const nw = sp.short ? ctx.measureText(sp.short).width : 0;
  ctx.font = fontL;
  const zero = sp.labels.length && sp.labels[0].f === 0 ? sp.labels[0] : null;
  const zw = (lab && zero) ? ctx.measureText(zero.t).width : 0;
  const nameF = 1 - (zw / 2 + nw / 2 + fs * 0.75) / circ;      // ring name sits just before zero
  const nameStart = nameF - (nw / 2 + fs * 0.5) / circ;
  if (lab && sp.labels.some(l => l.pri != null)) { // priority placement: higher pri first, skip overlaps
    const pad = fs * 0.5 / circ, placed = [];
    if (showNames && sp.short) placed.push([nameStart - pad, nameF + nw / 2 / circ]);
    const hit = (a, b) => placed.some(([x, y]) => [0, 1, -1].some(s => a + s < y && b + s > x));
    for (const l of [...sp.labels].sort((p, q) => (q.pri || 0) - (p.pri || 0))) {
      let txt = l.t, w = ctx.measureText(txt).width / circ;
      if (l.w != null && w + pad * 2 > l.w) { // too long for its stage: try the short name
        if (!l.t1) continue;
        txt = l.t1; w = ctx.measureText(txt).width / circ;
        if (w + pad > l.w) continue;
      }
      const a = l.f - w / 2 - pad, b = l.f + w / 2 + pad;
      if (hit(a, b)) continue;
      placed.push([a, b]);
      ctx.fillStyle = (arcs && l.f <= p) ? on(l.f) : off;
      textOnRing(txt, ang(l.f), r);
    }
  } else if (lab && sp.labels.length) {
    const L = sp.labels, n = L.length;
    let maxW = 0; for (const l of L) maxW = Math.max(maxW, ctx.measureText(l.t).width);
    const crowded = (wd, cnt) => cnt * (wd + fs * 1.1) > circ;
    let useShort = false;
    if (L[0].t1 && crowded(maxW, n)) { useShort = true; maxW = fs * 0.9; }
    let step = 1;
    while (step < n && crowded(maxW, Math.ceil(n / step))) step++;
    for (let i = 0; i < n; i += step) {
      const l = L[i], txt = useShort ? l.t1 : l.t;
      const half = (useShort ? fs * 0.45 : ctx.measureText(txt).width / 2) / circ;
      if (showNames && sp.short && l.f !== 0 && l.f + half > nameStart) continue;
      ctx.fillStyle = (arcs && l.f <= p) ? on(l.f) : off;
      textOnRing(txt, ang(l.f), r);
    }
  }
  if (sp.short) {
    ctx.font = fontN;
    ctx.fillStyle = (arcs && p >= nameF) ? on(nameF) : rgba(cAt(nameF), 1);
    textOnRing(sp.short, ang(nameF), r);
  }
}
function drawBandEdges(sp, r, th) {
  if (!sp.bands.length) return;
  const lw = Math.max(1.2, th * 0.085);
  ctx.lineWidth = lw; ctx.strokeStyle = rgba(FG, 0.62);
  for (const b of sp.bands) {
    ctx.lineCap = b.round ? 'round' : 'butt';
    ctx.setLineDash(b.dash.map(x => x * lw));
    arcP(b.inner ? r - th / 2 + lw * 0.9 : r + th / 2 - lw * 0.9, b.f0, b.f1); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.lineCap = 'butt';
}
function shapePath(kind, s) {
  ctx.beginPath();
  switch (kind) {
    case 'diamond': ctx.moveTo(0, -s * 1.35); ctx.lineTo(s, 0); ctx.lineTo(0, s * 1.35); ctx.lineTo(-s, 0); ctx.closePath(); break;
    case 'tri': ctx.moveTo(-s * 1.05, -s * 0.85); ctx.lineTo(s * 1.05, -s * 0.85); ctx.lineTo(0, s * 1.05); ctx.closePath(); break;
    case 'bar': ctx.rect(-s * 0.45, -s * 1.5, s * 0.9, s * 3); break;
    case 'star': for (let i = 0; i < 10; i++) { const rr = i % 2 ? s * 0.62 : s * 1.45, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); break;
    case 'ring': ctx.arc(0, 0, s * 1.2, 0, TAU); ctx.moveTo(s * 0.6, 0); ctx.arc(0, 0, s * 0.6, 0, TAU, true); break; // hollow circle, like the chart
    default: ctx.arc(0, 0, s, 0, TAU);
  }
}
function drawPoints(sp, r, th) {
  if (!sp.points.length) return;
  const s = clamp(th * 0.2, 2.2, 5.5), rr = r + th / 2 - s * 0.2;
  for (const pt of sp.points) {
    const a = ang(pt.f);
    ctx.save();
    ctx.translate(cx + rr * Math.cos(a), cy + rr * Math.sin(a));
    ctx.rotate(a + Math.PI / 2); // local -y points outward
    shapePath(pt.shape, s);
    ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = 3; ctx.stroke(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = rgba(FG, 0.95); ctx.fill();
    ctx.restore();
  }
}
function drawDisc(k, v, now) { // a timer as a filled disc in the center that empties as time runs out
  const t = timerByKey(k);
  if (!t || v.a < 0.01) return;
  const c = colorOf(k), p = clamp(v.disp, 0, 1), R = centerRad * (1 + 0.03 * v.hl);
  ctx.globalAlpha = v.a * (1 - hoverAmt * 0.62 * (1 - v.hl));
  ctx.fillStyle = rgba(c, isDark ? 0.1 : 0.08);
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
  if (p > 0.0004) { // translucent, so the clock on top stays readable; rings-only shows no text until a hover, so it's solid
    ctx.fillStyle = rgba(c, (isDark ? 0.5 : 0.42) + (S.minimal === 2 ? 0.4 * (1 - hoverAmt) : 0));
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, ang(0), ang(p)); ctx.closePath(); ctx.fill();
    const a = ang(p);
    ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = Math.max(2, R * 0.025); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a)); ctx.stroke();
  }
  ctx.lineWidth = Math.max(1.5, R * 0.018); ctx.strokeStyle = rgba(c, isDark ? 0.6 : 0.5);
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  let fl = v.flash;
  if (t.done) fl = Math.max(fl, 0.35 + 0.35 * Math.sin(now / 260));
  if (fl > 0.01) {
    ctx.save(); ctx.shadowColor = rgba(c, 0.9); ctx.shadowBlur = R * 0.25 * fl;
    ctx.strokeStyle = rgba(c, 0.6 * fl); ctx.lineWidth = R * 0.05; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke(); ctx.restore();
  }
  ctx.globalAlpha = 1; ctx.lineCap = 'butt';
}
function drawRing(k, T, now) {
  const v = vis[k];
  if (v.disc) { drawDisc(k, v, now); return; }
  if (v.a < 0.01 || v.th < 0.5) return;
  const isMain = k in RINGS;
  const t = isMain ? null : timerByKey(k);
  if (!isMain && !t) return;
  const sp = isMain ? spec(k, T) : { units: 0, labels: t.type === 'daily' ? [{ f: 0, t: fmtHour(t.from / 60) }] : [], bands: [], points: [], short: tName(t).toUpperCase().slice(0, 14) };
  const arcs = S.style === 'arcs' || !(isMain || isRingT(t)); // custom rings follow the ring style; timers are always arcs
  const hl = v.hl;
  const th = v.th * (1 + 0.12 * hl), r = v.r, p = clamp(v.disp, 0, 1);
  const pt = isMain ? paint(k, T) : null;                 // meaning colors, if on for this ring
  const c = pt ? paintAt(pt, Math.min(p, 0.9999)) : colorOf(k);
  const cAt = pt ? (f) => paintAt(pt, f) : () => c;
  ctx.globalAlpha = v.a * (1 - hoverAmt * 0.62 * (1 - hl));
  ctx.lineCap = 'butt'; ctx.lineWidth = th;
  const trackA = arcs ? (isDark ? 0.17 : 0.15) : (isDark ? 0.27 : 0.23);
  if (pt) strokePaint(pt, r, 0, 1, pt.grad ? trackA * 1.5 : trackA * 1.25); // the whole day/week/year stays readable
  else {
    ctx.strokeStyle = rgba(c, trackA); arcP(r, 0, 1); ctx.stroke();
    if (sp.bands.length) {
      ctx.strokeStyle = rgba(c, isDark ? 0.2 : 0.17);
      for (const b of sp.bands) { arcP(r, b.f0, b.f1); ctx.stroke(); }
    }
  }
  if (arcs) { if (pt) drawPaintArc(pt, r, th, p); else drawArc(r, th, p, c); }
  else drawDot(r, th, p, c);
  drawTicks(k, sp, r, th, p, cAt, arcs);
  if (!S.minimal || S.colorblind) drawLabels(sp, r, th, p, cAt, arcs); // color-blind mode keeps the ring names
  if (!S.minimal) { drawBandEdges(sp, r, th); drawPoints(sp, r, th); }
  if (hover && hover.key === k && hover.f != null && sp.units) {
    const u = sp.units, i = clamp(Math.floor(hover.f * u), 0, u - 1);
    ctx.lineCap = 'butt'; ctx.lineWidth = th + 5; ctx.strokeStyle = rgba(FG, isDark ? 0.24 : 0.16);
    arcP(r, i / u, (i + 1) / u); ctx.stroke();
  }
  let fl = v.flash;
  if (t && t.done) fl = Math.max(fl, 0.35 + 0.35 * Math.sin(now / 260));
  if (fl > 0.01) {
    ctx.save(); ctx.shadowColor = rgba(c, 0.9); ctx.shadowBlur = th * 1.4 * fl;
    ctx.strokeStyle = rgba(c, 0.5 * fl); ctx.lineWidth = th; arcP(r, 0, 1); ctx.stroke(); ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function draw(T, now) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  for (const k of Object.keys(vis)) drawRing(k, T, now);
  drawAgeSpokes(T);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
const fmtAge = (a) => String(Math.round(a * 10) / 10);
// Hovering the age ring (or its card) fans the data labels out from the ring, like the chart's callouts
function drawAgeSpokes(T) {
  const v = vis.age;
  if (!v || v.hl < 0.02 || !activeSet.has('age')) return;
  const groups = []; // merge points at (nearly) the same age: "18 · Adult · Can vote…"
  for (const pnt of spec('age', T).points.filter(q => q.age != null).sort((a, b) => a.f - b.f)) {
    const g = groups[groups.length - 1];
    const nm = pnt.short != null ? pnt.short : pnt.name;
    if (g && pnt.f - g.f < 0.004) { if (nm) g.names.push(nm); g.mine = g.mine || pnt.mine; }
    else groups.push({ f: pnt.f, age: pnt.age, names: nm ? [nm] : [], mine: pnt.mine });
  }
  if (!groups.length) return;
  const th = v.th * (1 + 0.12 * v.hl), fs = clamp(size * 0.0165, 9, 12);
  const inward = v.r - th / 2 - centerRad > 90; // inside the ring if there's room, else outside it
  const r0 = inward ? v.r - th / 2 - 6 : v.r + th / 2 + 6;
  const maxLen = inward ? r0 - centerRad - 8 : size / 2 - r0 - 2;
  if (maxLen < 40) return;
  const gap = (fs * 1.3) / Math.max(40, inward ? r0 - maxLen * 0.6 : r0) / TAU; // min spacing, in turns
  const pos = groups.map(g => g.f);
  for (let it = 0; it < 60; it++) { // nudge crowded labels apart
    let moved = false;
    for (let i = 1; i < pos.length; i++) {
      const d = pos[i] - pos[i - 1];
      if (d < gap) { const m = (gap - d) / 2 + 1e-5; pos[i - 1] -= m; pos[i] += m; moved = true; }
    }
    if (!moved) break;
  }
  const hy = hover && hover.key === 'age' && hover.f != null ? Math.floor(hover.f * 100) : null;
  ctx.save();
  ctx.globalAlpha = v.a * clamp(v.hl * 1.15, 0, 1);
  ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  groups.forEach((g, i) => {
    const a = ang(pos[i]), am = ang(g.f), co = Math.cos(a), si = Math.sin(a);
    const rm = inward ? v.r - th / 2 : v.r + th / 2;
    ctx.strokeStyle = rgba(FG, 0.4); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx + rm * Math.cos(am), cy + rm * Math.sin(am)); ctx.lineTo(cx + r0 * co, cy + r0 * si); ctx.stroke();
    const right = co >= 0, nearRingFirst = inward !== right; // keep the age next to the ring on both sides
    const now = hy != null && Math.floor(g.f * 100 + 1e-9) === hy;
    ctx.font = `${now ? 700 : 600} ${fs}px ${FONT}`;
    const mark = g.mine ? '●' : '○', num = fmtAge(g.age);
    let label = g.names.join(' · ');
    const make = (l) => !l ? (nearRingFirst ? `${mark} ${num}` : `${num} ${mark}`) : nearRingFirst ? `${mark} ${num}  ${l}` : `${l}  ${num} ${mark}`;
    let txt = make(label);
    if (ctx.measureText(txt).width > maxLen) {
      while (label.length > 3 && ctx.measureText(make(label + '…')).width > maxLen) label = label.slice(0, -1);
      txt = make(label.trimEnd() + '…');
    }
    ctx.save();
    ctx.translate(cx + r0 * co, cy + r0 * si);
    ctx.rotate(right ? a : a + Math.PI);
    ctx.textAlign = inward ? (right ? 'right' : 'left') : (right ? 'left' : 'right');
    ctx.lineWidth = 3.5; ctx.strokeStyle = rgba(BG, 0.9); ctx.strokeText(txt, 0, 0);
    ctx.fillStyle = rgba(FG, now ? 1 : 0.86); ctx.fillText(txt, 0, 0);
    ctx.restore();
  });
  ctx.restore();
}

/* ---------- animation step ---------- */
function step(dt, now, tp) {
  hoverAmt = ease(hoverAmt, hover && activeSet.has(hover.key) ? 1 : 0, 10, dt);
  startA = ease(startA, targetStart(), 6, dt);
  for (const k of Object.keys(vis)) {
    const v = vis[k];
    v.r = ease(v.r, v.tr, 7, dt);
    v.th = ease(v.th, v.ta ? v.tth : v.tth * 0.3, 7, dt);
    v.a = ease(v.a, v.ta, 6, dt);
    v.hl = ease(v.hl, hover && hover.key === k ? 1 : 0, 12, dt);
    let tgt = null;
    if (k in RINGS) tgt = CUR[k].p;
    else { const t = timerByKey(k); if (t) tgt = timerInfo(t, now).p; }
    if (tgt != null) {
      tgt = clamp(tgt, 0, 1);
      const life = tp - v.born;
      if (tgt < v.disp - 0.5 && life > 1500) { v.disp = tgt; v.flash = 1; } // wrapped around: glow once
      else v.disp = ease(v.disp, tgt, life < 0 ? 0 : (life < 1500 || tp < (v.sweep || 0)) ? 3.4 : 14, dt); // slow sweep on entry and in the briefing
    }
    v.flash = ease(v.flash, 0, 2.6, dt);
    if (!v.ta && v.a < 0.004) { delete vis[k]; delete ghosts[k]; }
  }
}

/* ---------- center readout ---------- */
let centerMode = '';
const setText = (el, s) => { if (el.textContent !== s) el.textContent = s; };
function updateCenter(T, now) {
  let mode = 'clock', label, main, sub, color = '';
  const hk = hover && activeSet.has(hover.key) ? hover.key : null;
  if (BRIEF.on && BRIEF.steps[BRIEF.i]) { // briefing: the center shows the step's headline number
    const st = BRIEF.steps[BRIEF.i];
    mode = 'b:' + BRIEF.i; label = st.label; main = st.main; sub = st.sub;
    color = rgba(st.key in RINGS ? ringColorNow(st.key) : colorOf(st.key), 1);
  } else if (hk) {
    mode = 'k:' + hk;
    const pt = hover.f != null ? paint(hk, T) : null; // over a Saturday the label turns weekend-red, etc.
    color = rgba(pt ? paintAt(pt, hover.f) : (hk in RINGS ? ringColorNow(hk) : colorOf(hk)), 1);
    if (hk in RINGS) {
      label = RINGS[hk].name;
      const x = hover.f == null ? CUR[hk] : atInfo(hk, hover.f, T);
      main = x.main; sub = x.sub;
    } else {
      const t = timerByKey(hk), x = timerInfo(t, now);
      label = tName(t); main = x.main; sub = x.sub;
    }
  } else {
    label = `${DAY3[T.dow]} · ${MON3[T.mo]} ${T.dt}`;
    main = (S.hour12 ? `${(T.h % 12) || 12}:${pad(T.mi)}` : `${pad(T.h)}:${pad(T.mi)}`) + (S.secDigits ? ':' + pad(T.s) : '');
    sub = activeSet.size ? (S.hour12 ? (T.h < 12 ? 'AM · ' : 'PM · ') : '') + `Day ${T.doy} · Week ${T.wk}` : 'All rings hidden · click a card';
    const dk = discKey(), dt = dk && activeSet.has(dk) ? timerByKey(dk) : null;
    if (dt) sub = `${tName(dt)} · ${dt.done ? 'done' : timerInfo(dt, now).main + (dt.running ? ' left' : ' · paused')}`; // the disc's time left
  }
  if (mode !== centerMode) {
    centerMode = mode;
    centerEl.classList.remove('swap'); void centerEl.offsetWidth; centerEl.classList.add('swap');
    centerEl.classList.toggle('idle', mode === 'clock'); // minimal display hides the date and day/week line while idle
  }
  if (cLabel.dataset.c !== color) { cLabel.dataset.c = color; cLabel.style.color = color; }
  setText(cLabel, label); setText(cSub, sub);
  if (cMain.textContent !== main) {
    cMain.textContent = main;
    const len = mode === 'clock' ? (S.secDigits ? 8 : 5) : Math.max(4, main.length);
    cMain.style.fontSize = `calc(var(--cs) * ${Math.min(0.25, 0.92 / (len * 0.6)).toFixed(3)})`;
  }
}

/* ---------- readout cards ---------- */
const readoutEl = $('#readout');
let cards = [];
const PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
const DISC_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><path d="M12 12V3.5A8.5 8.5 0 1 1 3.5 12z" fill="currentColor" stroke="none"/></svg>';
const RING_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="8" opacity=".35"/><path d="M12 4a8 8 0 0 1 8 8"/></svg>';
function setHover(h) {
  const prev = hover && hover.key;
  hover = h;
  const key = h && h.key;
  if (key !== prev) {
    readoutEl.classList.toggle('has-hl', !!key);
    for (const c of cards) c.el.classList.toggle('hl', c.key === key);
  }
}
function renderCtl(card) {
  const t = card.t;
  const b = (act, label, aria) => `<button type="button" data-act="${act}" data-id="${t.id}" aria-label="${aria || label}">${label}</button>`;
  let h;
  if (isRingT(t)) h = b('edit', 'Edit', `Edit ${tName(t)}`) + b('del', 'Remove', `Remove ${tName(t)}`);
  else if (t.done) h =(t.type === 'duration' ? b('restart', 'Restart') : '') + b('del', 'Remove');
  else if (t.type === 'duration') h = b('toggle', t.running ? 'Pause' : 'Resume') + b('reset', 'Reset') + b('del', '✕', 'Remove timer');
  else h = b('del', 'Remove');
  card.ctl.innerHTML = h;
  card.el.classList.toggle('done', !!t.done);
}
function wantShown(key) {
  if (key in RINGS) return !!S.rings[key];
  const t = S.timers.find(x => 't:' + x.id === key);
  return !!t && !t.hidden;
}
function setCardState(card) {
  const on = wantShown(card.key);
  card.off = !on;
  card.el.classList.toggle('off', !on);
  card.el.title = `Click to ${on ? 'hide' : 'show'} the ${card.name} ring`;
  card.vis.setAttribute('aria-pressed', String(on));
  card.vis.setAttribute('aria-label', `${on ? 'Hide' : 'Show'} the ${card.name} ring`);
}
function toggleCard(key) {
  if (key in RINGS) S.rings[key] = !S.rings[key];
  else {
    const t = S.timers.find(x => 't:' + x.id === key);
    if (!t) return;
    t.hidden = !t.hidden;
  }
  save(); bump(); relayout(); syncUI();
  const card = cards.find(c => c.key === key);
  if (card) { setCardState(card); setText(card.pct, card.off ? 'Hidden' : ''); }
  setHover(activeSet.has(key) ? { key, f: null, src: 'card' } : null);
}
function addCard(key, name, t, i) {
  const el = document.createElement('div');
  el.className = 'card'; el.dataset.key = key; el.style.animationDelay = (i * 30) + 'ms';
  el.innerHTML = '<div class="top"><button type="button" class="vis"><span class="dot"></span></button><span class="nm"></span><span class="pct"></span></div><div class="val"></div><div class="sub"></div><div class="bar"><i></i></div>' + (t ? '<div class="ctl"></div>' : '');
  el.querySelector('.nm').textContent = name;
  if (t && !isRingT(t)) { // timers: ring/disc toggle in the top row
    el.classList.add('tmr');
    el.querySelector('.top').insertAdjacentHTML('beforeend', `<button type="button" class="tb" data-act="shape" data-id="${t.id}">${DISC_ICON}</button>`);
  }
  const card = { key, el, t, name, vis: el.querySelector('.vis'), val: el.querySelector('.val'), sub: el.querySelector('.sub'), pct: el.querySelector('.pct'), bar: el.querySelector('.bar i'), ctl: el.querySelector('.ctl') };
  el.addEventListener('mouseenter', () => { if (!drag && !BRIEF.on && activeSet.has(key)) setHover({ key, f: null, src: 'card' }); });
  el.addEventListener('mouseleave', () => { if (hover && hover.src === 'card') setHover(null); });
  readoutEl.appendChild(el); cards.push(card);
  setCardState(card);
  if (t) { renderCtl(card); setTimerBtns(card); }
}
function setTimerBtns(card) {
  const b = card.el.querySelector('.tb[data-act="shape"]');
  if (!b) return;
  const disc = card.t.shape === 'disc';
  b.setAttribute('aria-pressed', String(disc));
  b.title = disc ? 'Shown as a disc in the center · click for a ring' : 'Show as a disc in the center';
  b.setAttribute('aria-label', disc ? `Show ${card.name} as a ring` : `Show ${card.name} as a disc`);
}
function setShape(t, disc) { // only one disc at a time: it fills the center
  for (const o of S.timers) delete o.shape;
  if (disc) t.shape = 'disc';
  save(); bump(); relayout();
  for (const c of cards) if (c.t) setTimerBtns(c);
}
function refreshCards() { paintCards(); cards.forEach(setCardState); }
function paintCards() { // card accent = the ring's color right now (weekend red on a Saturday, sky color at dusk…)
  for (const c of cards) {
    const col = c.key in RINGS ? ringColorNow(c.key) : colorOf(c.key);
    const s = rgba(col, 1);
    if (c.col === s + isDark) continue;
    c.col = s + isDark;
    c.el.style.setProperty('--c', s);
    c.el.style.setProperty('--ct', rgba(col, isDark ? 0.2 : 0.16));
  }
}
function rebuildCards() {
  readoutEl.textContent = ''; cards = [];
  let i = 0;
  for (const k of S.ringOrder) { // same order as the rings; hidden rings keep a card so they can be switched back on
    if (k in RINGS) addCard(k, RINGS[k].name, null, i++);
    else { const t = S.timers.find(x => 't:' + x.id === k); if (t) addCard(k, tName(t), t, i++); }
  }
  const add = document.createElement('button');
  add.type = 'button'; add.className = 'card add'; add.style.animationDelay = (i * 30) + 'ms';
  add.innerHTML = PLUS + '<span>Add timer</span>';
  add.addEventListener('click', openTimerDlg);
  const addR = document.createElement('button');
  addR.type = 'button'; addR.className = 'card add'; addR.style.animationDelay = (i * 30 + 30) + 'ms';
  addR.innerHTML = RING_ICON + '<span>Add ring</span>';
  addR.addEventListener('click', () => openRingDlg());
  readoutEl.append(add, addR);
  paintCards();
  const h = hover; hover = null; setHover(h && (activeSet.has(h.key) ? h : null));
}
function updateCards(now) {
  for (const c of cards) {
    const x = c.t ? timerInfo(c.t, now) : CUR[c.key];
    if (!x) continue;
    setText(c.val, x.long || x.main); setText(c.sub, x.sub); setText(c.pct, c.off ? 'Hidden' : (x.pct || ''));
    c.bar.style.width = (clamp(x.p, 0, 1) * 100).toFixed(2) + '%';
  }
}
readoutEl.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-act]');
  if (!b) { // a click anywhere else on a card shows or hides its ring
    if (e.target.closest('.ctl')) return;
    const card = e.target.closest('.card[data-key]');
    if (card) toggleCard(card.dataset.key);
    return;
  }
  const t = S.timers.find(x => x.id === b.dataset.id);
  if (!t) return;
  const now = Date.now();
  switch (b.dataset.act) {
    case 'edit': openRingDlg(t); return;
    case 'shape': setShape(t, t.shape !== 'disc'); return;
    case 'toggle':
      if (t.running) { t.remaining = Math.max(0, t.endAt - now); t.endAt = null; t.running = false; }
      else { t.endAt = now + t.remaining; t.running = true; }
      break;
    case 'reset':
      t.done = false;
      if (t.running) t.endAt = now + t.total; else t.remaining = t.total;
      break;
    case 'restart':
      t.done = false; t.running = true; t.endAt = now + t.total; t.remaining = t.total;
      break;
    case 'del':
      ghosts['t:' + t.id] = t;
      S.timers = S.timers.filter(x => x !== t);
      clearTitle(); save(); timersChanged();
      return;
  }
  clearTitle(); save();
  const card = cards.find(c => c.t === t);
  if (card) renderCtl(card);
});
function tickTimers(now) {
  for (const t of S.timers) {
    if (t.running && !t.done && t.endAt <= now) {
      t.running = false; t.remaining = 0; t.endAt = null; t.done = true;
      chime(4);
      startAlarm(t.color);
      document.title = `⏰ ${t.label || 'Timer'} is done`;
      save();
      const card = cards.find(c => c.t === t);
      if (card) renderCtl(card);
    }
  }
}
function timersChanged() { normOrder(S); bump(); relayout(); rebuildCards(); syncUI(); }

/* ---------- drag cards to reorder rings (mouse: press and move · touch: long-press) ---------- */
let drag = null, justDragged = false;
const cardEls = () => [...readoutEl.querySelectorAll('.card[data-key]')];
const naturalLeft = (el) => readoutEl.getBoundingClientRect().left + el.offsetLeft - readoutEl.scrollLeft; // ignores transforms
function moveCardTo(el, idx) { // idx = position among the other cards; animates the others (FLIP)
  const all = cardEls(), others = all.filter(x => x !== el);
  idx = clamp(idx, 0, others.length);
  if (all.indexOf(el) === idx) return false;
  const before = new Map(others.map(x => [x, x.getBoundingClientRect().left]));
  readoutEl.insertBefore(el, others[idx] || readoutEl.querySelector('.card.add'));
  for (const x of others) {
    const dx = before.get(x) - naturalLeft(x);
    if (Math.abs(dx) < 0.5) continue;
    x.style.transition = 'none'; x.style.transform = `translateX(${dx.toFixed(1)}px)`;
  }
  void readoutEl.offsetWidth;
  for (const x of others) if (x.style.transition === 'none') { x.style.transition = ''; x.style.transform = ''; }
  return true;
}
function commitOrder() {
  S.ringOrder = cardEls().map(e => e.dataset.key);
  normOrder(S); save(); relayout(); syncUI(); // rings glide to their new radii
}
function dragPlace() {
  const d = drag, el = d.el;
  const top = readoutEl.getBoundingClientRect().top + el.offsetTop;
  const dx = d.x - d.grabX - naturalLeft(el), dy = clamp(d.y - d.grabY - top, -6, 6);
  el.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(1.03)`;
}
function dragFollow() {
  const d = drag, el = d.el;
  dragPlace();
  const mid = d.x - d.grabX + el.offsetWidth / 2;
  let idx = 0;
  for (const o of cardEls()) if (o !== el && naturalLeft(o) + o.offsetWidth / 2 < mid) idx++;
  if (moveCardTo(el, idx)) { commitOrder(); dragPlace(); }
}
function dragAuto() { // scroll the row when dragging near its edges
  const d = drag;
  if (!d || !d.active) return;
  const r = readoutEl.getBoundingClientRect(), edge = 48;
  let v = 0;
  if (d.x < r.left + edge) v = -Math.ceil((r.left + edge - d.x) / 4);
  else if (d.x > r.right - edge) v = Math.ceil((d.x - r.right + edge) / 4);
  if (v && readoutEl.scrollWidth > readoutEl.clientWidth) { readoutEl.scrollLeft += v; dragFollow(); }
  d.raf = requestAnimationFrame(dragAuto);
}
function dragStart() {
  const d = drag;
  if (!d || d.active) return;
  clearTimeout(d.timer);
  d.active = true;
  const r = d.el.getBoundingClientRect();
  d.grabX = d.x0 - r.left; d.grabY = d.y0 - r.top;
  d.el.style.transition = 'none';
  d.el.classList.add('dragging'); document.body.classList.add('sorting');
  if (d.type === 'touch' && navigator.vibrate) navigator.vibrate(10);
  setHover(activeSet.has(d.key) ? { key: d.key, f: null, src: 'drag' } : null);
  dragFollow();
  d.raf = requestAnimationFrame(dragAuto);
}
function dragEnd() {
  const d = drag;
  drag = null;
  if (!d) return;
  clearTimeout(d.timer); cancelAnimationFrame(d.raf);
  if (!d.active) return;
  justDragged = true; setTimeout(() => { justDragged = false; }, 60); // the click that follows a drop is not a toggle
  d.el.style.transition = ''; d.el.style.transform = ''; // settle into its slot
  document.body.classList.remove('sorting');
  setTimeout(() => d.el.classList.remove('dragging'), 300);
  if (hover && hover.src === 'drag') setHover(null);
}
readoutEl.addEventListener('pointerdown', (e) => {
  if (drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const el = e.target.closest('.card[data-key]');
  if (!el || e.target.closest('.ctl, .tb')) return;
  drag = { el, key: el.dataset.key, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, pid: e.pointerId, type: e.pointerType, active: false };
  if (e.pointerType !== 'mouse') drag.timer = setTimeout(dragStart, 380); // long-press, so a swipe still scrolls the row
});
window.addEventListener('pointermove', (e) => {
  const d = drag;
  if (!d || e.pointerId !== d.pid) return;
  d.x = e.clientX; d.y = e.clientY;
  if (d.active) { dragFollow(); return; }
  const dist = Math.hypot(d.x - d.x0, d.y - d.y0);
  if (d.type === 'mouse') { if (dist > 5) dragStart(); }
  else if (dist > 10) { clearTimeout(d.timer); drag = null; } // it was a scroll
});
window.addEventListener('pointerup', (e) => { if (drag && e.pointerId === drag.pid) dragEnd(); });
window.addEventListener('pointercancel', (e) => { if (drag && e.pointerId === drag.pid) dragEnd(); });
readoutEl.addEventListener('touchmove', (e) => { if (drag && drag.active) e.preventDefault(); }, { passive: false });
readoutEl.addEventListener('contextmenu', (e) => { if (drag) e.preventDefault(); });
readoutEl.addEventListener('click', (e) => { if (justDragged) { e.stopPropagation(); e.preventDefault(); } }, true);
readoutEl.addEventListener('keydown', (e) => { // Alt + ← / → moves the focused card
  if (!e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
  const el = e.target.closest('.card[data-key]');
  if (!el) return;
  e.preventDefault();
  if (moveCardTo(el, cardEls().indexOf(el) + (e.key === 'ArrowLeft' ? -1 : 1))) { commitOrder(); el.querySelector('.vis').focus(); }
});

/* ---------- timer dialog ---------- */
const dlg = $('#timerDlg');
let tType = 'duration', tColor = TIMER_COLORS[0], tShape = 'ring';
const segPick = (box, v) => { for (const b of box.children) b.classList.toggle('on', b.dataset.v === v); };
function timerPalette() { return S.colorblind ? TIMER_COLORS_CB : TIMER_COLORS; }
function nextTimerColor() {
  const set = timerPalette(), used = new Set(S.timers.map(t => String(t.color).toLowerCase()));
  return set.find(c => !used.has(c)) || set[S.timers.length % set.length];
}
function setTType(v) {
  tType = v;
  for (const b of $('#tType').children) b.classList.toggle('on', b.dataset.v === v);
  $('#tDurBox').hidden = v !== 'duration'; $('#tUntilBox').hidden = v !== 'until';
}
function renderSwatches(sel) { // shared by the timer and ring dialogs (only one is open at a time)
  const box = $(sel); box.textContent = '';
  for (const c of timerPalette()) {
    const b = document.createElement('button');
    b.type = 'button'; b.style.setProperty('--c', c); b.setAttribute('aria-label', 'Color ' + c);
    b.classList.toggle('on', c === tColor);
    b.addEventListener('click', () => { tColor = c; renderSwatches(sel); });
    box.appendChild(b);
  }
  const custom = document.createElement('input');
  custom.type = 'color'; custom.value = tColor; custom.setAttribute('aria-label', 'Custom color');
  custom.addEventListener('input', () => { tColor = custom.value; for (const s of box.querySelectorAll('button')) s.classList.remove('on'); });
  box.appendChild(custom);
}
function openTimerDlg() {
  ensureAudio();
  $('#tErr').textContent = ''; $('#tLabel').value = '';
  setTType('duration');
  const d = new Date(Date.now() + 864e5); d.setSeconds(0, 0);
  $('#tUntil').value = toLocalInput(d);
  tColor = nextTimerColor(); renderSwatches('#tSwatches');
  tShape = 'ring'; segPick($('#tShape'), tShape);
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  setTimeout(() => $('#tLabel').focus(), 60);
}
function closeDlg() { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); }
for (const b of $('#tType').children) b.addEventListener('click', () => setTType(b.dataset.v));
for (const b of $('#tShape').children) b.addEventListener('click', () => { tShape = b.dataset.v; segPick($('#tShape'), tShape); });
for (const b of $('#tQuick').children) b.addEventListener('click', () => {
  const m = +b.dataset.m;
  $('#tH').value = Math.floor(m / 60); $('#tM').value = m % 60; $('#tS').value = 0;
});
$('#tCancel').addEventListener('click', closeDlg);
$('#timerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const now = Date.now();
  const label = $('#tLabel').value.trim() || (tType === 'duration' ? 'Timer' : 'Countdown');
  let t;
  if (tType === 'duration') {
    const ms = (Math.max(0, +$('#tH').value || 0) * 3600 + Math.max(0, +$('#tM').value || 0) * 60 + Math.max(0, +$('#tS').value || 0)) * 1000;
    if (!(ms > 0)) { $('#tErr').textContent = 'Set a duration longer than zero.'; return; }
    t = { id: uid(), label, color: tColor, type: 'duration', total: ms, endAt: now + ms, remaining: ms, running: true, done: false };
  } else {
    const v = $('#tUntil').value, target = v ? new Date(v).getTime() : NaN;
    if (!(target > now)) { $('#tErr').textContent = 'Pick a date and time in the future.'; return; }
    t = { id: uid(), label, color: tColor, type: 'until', total: target - now, endAt: target, remaining: target - now, running: true, done: false };
  }
  if (tShape === 'disc') { for (const o of S.timers) delete o.shape; t.shape = 'disc'; } // the new disc replaces any other
  S.timers.push(t); save(); timersChanged(); closeDlg();
});

/* ---------- custom ring dialog ---------- */
const rdlg = $('#ringDlg');
let rRepeat = 'daily', rEnds = 'end', rEditId = null, rDays = new Set();
const timeMin = (v) => { const m = /^(\d{1,2}):(\d{2})/.exec(v || ''); return m ? +m[1] * 60 + +m[2] : NaN; };
const minTime = (n) => `${pad(Math.floor(n / 60) % 24)}:${pad(n % 60)}`;
function readRing() { // the dialog's fields → ring fields, or an error message
  const num = (id) => Math.max(0, Math.floor(+$(id).value || 0));
  if (rRepeat === 'daily') {
    const from = timeMin($('#rFrom').value);
    if (isNaN(from)) return 'Pick a start time.';
    let dur;
    if (rEnds === 'end') {
      const to = timeMin($('#rTo').value);
      if (isNaN(to)) return 'Pick an end time.';
      if (to === from) return 'The end time has to differ from the start.';
      dur = (to - from + 1440) % 1440; // an end before the start runs past midnight
    } else {
      dur = num('#rH') * 60 + num('#rM');
      if (!(dur > 0)) return 'Set a duration longer than zero.';
      if (dur > 1440) return 'A daily ring can last 24 hours at most.';
    }
    if (!rDays.size) return 'Pick at least one day.';
    return { type: 'daily', from, dur, days: [...rDays].sort(), total: dur * 60000 };
  }
  const when = (id) => $(id).value ? new Date($(id).value).getTime() : NaN;
  const start = when('#rStart');
  if (!isFinite(start)) return 'Pick a start date and time.';
  const end = rEnds === 'end' ? when('#rEnd') : start + (num('#rD') * 1440 + num('#rH') * 60 + num('#rM')) * 60000;
  if (!isFinite(end)) return 'Pick an end date and time.';
  if (!(end > start)) return rEnds === 'end' ? 'The end has to be after the start.' : 'Set a duration longer than zero.';
  return { type: 'span', start, endAt: end, total: end - start };
}
function rNote() { // live summary: "Weekdays · 8 h 00 m", "Overnight · every day · 8 h 00 m"
  const r = readRing(), el = $('#rNote');
  if (typeof r === 'string') { el.textContent = ''; return; }
  if (r.type === 'span') { el.textContent = `Lasts ${fmtDurCalm(r.total)}.`; return; }
  const d = r.days.join();
  const wk = (x) => (x - S.weekStart + 7) % 7;
  const days = d === '0,1,2,3,4,5,6' ? 'Every day' : d === '1,2,3,4,5' ? 'Weekdays' : d === '0,6' ? 'Weekends' : r.days.slice().sort((a, b) => wk(a) - wk(b)).map(x => DAY3[x]).join(', ');
  el.textContent = `${days}, ${fmtHour(r.from / 60)} to ${fmtHour((r.from + r.dur) / 60)}${r.from + r.dur > 1440 ? ' (overnight)' : ''} · ${fmtSpan(r.dur / 60)}.`;
}
function setRMode() {
  segPick($('#rRepeat'), rRepeat); segPick($('#rEnds'), rEnds);
  const daily = rRepeat === 'daily';
  $('#rFrom').hidden = !daily; $('#rStart').hidden = daily;
  $('#rTo').hidden = !daily; $('#rEnd').hidden = daily;
  $('#rEndBox').hidden = rEnds !== 'end'; $('#rDurBox').hidden = rEnds !== 'dur';
  $('#rDLab').hidden = daily; $('#rDaysBox').hidden = !daily;
  $('#rErr').textContent = '';
  rNote();
}
function renderDays() {
  const box = $('#rDays'); box.textContent = '';
  for (let i = 0; i < 7; i++) {
    const d = (i + S.weekStart) % 7, on = rDays.has(d), b = document.createElement('button');
    b.type = 'button'; b.className = 'chip' + (on ? ' on' : ''); b.textContent = DAY3[d];
    b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', DAY[d]);
    b.addEventListener('click', () => { if (on) rDays.delete(d); else rDays.add(d); renderDays(); rNote(); });
    box.appendChild(b);
  }
}
function openRingDlg(t) { // t = a ring to edit; nothing = a new one
  t = t && isRingT(t) ? t : null;
  rEditId = t ? t.id : null;
  $('#rTitle').textContent = t ? 'Edit ring' : 'New ring';
  $('#rSave').textContent = t ? 'Save' : 'Add ring';
  $('#rLabel').value = t ? (t.label || '') : '';
  rRepeat = t ? t.type : 'daily'; rEnds = 'end';
  const daily = t && t.type === 'daily', span = t && t.type === 'span';
  $('#rFrom').value = minTime(daily ? t.from : 9 * 60);
  $('#rTo').value = minTime(daily ? (t.from + t.dur) % 1440 : 17 * 60);
  const now = new Date(); now.setSeconds(0, 0);
  $('#rStart').value = toLocalInput(span ? new Date(t.start) : now);
  $('#rEnd').value = toLocalInput(span ? new Date(t.endAt) : new Date(now.getTime() + 864e5));
  const m = t ? Math.round(t.total / 60000) : 60;
  $('#rD').value = span ? Math.floor(m / 1440) : 0;
  $('#rH').value = span ? Math.floor(m % 1440 / 60) : Math.floor(m / 60);
  $('#rM').value = m % 60;
  rDays = new Set(daily ? t.days : [0, 1, 2, 3, 4, 5, 6]);
  tColor = t ? t.color : nextTimerColor();
  renderDays(); renderSwatches('#rSwatches'); setRMode();
  if (typeof rdlg.showModal === 'function') rdlg.showModal(); else rdlg.setAttribute('open', '');
  setTimeout(() => $('#rLabel').focus(), 60);
}
function closeRDlg() { if (typeof rdlg.close === 'function') rdlg.close(); else rdlg.removeAttribute('open'); }
for (const b of $('#rRepeat').children) b.addEventListener('click', () => { rRepeat = b.dataset.v; setRMode(); });
for (const b of $('#rEnds').children) b.addEventListener('click', () => { rEnds = b.dataset.v; setRMode(); });
$('#ringForm').addEventListener('input', () => { $('#rErr').textContent = ''; rNote(); });
$('#rCancel').addEventListener('click', closeRDlg);
$('#ringForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const r = readRing();
  if (typeof r === 'string') { $('#rErr').textContent = r; return; }
  const label = $('#rLabel').value.trim() || 'Ring';
  const cur = rEditId && S.timers.find(x => x.id === rEditId);
  if (cur) {
    for (const k of ['from', 'dur', 'days', 'start', 'endAt']) delete cur[k];
    Object.assign(cur, r, { label, color: tColor });
  } else S.timers.push(Object.assign({ id: uid(), label, color: tColor }, r));
  save(); timersChanged(); closeRDlg();
});

/* ---------- settings drawer ---------- */
const drawer = $('#drawer'), scrim = $('#scrim');
drawer.inert = true;
function openDrawer() { drawer.inert = false; drawer.classList.add('on'); scrim.classList.add('on'); drawer.setAttribute('aria-hidden', 'false'); setTimeout(() => $('#closeDrawer').focus(), 60); }
function closeDrawer() { drawer.classList.remove('on'); scrim.classList.remove('on'); drawer.setAttribute('aria-hidden', 'true'); drawer.inert = true; }
$('#settingsBtn').addEventListener('click', openDrawer);
$('#closeDrawer').addEventListener('click', closeDrawer);
scrim.addEventListener('click', closeDrawer);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.classList.contains('on')) closeDrawer(); });

const parseVal = (v) => v === 'true' ? true : v === 'false' ? false : /^\d+$/.test(v) ? +v : v;
function changed(opts) {
  save(); bump(); applyTheme(); applyMinimal(); parseMS(); relayout();
  if (opts && opts.cards) rebuildCards(); else refreshCards();
  if (S.shortcuts !== SC.mode) renderShortcuts();
  syncUI();
}
function buildSettings() {
  const pr = $('#presets');
  for (const p of PRESETS) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = p.name; b.dataset.id = p.id;
    b.addEventListener('click', () => { S.rings = Object.assign({}, p.rings); S.markers = Object.assign({}, p.markers); changed(); });
    pr.appendChild(b);
  }
  const rl = $('#ringList');
  for (const k of RING_IDS) {
    const row = document.createElement('label');
    row.className = 'switch'; row.dataset.ring = k;
    row.innerHTML = `<span class="rl"><b class="sw"></b><span><span class="rn"></span><small></small></span></span><input type="checkbox"><i></i>`;
    row.querySelector('.rn').textContent = RINGS[k].name;
    row.querySelector('input').addEventListener('change', (e) => { S.rings[k] = e.target.checked; changed(); });
    rl.appendChild(row);
  }
  const mlist = $('#meaningList');
  const PICKERS = { week: ['weekend'], day: [], hour: ['night', 'twilight', 'horizon', 'day'], month: SEASONS, age: LIFE.stages.map(s => s[2]) };
  for (const k in MEANING) {
    const row = document.createElement('label');
    row.className = 'switch'; row.dataset.mean = k;
    row.innerHTML = `<span class="rl"><b class="sw"></b><span><span class="rn"></span><small></small></span></span><input type="checkbox"><i></i>`;
    row.querySelector('.rn').textContent = MEANING[k].name;
    row.querySelector('small').textContent = MEANING[k].what;
    row.querySelector('input').addEventListener('change', (e) => { S.meaning[k] = e.target.checked; changed(); });
    const pk = document.createElement('div');
    pk.className = 'mc-row'; pk.dataset.mean = k;
    if (!PICKERS[k].length) pk.innerHTML = '<span class="note">Uses the weekend color above; weekdays keep the ring’s own color.</span>';
    for (const name of PICKERS[k]) {
      const lab = document.createElement('label');
      lab.className = 'mc';
      lab.innerHTML = '<input type="color"><span></span>';
      lab.querySelector('span').textContent = MC_KEYS[name];
      const inp = lab.querySelector('input');
      inp.dataset.mc = name; inp.setAttribute('aria-label', `${MC_KEYS[name]} color`);
      inp.addEventListener('input', () => { S.mcol[name] = inp.value; bump(); save(); paintCards(); }); // live preview
      inp.addEventListener('change', () => { S.mcol[name] = inp.value; changed(); });
      pk.appendChild(lab);
    }
    if (k === 'week') pk.insertAdjacentHTML('beforeend', '<span class="note">Weekdays keep the ring’s own color.</span>');
    mlist.append(row, pk);
  }
  const setLoc = () => {
    const la = parseFloat($('#lat').value), lo = parseFloat($('#lon').value);
    if (isFinite(la) && isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180) { S.lat = la; S.lon = lo; }
    else if ($('#lat').value === '' && $('#lon').value === '') { S.lat = null; S.lon = null; }
    else return; // wait until both numbers are valid
    changed();
  };
  $('#lat').addEventListener('change', setLoc); $('#lon').addEventListener('change', setLoc);
  $('#locAuto').addEventListener('click', () => { S.lat = null; S.lon = null; $('#lat').value = ''; $('#lon').value = ''; changed(); });
  $('#mcReset').addEventListener('click', () => { S.mcol = {}; changed(); });
  $('#addRingSet').addEventListener('click', () => { closeDrawer(); openRingDlg(); });
  const ml = $('#markerList');
  for (const m of MARKERS) {
    const row = document.createElement('label');
    row.className = 'switch'; row.dataset.marker = m.id;
    row.innerHTML = `<span class="rl"><b class="glyph"></b><span><span class="rn"></span><small></small></span></span><input type="checkbox"><i></i>`;
    row.querySelector('.glyph').textContent = m.glyph;
    row.querySelector('.rn').textContent = m.label;
    row.querySelector('small').textContent = m.where;
    row.querySelector('input').addEventListener('change', (e) => { S.markers[m.id] = e.target.checked; changed(); });
    ml.appendChild(row);
  }
  document.querySelectorAll('.seg[data-key]').forEach(seg => {
    const key = seg.dataset.key;
    seg.dataset.opts.split(',').forEach(pair => {
      const [v, l] = pair.split(':');
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = l; b.dataset.v = v;
      b.addEventListener('click', () => { S[key] = parseVal(v); changed({ cards: key === 'hour12' }); });
      seg.appendChild(b);
    });
  });
  const ps = $('#palette');
  for (const id in PALETTES) { const o = document.createElement('option'); o.value = id; o.textContent = PALETTES[id].name; ps.appendChild(o); }
  ps.addEventListener('change', () => { S.palette = ps.value; changed(); });
  $('#order').addEventListener('change', (e) => { // a preset reorders the 7 rings; timers stay innermost
    if (!ORDERS[e.target.value]) return;
    S.ringOrder = ORDERS[e.target.value].concat(S.ringOrder.filter(k => !(k in RINGS)));
    changed({ cards: true });
  });
  for (const id of ['colorblind', 'labels', 'smooth', 'secDigits']) $('#' + id).addEventListener('change', (e) => { S[id] = e.target.checked; changed(); });
  $('#briefOn').addEventListener('change', (e) => { S.brief = e.target.checked; changed(); });
  $('#briefPlay').addEventListener('click', () => { closeDrawer(); setTimeout(() => { if (!startBrief()) window.alert('Turn on at least one of Age, Month, Day of month, Day of week or Hours to get a briefing.'); }, 380); });
  $('#birthdate').addEventListener('change', (e) => { S.birthdate = e.target.value; changed(); });
  $('#milestones').addEventListener('change', (e) => { S.milestones = e.target.value; changed(); });
  $('#resetAll').addEventListener('click', () => {
    if (!window.confirm('Reset all settings, your birthdate, timers and custom rings?')) return;
    S = clone(DEFAULTS); normOrder(S); clearTitle(); changed({ cards: true });
  });
}
const sameSet = (a, b) => Object.keys(b).every(k => !!a[k] === !!b[k]);
function syncUI() {
  const p = PRESETS.find(x => sameSet(S.rings, x.rings) && sameSet(S.markers, x.markers));
  for (const b of $('#presets').children) b.classList.toggle('on', !!p && b.dataset.id === p.id);
  const T0 = LAST_T || snap(Date.now());
  const swatch = (k) => { // speed color, or a little strip of the ring's meaning colors
    const pt = paint(k, T0);
    return pt ? `linear-gradient(90deg, ${[0, .15, .3, .45, .6, .75, .9].map(f => rgba(paintAt(pt, f), 1)).join(',')})` : '';
  };
  for (const row of $('#ringList').children) {
    const k = row.dataset.ring;
    row.style.setProperty('--c', rgba(RC[k], 1));
    row.querySelector('.sw').style.background = swatch(k);
    row.querySelector('input').checked = !!S.rings[k];
    row.querySelector('small').textContent = (k === 'hour' && S.hour12 ? '12-hour cycle' : RINGS[k].cycle) + (S.meaning[k] ? ' · meaning colors' : '');
  }
  for (const row of $('#meaningList').querySelectorAll('label.switch')) {
    const k = row.dataset.mean;
    row.style.setProperty('--c', rgba(RC[k], 1));
    row.querySelector('.sw').style.background = S.meaning[k] ? swatch(k) : '';
    row.querySelector('input').checked = !!S.meaning[k];
  }
  for (const pk of $('#meaningList').querySelectorAll('.mc-row')) pk.classList.toggle('dim', !S.meaning[pk.dataset.mean]);
  for (const inp of $('#meaningList').querySelectorAll('input[data-mc]')) {
    const v = mcHex(inp.dataset.mc).toLowerCase();
    if (document.activeElement !== inp && inp.value !== v) inp.value = v;
  }
  const L = loc(), sun = sunInfo(T0);
  const deg = (v, p, n) => `${Math.abs(v).toFixed(1)}° ${v >= 0 ? p : n}`;
  if (document.activeElement !== $('#lat')) $('#lat').value = S.lat != null ? S.lat : '';
  if (document.activeElement !== $('#lon')) $('#lon').value = S.lon != null ? S.lon : '';
  $('#lat').placeholder = `Lat ${AUTO_LOC.lat.toFixed(2)}`; $('#lon').placeholder = `Lon ${AUTO_LOC.lon.toFixed(2)}`;
  const today = sun.polarDay ? 'the sun stays up all day' : sun.polarNight ? 'the sun doesn’t rise' : `sunrise ≈ ${fmtHour(sun.rise)}, sunset ≈ ${fmtHour(sun.set)}`;
  $('#locHint').textContent = (L.custom
    ? `Custom location (${deg(L.lat, 'N', 'S')}, ${deg(L.lon, 'E', 'W')}).`
    : `Auto: ${AUTO_LOC.name} (${deg(AUTO_LOC.lat, 'N', 'S')}, ${deg(AUTO_LOC.lon, 'E', 'W')}), ${AUTO_LOC.exact ? 'from your time zone' : 'a rough guess from your time zone'}. Type your own coordinates for exact times.`)
    + ` Today: ${today}. ${L.lat < 0 ? 'Southern' : 'Northern'} hemisphere seasons.`;
  for (const row of $('#markerList').children) row.querySelector('input').checked = !!S.markers[row.dataset.marker];
  document.querySelectorAll('.seg[data-key]').forEach(seg => {
    for (const b of seg.children) b.classList.toggle('on', parseVal(b.dataset.v) === S[seg.dataset.key]);
  });
  const ps = $('#palette'); ps.value = S.palette; ps.disabled = S.colorblind;
  $('#palDesc').textContent = pal().desc;
  const seq = S.ringOrder.filter(k => k in RINGS).join();
  $('#order').value = Object.keys(ORDERS).find(o => ORDERS[o].join() === seq) || 'custom';
  document.querySelectorAll('.seg[data-key="shortcuts"] button').forEach(b => { b.disabled = !SC.ok; });
  $('#bmHint').textContent = SC.ok
    ? 'Shows your Chrome bookmarks bar (folders open as menus) or your most visited sites under the top bar.'
    : 'Needs the Chrome extension version: Chrome only lets extensions read bookmarks. Opened as a plain file, this stays hidden.';
  $('#colorblind').checked = S.colorblind; $('#labels').checked = S.labels; $('#smooth').checked = S.smooth; $('#secDigits').checked = S.secDigits; $('#briefOn').checked = S.brief;
  if (document.activeElement !== $('#birthdate')) $('#birthdate').value = S.birthdate || '';
  if (document.activeElement !== $('#milestones')) $('#milestones').value = S.milestones || '';
  $('#cbBtn').setAttribute('aria-pressed', String(S.colorblind));
  const mb = $('#minBtn');
  mb.setAttribute('aria-pressed', String(S.minimal > 0));
  mb.setAttribute('aria-label', `Minimal display: ${MIN_NAMES[S.minimal]}`); mb.title = `Minimal display: ${MIN_NAMES[S.minimal]} (M)`;
  const icons = {
    auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/></svg>',
  };
  const tb = $('#themeBtn');
  if (tb.dataset.mode !== S.theme) { tb.innerHTML = icons[S.theme]; tb.dataset.mode = S.theme; }
  tb.title = `Theme: ${S.theme} (click to change)`;
  $('#onboard').hidden = !!S.birthdate || !!S.hideOnboard || !S.rings.age; // only ask for a birthdate once the Age ring is on
  const grad = `linear-gradient(90deg, ${RING_IDS.map(k => rgba(RC[k], 1)).join(',')})`;
  $('#legendGrad').style.background = grad; $('#palStrip').style.background = grad;
  $('#legendName').textContent = pal().name;
}

/* ---------- top bar + onboarding ---------- */
$('#themeBtn').addEventListener('click', () => { S.theme = { auto: 'light', light: 'dark', dark: 'auto' }[S.theme]; changed(); });
$('#cbBtn').addEventListener('click', () => { S.colorblind = !S.colorblind; changed(); });
$('#minBtn').addEventListener('click', nextMinimal);
$('#addTimerBtn').addEventListener('click', openTimerDlg);
$('#legend').addEventListener('click', () => { // cycle Heat → Spectrum → Viridis → color-blind → Heat
  const ids = Object.keys(PALETTES);
  if (S.colorblind) { S.colorblind = false; S.palette = ids[0]; }
  else { const i = ids.indexOf(S.palette); if (i === ids.length - 1) S.colorblind = true; else S.palette = ids[i + 1]; }
  changed();
});
$('#obSave').addEventListener('click', () => { const v = $('#obDate').value; if (v) { S.birthdate = v; changed(); } else $('#obDate').focus(); });
$('#obLater').addEventListener('click', () => { S.hideOnboard = true; changed(); });
darkMQ.addEventListener('change', () => { if (S.theme === 'auto') changed(); });
// another tab saved: pick up its settings and timers live
window.addEventListener('storage', (e) => {
  if (e.key !== STORE || dirty) return;
  S = load(); bump(); applyTheme(); applyMinimal(); parseMS(); relayout(); rebuildCards(); syncUI();
  if (S.shortcuts !== SC.mode) renderShortcuts();
});

/* ---------- shortcuts: bookmarks bar or most visited (Chrome extension only) ---------- */
const bmEl = $('#bm');
const EXT = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) ? chrome : null;
const SC = { ok: !!(EXT && EXT.bookmarks && EXT.topSites), mode: null, token: 0, menu: null, btn: null };
const FOLDER_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
const usableUrl = (u) => !!u && !/^javascript:/i.test(u); // bookmarklets can't run from an extension page
function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, '') || u; } catch (e) { return u; } }
function favicon(u) {
  try { const f = new URL(EXT.runtime.getURL('/_favicon/')); f.searchParams.set('pageUrl', u); f.searchParams.set('size', '32'); return f.href; } catch (e) { return ''; }
}
function linkEl(node, cls) {
  const a = document.createElement('a');
  if (cls) a.className = cls;
  a.href = node.url; a.title = (node.title ? node.title + '\n' : '') + node.url;
  const img = document.createElement('img'); img.alt = ''; img.width = 16; img.height = 16; img.src = favicon(node.url);
  const sp = document.createElement('span'); sp.textContent = node.title || hostOf(node.url);
  a.append(img, sp);
  return a;
}
function openLink(e) { // http(s) links navigate normally; chrome://, file:// etc. need the tabs API
  const a = e.target.closest('a[href]');
  if (!a || !EXT || !EXT.tabs) return;
  const url = a.getAttribute('href');
  if (/^https?:/i.test(url)) return;
  e.preventDefault();
  if (e.ctrlKey || e.metaKey || e.shiftKey) EXT.tabs.create({ url, active: false }); else EXT.tabs.update({ url });
}
function closeBmMenu() {
  if (SC.menu) { SC.menu.remove(); SC.menu = null; }
  if (SC.btn) { SC.btn.setAttribute('aria-expanded', 'false'); SC.btn = null; }
}
function fillMenu(box, nodes, depth) {
  let any = false;
  for (const n of nodes) {
    if (n.children) {
      if (depth > 4) continue;
      const h = document.createElement('h4'); h.textContent = n.title || 'Folder';
      const sub = document.createElement('div'); sub.className = 'sub';
      box.append(h, sub);
      if (!fillMenu(sub, n.children, depth + 1)) { const p = document.createElement('div'); p.className = 'none'; p.textContent = 'Empty'; sub.append(p); }
      any = true;
    } else if (usableUrl(n.url)) { box.append(linkEl(n)); any = true; }
  }
  return any;
}
function toggleBmMenu(btn, node) {
  const same = SC.btn === btn;
  closeBmMenu();
  if (same) return;
  const m = document.createElement('div');
  m.className = 'bm-menu';
  if (!fillMenu(m, node.children || [], 0)) { const p = document.createElement('div'); p.className = 'none'; p.textContent = 'This folder is empty'; m.append(p); }
  m.addEventListener('click', openLink);
  document.body.append(m);
  const r = btn.getBoundingClientRect();
  m.style.top = Math.round(r.bottom + 6) + 'px';
  m.style.left = Math.round(Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8))) + 'px';
  SC.menu = m; SC.btn = btn; btn.setAttribute('aria-expanded', 'true');
}
async function renderShortcuts() {
  closeBmMenu();
  const mode = S.shortcuts, tok = ++SC.token;
  SC.mode = mode;
  const show = SC.ok && mode !== 'off';
  bmEl.setAttribute('aria-label', mode === 'top' ? 'Most visited' : 'Bookmarks bar');
  if (!show) { bmEl.hidden = true; bmEl.textContent = ''; return; }
  let items = [];
  try {
    if (mode === 'bar') {
      const tree = await new Promise(res => EXT.bookmarks.getTree(res));
      const roots = (tree && tree[0] && tree[0].children) || [];
      const bar = roots.find(n => n.id === '1') || roots[0];
      items = (bar && bar.children) || [];
    } else {
      items = ((await new Promise(res => EXT.topSites.get(res))) || []).slice(0, 12);
    }
  } catch (e) { items = []; }
  if (tok !== SC.token) return; // a newer render started meanwhile
  const frag = document.createDocumentFragment();
  for (const n of items) {
    if (n.children) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'bm-item';
      b.setAttribute('aria-haspopup', 'true'); b.setAttribute('aria-expanded', 'false');
      b.innerHTML = FOLDER_SVG;
      const sp = document.createElement('span'); sp.textContent = n.title || 'Folder'; b.append(sp);
      b.addEventListener('click', () => toggleBmMenu(b, n));
      frag.append(b);
    } else if (usableUrl(n.url)) frag.append(linkEl(n, 'bm-item'));
  }
  if (!frag.childNodes.length) {
    const p = document.createElement('div'); p.className = 'bm-empty';
    p.textContent = mode === 'bar' ? 'Your bookmarks bar is empty. Bookmark a page with Ctrl/⌘ + D to see it here.' : 'No frequently visited sites yet.';
    frag.append(p);
  }
  bmEl.textContent = ''; bmEl.append(frag); bmEl.hidden = false;
}
bmEl.addEventListener('click', openLink);
bmEl.addEventListener('scroll', closeBmMenu, { passive: true });
window.addEventListener('resize', closeBmMenu);
document.addEventListener('pointerdown', (e) => { if (SC.menu && !SC.menu.contains(e.target) && !(SC.btn && SC.btn.contains(e.target))) closeBmMenu(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && SC.menu) { const b = SC.btn; closeBmMenu(); if (b) b.focus(); } });
if (SC.ok) { // keep the strip live when bookmarks change anywhere in Chrome
  let t = 0;
  const later = () => { clearTimeout(t); t = setTimeout(() => { if (S.shortcuts === 'bar') renderShortcuts(); }, 150); };
  ['onCreated', 'onRemoved', 'onChanged', 'onMoved', 'onChildrenReordered', 'onImportEnded'].forEach(ev => { if (EXT.bookmarks[ev]) EXT.bookmarks[ev].addListener(later); });
}

/* ---------- fit: dial + one row of cards fill the window ---------- */
const appEl = $('.app');
let lastOther = -1, layoutRaf = 0;
function fitDial() {
  // +2 px keeps the page just under the window height, so a scrollbar can't flicker on and off
  const other = Math.max(0, Math.ceil(appEl.offsetHeight - wrap.offsetHeight) + 2);
  if (Math.abs(other - lastOther) < 2) return; // ignore sub-2px jitter (stops feedback loops)
  lastOther = other;
  document.documentElement.style.setProperty('--other', other + 'px');
}
// Resize work runs in the next frame, never inside the ResizeObserver callback itself;
// changing layout inside it is what triggers "ResizeObserver loop completed with undelivered notifications".
function scheduleLayout() {
  if (layoutRaf) return;
  layoutRaf = requestAnimationFrame(() => { layoutRaf = 0; fitDial(); resize(); });
}

/* ---------- pointer: hover / tap to explore ---------- */
function hitTest(e) {
  const rect = cv.getBoundingClientRect();
  const x = e.clientX - rect.left - rect.width / 2, y = e.clientY - rect.top - rect.height / 2;
  const d = Math.hypot(x, y) * (size / rect.width);
  let key = null;
  for (const k of activeSet) { const v = vis[k]; if (v && Math.abs(d - v.tr) <= v.slot / 2) { key = k; break; } }
  if (!key) return null;
  let a = Math.atan2(y, x) - startA;
  a = ((a % TAU) + TAU) % TAU;
  return { key, f: a / TAU, src: 'ring' };
}
cv.addEventListener('pointermove', (e) => { if (!BRIEF.on && (e.pointerType !== 'touch' || e.buttons)) setHover(hitTest(e)); });
cv.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch' && hover && hover.src === 'ring') setHover(null); });
cv.addEventListener('pointerdown', (e) => setHover(hitTest(e)));
document.addEventListener('pointerdown', (e) => {
  if (alarmOn) { // the first click only stops the alarm, so it can't toggle or remove anything by accident
    dismissAlarm(); swallowClick = true; setTimeout(() => { swallowClick = false; }, 800);
    e.stopPropagation(); e.preventDefault();
    return;
  }
  // a click outside the caption ends the briefing and still does its normal job (e.g. opens a bookmark)
  if (BRIEF.on && !briefEl.contains(e.target)) endBrief();
  ensureAudio(); clearTitle();
  if (e.target !== cv && hover && hover.src === 'ring') setHover(null);
  if (e.pointerType === 'touch' && hover && hover.src === 'card' && !e.target.closest('.card')) setHover(null); // no mouseleave on touch
}, true);
document.addEventListener('click', (e) => { if (swallowClick) { swallowClick = false; e.stopPropagation(); e.preventDefault(); } }, true);
document.addEventListener('keydown', (e) => {
  if (BRIEF.on) {
    const onButton = e.target.closest && e.target.closest('button');
    if (e.key === 'Escape') { endBrief(); e.preventDefault(); }
    else if (e.key === 'ArrowRight' || ((e.key === ' ' || e.key === 'Enter') && !onButton)) { goBrief(BRIEF.i + 1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { goBrief(BRIEF.i - 1); e.preventDefault(); }
  } else if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat && !dlg.open && !rdlg.open
      && !(e.target.closest && e.target.closest('input, textarea, select, [contenteditable]'))) {
    nextMinimal();
  }
  dismissAlarm(); ensureAudio(); clearTitle();
});

/* ---------- daily briefing: one ring at a time, zooming in from your life to today ---------- */
const BRIEF = { on: false, steps: [], i: 0, elapsed: 0, dur: 0, paused: false };
const briefEl = $('#brief');
const READ_WPM = 238; // average adult silent reading speed (Brysbaert, 2019)
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const countWords = (s) => (String(s).trim().match(/\S+/g) || []).length;
const capFirst = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function nextSeasonEvent(T) { // next solstice or equinox, named for this hemisphere
  const s = loc().lat < 0;
  const ev = [[2, 20, s ? 'the autumn equinox' : 'the spring equinox'], [5, 21, s ? 'the winter solstice' : 'the summer solstice'],
              [8, 22, s ? 'the spring equinox' : 'the autumn equinox'], [11, 21, s ? 'the summer solstice' : 'the winter solstice']];
  const today = new Date(T.y, T.mo, T.dt);
  for (const yy of [T.y, T.y + 1]) for (const [m, d, name] of ev) {
    const days = Math.round((new Date(yy, m, d) - today) / 864e5);
    if (days >= 0) return { days, name };
  }
}
function briefFor(k, T) {
  switch (k) {
    case 'age': {
      if (!AI) return null;
      const yrs = Math.floor(AI.years);
      let text;
      if (AI.isBday) text = `Happy birthday! You turn ${Math.round(AI.years)} today.`;
      else {
        text = `You're ${yrs}% of the way through a 100-year life` + (S.meaning.age ? `, in the ${stageAt(AI.years)[3].toLowerCase()} stage.` : '.');
        const nx = MS.find(m => m.a > AI.years);
        if (AI.daysTo <= 30) text += ` Your birthday is ${AI.daysTo === 1 ? 'tomorrow' : `in ${AI.daysTo} days`}.`;
        else if (nx) text += ` Next milestone: ${nx.a}${nx.name !== 'Milestone' ? ` (${nx.name})` : ''}, in ${(nx.a - AI.years).toFixed(1)} years.`;
      }
      return { key: k, title: 'Your life', label: 'Your life', main: `${AI.years.toFixed(1)} yrs`, sub: `${yrs}% of 100 years`, text };
    }
    case 'month': {
      const pct = Math.floor((T.doy - 1 + T.dayF) / T.diy * 100), ev = nextSeasonEvent(T);
      const text = `${T.diy - T.doy} days left in ${T.y}. It's ${SEASONS[seasonIndex(T.mo).s]}` + (ev.days === 0 ? `, and today is ${ev.name}.` : `; ${ev.name} is in ${ev.days} days.`);
      return { key: k, title: `This year · ${T.y}`, label: String(T.y), main: `${pct}%`, sub: `Day ${T.doy} of ${T.diy}`, text };
    }
    case 'day': {
      const left = T.dim - T.dt;
      let wk = 0;
      for (let d = T.dt + 1; d <= T.dim; d++) { const w = new Date(T.y, T.mo, d).getDay(); if (w === 0 || w === 6) wk++; }
      const text = left === 0 ? `Last day of ${MON[T.mo]}; a new month starts tomorrow.`
        : `${left} day${left === 1 ? '' : 's'} left in ${MON[T.mo]}${wk ? `, ${wk} of them on the weekend` : ''}.`;
      return { key: k, title: `This month · ${MON[T.mo]}`, label: MON[T.mo], main: `Day ${T.dt}`, sub: `of ${T.dim}`, text };
    }
    case 'week': {
      const idx = (T.dow - S.weekStart + 7) % 7, pct = Math.floor((idx + T.dayF) / 7 * 100);
      let text;
      if (T.dow === 6) text = 'It’s Saturday: the weekend is here.';
      else if (T.dow === 0) text = 'It’s Sunday, the last day of the weekend.';
      else { const n = 6 - T.dow; text = `${pct}% of the week is behind you. ` + (n === 1 ? 'The weekend starts tomorrow.' : `The weekend starts in ${n} days.`); }
      return { key: k, title: `This week · week ${T.wk}`, label: `Week ${T.wk}`, main: DAY[T.dow], sub: `Day ${idx + 1} of 7`, text };
    }
    case 'hour': {
      const hv = T.dayF * 24, s = sunInfo(T), pct = Math.floor(T.dayF * 100);
      let text = `${pct}% of today has passed. `;
      if (s.polarDay) text += 'The sun stays up all day.';
      else if (s.polarNight) text += 'The sun won’t rise today.';
      else if (hv < s.rise) text += `Sunrise is at ${fmtHour(s.rise)}, in ${fmtSpan(s.rise - hv)}.`;
      else if (hv < s.set) text += `${capFirst(fmtSpan(s.set - hv))} of daylight left; sunset is at ${fmtHour(s.set)}.`;
      else text += `The sun set at ${fmtHour(s.set)} and rises again around ${fmtHour(s.rise)}.`;
      if (S.markers.work && T.dow > 0 && T.dow < 6 && hv >= 9 && hv < 17) text += ` The work day ends in ${fmtSpan(17 - hv)}.`;
      return { key: k, title: 'Today', label: 'Today', main: fmtHour(Math.floor(hv * 60) / 60), sub: `${pct}% of the day`, text };
    }
  }
  return null;
}
function briefTimers() {
  const now = Date.now();
  const live = S.timers.filter(t => t.running && !t.done && !t.hidden && activeSet.has('t:' + t.id));
  if (!live.length) return null;
  const today = new Date(now).toDateString();
  const parts = live.slice(0, 3).map(t => {
    const e = new Date(t.endAt), when = e.toDateString() === today ? `at ${fmtClock(e)}` : `on ${MON3[e.getMonth()]} ${e.getDate()} at ${fmtClock(e)}`;
    return `${t.label || 'Timer'} ends ${when}`;
  });
  const t0 = live[0];
  return { key: 't:' + t0.id, title: live.length === 1 ? 'Timer' : 'Timers', label: live.length === 1 ? (t0.label || 'Timer') : 'Timers',
    main: live.length === 1 ? fmtDurCalm(tRemain(t0, now)) : `${live.length} running`, sub: live.length === 1 ? 'left' : 'timers', text: parts.join('; ') + '.' };
}
function buildBrief(T) {
  const steps = [];
  for (const k of ['age', 'month', 'day', 'week', 'hour']) if (activeSet.has(k)) { const s = briefFor(k, T); if (s) steps.push(s); } // never minutes or seconds
  const ts = briefTimers(); if (ts) steps.push(ts);
  for (const s of steps) { // time to read the caption at 238 wpm, +20% buffer, +1 s to glance at the ring and its number
    s.dur = clamp(1000 + countWords(`${s.title} ${s.text}`) * 60000 / READ_WPM * 1.2, 3000, 10000);
  }
  return steps;
}
function greeting(T) {
  const g = AI && AI.isBday ? 'Happy birthday' : T.h < 5 ? 'Good night' : T.h < 12 ? 'Good morning' : T.h < 17 ? 'Good afternoon' : T.h < 22 ? 'Good evening' : 'Good night';
  return `${g} · ${DAY[T.dow]}, ${MON[T.mo]} ${T.dt}`;
}
function startBrief() {
  if (BRIEF.on) return false;
  const now = Date.now(), T = snap(now);
  AI = ageInfo(now);
  for (const k of RING_IDS) CUR[k] = current(k, T);
  const steps = buildBrief(T);
  if (!steps.length) return false;
  closeDrawer();
  S.lastBrief = dayKey(new Date(now)); persist(); // saved right away, so other tabs opened now don't replay it
  BRIEF.on = true; BRIEF.steps = steps; BRIEF.paused = false;
  $('#briefHello').textContent = greeting(T);
  $('#briefDots').innerHTML = steps.map(() => '<i></i>').join('');
  briefEl.hidden = false; briefEl.classList.remove('out', 'paused');
  goBrief(0);
  return true;
}
function goBrief(i) {
  if (!BRIEF.on) return;
  i = Math.max(0, i);
  if (i >= BRIEF.steps.length) { endBrief(); return; }
  const st = BRIEF.steps[i];
  BRIEF.i = i; BRIEF.elapsed = 0; BRIEF.dur = st.dur;
  briefEl.style.setProperty('--c', rgba(st.key in RINGS ? ringColorNow(st.key) : colorOf(st.key), 1));
  $('#briefTitle').textContent = st.title; $('#briefText').textContent = st.text;
  const body = $('#briefBody'); body.classList.remove('swap'); void body.offsetWidth; body.classList.add('swap');
  [...$('#briefDots').children].forEach((d, j) => { d.className = j === i ? 'on' : j < i ? 'done' : ''; });
  $('#briefNext').textContent = i === BRIEF.steps.length - 1 ? 'Done' : 'Next ›';
  $('#briefBack').disabled = i === 0;
  setHover({ key: st.key, f: null, src: 'brief' }); // spotlight this ring, dim the rest
  const v = vis[st.key];
  if (v && !RM) { v.disp = 0; v.sweep = performance.now() + 1800; } // re-sweep its fill from zero
}
function endBrief() {
  if (!BRIEF.on) return;
  BRIEF.on = false;
  if (hover && hover.src === 'brief') setHover(null);
  briefEl.classList.add('out');
  setTimeout(() => { if (!BRIEF.on) briefEl.hidden = true; }, 380);
}
function briefTick(dt) {
  if (!BRIEF.on) return;
  if (!BRIEF.paused) BRIEF.elapsed += dt * 1000;
  $('#briefProg').style.width = Math.min(100, BRIEF.elapsed / BRIEF.dur * 100).toFixed(2) + '%';
  if (BRIEF.elapsed >= BRIEF.dur) goBrief(BRIEF.i + 1);
}
function maybeBrief() { // first new tab of the day, once the tab is actually visible
  if (!S.brief || BRIEF.on || S.lastBrief === dayKey(new Date())) return;
  if (document.hidden) {
    const once = () => { if (!document.hidden) { document.removeEventListener('visibilitychange', once); setTimeout(maybeBrief, 700); } };
    document.addEventListener('visibilitychange', once);
    return;
  }
  startBrief();
}
$('#briefSkip').addEventListener('click', endBrief);
$('#briefNext').addEventListener('click', () => goBrief(BRIEF.i + 1));
$('#briefBack').addEventListener('click', () => goBrief(BRIEF.i - 1));
briefEl.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { BRIEF.paused = true; briefEl.classList.add('paused'); $('#briefHint').textContent = 'Paused'; } });
briefEl.addEventListener('pointerleave', () => { BRIEF.paused = false; briefEl.classList.remove('paused'); $('#briefHint').textContent = 'Hover to pause'; });

/* ---------- main loop ---------- */
let lastT = performance.now(), lastDom = -1e9;
function loop(tp) {
  const dt = clamp((tp - lastT) / 1000, 0, 0.1); lastT = tp;
  const now = Date.now(), T = snap(now);
  AI = ageInfo(now);
  LAST_T = T;
  tickTimers(now);
  for (const k of RING_IDS) CUR[k] = current(k, T);
  briefTick(dt);
  step(dt, now, tp);
  draw(T, now);
  updateCenter(T, now);
  if (tp - lastDom > 100) { updateCards(now); paintCards(); lastDom = tp; }
  requestAnimationFrame(loop);
}

/* ---------- boot ---------- */
parseMS();
applyTheme();
applyMinimal();
buildSettings();
rebuildCards();
syncUI();
fitDial();
resize();
relayout();
renderShortcuts();
if ('ResizeObserver' in window) {
  const ro = new ResizeObserver(scheduleLayout);
  [wrap, $('.topbar'), bmEl, $('.side'), $('#legend')].forEach(el => ro.observe(el));
}
window.addEventListener('resize', scheduleLayout);
setInterval(() => tickTimers(Date.now()), 1000); // keeps timers honest in background tabs
requestAnimationFrame(loop);
setTimeout(maybeBrief, 1300); // let the rings sweep in first
})();
