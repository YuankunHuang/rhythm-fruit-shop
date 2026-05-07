# Rhythm Fruit Shop Demo

A mobile-friendly rhythm game demo where you run a fruit shop and serve orders to the beat.

## Important (Windows / local folder)

**Do not double-click `index.html`.** This demo uses ES modules (`<script type="module">`). Chromium-based browsers load them only from `http://` or `https://`; on `file://` you will see CORS / `origin null` errors and `main.js` will not run.

**Instead:** double-click **`START_HTTP.bat`** in this folder (requires Python 3). It starts `python -m http.server` and opens the game in your browser.

线上托管（GitHub Pages 等）使用 http/https 时，直接打开站点即可，无需 bat。

## How To Play

1. Start a local static server (`START_HTTP.bat`) or open the hosted build.
2. Click the start button.
3. Pick a song and difficulty.
4. Tap or hold the single input area to process fruit to the rhythm.

For local testing, run:

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

- `START_HTTP.bat`: Windows shortcut — starts local http server (needed for ES modules).
- `index.html`: playable demo entry.
- `src/`: game logic ES modules.
- `data/`: game data JSON files.
- `audio/`: runtime music files.
- `assets/`: runtime UI art files.
- `charts/`: official chart JSON files.
- `README.md`: this file.

This package intentionally excludes development tools, MuG Diffusion imports, stems, diagnostics, and editor scripts.
