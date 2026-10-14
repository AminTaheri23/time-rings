"""Build a Chrome MV3 new-tab extension from time-rings.html.
MV3 extension pages forbid inline <script>, so the script moves to app.js."""
import json, re, sys, zipfile, math
from pathlib import Path
from PIL import Image, ImageDraw

src, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
ext = out_dir / 'time-rings-newtab'
(ext / 'icons').mkdir(parents=True, exist_ok=True)

html = src.read_text(encoding='utf-8')
m = re.search(r'<script>\n(.*?)</script>', html, re.S)
assert m, 'inline script not found'
(ext / 'app.js').write_text(m.group(1), encoding='utf-8')
page = html[:m.start()] + '<script src="app.js"></script>' + html[m.end():]
assert '<script>' not in page and ' onclick=' not in page
(ext / 'newtab.html').write_text(page, encoding='utf-8')

manifest = {
    'manifest_version': 3,
    'name': 'Time Rings New Tab',
    'version': '1.0.0',
    'description': 'A ring clock for every scale of time: seconds, hours, weekdays, months and a 100-year life.',
    'chrome_url_overrides': {'newtab': 'newtab.html'},
    # bookmarks: read the bookmarks bar · topSites: most visited · favicon: site icons via /_favicon/
    'permissions': ['bookmarks', 'topSites', 'favicon'],
    'icons': {'16': 'icons/icon16.png', '48': 'icons/icon48.png', '128': 'icons/icon128.png'},
}
(ext / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')

def icon(n):
    S = n * 4  # supersample for smooth edges
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([0, 0, S - 1, S - 1], fill=(11, 13, 18, 255))
    rings = [(0.40, '#8b5cf6', 0.62), (0.29, '#22d3ee', 0.45), (0.18, '#ff3b30', 0.78)]
    w = S * 0.085
    for r, col, frac in rings:
        R = S * r
        box = [S / 2 - R, S / 2 - R, S / 2 + R, S / 2 + R]
        d.arc(box, 0, 360, fill=tuple(int(col[i:i + 2], 16) // 4 + 20 for i in (1, 3, 5)) + (255,), width=int(w))
        start = 90  # zero at the bottom, like the dial
        d.arc(box, start, start + 360 * frac, fill=col, width=int(w))
        for a in (start, start + 360 * frac):  # round caps
            x, y = S / 2 + (R - w / 2) * math.cos(math.radians(a)), S / 2 + (R - w / 2) * math.sin(math.radians(a))
            d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=col)
    return im.resize((n, n), Image.LANCZOS)

for n in (16, 48, 128):
    icon(n).save(ext / 'icons' / f'icon{n}.png')

zpath = out_dir / 'time-rings-newtab.zip'
with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in sorted(ext.rglob('*')):
        if f.is_file():
            z.write(f, f.relative_to(ext))
print('built', zpath, [str(f.relative_to(ext)) for f in sorted(ext.rglob('*')) if f.is_file()])
