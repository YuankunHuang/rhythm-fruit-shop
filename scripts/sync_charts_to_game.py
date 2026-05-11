#!/usr/bin/env python3
"""Synchronize official per-song chart files with the playable game.

`charts/**/*.json` is the source of truth. This script refreshes
charts/manifest.json and the song metadata in data/songs.json.
"""

from __future__ import annotations

import argparse
import json
import os
import statistics
import tempfile
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TRACK_DIFFS = ["easy", "normal", "hard", "expert"]
SERVICE_DIFFS = ["service"]
CHART_KEYS = TRACK_DIFFS + SERVICE_DIFFS
DIFFS = TRACK_DIFFS
AUDIO_RUNTIME_DIRS = {"service", "tracks"}


def js_object(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def chart_id(song_file: str) -> str:
    return Path(song_file).stem.lower().replace(" ", "-").replace("_", "-")


def song_id(song_file: str) -> str:
    return chart_id(song_file).replace("-", "_")


def title_from_song(song_file: str) -> str:
    return Path(song_file).stem.replace("-", " ").replace("_", " ").title()


def chart_type_from_song(song_file: str) -> str:
    parts = Path(song_file.replace("\\", "/")).parts
    if "service" in parts:
        return "service"
    return "track"


def chart_type_from_path(path: Path) -> str:
    parts = set(path.parts)
    if "service" in parts:
        return "service"
    return "track"


def chart_keys(chart_type: str) -> list[str]:
    return SERVICE_DIFFS if chart_type == "service" else TRACK_DIFFS


def chart_file_path(charts_dir: Path, song_file: str, chart_type: str | None = None) -> Path:
    ctype = chart_type or chart_type_from_song(song_file)
    subdir = "service" if ctype == "service" else "tracks"
    return charts_dir / subdir / f"{chart_id(song_file)}.json"


def chart_paths(charts_dir: Path) -> list[Path]:
    return sorted(path for path in charts_dir.glob("**/*.json") if path.name != "manifest.json")


def existing_chart_file_path(charts_dir: Path, song_file: str) -> Path:
    """Return the current chart path for a song, preserving manually named files."""
    default = chart_file_path(charts_dir, song_file)
    if default.exists():
        return default
    for path in chart_paths(charts_dir):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if data.get("song") == song_file:
            return path
    return default


def inferred_bpm(beats: list[float]) -> float:
    gaps = [b - a for a, b in zip(beats, beats[1:]) if 0.1 < b - a < 2]
    if not gaps:
        return 120.0
    return round(60 / statistics.median(gaps), 1)


def chart_duration(charts: dict[str, list[dict]], beats: list[float]) -> float:
    end = 0.0
    for notes in charts.values():
        for note in notes:
            end = max(end, float(note.get("end", note.get("time", 0))))
    if end <= 0:
        end = max(beats or [0])
    return round(end, 3)



def normalized_note(note: dict, note_id: int) -> dict:
    time = round(float(note.get("time", 0)), 3)
    kind = "press" if note.get("kind") == "press" else "tap"
    end = round(max(time, float(note.get("end", time))) if kind == "press" else time, 3)
    return {
        "id": note_id,
        "kind": kind,
        "time": time,
        "end": end,
        "lane": int(note.get("lane", 0)),
        "fruit": int(note.get("fruit", note_id % 7)),
        "accent": note.get("accent", "manual"),
        "role": note.get("role", "verse"),
        "intensity": round(float(note.get("intensity", 1)), 3),
    }


def normalize_notes(notes: list[dict], *, filter_conflicts: bool = True) -> list[dict]:
    if not filter_conflicts:
        return [normalized_note(note, index) for index, note in enumerate(notes)]

    output = []
    active_press_end = -1.0
    seen_times: set[str] = set()
    sorted_notes = sorted(
        notes,
        key=lambda n: (
            float(n.get("time", 0)),
            0 if n.get("kind") == "press" else 1,
            -float(n.get("end", 0)) if n.get("kind") == "press" else float(n.get("end", 0)),
        ),
    )
    margin = 0.005
    for note in sorted_notes:
        normalized = normalized_note(note, len(output))
        time = normalized["time"]
        kind = normalized["kind"]
        end = normalized["end"]
        if time < active_press_end + margin:
            continue
        time_key = f"{time:.3f}"
        if time_key in seen_times:
            continue
        seen_times.add(time_key)
        output.append(normalized)
        if kind == "press":
            active_press_end = max(active_press_end, end)
    return output


def normalize_chart_file(data: dict, fallback_song: str = "", *, filter_conflicts: bool = True) -> dict:
    song = data.get("song") or fallback_song
    chart_data = data.get("charts", data.get(song, {}))
    if not song and len(data) == 1:
        song = next(iter(data))
        chart_data = data[song]
    if not song:
        raise RuntimeError("Chart file is missing `song`")
    chart_type = data.get("type") or chart_type_from_song(song)
    keys = chart_keys(chart_type)
    return {
        "id": data.get("id") or song_id(song),
        "type": chart_type,
        "title": data.get("title") or title_from_song(song),
        "song": song,
        "beats": [round(float(t), 3) for t in data.get("beats", [])],
        "downbeats": [round(float(t), 3) for t in data.get("downbeats", [])],
        "charts": {diff: normalize_notes(chart_data.get(diff, []), filter_conflicts=filter_conflicts) for diff in keys},
    }


def atomic_write_text(path: Path, text: str, encoding: str = "utf-8", retries: int = 5, delay: float = 0.25) -> None:
    """Write text atomically: write a sibling temp file then os.replace.
    Retries with small backoff on Windows EINVAL/permission flicker (AV / cloud sync filter / brief locks)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    last_err: Exception | None = None
    for attempt in range(retries):
        tmp_fd, tmp_name = tempfile.mkstemp(prefix=path.name + ".", suffix=".tmp", dir=str(path.parent))
        tmp_path = Path(tmp_name)
        try:
            with os.fdopen(tmp_fd, "w", encoding=encoding, newline="") as f:
                f.write(text)
            os.replace(tmp_path, path)
            return
        except OSError as e:
            last_err = e
            tmp_path.unlink(missing_ok=True)
            time.sleep(delay * (attempt + 1))
    raise last_err if last_err else RuntimeError(f"atomic_write_text failed: {path}")


def write_manifest(charts_dir: Path) -> None:
    entries = []
    for path in chart_paths(charts_dir):
        data = normalize_chart_file(json.loads(path.read_text(encoding="utf-8")), filter_conflicts=False)
        entries.append({
            "id": data["id"],
            "type": data["type"],
            "title": data["title"],
            "song": data["song"],
            "file": path.relative_to(charts_dir).as_posix(),
        })
    atomic_write_text(charts_dir / "manifest.json", json.dumps({"charts": entries}, ensure_ascii=False, indent=2) + "\n")


def load_official_charts(charts_dir: Path) -> tuple[dict, dict]:
    charts: dict[str, dict] = {}
    beat_data: dict[str, dict] = {}
    for path in chart_paths(charts_dir):
        source = json.loads(path.read_text(encoding="utf-8"))
        raw = normalize_chart_file(source, filter_conflicts=False)
        clean = normalize_chart_file(source, filter_conflicts=True)
        for diff in chart_keys(clean["type"]):
            removed = len(raw["charts"][diff]) - len(clean["charts"][diff])
            if removed:
                print(
                    f"  warn: {path.name} [{diff}] still has {removed} conflicts; "
                    f"re-run import_osu_mania.py or fix in chart_editor.html"
                )
        song = clean["song"]
        charts[song] = clean["charts"]
        beat_data[song] = {
            "id": clean["id"],
            "type": clean["type"],
            "title": clean["title"],
            "beats": clean.get("beats", []),
            "downbeats": clean.get("downbeats", []),
        }
    if not charts:
        raise RuntimeError(f"No chart files found in {charts_dir}")
    write_manifest(charts_dir)
    return charts, beat_data


def sync_songs_json(songs_path: Path, charts: dict, beat_data: dict) -> None:
    data = json.loads(songs_path.read_text(encoding="utf-8-sig"))
    songs = data.get("songs", [])
    existing = {song["file"]: song for song in songs}
    synced = []
    for song_file, chart in charts.items():
        beats = beat_data.get(song_file, {}).get("beats", [])
        meta = beat_data.get(song_file, {})
        chart_type = meta.get("type") or chart_type_from_song(song_file)
        current = dict(existing.get(song_file, {}))
        current.update({
            "id": current.get("id") or meta.get("id") or song_id(song_file),
            "type": current.get("type") or chart_type,
            "title": current.get("title") or meta.get("title") or title_from_song(song_file),
            "artist": current.get("artist") or "Demo Audio",
            "file": song_file,
            "duration": chart_duration(chart, beats),
            "bpm": inferred_bpm(beats),
            "activeStart": beats[0] if beats else current.get("activeStart", 0),
            "audioOffset": current.get("audioOffset", -0.02),
            "stage": current.get("stage", "day"),
            "difficulties": chart_keys(chart_type),
        })
        synced.append(current)
    data["songs"] = synced
    atomic_write_text(songs_path, json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def sync_to_game(charts_dir: Path, songs_path: Path) -> None:
    charts, beat_data = load_official_charts(charts_dir)
    sync_songs_json(songs_path, charts, beat_data)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--charts-dir", type=Path, default=ROOT / "charts")
    parser.add_argument("--songs", type=Path, default=ROOT / "data" / "songs.json")
    args = parser.parse_args()

    sync_to_game(args.charts_dir, args.songs)
    print(f"Synced {args.charts_dir.relative_to(ROOT).as_posix()} manifest and song metadata")


if __name__ == "__main__":
    main()
