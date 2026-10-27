"""Background music for the README demo video, composed and synthesized from scratch.

Released under CC0 1.0 (public domain): use it for anything, no credit needed.

Soft pads on A - F#m - D - E at 84 bpm, a bell motif built from the app's own alarm chime
(A5, C#6, E6), a gentle bass and light shaker ticks. Needs Python 3 and numpy.

Usage: python3 tools/demo_music.py out.wav [seconds]
"""
import sys
import wave

import numpy as np

SR = 44100
EIGHTH = 60 / 84 / 2
BAR = EIGHTH * 8
dur = float(sys.argv[2]) if len(sys.argv) > 2 else 40.0
n = int(SR * dur)
mix = np.zeros((2, n))
bells = np.zeros((2, n))  # its own bus, so only the bells get the echo
rng = np.random.default_rng(7)

# per chord: pad voicing, bass note, bell notes (MIDI)
CHORDS = [
    ([57, 61, 64, 69], 45, [81, 85, 88]),  # A    (the bells are the app's chime: A5 C#6 E6)
    ([54, 57, 61, 66], 42, [78, 81, 85]),  # F#m
    ([54, 57, 62, 66], 38, [78, 81, 86]),  # D
    ([56, 59, 64, 68], 40, [76, 80, 83]),  # E
]


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def t_of(length):
    return np.arange(int(length * SR)) / SR


def add(bus, sig, start, pan=0.0, gain=1.0):
    i = int(start * SR)
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
    return s * env(t, length, 0.9, 1.4)


def bell(f, length=2.6):
    t = t_of(length)
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.9)
         + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.35)
         + 0.12 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.15))
    return s * np.minimum(1, t / 0.004)


def bass(f, length):
    t = t_of(length)
    s = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(2 * np.pi * 2 * f * t)
    return s * env(t, length, 0.04, 0.5) * (0.65 + 0.35 * np.exp(-t / 0.6))


def tick(length=0.07):
    t = t_of(length)
    s = np.diff(rng.standard_normal(len(t) + 1))  # crude high-pass: a soft "tss"
    return s * np.exp(-t / 0.018)


bars = int(np.ceil(dur / BAR))
for b in range(bars):
    start = b * BAR
    voicing, root, notes = CHORDS[b % 4]
    for k, m in enumerate(voicing):
        add(mix, pad(hz(m), BAR + 1.4), start, pan=(-0.5, 0.5, -0.25, 0.25)[k], gain=0.075)
    full = 2 <= b < bars - 2  # bass and shaker sit out the first and last two bars
    if full:
        add(mix, bass(hz(root), BAR * 0.95), start, gain=0.13)
        add(mix, bass(hz(root), BAR * 0.45), start + EIGHTH * 5, gain=0.07)
        for e in (1, 3, 5, 7):
            add(mix, tick(), start + e * EIGHTH, pan=0.3, gain=0.02 if e % 4 == 1 else 0.012)
    # the chime motif: up the triad, then a softer answer; every other bar a sparser variation
    hits = [(0, 0), (1, 1), (2, 2), (5, 1), (6, 0)] if b % 2 == 0 else [(0, 2), (3, 1), (6, 2)]
    for j, (e, i) in enumerate(hits):
        add(bells, bell(hz(notes[i])), start + e * EIGHTH, pan=(-0.35, 0.35)[j % 2], gain=0.13 if e < 3 else 0.08)

# echo on the bells: three eighths later, ping-ponged
d = int(3 * EIGHTH * SR)
echo = np.zeros_like(bells)
echo[0, d:] += bells[1, :-d] * 0.32
echo[1, d:] += bells[0, :-d] * 0.32
echo[0, 2 * d:] += bells[0, :-2 * d] * 0.12
echo[1, 2 * d:] += bells[1, :-2 * d] * 0.12
mix += bells + echo

t = np.arange(n) / SR
mix *= np.minimum(1, t / 0.8) * np.clip((dur - t) / 3.0, 0, 1)  # fade in and out
mix *= 0.7 / np.max(np.abs(mix))  # peak at about -3 dBFS

with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix.T * 32767).astype('<i2').tobytes())
print(f'wrote {sys.argv[1]}: {dur:.1f} s')
