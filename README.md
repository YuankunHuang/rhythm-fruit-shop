# Rhythm Fruit Shop

A rhythm game × fruit-shop personal project. Music is the feel of making drinks, not a stage performance. You start as a summer intern and grow into the shop owner — daily shifts mix customer stories with falling-note tension.

This repo is the **web prototype** and **chart authoring pipeline**. The native C++ rhythm core lives in a separate repository:

**→ [YuankunHuang/rhythm-fruit-shop-cpp](https://github.com/YuankunHuang/rhythm-fruit-shop-cpp)**

| | **Web** (this repo) | **C++** ([rhythm-fruit-shop-cpp](https://github.com/YuankunHuang/rhythm-fruit-shop-cpp)) |
|---|---------------------|------------------------------------------------------------------------------------------|
| What I'm exploring | Look, feel, story, shop loop — does the idea work as a game? | Native rhythm core — clocks, input, charts, architecture |
| Presentation | Playable browser prototype | Minimal geometry on purpose — systems first |
| Stack | HTML + JS | C++20 · SFML · miniaudio · CMake |

They are **not** a port of each other: separate code, chart formats, and assets. The web build is for fast iteration; the C++ build is a fresh native line focused on rhythm foundations.

```text
Web  —  visuals, narrative, service loop, chart pipeline (this repo)
  ↓
C++  —  layered clock, platform boundaries, testable rhythm core (sibling repo)
  ↓
Later —  richer presentation maybe; both are milestones, not final shipping builds
```

**Quick links**

- Play the web prototype → [Web prototype](#web-prototype) · run `05_start_local_server.bat` · open `http://localhost:8080/`
- Run the native demo → [rhythm-fruit-shop-cpp](https://github.com/YuankunHuang/rhythm-fruit-shop-cpp)

**Note:** In-game narrative and many design docs are **Chinese (zh-CN)** — that's the language this story is written in. This README is in English so the repo is easy to navigate.

**Assets:** All bundled music is **AI-generated with Suno for this project** (service segments + the theme song "Open the Fruit Stand!"). No third-party commercial music or album artwork is included.

**Local layout (recommended):** clone both repos as siblings, e.g. `Projects/rhythm-fruit-shop/` and `Projects/rhythm-fruit-shop-cpp/`. Chart import scripts (`03_import_for_cpp.bat`, `07_convert_audio_for_cpp_core.bat`) write assets into the C++ repo by default.

---

## Web prototype

A shareable HTML rhythm + shop prototype. Full charts are the main focus today: judgment, chart pipeline, practice vs. service boundaries, and shop feedback. Design baseline: *customer stories + fresh-fruit service + rhythm crafting*.

Chart authoring workflow:

```text
Source audio
-> Demucs v4 stems -> stems/
-> MuG Diffusion -> 3K osu!mania .osu drafts
-> scripts/import_osu_mania.py -> charts/<song>.json
-> tools/chart_editor.html manual polish
-> scripts/sync_charts_to_game.py -> refresh HTML demo metadata
```

Single-finger input. The 3 visual lanes (`-1 / 0 / 1`) are display-only; input stays one-finger.

### Try it

1. Keep the folder layout as-is.
2. Double-click `05_start_local_server.bat`.
3. Open `http://localhost:8080/`, choose a song and difficulty.

The runtime loads charts from `charts/*.json`.

### Directory layout

- `audio/` — Music files the playable build uses.
- `stems/` — Demucs cache; not loaded at runtime.
- `imports/` — Draft outputs from MuG Diffusion, osu! editors, etc.
- `charts/` — Canonical chart source. One JSON per song; `manifest.json` indexes them.
- `index.html` — Playable entry; loads charts at runtime.
- `tools/chart_editor.html` — Local chart polish tool.
- `tools/schedule_editor.html` — Schedule / prologue dialogue editor (pick `data/` folder to save).
- `scripts/import_osu_mania.py` — Import 3K `.osu` drafts to JSON + single-finger rule checks.
- `scripts/sync_charts_to_game.py` — Refresh `manifest.json` and song metadata in `index.html` (does not rewrite note data).

### C++ chart pipeline (sibling repo)

When `rhythm-fruit-shop-cpp` is cloned next to this repo:

```text
07_convert_audio_for_cpp_core.bat   audio/ -> rhythm-fruit-shop-cpp/assets/audio/ (MP3)
03_import_for_cpp.bat               imports/ -> rhythm-fruit-shop-cpp/assets/charts/
```

Override the target with `--cpp-repo PATH` or env `RFS_CPP_REPO`.

### Narrative editing

- Dialogue tone benchmark: [`docs/dialogue_style_benchmark_zh-CN.md`](docs/dialogue_style_benchmark_zh-CN.md) *(zh-CN)*
- Story bible: [`docs/story_bible_zh-CN.md`](docs/story_bible_zh-CN.md) *(zh-CN)*. Runtime prologue: `data/dialogue/prologue.json`. Edit in `tools/schedule_editor.html` → Prologue tab → saves back to `prologue.json`.
- `data/flows/*.json` — Day structure, dialogue, service, grades, settlement (editor format). The HTML runtime does not fully interpret flows yet.
- Keep `action: "startService"` on the last order node in prologue `opening`, and `action: "settlement"` on the last shared after-service node, or service/settlement breaks.

### Chart pipeline (recommended)

0. Normalize runtime audio to m4a — `00_convert_audio_to_m4a.bat` (uses `audio/loudness-manifest.json`; `--force` for full re-run).

1. Put music in `audio/service/` or `audio/tracks/` (e.g. `audio/tracks/drama.m4a`).

2. Prepare WAV for MuG — `01_prepare_mug_inputs.bat` → `imports/<song-id>/mug/source.wav`.

3. Generate `.osu` / `.osz` in MuG Diffusion (4K VSRG / osu!mania), e.g. `imports/lemon-water/mug/service.osz`.

4. Import drafts:

```powershell
python scripts\import_osu_mania.py imports\drama\mug\expert.osz --difficulty expert --audio-key audio/tracks/drama.m4a
```

Batch:

```powershell
python scripts\import_all_osu_mania.py
python scripts\import_all_osu_mania.py --overwrite   # only when re-importing existing charts
```

Or `02_import_all_osu_mania.bat`. Expects `imports/<id>/mug/{easy,normal,hard,expert,service}.osu` or `.osz`.

5. `03_open_chart_editor.bat` — final human pass on JSON.

6. `04_sync_charts_to_game.bat` — sync playable metadata only.

### Batch scripts

```text
00_convert_audio_to_m4a.bat    Normalize audio to m4a
01_prepare_mug_inputs.bat        WAV for MuG
02_import_all_osu_mania.bat      Batch import + screening
03_open_chart_editor.bat         Chart editor
04_sync_charts_to_game.bat       Sync demo metadata
05_start_local_server.bat        Local test server
06_package_github_share.bat      Shareable package
07_convert_audio_for_cpp_core.bat  Export MP3 to C++ repo
03_import_for_cpp.bat            Import osu! charts to C++ repo
```

### Chart JSON format

Canonical paths: `charts/service/*.json`, `charts/tracks/*.json`.

```json
{
  "id": "drama",
  "type": "track",
  "title": "Drama",
  "song": "audio/tracks/drama.m4a",
  "beats": [0.5, 1.0],
  "downbeats": [0.5],
  "charts": {
    "easy": [],
    "normal": [],
    "hard": [],
    "expert": [
      {"id": 0, "kind": "tap", "time": 1.234, "end": 1.234, "lane": 0, "fruit": 0, "accent": "manual", "role": "verse", "intensity": 1}
    ]
  }
}
```

`.osu` files are draft input only, not runtime assets.

### Controls

- **Mobile:** Tap / hold the bottom play area.
- **Desktop:** Mouse, `Z`, `X`, or `Space`.
- **`R`** — Retry shift.
- **`Esc`** — Pause or back.
- **`F1`** — Debug overlay.

### About this prototype

Not a product pitch — a sandbox to see if *Rhythm Fruit Shop* feels right. The web build carries the visual and narrative experiments; the [C++ repo](https://github.com/YuankunHuang/rhythm-fruit-shop-cpp) is the parallel native rhythm line. Both are active; neither replaces the other.

Design pillars:

- You are an intern becoming the manager, not a performer on a stage.
- Music is rhythm while crafting drinks, not a customer-requested concert.
- Daily service uses ~30–45s **service segments** for specific customers.
- Full songs: practice, challenge, story beats, voluntary overtime, high-performance ZONE rewards.
- Regulars drive story; semi-fixed crowds add variety; walk-ins add shop pressure.
- Practice does not write shop progress; service mode does (coins, reputation, orders, relationships).

More design docs *(mostly zh-CN)*:

- `docs/shop_management_design.md`
- `rhythm_fruit_shop_game_design_doc_zh-CN.md`
- `docs/music_sourcing_recommendations.md`
- `docs/chart_generation_rules.md`
