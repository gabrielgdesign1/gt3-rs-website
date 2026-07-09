# 911 GT3 RS — Formed by the Wind

A cinematic, scroll-driven tribute site for the Porsche 911 GT3 RS (992).

**Live:** deployed on Vercel · **Data:** [porsche.com](https://www.porsche.com/brazil/pt/models/911/911-gt3-rs/911-gt3-rs/)

## How it works

- **Scroll-scrubbed video** — the hero (exterior turntable) and interior films are pinned full-screen and scrubbed by scroll position. Both videos are re-encoded with ffmpeg so **every frame is a keyframe** (`-g 1 -keyint_min 1`), which makes `currentTime` seeks land instantly and the scrub feel buttery.
- **GSAP + ScrollTrigger + SplitText** — pinned acts, word-by-word manifesto reveal, animated spec counters, horizontal aerodynamics gallery, theme morph from studio-white to track-black.
- **Three.js** — the engine act renders a 9,000-particle vortex (custom GLSL point shader) that spins up with scroll like a tachometer needle.
- **Lenis** — smooth scroll, wired into ScrollTrigger.
- **Accessibility** — `prefers-reduced-motion` disables pinning/scrubbing (videos simply loop), focus states are visible, and mobile gets lighter video files and a reduced particle budget.

## Stack

Vite · vanilla JS · GSAP 3.13 · Three.js · Lenis

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Video pipeline

```bash
ffmpeg -i "source.mp4" -an -vf "scale=1920:-2" -c:v libx264 -crf 21 \
  -g 1 -keyint_min 1 -pix_fmt yuv420p -movflags +faststart out.mp4
```

---

Unofficial concept build. Not affiliated with Dr. Ing. h.c. F. Porsche AG.
