#!/usr/bin/env python3
"""Build a clean playable package for the public sharing repository."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

MAX_WORKERS = min(8, (os.cpu_count() or 4))

try:
    from PIL import Image
    HAS_PILLOW = True
except ImportError:
    HAS_PILLOW = False

ROOT = Path(__file__).resolve().parents[1]
AUDIO_SUFFIXES = {".opus", ".mp3", ".ogg", ".wav", ".flac", ".m4a"}

COVER_SIZE = (800, 450)
THUMB_SIZE = (200, 112)
WEBP_QUALITY = 82

AAC_TARGET_KBPS = 96
FINGERPRINT_HEX_LEN = 10


def has_ffmpeg() -> bool:
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False


HAS_FFMPEG = has_ffmpeg()

SHARE_README = """# Rhythm Fruit Shop Demo

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
"""

START_HTTP_BAT = r"""@echo off
setlocal
cd /d "%~dp0"
set PORT=8817
where python >nul 2>nul
if errorlevel 1 (
  echo Python 3 is required. Install from https://www.python.org/ then retry.
  pause
  exit /b 1
)
echo.
echo Rhythm Fruit Shop - local preview
echo URL: http://127.0.0.1:%PORT%/
echo.
echo Do NOT open index.html directly - browsers block ES modules on file://
echo Press Ctrl+C in this window to stop the server.
echo.
start "" cmd /c "ping -n 2 127.0.0.1 >nul && start http://127.0.0.1:%PORT%/"
python -m http.server %PORT%
"""


def write_share_launchers(target: Path) -> None:
    """Windows helper: ES modules require http(s); file:// double-click breaks in Chromium."""
    (target / "START_HTTP.bat").write_text(START_HTTP_BAT, encoding="utf-8")


def rel(path: Path) -> str:
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        return str(path)


def run_sync() -> None:
    subprocess.run([sys.executable, str(ROOT / "scripts" / "sync_charts_to_game.py")], cwd=ROOT, check=True)


def copy_file(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    print(f"  copied {rel(src)}")


def convert_to_webp(src: Path, dst: Path, size: tuple[int, int] | None = None) -> None:
    """Resize and convert a PNG to WebP. Falls back to plain copy if Pillow unavailable."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    if not HAS_PILLOW:
        shutil.copy2(src, dst.with_suffix(".png"))
        print(f"  copied {rel(src)} (no Pillow, skipped WebP)")
        return
    img = Image.open(src)
    if size:
        img = img.resize(size, Image.LANCZOS)
    webp_dst = dst.with_suffix(".webp")
    img.save(webp_dst, "WEBP", quality=WEBP_QUALITY, method=4)
    src_kb = src.stat().st_size / 1024
    dst_kb = webp_dst.stat().st_size / 1024
    size_label = f"{size[0]}x{size[1]}" if size else "original"
    print(f"  webp {rel(src)}  {src_kb:.0f}KB -> {dst_kb:.0f}KB  ({size_label})")


def reencode_m4a(src: Path, dst: Path, kbps: int) -> None:
    """Re-encode audio to AAC/M4A for broad mobile browser compatibility."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".m4a", delete=False, dir=dst.parent) as tmp:
        tmp_path = Path(tmp.name)
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(src),
                "-vn",
                "-map",
                "0:a:0",
                "-c:a",
                "aac",
                "-b:a",
                f"{kbps}k",
                "-movflags",
                "+faststart",
                str(tmp_path),
            ],
            capture_output=True, check=True,
        )
        shutil.move(str(tmp_path), str(dst))
        src_kb = src.stat().st_size / 1024
        dst_kb = dst.stat().st_size / 1024
        print(f"  m4a  {rel(src)}  {src_kb:.0f}KB -> {dst_kb:.0f}KB  ({kbps}kbps)")
    except subprocess.CalledProcessError as e:
        tmp_path.unlink(missing_ok=True)
        print(f"  ffmpeg failed for {rel(src)}: {e.stderr.decode()[:200]}")
        shutil.copy2(src, dst)
        print(f"  fallback: copied {rel(src)}")


def _process_audio(src: Path, dst: Path) -> str:
    if HAS_FFMPEG:
        reencode_m4a(src, dst, AAC_TARGET_KBPS)
    else:
        copy_file(src, dst)
    return src.name


def copy_audio(target: Path) -> int:
    jobs = []
    audio_root = ROOT / "audio"
    for path in sorted(audio_root.rglob("*")):
        if path.is_file() and path.suffix.lower() in AUDIO_SUFFIXES:
            rel_path = path.relative_to(audio_root)
            dst_rel = rel_path.with_suffix(".m4a") if HAS_FFMPEG else rel_path
            jobs.append((path, target / "audio" / dst_rel))
    if not jobs:
        return 0
    (target / "audio").mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = [pool.submit(_process_audio, src, dst) for src, dst in jobs]
        for f in as_completed(futures):
            f.result()
    return len(jobs)


def copy_src_modules(target: Path) -> int:
    src_root = ROOT / "src"
    paths = [p for p in sorted(src_root.rglob("*.js")) if not p.name.endswith(".test.js")]
    for path in paths:
        copy_file(path, target / "src" / path.relative_to(src_root))
    return len(paths)


def copy_data_files(target: Path) -> int:
    data_root = ROOT / "data"
    paths = sorted(data_root.rglob("*.json"))
    for path in paths:
        copy_json_minified(path, target / "data" / path.relative_to(data_root))
    return len(paths)


def copy_charts(target: Path) -> tuple[int, bool]:
    charts_root = ROOT / "charts"
    paths = sorted(charts_root.rglob("*.json"))
    if not paths:
        return 0, False
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = [
            pool.submit(copy_json_minified, path, target / "charts" / path.relative_to(charts_root))
            for path in paths
        ]
        for f in as_completed(futures):
            f.result()
    has_manifest = any(path.name == "manifest.json" for path in paths)
    song_chart_count = sum(1 for path in paths if path.name != "manifest.json")
    return song_chart_count, has_manifest


def copy_json_minified(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    try:
        data = json.loads(src.read_text(encoding="utf-8"))
        dst.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        src_kb = src.stat().st_size / 1024
        dst_kb = dst.stat().st_size / 1024
        print(f"  json {rel(src)}  {src_kb:.0f}KB -> {dst_kb:.0f}KB")
    except Exception:
        shutil.copy2(src, dst)
        print(f"  copied {rel(src)}")


def copy_png_tree(source: Path, target_root: Path) -> int:
    if not source.exists():
        return 0
    paths = sorted(source.rglob("*.png"))
    if not paths:
        return 0
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = [pool.submit(copy_file, path, target_root / path.relative_to(source)) for path in paths]
        for f in as_completed(futures):
            f.result()
    return len(paths)


def _process_cover(song_dir: Path, songs_dst: Path) -> int:
    count = 0
    cover = song_dir / "cover.png"
    if cover.exists():
        convert_to_webp(cover, songs_dst / song_dir.name / "cover", COVER_SIZE)
        convert_to_webp(cover, songs_dst / song_dir.name / "thumb", THUMB_SIZE)
        count += 2
    for other in sorted(song_dir.glob("*.png")):
        if other.name == "cover.png":
            continue
        copy_file(other, songs_dst / song_dir.name / other.name)
        count += 1
    return count


def optimize_song_covers(target: Path) -> int:
    """Convert song covers to WebP with resize; also generate thumbnails."""
    songs_src = ROOT / "assets" / "songs"
    songs_dst = target / "assets" / "songs"
    if not songs_src.exists():
        return 0
    dirs = [d for d in sorted(songs_src.iterdir()) if d.is_dir()]
    if not dirs:
        return 0
    total = 0
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = [pool.submit(_process_cover, d, songs_dst) for d in dirs]
        for f in as_completed(futures):
            total += f.result()
    return total


def optimize_game_art(target: Path) -> int:
    """Convert runtime game_art PNG assets to WebP where possible."""
    art_src = ROOT / "assets" / "game_art"
    art_dst = target / "assets" / "game_art"
    if not art_src.exists():
        return 0
    paths = sorted(art_src.rglob("*.png"))
    if not paths:
        return 0
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        if HAS_PILLOW:
            futures = [pool.submit(convert_to_webp, path, art_dst / path.relative_to(art_src)) for path in paths]
        else:
            futures = [pool.submit(copy_file, path, art_dst / path.relative_to(art_src)) for path in paths]
        for f in as_completed(futures):
            f.result()
    return len(paths)


def copy_runtime_assets(target: Path) -> int:
    print("\n[fruit_notes]")
    n = copy_png_tree(ROOT / "assets" / "fruit_notes", target / "assets" / "fruit_notes")
    print(f"\n[game_art]")
    n += optimize_game_art(target)
    print(f"\n[song covers] (converting to WebP)")
    n += optimize_song_covers(target)
    return n


def _apply_webp_patches(text: str) -> str:
    text = re.sub(r"(assets/songs/[^'\"]+/)cover\.png", r"\1cover.webp", text)
    text = re.sub(r"(assets/game_art/song_covers/[^'\"]+)\.png", r"\1.webp", text)
    text = re.sub(r"(assets/game_art/[^'\"\)]+)\.png", r"\1.webp", text)
    return text


def patch_html_for_webp(target: Path) -> None:
    """Replace image paths in the packaged index.html and src/*.js to use .webp versions."""
    patched = []

    html_path = target / "index.html"
    original = html_path.read_text(encoding="utf-8")
    updated = _apply_webp_patches(original)
    if updated != original:
        html_path.write_text(updated, encoding="utf-8")
        patched.append("index.html")

    for js_path in sorted((target / "src").rglob("*.js")):
        original = js_path.read_text(encoding="utf-8")
        updated = _apply_webp_patches(original)
        if updated != original:
            js_path.write_text(updated, encoding="utf-8")
            patched.append(f"src/{js_path.relative_to(target / 'src').as_posix()}")

    print(f"\nPatched image paths for WebP in: {', '.join(patched) if patched else '(none changed)'}")


def file_digest(path: Path, length: int = FINGERPRINT_HEX_LEN) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()[:length]


def fingerprint_name(path: Path) -> Path:
    digest = file_digest(path)
    return path.with_name(f"{path.stem}.{digest}{path.suffix}")


def fingerprint_runtime_files(target: Path) -> dict[str, str]:
    """Rename cacheable runtime files with a content hash and rewrite references."""
    roots = [target / "audio", target / "assets", target / "charts"]
    files: list[Path] = []
    for root in roots:
        if not root.exists():
            continue
        for path in sorted(root.rglob("*")):
            if not path.is_file() or path.name == "manifest.json":
                continue
            files.append(path)

    mapping: dict[str, str] = {}
    for path in files:
        hashed = fingerprint_name(path)
        if hashed != path:
            path.rename(hashed)
        old_rel = path.relative_to(target).as_posix()
        new_rel = hashed.relative_to(target).as_posix()
        mapping[old_rel] = new_rel
        if old_rel.startswith("audio/") and path.suffix.lower() == ".m4a":
            old_path = Path(old_rel)
            for source_suffix in [".opus", ".mp3", ".ogg", ".wav", ".flac"]:
                mapping[old_path.with_suffix(source_suffix).as_posix()] = new_rel

    rewrite_fingerprinted_references(target, mapping)
    print(f"\nFingerprinted runtime files: {len(mapping)}")
    return mapping


def rewrite_text_file(path: Path, replacements: dict[str, str]) -> None:
    text = path.read_text(encoding="utf-8")
    original = text
    for old, new in sorted(replacements.items(), key=lambda item: len(item[0]), reverse=True):
        text = text.replace(old, new)
    if text != original:
        path.write_text(text, encoding="utf-8")


def rewrite_fingerprinted_references(target: Path, mapping: dict[str, str]) -> None:
    if not mapping:
        return

    rewrite_text_file(target / "index.html", mapping)
    patch_song_cover_lookup(target, mapping)

    for js_path in sorted((target / "src").rglob("*.js")):
        rewrite_text_file(js_path, mapping)

    for json_path in sorted((target / "data").rglob("*.json")):
        rewrite_text_file(json_path, mapping)

    chart_replacements = {old: new for old, new in mapping.items() if old.startswith("audio/")}
    for chart_path in sorted((target / "charts").rglob("*.json")):
        if chart_path.name != "manifest.json":
            rewrite_text_file(chart_path, chart_replacements)

    manifest_path = target / "charts" / "manifest.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        for entry in manifest.get("charts", []):
            song = entry.get("song")
            chart = entry.get("file")
            if song in mapping:
                entry["song"] = mapping[song]
            if chart and f"charts/{chart}" in mapping:
                entry["file"] = Path(mapping[f"charts/{chart}"]).relative_to("charts").as_posix()
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def patch_song_cover_lookup(target: Path, mapping: dict[str, str]) -> None:
    """Dynamic cover URLs need an explicit id -> fingerprinted path lookup injected into src/main.js."""
    covers: dict[str, str] = {}
    for old, new in mapping.items():
        match = re.fullmatch(r"assets/songs/([^/]+)/cover\.(?:png|webp)", old)
        if match:
            covers[match.group(1)] = new

    if not covers:
        return

    main_js_path = target / "src" / "main.js"
    if not main_js_path.exists():
        return

    js = main_js_path.read_text(encoding="utf-8")
    lookup = "const SONG_COVERS=" + json.dumps(covers, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + ";"
    if "const SONG_COVERS=" not in js:
        js = js.replace("function songByline(", lookup + "\nfunction songByline(", 1)

    js = re.sub(
        r"function songSnapshot\(s\)\{return versionedUrl\(`assets/songs/\$\{s\.id\}/cover\.(?:png|webp)`\)\}",
        "function songSnapshot(s){return versionedUrl(SONG_COVERS[s.id]||`assets/songs/${s.id}/cover.webp`)}",
        js,
        count=1,
    )
    main_js_path.write_text(js, encoding="utf-8")


def require_file(path: Path) -> None:
    if not path.exists():
        raise RuntimeError(f"Missing package file: {path}")


def require_one(pattern: str, root: Path) -> None:
    if not list(root.glob(pattern)):
        raise RuntimeError(f"Missing package file matching: {pattern}")


def validate_package(target: Path) -> None:
    webp = HAS_PILLOW
    art_ext = ".webp" if webp else ".png"
    cover_ext = ".webp" if webp else ".png"
    for path in [
        target / "index.html",
        target / "START_HTTP.bat",
        target / "src" / "main.js",
        target / "data" / "songs.json",
        target / "charts" / "manifest.json",
        target / "README.md",
    ]:
        require_file(path)

    require_one(f"assets/fruit_notes/day/apple.*.png", target)
    require_one(f"assets/fruit_notes/night/apple.*.png", target)
    require_one(f"assets/fruit_notes/sunny/apple.*.png", target)
    require_one(f"assets/game_art/clean_mobile/brand_logo.*{art_ext}", target)
    require_one(f"assets/game_art/clean_mobile/background_clean.*{art_ext}", target)
    require_one(f"assets/game_art/neon_night/brand_logo.*{art_ext}", target)
    require_one(f"assets/game_art/neon_night/background_neon.*{art_ext}", target)
    require_one(f"assets/game_art/sunny_shop/brand_logo.*{art_ext}", target)
    require_one(f"assets/game_art/sunny_shop/background_sunny.*{art_ext}", target)
    require_one(f"assets/game_art/sunny_shop/main_visual_landscape.*{art_ext}", target)
    require_one(f"assets/game_art/sunny_shop/main_visual_portrait.*{art_ext}", target)
    require_one(f"assets/songs/ark_light/cover.*{cover_ext}", target)

    manifest = json.loads((target / "charts" / "manifest.json").read_text(encoding="utf-8"))
    for entry in manifest.get("charts", []):
        song = target / entry["song"]
        chart = target / "charts" / entry["file"]
        if not song.exists():
            raise RuntimeError(f"Missing audio referenced by manifest: {entry['song']}")
        if not chart.exists():
            raise RuntimeError(f"Missing chart referenced by manifest: {entry['file']}")


def build_package(target: Path, make_zip: bool) -> None:
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True)

    run_sync()
    copy_file(ROOT / "index.html", target / "index.html")
    print("\n[src modules]")
    src_count = copy_src_modules(target)
    print("\n[data files]")
    data_count = copy_data_files(target)
    asset_count = copy_runtime_assets(target)
    audio_count = copy_audio(target)
    song_chart_count, has_manifest = copy_charts(target)
    (target / "README.md").write_text(SHARE_README, encoding="utf-8")
    (target / ".nojekyll").write_text("", encoding="utf-8")
    write_share_launchers(target)

    if HAS_PILLOW:
        patch_html_for_webp(target)

    fingerprint_runtime_files(target)
    validate_package(target)

    total_mb = sum(f.stat().st_size for f in target.rglob("*") if f.is_file()) / 1024 / 1024
    print("")
    print(f"Playable package: {target}")
    print(f"JS modules: {src_count}")
    print(f"Data JSON files: {data_count}")
    print(f"Art asset files: {asset_count}")
    print(f"Audio files: {audio_count}")
    print(f"Song chart files: {song_chart_count}")
    print(f"Chart manifest: {'yes' if has_manifest else 'no'}")
    print(f"WebP optimization: {'enabled' if HAS_PILLOW else 'disabled (install Pillow)'}") 
    print(f"AAC/M4A audio: {'enabled (' + str(AAC_TARGET_KBPS) + 'kbps)' if HAS_FFMPEG else 'disabled (install ffmpeg)'}")
    print("Content fingerprints: enabled")
    print(f"Total package size: {total_mb:.1f} MB")

    if make_zip:
        archive_base = target.parent / target.name
        zip_path = shutil.make_archive(str(archive_base), "zip", target)
        zip_mb = Path(zip_path).stat().st_size / 1024 / 1024
        print(f"Zip package: {zip_path} ({zip_mb:.1f} MB)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a clean GitHub-shareable playable package.")
    parser.add_argument("--target", type=Path, default=ROOT / "dist" / "github-share")
    parser.add_argument("--no-zip", action="store_true")
    args = parser.parse_args()

    target = args.target if args.target.is_absolute() else ROOT / args.target
    build_package(target, not args.no_zip)


if __name__ == "__main__":
    main()
