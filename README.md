# Rhythm Fruit Shop Demo

A mobile-friendly rhythm game demo where you run a fruit shop and serve orders to the beat.

## How To Play

1. Open `index.html` directly, or start a local static server.
2. Click the start button.
3. Pick a song and difficulty.
4. Tap or hold the single input area to process fruit to the rhythm.

If local audio playback is blocked by the browser, run:

```powershell
python -m http.server 8080
```

Then visit:

```text
http://localhost:8080/
```

## Controls

- Mobile: tap or hold the bottom input area.
- Desktop: mouse left button, `Z`, `X`, or `Space`.
- `R`: retry.
- `Esc`: pause or go back.
- `F1`: debug overlay.

## Package Contents

- `index.html`: playable demo entry.
- `audio/`: runtime music files.
- `charts/`: official chart JSON files.
- `hybrid_charts.json`: embedded chart build output for the single-file demo path.
- `README.md`: this file.

This package intentionally excludes development tools, MuG Diffusion imports, stems, diagnostics, and editor scripts.
