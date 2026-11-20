"""Synthesize the dodge fight's sound effects (no third-party audio).

Run from mobile/: python3 scripts/fight-sfx.py
Writes 44.1 kHz mono 16-bit WAVs to assets/audio/sfx/, matching the app's other effects.
"""
import math, random, struct, wave

RATE = 44100
random.seed(7)

def write(name, samples, peak=0.5):
    top = max(abs(x) for x in samples) or 1
    with wave.open(f"assets/audio/sfx/{name}.wav", "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(x / top * peak * 32767)) for x in samples))

def env(i, n, attack=0.01, curve=3.0):
    t = i / n
    a = min(1.0, t / attack) if attack else 1.0
    return a * (1 - t) ** curve

def lowpass(xs, k):
    out, y = [], 0.0
    for x in xs:
        y += k * (x - y); out.append(y)
    return out

# Throw: a soft rising whoosh of filtered noise.
n = int(RATE * .2)
noise = [random.uniform(-1, 1) for _ in range(n)]
out, y = [], 0.0
for i, x in enumerate(noise):
    k = .04 + .22 * (i / n)
    y += k * (x - y)
    out.append(y * math.sin(math.pi * i / n) ** 1.5)
write("fightThrow", out, .32)

# Capsule hit: a short glassy crack over a soft thud.
n = int(RATE * .18)
crack = lowpass([random.uniform(-1, 1) for _ in range(n)], .55)
write("fightHit", [
    .55 * crack[i] * env(i, n, .002, 9)
    + .6 * math.sin(2 * math.pi * 150 * i / RATE) * env(i, n, .004, 4)
    + .25 * math.sin(2 * math.pi * 1240 * i / RATE) * env(i, n, .002, 12)
    for i in range(n)], .5)

# Player hit: a dull, low thump with a falling pitch.
n = int(RATE * .26)
phase, out = 0.0, []
for i in range(n):
    f = 120 - 55 * (i / n)
    phase += 2 * math.pi * f / RATE
    out.append(math.sin(phase) * env(i, n, .006, 3) + .15 * random.uniform(-1, 1) * env(i, n, .002, 14))
write("fightHurt", lowpass(out, .3), .55)

# Attack warning: a low, soft two-pulse tone.
n = int(RATE * .3)
out = []
for i in range(n):
    t = i / RATE
    pulse = math.sin(math.pi * min(1, (i % (n // 2)) / (n // 2))) ** 2
    out.append((math.sin(2 * math.pi * 196 * t) + .35 * math.sin(2 * math.pi * 294 * t)) * pulse * (1 - i / n) ** .5)
write("fightWarn", out, .3)
