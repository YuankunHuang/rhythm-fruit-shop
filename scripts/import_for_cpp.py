#!/usr/bin/env python3
"""
Import osu!mania .osz drafts from imports/ into the C++ project chart format.

Expected import layout:
    imports/<song-id>/mug/<difficulty>.osz   (e.g. easy / normal / hard / expert)

Output:
    cpp_core/assets/charts/<song-id>.rfs.json   -- rfs-cpp-v1 chart
    cpp_core/assets/charts/catalog.json         -- updated song catalog

Notes:
  - The rfs-cpp-v1 format uses time_ms (integer milliseconds) and lanes 0-3.
  - 4K osu!mania maps to lanes 0-3 directly (column N -> lane N).
  - Other key counts are scaled to 4 lanes.
  - Audio is NOT handled by this script. Place the audio file at:
        cpp_core/assets/audio/<song-id>.mp3  (or .m4a / .ogg)
    before running.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
import zipfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parent
CPP_CORE = ROOT / "cpp_core"
CHARTS_DIR = CPP_CORE / "assets" / "charts"
AUDIO_DIR = CPP_CORE / "assets" / "audio"
IMPORTS_DIR = ROOT / "imports"
CATALOG_PATH = CHARTS_DIR / "catalog.json"

VALID_DIFFICULTIES = {"easy", "normal", "hard", "expert", "service"}
AUDIO_EXTENSIONS = (".mp3", ".m4a", ".ogg", ".wav")


# ---------------------------------------------------------------------------
# .osu parsing helpers
# ---------------------------------------------------------------------------

def sections_from_text(text: str) -> dict[str, list[str]]:
    sections: dict[str, list[str]] = {}
    current: str | None = None
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("//"):
            continue
        if line.startswith("[") and line.endswith("]"):
            current = line[1:-1]
            sections.setdefault(current, [])
            continue
        if current:
            sections[current].append(line)
    return sections


def read_sections_from_osz(osz_path: Path) -> tuple[dict[str, list[str]], str]:
    with zipfile.ZipFile(osz_path) as archive:
        osu_names = sorted(name for name in archive.namelist() if name.lower().endswith(".osu"))
        if not osu_names:
            raise RuntimeError(f"{osz_path.name}: no .osu file inside archive")
        osu_name = osu_names[0]
        text = archive.read(osu_name).decode("utf-8-sig", errors="replace")
        return sections_from_text(text), osu_name


def key_values(lines: list[str]) -> dict[str, str]:
    result: dict[str, str] = {}
    for line in lines:
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        result[key.strip()] = value.strip()
    return result


def parse_int(value: str, default: int = 0) -> int:
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return default


# ---------------------------------------------------------------------------
# Lane mapping
# ---------------------------------------------------------------------------

def lane_for_column(column: int, key_count: int) -> int:
    """Map an osu!mania column to a C++ 4-lane index (0-3)."""
    if key_count <= 0:
        return 0
    if key_count == 4:
        return max(0, min(3, column))
    # Scale other key counts proportionally to 4 lanes
    normalized = column / max(1, key_count - 1)
    return min(3, int(normalized * 4))


def column_for_x(x: int, key_count: int) -> int:
    return max(0, min(key_count - 1, int(math.floor(x * key_count / 512))))


# ---------------------------------------------------------------------------
# Note parsing
# ---------------------------------------------------------------------------

def parse_hit_objects(lines: list[str], key_count: int) -> list[dict]:
    notes: list[dict] = []
    for line in lines:
        parts = line.split(",")
        if len(parts) < 5:
            continue
        x = parse_int(parts[0])
        time_ms = parse_int(parts[2])
        object_type = parse_int(parts[3])
        column = column_for_x(x, key_count)
        lane = lane_for_column(column, key_count)

        notes.append({
            "id": len(notes),
            "time_ms": time_ms,
            "lane": lane,
            "visual": len(notes) % 4,
        })
    return notes


# ---------------------------------------------------------------------------
# Catalog management
# ---------------------------------------------------------------------------

def load_catalog() -> dict:
    if CATALOG_PATH.exists():
        try:
            return json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"songs": []}


def save_catalog(catalog: dict) -> None:
    CATALOG_PATH.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def find_audio(song_id: str) -> str | None:
    """Return a relative audio path (assets/audio/...) if a file exists, else None."""
    for ext in AUDIO_EXTENSIONS:
        candidate = AUDIO_DIR / (song_id + ext)
        if candidate.exists():
            return "assets/audio/" + song_id + ext
    return None


def catalog_entry_for(song_id: str, title: str, difficulties: list[str]) -> dict:
    audio = find_audio(song_id)
    return {
        "id": song_id,
        "title": title,
        "audio": audio or "",
        "chart": f"assets/charts/{song_id}.rfs.json",
        "difficulties": difficulties,
    }


def update_catalog(song_id: str, title: str, difficulties: list[str]) -> None:
    catalog = load_catalog()
    songs: list[dict] = catalog.setdefault("songs", [])

    existing = next((s for s in songs if s.get("id") == song_id), None)
    entry = catalog_entry_for(song_id, title, difficulties)

    if existing is None:
        songs.append(entry)
    else:
        existing.update(entry)

    save_catalog(catalog)


# ---------------------------------------------------------------------------
# Per-song import
# ---------------------------------------------------------------------------

def import_song(song_dir: Path, overwrite: bool) -> bool:
    song_id = song_dir.name
    mug_dir = song_dir / "mug"
    if not mug_dir.is_dir():
        print(f"  Skipping {song_id}: no mug/ subdirectory")
        return False

    osz_files = sorted(mug_dir.glob("*.osz"))
    if not osz_files:
        print(f"  Skipping {song_id}: no .osz files in mug/")
        return False

    chart_path = CHARTS_DIR / f"{song_id}.rfs.json"

    if chart_path.exists() and not overwrite:
        existing = json.loads(chart_path.read_text(encoding="utf-8"))
    else:
        existing = {
            "schema": "rfs-cpp-v1",
            "id": song_id,
            "title": song_id,
            "approach_time_ms": 1600,
            "difficulties": {},
        }

    title = existing.get("title", song_id)
    imported_diffs: list[str] = []

    for osz_path in osz_files:
        diff_name = osz_path.stem.lower()
        if diff_name not in VALID_DIFFICULTIES:
            print(f"    Unknown difficulty '{diff_name}', skipping {osz_path.name}")
            continue

        try:
            sections, osu_name = read_sections_from_osz(osz_path)
        except Exception as e:
            print(f"    ERROR reading {osz_path.name}: {e}")
            continue

        general = key_values(sections.get("General", []))
        metadata = key_values(sections.get("Metadata", []))
        difficulty = key_values(sections.get("Difficulty", []))

        mode = parse_int(general.get("Mode", "3"), 3)
        if mode != 3:
            print(f"    Skipping {osz_path.name}: not an osu!mania map (Mode={mode})")
            continue

        key_count = parse_int(difficulty.get("CircleSize", "4"), 4)
        if key_count != 4:
            print(f"    Warning: {osz_path.name} has {key_count} keys; folding to 4 lanes")

        notes = parse_hit_objects(sections.get("HitObjects", []), key_count)

        song_title = metadata.get("TitleUnicode") or metadata.get("Title") or song_id
        title = song_title  # update from metadata

        existing["difficulties"][diff_name] = notes
        imported_diffs.append(diff_name)

        print(f"    {diff_name}: {len(notes)} notes  ({osu_name})")

    if not imported_diffs:
        return False

    existing["title"] = title
    existing["id"] = song_id

    # Sort difficulties in standard order
    order = ["easy", "normal", "hard", "expert", "service"]
    all_diffs = sorted(existing["difficulties"].keys(), key=lambda d: order.index(d) if d in order else 99)

    chart_path.write_text(
        json.dumps(existing, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )

    audio = find_audio(song_id)
    if not audio:
        print(f"    Warning: no audio found at {AUDIO_DIR / song_id}.<ext>")

    update_catalog(song_id, title, all_diffs)
    print(f"  Wrote {chart_path.relative_to(ROOT)}")
    return True


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Import osu!mania .osz files from imports/ into the C++ chart format."
    )
    parser.add_argument(
        "--song", metavar="SONG_ID",
        help="Import only this song (subdirectory name under imports/). Imports all if omitted."
    )
    parser.add_argument(
        "--overwrite", action="store_true",
        help="Overwrite existing difficulties in the chart file. Default: merge (keep existing)."
    )
    args = parser.parse_args()

    CHARTS_DIR.mkdir(parents=True, exist_ok=True)

    if args.song:
        dirs = [IMPORTS_DIR / args.song]
    else:
        dirs = sorted(p for p in IMPORTS_DIR.iterdir() if p.is_dir())

    if not dirs:
        print("No song directories found in imports/.")
        sys.exit(0)

    success = 0
    for song_dir in dirs:
        if not song_dir.is_dir():
            print(f"Not found: {song_dir}")
            continue
        print(f"{song_dir.name}")
        if import_song(song_dir, args.overwrite):
            success += 1

    print()
    print(f"Imported {success} / {len(dirs)} song(s).")
    print(f"Catalog: {CATALOG_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
