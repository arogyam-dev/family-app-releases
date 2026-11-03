"""Synthesize sound effects into assets/sfx/*.mp3 (numpy + ffmpeg)."""
import subprocess
from pathlib import Path
import numpy as np

SR, OUT = 44100, Path(__file__).resolve().parent.parent / "assets/sfx"
rng = np.random.default_rng(7)
t = lambda d: np.arange(int(SR * d)) / SR

def bandpass(x, lo, hi):
    f = np.fft.rfftfreq(len(x), 1 / SR); X = np.fft.rfft(x)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))

def applause(dur=2.2, people=30):
    out = np.zeros(int(SR * dur))
    for _ in range(people):
        lo = rng.uniform(600, 1400); clap = bandpass(rng.normal(size=int(SR * .03)), lo, lo * rng.uniform(1.8, 3))
        clap *= np.exp(-t(.03) * rng.uniform(120, 220))
        at = rng.uniform(0, .25)
        while at < dur - .03:
            i = int(at * SR); out[i:i + len(clap)] += clap * rng.uniform(.4, 1)
            at += rng.uniform(.16, .3)
    env = np.minimum(1, t(dur) / .08) * np.minimum(1, (dur - t(dur)) / .9)
    return out * env

def boink(dur=.45):
    x = t(dur); f = 520 * np.exp(-x * 4.5) * (1 + .06 * np.sin(2 * np.pi * 14 * x))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + .3 * np.sin(2 * ph)) * np.exp(-x * 5) * np.minimum(1, x / .005)

def notes(freqs, step, tail):
    total = step * len(freqs) + tail; out = np.zeros(int(SR * total))
    for i, fr in enumerate(freqs):
        x = t(tail + step); tone = sum(np.sin(2 * np.pi * fr * h * x) / h ** 1.5 for h in (1, 2, 3))
        tone *= np.exp(-x * 4) * np.minimum(1, x / .01)
        s = int(i * step * SR); out[s:s + len(tone)] += tone
    return out

def tap(dur=.06):
    x = t(dur); return np.sin(2 * np.pi * 900 * x) * np.exp(-x * 90)

def save(name, x):
    x = (x / np.abs(x).max() * .9).astype(np.float32)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                    "-b:a", "64k", str(OUT / f"{name}.mp3")], input=x.tobytes(), check=True)

OUT.mkdir(parents=True, exist_ok=True)
save("applause", applause())
save("boink", boink())
save("levelup", notes([523, 659, 784, 1047], .09, .4))   # C E G C
save("fanfare", notes([392, 523, 659, 784, 659, 1047], .13, .7))
save("tap", tap())
