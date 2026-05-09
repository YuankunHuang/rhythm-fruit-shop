#!/usr/bin/env python3
"""Import a 3K osu!mania draft into the official Rhythm Fruit Aim chart format."""

from __future__ import annotations

import argparse
import json
import math
import sys
import zipfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from sync_charts_to_game import (
    CHART_KEYS,
    ROOT,
    chart_keys,
    chart_type_from_song,
    existing_chart_file_path,
    normalize_chart_file,
    normalize_notes,
    sync_to_game,
)


LANE_BY_COLUMN_3K = [-1, 0, 1]


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


def read_sections(path: Path) -> tuple[dict[str, list[str]], str]:
    if path.suffix.lower() != ".osz":
        return sections_from_text(path.read_text(encoding="utf-8-sig", errors="replace")), path.name

    with zipfile.ZipFile(path) as archive:
        osu_names = sorted(name for name in archive.namelist() if name.lower().endswith(".osu"))
        if not osu_names:
            raise RuntimeError(f"{path.name} does not contain any .osu beatmap")
        osu_name = osu_names[0]
        text = archive.read(osu_name).decode("utf-8-sig", errors="replace")
        return sections_from_text(text), osu_name


def read_key_values(lines: list[str]) -> dict[str, str]:
    values: dict[str, str] = {}
    for line in lines:
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        values[key.strip()] = value.strip()
    return values


def parse_float(value: str, default: float = 0.0) -> float:
    try:
        return float(value)
    except ValueError:
        return default


def parse_int(value: str, default: int = 0) -> int:
    try:
        return int(float(value))
    except ValueError:
        return default


def column_for_x(x: int, key_count: int) -> int:
    return max(0, min(key_count - 1, int(math.floor(x * key_count / 512))))


def lane_for_column(column: int, key_count: int) -> int:
    if key_count == 3:
        return LANE_BY_COLUMN_3K[column]
    if key_count <= 1:
        return 0
    normalized = round((column / (key_count - 1)) * 2)
    return LANE_BY_COLUMN_3K[max(0, min(2, normalized))]


def parse_timing_points(lines: list[str], duration: float = 0.0) -> tuple[list[float], list[float]]:
    uninherited: list[tuple[float, float]] = []
    for line in lines:
        parts = line.split(",")
        if len(parts) < 2:
            continue
        start_ms = parse_float(parts[0])
        beat_ms = parse_float(parts[1])
        inherited = len(parts) < 7 or parts[6].strip() != "0"
        if inherited and beat_ms > 0:
            uninherited.append((start_ms / 1000.0, beat_ms / 1000.0))

    if not uninherited:
        return [], []

    uninherited.sort(key=lambda item: item[0])
    end_time = max(duration, uninherited[-1][0] + 60.0)
    beats: list[float] = []
    downbeats: list[float] = []
    beat_index = 0

    for index, (start, beat_len) in enumerate(uninherited):
        if beat_len <= 0:
            continue
        segment_end = uninherited[index + 1][0] if index + 1 < len(uninherited) else end_time
        t = start
        local_index = 0
        while t <= segment_end + 1e-6:
            rounded = round(max(0.0, t), 3)
            beats.append(rounded)
            if (beat_index + local_index) % 4 == 0:
                downbeats.append(rounded)
            local_index += 1
            t += beat_len
        beat_index += local_index

    beats = sorted(set(beats))
    downbeats = sorted(set(downbeats))
    return beats, downbeats


def parse_hit_objects(lines: list[str], key_count: int) -> list[dict]:
    notes: list[dict] = []
    for line in lines:
        parts = line.split(",")
        if len(parts) < 5:
            continue
        x = parse_int(parts[0])
        time = parse_int(parts[2]) / 1000.0
        object_type = parse_int(parts[3])
        column = column_for_x(x, key_count)
        lane = lane_for_column(column, key_count)
        kind = "press" if object_type & 128 else "tap"
        end = time
        if kind == "press" and len(parts) >= 6:
            end = max(time, parse_int(parts[5].split(":", 1)[0]) / 1000.0)
            if end - time < 0.05:
                kind = "tap"
                end = time
        notes.append({
            "id": len(notes),
            "kind": kind,
            "time": round(time, 3),
            "end": round(end, 3),
            "lane": lane,
            "fruit": len(notes) % 7,
            "accent": "osu_mania_hold" if kind == "press" else "osu_mania_tap",
            "role": "verse",
            "intensity": 1,
        })
    return notes


def audio_key_from_osu(osu_path: Path, general: dict[str, str], explicit: str | None) -> str:
    if explicit:
        return explicit.replace("\\", "/")
    audio_name = general.get("AudioFilename") or f"{osu_path.stem}.mp3"
    return f"audio/{Path(audio_name).name}".replace("\\", "/")


def merge_chart(chart_path: Path, song_key: str, diff: str, beats: list[float], downbeats: list[float], notes: list[dict]) -> dict:
    chart_type = chart_type_from_song(song_key)
    keys = chart_keys(chart_type)
    if chart_path.exists():
        data = normalize_chart_file(json.loads(chart_path.read_text(encoding="utf-8")), song_key)
    else:
        data = {"type": chart_type, "song": song_key, "beats": [], "downbeats": [], "charts": {name: [] for name in keys}}
    data["type"] = chart_type
    data["song"] = song_key
    if beats:
        data["beats"] = beats
    if downbeats:
        data["downbeats"] = downbeats
    data["charts"] = {name: data.get("charts", {}).get(name, []) for name in keys}
    data["charts"][diff] = notes
    return normalize_chart_file(data, song_key)


def display_path(path: Path) -> str:
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        return str(path)


def import_osu(path: Path, diff: str, audio_key: str | None, charts_dir: Path, index_path: Path, sync: bool) -> Path:
    if diff not in CHART_KEYS:
        raise RuntimeError(f"Unknown chart key `{diff}`. Expected one of: {', '.join(CHART_KEYS)}")
    sections, source_name = read_sections(path)
    general = read_key_values(sections.get("General", []))
    metadata = read_key_values(sections.get("Metadata", []))
    difficulty = read_key_values(sections.get("Difficulty", []))
    mode = parse_int(general.get("Mode", "3"), 3)
    if mode != 3:
        raise RuntimeError(f"{path.name} is not an osu!mania map: Mode={mode}")
    key_count = parse_int(difficulty.get("CircleSize", "3"), 3)
    if key_count != 3:
        print(f"Warning: CircleSize={key_count}; lanes will be folded into the current 3-lane visual layout.")

    raw_notes = parse_hit_objects(sections.get("HitObjects", []), key_count)
    notes = normalize_notes(raw_notes, filter_conflicts=True)
    dropped = len(raw_notes) - len(notes)
    duration = max((float(note["end"]) for note in notes), default=0.0)
    beats, downbeats = parse_timing_points(sections.get("TimingPoints", []), duration)
    song_key = audio_key_from_osu(path, general, audio_key)
    charts_dir.mkdir(parents=True, exist_ok=True)
    chart_path = existing_chart_file_path(charts_dir, song_key)
    chart_path.parent.mkdir(parents=True, exist_ok=True)
    payload = merge_chart(chart_path, song_key, diff, beats, downbeats, notes)
    chart_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if sync:
        sync_to_game(charts_dir, index_path)

    title = metadata.get("TitleUnicode") or metadata.get("Title") or path.stem
    final_notes = payload["charts"][diff]
    print(f"Imported {path.name} -> {display_path(chart_path)}")
    if source_name != path.name:
        print(f"  source: {source_name}")
    print(f"  song: {song_key}")
    print(f"  title: {title}")
    print(f"  difficulty: {diff}")
    print(f"  keys: {key_count}")
    print(f"  notes: {len(final_notes)}")
    print(f"  holds: {sum(1 for note in final_notes if note['kind'] == 'press')}")
    if dropped:
        print(f"  dropped: {dropped} taps inside hold ranges (single-finger cleanup)")
    print(f"  beats: {len(beats)}")
    return chart_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Import an osu!mania .osu/.osz draft into charts/service or charts/tracks.")
    parser.add_argument("osu", type=Path, help="Path to the .osu or .osz file exported by MuG Diffusion or an osu!mania editor")
    parser.add_argument("--difficulty", choices=CHART_KEYS, default="expert")
    parser.add_argument("--audio-key", help="Project audio key, for example audio/tracks/drama.m4a")
    parser.add_argument("--charts-dir", type=Path, default=ROOT / "charts")
    parser.add_argument("--index", type=Path, default=ROOT / "index.html")
    parser.add_argument("--no-sync", action="store_true", help="Only write charts/*.json; do not refresh manifest/song metadata")
    args = parser.parse_args()

    osu_path = args.osu if args.osu.is_absolute() else ROOT / args.osu
    import_osu(osu_path, args.difficulty, args.audio_key, args.charts_dir, args.index, not args.no_sync)


if __name__ == "__main__":
    main()
