"""Background music for the README demo video, composed and synthesized from scratch.

Released under CC0 1.0 (public domain): use it for anything, no credit needed.

It follows tools/demo-video/timeline.json bar for bar, so the music turns with the captions:
a soft swell rises into every caption and a bell lands on its downbeat. Pads alone for the
opening lines; bass and light shaker once the app appears; a thinner bar for the question
about time; a building arpeggio and a riser through the timer's time-lapse; the app's own
alarm chime (A5 C#6 E6) when the timer ends; a plagal "amen" (D to A) under the title.
Needs Python 3 and numpy.

Usage: python3 tools/demo_music.py out.wav tools/demo-video/timeline.json
"""
import json
import sys
import wave

import numpy as np

SR = 44100
tl = json.load(open(sys.argv[2]))
BEAT = 60 / tl['bpm']
BAR = BEAT * 4
EIGHTH = BEAT / 2
bars = tl['bars']
dur = bars * BAR
n = int(SR * dur)
mix = np.zeros((2, n))
bells = np.zeros((2, n))  # its own bus, so only the bells get the echo
rng = np.random.default_rng(7)

foot = tl['footageAt']
lapse0, lapse1 = tl['cues']['lapse']
done = tl['cues']['done']
caption_bars = {c['bar'] for c in tl['captions']}
outro = next(c['bar'] for c in tl['captions'] if c.get('outro'))
quiet = {c['bar'] for c in tl['captions'] if c.get('quiet')}  # the question about time gets a thinner bar

CHORDS = {  # pad voicing, bass note, bell notes (MIDI)
    'A': ([57, 61, 64, 69], 45, [81, 85, 88]),  # the bells are the app's chime: A5 C#6 E6
    'F#m': ([54, 57, 61, 66], 42, [78, 81, 85]),
    'D': ([54, 57, 62, 66], 38, [78, 81, 86]),
    'E': ([56, 59, 64, 68], 40, [76, 80, 83]),
}
# one chord a bar: home, a sigh, then round the loop; E leans into the start, the time-lapse and the finish
PROG = ['A', 'F#m', 'A', 'E', 'F#m', 'D', 'A', 'E', 'F#m', 'E', 'A', 'F#m', 'E', 'A', 'D', 'A']
PROG = (PROG * (bars // len(PROG) + 1))[:bars]


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def t_of(length):
    return np.arange(int(length * SR)) / SR


def add(bus, sig, start, pan=0.0, gain=1.0):
    i = int(start * SR)
    if i < 0:
        sig, i = sig[-i:], 0
    if i >= n:
        return
    sig = sig[: n - i] * gain
    a = (pan + 1) * np.pi / 4  # equal-power pan, -1 left .. 1 right
    bus[0, i:i + len(sig)] += sig * np.cos(a)
    bus[1, i:i + len(sig)] += sig * np.sin(a)


def env(t, length, attack, release):
    return np.minimum(1, t / attack) * np.clip((length - t) / release, 0, 1)


def pad(f, length):
    t = t_of(length)
    s = sum(np.sin(2 * np.pi * f * (1 + d) * t + ph) for d, ph in ((0, 0), (0.0021, 1.3), (-0.0017, 2.1))) / 3
    s += 0.22 * np.sin(2 * np.pi * 2 * f * t) + 0.06 * np.sin(2 * np.pi * 3 * f * t)
    s *= 0.85 + 0.15 * np.sin(2 * np.pi * 0.35 * t + f)  # slow shimmer
    return s * env(t, length, 0.6, 1.2)


def bell(f, length=2.6):
    t = t_of(length)
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.9)
         + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.35)
         + 0.12 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.15))
    return s * np.minimum(1, t / 0.004)


def pluck(f, length=0.5):
    t = t_of(length)
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)
    return s * np.exp(-t / 0.16) * np.minimum(1, t / 0.003)


def bass(f, length):
    t = t_of(length)
    s = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(2 * np.pi * 2 * f * t)
    return s * env(t, length, 0.04, 0.5) * (0.65 + 0.35 * np.exp(-t / 0.6))


def noise(length, soft=1):
    s = rng.standard_normal(int(length * SR) + 1)
    s = np.diff(s)  # crude high-pass: a soft "tss"
    if soft > 1:
        s = np.convolve(s, np.ones(soft) / soft, mode='same')
    return s


def tick(length=0.07):
    t = t_of(length)
    return noise(length)[: len(t)] * np.exp(-t / 0.018)


def swell(length=0.55):  # reversed-cymbal "shhh" that rises into a downbeat
    t = t_of(length)
    return noise(length, 3)[: len(t)] * (t / length) ** 2.5


def riser(length):  # a longer swell with a rising whistle, for the end of the time-lapse
    t = t_of(length)
    k = (t / length) ** 2
    whistle = np.sin(2 * np.pi * np.cumsum(500 + 1700 * k) / SR) * 0.25
    return (noise(length, 4)[: len(t)] + whistle) * k


for b in range(bars):
    start = b * BAR
    voicing, root, notes = CHORDS[PROG[b]]
    intro, lapsing, ending = b < foot, lapse0 <= b + 0.5 < lapse1, b >= outro
    # pads: under everything, a little fuller from the time-lapse on
    for k, m in enumerate(voicing):
        add(mix, pad(hz(m), BAR + 1.2), start, pan=(-0.5, 0.5, -0.25, 0.25)[k], gain=0.07 if intro else 0.05 if b in quiet else 0.08)
    # bass: from the app's entrance; long notes in the outro
    if not intro:
        if ending or b in quiet:
            add(mix, bass(hz(root), BAR * 1.6), start, gain=0.13 if ending else 0.09)
        else:
            add(mix, bass(hz(root), BAR * 0.95), start, gain=0.13)
            add(mix, bass(hz(root), BAR * 0.45), start + EIGHTH * 5, gain=0.07)
    # shaker: off-beat eighths, sixteenths through the time-lapse; out for the question and the outro
    if not intro and not ending and b not in quiet:
        step = EIGHTH / 2 if lapsing else EIGHTH
        for e in range(int(BAR / step)):
            if lapsing or e % 2:
                add(mix, tick(), start + e * step, pan=0.3, gain=(0.022 if e % 4 == 1 else 0.012) * ((1.2 + 0.25 * (b - lapse0)) if lapsing else 1))
    # the time-lapse: a rising arpeggio, an octave higher in its last bar
    if lapsing:
        tones = sorted(notes) + [notes[0] + 12]
        up = 12 if b + 1 >= lapse1 else 0
        for e in range(8):
            add(mix, pluck(hz(tones[e % len(tones)] - 12 + up)), start + e * EIGHTH, pan=(-0.3, 0.3)[e % 2], gain=0.07 + 0.006 * e + 0.015 * (b - lapse0))
    # bells: the chime motif lands on each caption's downbeat; sparser in between
    if b in caption_bars or b == done:
        hits = [(0, 0), (1, 1), (2, 2), (5, 1), (6, 0)]
        gain = 0.11 if b in quiet else 0.16
    else:
        hits = [(0, 2), (3, 1), (6, 2)]
        gain = 0.09
    if b == done:  # the timer's alarm: the app's chime, brighter, plus a soft burst
        hits = [(0, 0), (0.5, 1), (1, 2), (2, 0), (2.5, 1), (3, 2), (6, 2)]
        gain = 0.2
        burst = t_of(1.4)
        add(mix, noise(1.4, 2)[: len(burst)] * np.exp(-burst / 0.35), start, gain=0.05)
    for j, (e, i) in enumerate(hits):
        add(bells, bell(hz(notes[i])), start + e * EIGHTH, pan=(-0.35, 0.35)[j % 2], gain=gain if e < 3 else gain * 0.6)
    # transitions: a swell into every caption; a long riser into the end of the time-lapse
    if b + 1 in caption_bars and b + 1 != done:
        add(mix, swell(), start + BAR - 0.55, gain=0.05)
    if b + 1 == done:
        add(mix, riser(BAR), start, gain=0.07)

# echo on the bells: three eighths later, ping-ponged
d = int(3 * EIGHTH * SR)
echo = np.zeros_like(bells)
echo[0, d:] += bells[1, :-d] * 0.3
echo[1, d:] += bells[0, :-d] * 0.3
echo[0, 2 * d:] += bells[0, :-2 * d] * 0.11
echo[1, 2 * d:] += bells[1, :-2 * d] * 0.11
mix += bells + echo

t = np.arange(n) / SR
mix *= np.minimum(1, t / 0.15) * np.clip((dur - t) / 2.2, 0, 1)  # fade in fast, out over the title
mix *= 0.7 / np.max(np.abs(mix))  # peak at about -3 dBFS

with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix.T * 32767).astype('<i2').tobytes())
print(f'wrote {sys.argv[1]}: {dur:.1f} s, {bars} bars at {tl["bpm"]} bpm')
