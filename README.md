# Time Rings

**A circular, Apple-Watch-style view of time, built as one HTML file that doubles as a Chrome new-tab page.**

Seconds, minutes, hours, day of week, day of month, month and your age (0–100) are drawn as concentric rings that fill as time passes. Each ring is colored by what it means, and every part can be toggled, reordered and customized. Everything runs in your browser. There is no server, no build step and no tracking.

![Time Rings with every ring on](docs/screenshots/everything-dark.png)

## Contents

- [Quick start](#quick-start)
- [Features](#features)
- [Install as a Chrome new-tab extension](#install-as-a-chrome-new-tab-extension)
- [Using it](#using-it)
- [Rings](#rings)
- [Meaning colors](#meaning-colors)
- [The age ring](#the-age-ring)
- [Markers](#markers)
- [Timers](#timers)
- [Daily briefing](#daily-briefing)
- [Bookmarks](#bookmarks)
- [Themes and accessibility](#themes-and-accessibility)
- [Settings reference](#settings-reference)
- [Privacy](#privacy)
- [How it works](#how-it-works)
- [Project layout](#project-layout)
- [Development](#development)
- [Known limitations](#known-limitations)
- [License](#license)

## Quick start

1. Download [`index.html`](index.html).
2. Open it in any modern browser.

That is all. Your settings are saved in the browser (`localStorage`). To use it as your new-tab page with bookmarks, follow the [extension steps](#install-as-a-chrome-new-tab-extension).

## Features

| Area | What you get |
| --- | --- |
| **Rings** | Seconds, minutes, hours, day of week, day of month, month of year, age (0–100). Slowest ring outside, zero point at the bottom, 24-hour hours (12-hour optional). |
| **Click to show/hide** | Click any card under the dial to turn its ring on or off. |
| **Drag to reorder** | Drag cards to change the ring order. Cards stay in one horizontal row. Keyboard: `Alt` + `←`/`→`. Touch: long-press, then drag. |
| **Meaning colors** | Weekends in red, hours shaded by sunrise and sunset for your time zone, months by season, age by life stage. Each has custom color pickers. |
| **Age ring** | Enter your birthdate. Milestones and typical-American life data (driving, voting, marriage, first child, retirement…) are marked on the ring. |
| **Markers** | Midnight/noon, sunrise/sunset, work hours, night, weekends, mid-month, solstices and equinoxes, quarters, your birthday and more, each individually toggled. |
| **Timers** | Colored countdown timers, each drawn as its own ring. When one finishes, it chimes several times and the page slowly breathes in the timer's color until you click. |
| **Daily briefing** | On the first new tab of the day, the rings are shown one by one with a short caption timed to your reading speed. Skippable. |
| **Bookmarks** | Chrome bookmarks bar, folders and most-visited sites on the new tab (extension version). |
| **Looks** | Light, dark or auto theme. Heat, light-spectrum and viridis palettes. A color-blind-safe (Okabe–Ito) mode. Smooth animation, hover highlight. |
| **Presets** | Default, Minimal, Clock, Life and Everything. |
| **Hide seconds digits** | Keep the seconds ring but remove the ticking numbers from the whole page. |

## Install as a Chrome new-tab extension

The [`extension/`](extension) folder is a ready-to-load Manifest V3 extension.

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the `extension/` folder.
4. Open a new tab.

To update later, replace the folder's contents and press the reload icon on the extension's card.

Permissions requested, and why:

| Permission | Used for |
| --- | --- |
| `bookmarks` | Showing your bookmarks bar and folders. |
| `topSites` | The "Most visited" shortcuts option. |
| `favicon` | Site icons next to bookmarks, loaded locally by Chrome. |

No network access and no host permissions are requested. The standalone `index.html` works fine without any of these, but it cannot read bookmarks (browsers do not allow web pages to do that).

### Publishing to the Chrome Web Store

1. Build the zip: `python tools/build_ext.py index.html .` (creates `time-rings-newtab.zip`).
2. Register a [Chrome Web Store developer account](https://chrome.google.com/webstore/devconsole) (one-time fee).
3. Upload the zip, add a description, at least one 1280×800 screenshot (see [`docs/screenshots`](docs/screenshots)) and a privacy statement. The statement can say that all data stays on the device.
4. Justify each permission using the table above, then submit for review.

Other Chromium browsers (Edge, Brave) should be able to load the same folder, though only Chrome has been tested. Firefox would need a different manifest.

## Using it

- **Hover or tap a ring** to highlight it. Its value appears in the center and the other rings dim.
- **Click a card** to show or hide that ring. The dot on the card is also a keyboard-accessible toggle.
- **Drag a card** to reorder the rings.
- **Gear icon** opens settings: birthdate, presets, palette, markers, meaning colors, briefing, shortcuts.
- **Half-circle icon** switches theme. **Eye icon** toggles color-blind-friendly colors.
- **+ Timer** adds a timer (duration or until a clock time, with a label and a color).

![New user default view](docs/screenshots/new-user.png)

New users start with only **Day of week**, **Hours** and **Month** on. Everything else is one click away.

## Rings

| Ring | Fills over | Notes |
| --- | --- | --- |
| Seconds | 1 minute | Digits can be hidden globally. |
| Minutes | 1 hour | |
| Hours | 24 hours | Shaded by daylight; 12-hour display optional. |
| Day of week | 7 days | Week can start on Sunday or Monday. Weekends are marked. |
| Day of month | 28–31 days | Mid-month and last-day markers. |
| Month | 12 months | Seasons and solstice/equinox markers. |
| Age | 0–100 years | Needs a birthdate. Shows milestones and life data. |

Ring order is "slowest outside" by default. Drag cards to arrange it however you like, and the order is saved.

## Meaning colors

Instead of coloring a ring by speed, color it by what each part means. Each type has its own on/off switch and custom color pickers.

![Meaning colors](docs/screenshots/meaning-colors.png)

- **Day of week:** weekend days are red.
- **Hours:** the ring is shaded by night, dawn, day and dusk. Sunrise and sunset are computed with the NOAA solar equation from your location. The location comes from your time zone (a built-in table of zone to latitude/longitude), or you can set your own. Computed times were checked against timeanddate.com and agree within about a minute. Polar day and polar night are handled.
- **Month:** colored by season, with the winter, spring, summer and autumn colors adjustable.
- **Age:** colored by life stage (childhood, school, career, retirement…).

## The age ring

Enter your birthdate in settings. The ring then shows your exact age with decimals, the percentage of 100 years, and the next milestone.

![Age ring](docs/screenshots/life-ring.png)

- **Your milestones:** a comma-separated list such as `13 Teen, 18 Adult, 30, 40, 50 Halfway, 65 Retirement`.
- **Typical life data (US):** spokes and labels derived from the "Life of a Typical American" chart (for example driving, voting, marriage, first child, retirement age), with figures updated to current US data. These are averages, not predictions.

## Markers

Every marker can be switched on or off in settings, and the choice is saved.

| Marker | Where it appears |
| --- | --- |
| Quarter marks :15 :30 :45 | Seconds and minutes rings |
| Midnight and noon | Hours ring |
| Sunrise and sunset | Hours ring |
| Work hours 9–17 | Hours ring (dashed band) |
| Night 22–06 | Hours ring (dotted band) |
| Weekends | Week and day rings (dashed band) |
| Mid-month and last day | Day of month ring |
| Solstices and equinoxes | Month ring |
| Quarters Q1–Q4 | Month ring |
| Birthday | Month and day rings |
| Your life milestones | Age ring |
| Typical life data (US) | Age ring |

Shapes and dash patterns differ per marker, so they stay distinguishable in color-blind mode.

## Timers

![Timer alarm](docs/screenshots/timer-alarm.png)

- Up to six timers, each with a label and a color, drawn as extra rings.
- Duration timers or "ends at" clock-time timers. Pause, reset and remove from the card.
- Timers survive page reloads and closing the tab. A timer that ended while the page was closed is shown as finished when you return.
- **When a timer ends:** a chime plays a few more times, and the whole page background breathes slowly in the timer's color (kept deliberately mild). **Click anywhere on the page to dismiss.** The dismissing click does not trigger anything else.
- Browsers block audio until you interact with the page once. If you have not clicked yet, the visual alarm still works.

## Daily briefing

![Daily briefing](docs/screenshots/daily-briefing.png)

On the first new tab each day, the rings are presented one at a time, from the big picture to today:

1. **Your life:** percent of 100 years, current life stage, next milestone.
2. **This year:** days left, current season, next solstice or equinox.
3. **This month:** days left, weekend days remaining.
4. **This week:** how much is behind you, when the weekend starts.
5. **Today:** percent passed, daylight left, sunset time, end of the work day.
6. **Timers** that are running.

Only the rings you have turned on are included, and **minutes and seconds are never part of it**.

- **Pacing:** each step stays on screen for the time its caption takes to read at 238 words per minute, plus 20% and one second for looking at the ring. It is clamped to 3–10 seconds.
- **Controls:** **Skip**, **Next ›** and **‹** buttons. `Esc` skips; `←`/`→` navigate; hovering the caption pauses it. Clicking elsewhere ends the briefing and the click still goes through, so a bookmark opens right away.
- **Schedule:** once per calendar day, only when the tab is visible, so background tabs do not use it up.
- **Settings:** turn it off, or press **Play the briefing now**.

## Bookmarks

In the extension version, a shortcut strip under the dial can show:

- **Bookmarks bar**, including folders (nested menus) and live updates when you add or remove bookmarks.
- **Most visited** sites.
- **Off.**

Site icons come from Chrome's local favicon cache. `chrome://` links and `javascript:` bookmarklets are handled. The standalone HTML file hides this strip, because pages cannot read bookmarks.

![Bookmarks](docs/screenshots/bookmarks.png)

## Themes and accessibility

![Light mode, color-blind palette](docs/screenshots/light-colorblind.png)

- **Theme:** auto (follows the system), light or dark.
- **Palettes:**
  - *Heat:* fast rings are hot (red, orange), slow rings are cold (blue, violet).
  - *Light spectrum:* fast is high-frequency violet, slow is low-frequency red.
  - *Viridis:* perceptually even, fast is yellow, slow is deep blue.
- **Color-blind mode:** the Okabe–Ito palette, ring names always visible, markers distinguished by shape and dash pattern.
- **Keyboard:** all cards are focusable buttons; `Enter`/`Space` toggle, `Alt`+arrows reorder.
- **Motion:** smooth animation can be turned off.
- **Mobile:** responsive layout with touch support. Tap a card to toggle, long-press to drag.

![Mobile](docs/screenshots/mobile.png)

## Settings reference

| Setting | Default |
| --- | --- |
| Birthdate | empty |
| Milestones | `13 Teen, 18 Adult, 30, 40, 50 Halfway, 65 Retirement, 80` |
| Rings shown | Day of week, Hours, Month |
| Theme | Auto |
| Palette | Heat |
| Color-blind friendly | Off |
| Ring style | Arcs (a second style is available) |
| Zero point | Bottom |
| 12-hour clock | Off |
| Week starts on | Sunday |
| Seconds digits | Shown |
| Shortcuts | Bookmarks bar |
| Meaning colors | On for week, day, hour, month, age |
| Daily briefing | On |

Everything is stored under a single `localStorage` key, `timeRings.v1`. Changes sync between open tabs.

## Privacy

- No analytics, no accounts, no network requests of its own.
- Settings, birthdate and timers are stored only in your browser's `localStorage`.
- Location for sunrise and sunset is derived from your time zone, not from the browser's geolocation prompt.
- The extension reads bookmarks and top sites only to display them. Nothing leaves your device.

## How it works

- **Rendering:** a single `<canvas>` scaled for device pixel ratio, redrawn each animation frame. Rings animate with easing, and the briefing re-sweeps a ring's fill when it is spotlighted.
- **State:** one object `S` merged over defaults, saved with a debounce, flushed on `pagehide` and synced across tabs with the `storage` event.
- **Meaning colors:** painted as segment arrays, life-stage spans and a conic gradient for the hours sky.
- **Sun times:** the NOAA sunrise equation with a time-zone to coordinates table.
- **Layout:** the dial is sized from the available space with `ResizeObserver`, using `requestAnimationFrame` scheduling and a 2 px hysteresis to avoid resize feedback loops.
- **Reordering:** pointer events with a FLIP animation, a long-press for touch, and keyboard support.
- **Audio:** the alarm chime is synthesized with the Web Audio API, no audio files.
- **Extension:** `tools/build_ext.py` extracts the inline script into `app.js` (Manifest V3 forbids inline scripts), writes the manifest, generates icons and zips the result.

## Project layout

```
.
├── index.html            # the whole app: HTML, CSS and JS in one file
├── extension/            # generated Chrome MV3 new-tab extension
│   ├── manifest.json
│   ├── newtab.html
│   ├── app.js
│   └── icons/
├── tools/
│   └── build_ext.py      # index.html -> extension/ + zip
├── docs/screenshots/
├── LICENSE
└── README.md
```

## Development

There is no build step for the web page: edit `index.html` and reload.

To regenerate the extension after editing (needs Python 3 and Pillow):

```bash
pip install pillow
python tools/build_ext.py index.html .
```

This rewrites `extension/` and creates `time-rings-newtab.zip`. Do not edit `extension/app.js` or `extension/newtab.html` by hand. They are overwritten on each build.

Handy checks while developing:

- Open the browser console. There should be no errors.
- Test with real scrollbars and a resized window to check the layout logic.
- Set `lastBrief` in `localStorage` (`timeRings.v1`) to an old date to replay the daily briefing, or use **Play the briefing now** in settings.

## Known limitations

- Bookmarks and most-visited need the extension. A plain web page cannot read them.
- Browsers block audio until the first click, so the first alarm can be silent if you have not interacted with the page.
- Sunrise and sunset come from the time zone, so they are approximate (within minutes) for places far from the zone's reference city.
- The "typical American" life data are US averages and will not fit everyone.
- Chrome's extension Errors page can keep old entries after an update until you clear them.

## License

[MIT](LICENSE) © 2026 Amin Taheri
