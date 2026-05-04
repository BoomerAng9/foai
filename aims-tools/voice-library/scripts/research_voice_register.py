"""
research_voice_register.py — Tool-orchestrated voice procurement.

Owner directive 2026-05-02: stop deferring voice judgments to manual ear-listening.
Operating policy memories `feedback_fair_use_training_policy.md` (2026-04-09)
and `feedback_attestation_not_ingestion_policing.md` (2026-04-16) authorize
ingesting public interview / podcast / press-conference audio of named
speakers as transformative training/reference material — provenance is
tracked, the IP gate sits at PRODUCTION (user attestation), not at
ingestion. We download, store, analyze, and use as register reference.

Pipeline:
  1. For each target speaker, run a web search for interview/podcast URLs.
  2. yt-dlp extracts the audio track (mp3) from each URL.
  3. Save to dialect-library/<group>/<region>/audio/<our-filename>.mp3
     with a provenance JSON sidecar (source_url, source_type, ingested_at,
     speaker, register_label, license_signal).
  4. Run analyze_voice on each download → feature JSON.
  5. Score each against the target acoustic profile.
  6. Surface a ranked report.

This module is the procurement-side of the pair `analyze_voice.py` already
provides. Together they answer: which audio sources actually carry the
acoustic signature we want for ACHEEVY (or any other character).

Usage:
  # Procure 3 Nas interview clips, store under URBANISM/east-coast-ny/audio,
  # score against the acheevy_baritone target.
  python research_voice_register.py \\
    --speaker "Nasir Jones" \\
    --register "queensbridge-baritone-5pct" \\
    --group URBANISM --region east-coast-ny \\
    --target acheevy_baritone --max-clips 3

  # Search-only dry run (no downloads).
  python research_voice_register.py --speaker "GZA" --dry-run

  # Procure for a list of seed speakers from a JSON file.
  python research_voice_register.py --seed-file seeds.json
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Optional


REPO_ROOT = Path(__file__).resolve().parent.parent  # voice-library/
DIALECT_LIBRARY = REPO_ROOT / "dialect-library"
ANALYZER = Path(__file__).parent / "analyze_voice.py"


# ---------------------------------------------------------------------------
# Provenance
# ---------------------------------------------------------------------------


@dataclass
class Provenance:
    speaker: str
    register_label: str
    source_url: str
    source_type: str           # "youtube" | "podcast" | "archive.org" | "interview-clip" etc.
    ingested_at: str           # ISO-8601 UTC
    license_signal: str        # "public-interview" | "press-conference" | "archive-public-domain"
    title: Optional[str]
    duration_sec: Optional[float]
    notes: Optional[str]
    # AIMS Companion §5: provenance is audit trail, not gate.
    storage_policy: str = (
        "Stored under fair-use transformative-training doctrine; "
        "production-layer attestation governs end-user output. "
        "See feedback_fair_use_training_policy.md."
    )


# ---------------------------------------------------------------------------
# Filesystem helpers
# ---------------------------------------------------------------------------


def slugify(s: str) -> str:
    s = re.sub(r"[^\w\s-]", "", s, flags=re.UNICODE).strip().lower()
    s = re.sub(r"[\s_-]+", "-", s)
    return s[:64] or "unnamed"


def short_hash(s: str, n: int = 8) -> str:
    return hashlib.sha1(s.encode("utf-8", errors="ignore")).hexdigest()[:n]


def audio_target_dir(group: str, region: str) -> Path:
    """Return the canonical audio storage directory for a group + region."""
    safe_group = slugify(group).upper() if group.upper() == group else slugify(group)
    safe_region = slugify(region)
    target = DIALECT_LIBRARY / safe_group / "regional" / safe_region / "audio"
    target.mkdir(parents=True, exist_ok=True)
    return target


# ---------------------------------------------------------------------------
# Search — uses Brave API if BRAVE_API_KEY is set, falls back to a simple
# yt-dlp search query for YouTube
# ---------------------------------------------------------------------------


def search_brave(query: str, count: int = 6) -> List[Dict[str, str]]:
    """Brave Web Search API → list of {title, url, description}."""
    api_key = os.environ.get("BRAVE_API_KEY")
    if not api_key:
        return []
    try:
        import urllib.parse
        import urllib.request
        q = urllib.parse.urlencode({"q": query, "count": count})
        req = urllib.request.Request(
            f"https://api.search.brave.com/res/v1/web/search?{q}",
            headers={
                "Accept": "application/json",
                "X-Subscription-Token": api_key,
            },
        )
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.loads(r.read())
        return [
            {"title": w.get("title", ""), "url": w.get("url", ""), "description": w.get("description", "")}
            for w in data.get("web", {}).get("results", [])
        ]
    except Exception as e:
        sys.stderr.write(f"[brave] search failed: {e}\n")
        return []


def search_youtube_via_ytdlp(query: str, count: int = 6) -> List[Dict[str, str]]:
    """yt-dlp's ytsearchN: returns video metadata without downloading."""
    cmd = [
        "yt-dlp", "--dump-json", "--no-warnings", "--flat-playlist",
        "--default-search", "ytsearch",
        f"ytsearch{count}:{query}",
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60, check=False)
        results = []
        for line in proc.stdout.splitlines():
            try:
                obj = json.loads(line)
                results.append({
                    "title": obj.get("title", ""),
                    "url": obj.get("url") or obj.get("webpage_url") or f"https://www.youtube.com/watch?v={obj.get('id')}",
                    "description": obj.get("description", "") or "",
                    "duration_sec": obj.get("duration"),
                })
            except json.JSONDecodeError:
                continue
        return results
    except Exception as e:
        sys.stderr.write(f"[ytdlp-search] failed: {e}\n")
        return []


# ---------------------------------------------------------------------------
# Download via yt-dlp → mp3
# ---------------------------------------------------------------------------


def get_ffmpeg() -> Optional[str]:
    try:
        import imageio_ffmpeg  # type: ignore
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return shutil.which("ffmpeg")


def download_subtitles(
    url: str,
    output_dir: Path,
    filename_stem: str,
) -> Optional[Path]:
    """Pull auto-generated YouTube subtitles via yt-dlp as VTT.

    Returns the path to the .en.vtt sidecar (yt-dlp appends `.<lang>.vtt`).
    Used for transcript-grounded speaker attribution: the analyzer's
    sliding-window output can be cross-referenced against the VTT
    timestamps to verify which speaker is in each window.
    """
    expected = output_dir / f"{filename_stem}.en.vtt"
    if expected.exists():
        return expected
    cmd = [
        "yt-dlp",
        "--no-warnings",
        "--no-playlist",
        "--write-auto-sub",
        "--write-sub",
        "--skip-download",
        "--sub-format", "vtt",
        "--sub-langs", "en",
        "-o", str(output_dir / f"{filename_stem}.%(ext)s"),
        url,
    ]
    try:
        subprocess.run(cmd, capture_output=True, text=True, timeout=120, check=False)
        return expected if expected.exists() else None
    except Exception as e:
        sys.stderr.write(f"[ytdlp-subs] {url}: {e}\n")
        return None


_VTT_TIMESTAMP_RE = re.compile(
    r"(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})"
)


def _vtt_ts_to_seconds(ts: str) -> float:
    h, m, s = ts.split(":")
    return int(h) * 3600 + int(m) * 60 + float(s)


def parse_vtt(path: Path) -> List[Dict]:
    """Parse a VTT file into [{start_sec, end_sec, text}, ...].

    Strips inline `<00:00:00.000><c>word</c>` per-word timing markers
    that YouTube auto-subs include — keeps the plain spoken text.
    De-duplicates back-to-back blocks with identical text (a YouTube
    auto-sub artifact).
    """
    if not path.exists():
        return []
    blocks: List[Dict] = []
    raw = path.read_text(encoding="utf-8", errors="replace")
    cur_start: Optional[float] = None
    cur_end: Optional[float] = None
    cur_lines: List[str] = []
    for line in raw.splitlines():
        m = _VTT_TIMESTAMP_RE.search(line)
        if m:
            if cur_start is not None and cur_lines:
                blocks.append({
                    "start_sec": round(cur_start, 2),
                    "end_sec":   round(cur_end or cur_start, 2),
                    "text":      " ".join(cur_lines).strip(),
                })
            cur_start = _vtt_ts_to_seconds(m.group(1))
            cur_end   = _vtt_ts_to_seconds(m.group(2))
            cur_lines = []
            continue
        if cur_start is None:
            continue
        if not line.strip() or line.startswith(("WEBVTT", "Kind:", "Language:", "NOTE")):
            continue
        cleaned = re.sub(r"<\d{2}:\d{2}:\d{2}\.\d{3}>", "", line)  # strip inline timestamps
        cleaned = re.sub(r"</?c[^>]*>", "", cleaned)               # strip <c> tags
        cleaned = cleaned.strip()
        if cleaned:
            cur_lines.append(cleaned)
    if cur_start is not None and cur_lines:
        blocks.append({
            "start_sec": round(cur_start, 2),
            "end_sec":   round(cur_end or cur_start, 2),
            "text":      " ".join(cur_lines).strip(),
        })
    # Dedupe consecutive blocks with identical text
    deduped: List[Dict] = []
    for b in blocks:
        if deduped and deduped[-1]["text"] == b["text"]:
            deduped[-1]["end_sec"] = b["end_sec"]
        else:
            deduped.append(b)
    return deduped


def transcript_span_for_window(
    transcript: List[Dict],
    window_start_sec: float,
    window_seconds: float,
    audio_offset_sec: float = 0.0,
) -> str:
    """Return the concatenated transcript text overlapping a given window.

    `audio_offset_sec` lets callers correct for the `--skip-intro` shift —
    if the downloaded mp3 began at second 90 of the source video, the
    analyzer window 0:00 corresponds to source-video time 90:00.
    """
    if not transcript:
        return ""
    win_a = window_start_sec + audio_offset_sec
    win_b = win_a + window_seconds
    spans = [
        b["text"] for b in transcript
        if b["end_sec"] >= win_a and b["start_sec"] <= win_b
    ]
    return " ".join(spans).strip()


def download_audio(
    url: str,
    output_dir: Path,
    filename_stem: str,
    max_seconds: int = 600,
    skip_intro_seconds: int = 90,
) -> Optional[Path]:
    """Pull audio via yt-dlp → mp3.

    Skips `skip_intro_seconds` from the start (podcast intros / ad reads /
    music) and grabs the next `max_seconds` of audio — a middle window where
    the speaker is more likely to be in flow without sponsor talk.
    """
    output_path = output_dir / f"{filename_stem}.mp3"
    if output_path.exists():
        sys.stderr.write(f"[skip] exists {output_path.name}\n")
        return output_path

    ffmpeg = get_ffmpeg()
    cmd = [
        "yt-dlp",
        "--no-warnings",
        "--no-playlist",
        "-x", "--audio-format", "mp3",
        "-o", str(output_dir / f"{filename_stem}.%(ext)s"),
    ]
    if ffmpeg:
        cmd += ["--ffmpeg-location", ffmpeg]
    pp_args = []
    if skip_intro_seconds:
        pp_args.append(f"-ss {skip_intro_seconds}")
    if max_seconds:
        pp_args.append(f"-t {max_seconds}")
    if pp_args:
        cmd += ["--postprocessor-args", f"ffmpeg:{' '.join(pp_args)}"]
    cmd.append(url)

    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=300, check=False)
        if proc.returncode != 0 or not output_path.exists():
            sys.stderr.write(f"[ytdlp-dl] {url}\n  stderr: {proc.stderr.splitlines()[-1] if proc.stderr else ''}\n")
            return None
        return output_path
    except Exception as e:
        sys.stderr.write(f"[ytdlp-dl] exception on {url}: {e}\n")
        return None


# ---------------------------------------------------------------------------
# Analyzer integration
# ---------------------------------------------------------------------------


def run_analyzer(
    folder: Path,
    target_profile: Optional[str],
    out_path: Path,
    max_seconds: float = 600.0,
    window_seconds: float = 30.0,
) -> Optional[Dict]:
    cmd = [
        sys.executable, str(ANALYZER),
        "--dir", str(folder),
        "--out", str(out_path),
        "--max-seconds", str(max_seconds),
        "--quiet",
    ]
    if target_profile:
        cmd += ["--target", target_profile, "--window-seconds", str(window_seconds)]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        sys.stderr.write(f"[analyzer] returncode={proc.returncode}\n  {proc.stderr}\n")
        return None
    try:
        return json.loads(out_path.read_text())
    except Exception as e:
        sys.stderr.write(f"[analyzer] failed to read {out_path}: {e}\n")
        return None


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------


def query_set_for_speaker(speaker: str, register_label: str, extra_queries: Optional[List[str]] = None) -> List[str]:
    """Diversified queries that bias toward LONG-FORM, SINGLE-SPEAKER content
    (the cleaner the audio, the better the analyzer's pitch / HNR / spectral
    estimates).

    Show names appear UNQUOTED — YouTube's search treats quoted phrases more
    loosely than expected, often returning unrelated channels that contain
    the quoted token. Bare-text queries return the canonical episodes.
    """
    base = [
        f'{speaker} Drink Champs full episode',
        f'{speaker} Joe Budden podcast',
        f'{speaker} Hot 97 interview',
        f'{speaker} Breakfast Club interview',
        f'{speaker} Funk Flex interview',
        f'{speaker} Combat Jack Show',
        f'{speaker} long form sit down interview',
        f'{speaker} {register_label}',
    ]
    return base + (extra_queries or [])


def deduplicate(results: List[Dict[str, str]]) -> List[Dict[str, str]]:
    seen = set()
    out = []
    for r in results:
        u = (r.get("url") or "").split("?")[0].rstrip("/")
        if u and u not in seen:
            seen.add(u)
            out.append(r)
    return out


def procure_for_speaker(
    speaker: str,
    register_label: str,
    group: str,
    region: str,
    target_profile: Optional[str],
    max_clips: int,
    license_signal: str,
    source_type: str,
    notes: Optional[str],
    dry_run: bool,
    skip_intro_seconds: int = 90,
    clip_seconds: int = 600,
    analyzer_window_seconds: float = 30.0,
) -> Dict:
    target_dir = audio_target_dir(group, region)
    queries = query_set_for_speaker(speaker, register_label)

    # Search
    candidates: List[Dict[str, str]] = []
    for q in queries:
        results = search_brave(q, count=4) or search_youtube_via_ytdlp(q, count=4)
        for r in results:
            r["query"] = q
            r["speaker"] = speaker
        candidates.extend(results)

    candidates = deduplicate(candidates)[: max_clips * 3]  # generous over-fetch
    if dry_run:
        return {
            "speaker": speaker,
            "register_label": register_label,
            "candidates_found": len(candidates),
            "candidates": candidates[:max_clips],
            "downloads": [],
            "analysis": None,
            "dry_run": True,
        }

    # Download
    downloaded: List[Dict] = []
    for cand in candidates:
        if len(downloaded) >= max_clips:
            break
        url = cand.get("url", "")
        if not url:
            continue
        stem = f"{slugify(speaker)}_{slugify(cand.get('title', '') or 'clip')[:40]}_{short_hash(url)}"
        path = download_audio(url, target_dir, stem,
                              max_seconds=clip_seconds,
                              skip_intro_seconds=skip_intro_seconds)
        if not path:
            continue
        # Sidecar provenance
        prov = Provenance(
            speaker=speaker,
            register_label=register_label,
            source_url=url,
            source_type=source_type,
            ingested_at=dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
            license_signal=license_signal,
            title=cand.get("title"),
            duration_sec=cand.get("duration_sec"),
            notes=notes,
        )
        sidecar = path.with_suffix(".provenance.json")
        sidecar.write_text(json.dumps(asdict(prov), indent=2))

        # Transcript sidecar — pulls YouTube auto-subs (when available) so
        # the analyzer's best-window output can be cross-referenced against
        # the VTT timestamps for transcript-grounded speaker attribution.
        # Note: VTT timestamps are SOURCE-VIDEO time. Our downloaded mp3
        # starts at `skip_intro_seconds` into the source. The audio_offset
        # field in the JSON records that shift so consumers can align.
        vtt_path = download_subtitles(url, target_dir, stem)
        transcript_blocks = parse_vtt(vtt_path) if vtt_path else []
        transcript_path: Optional[Path] = None
        if transcript_blocks:
            transcript_path = path.with_suffix(".transcript.json")
            transcript_path.write_text(json.dumps({
                "source_url": url,
                "audio_file": path.name,
                "audio_offset_sec_from_source": skip_intro_seconds,
                "audio_duration_sec": clip_seconds,
                "block_count": len(transcript_blocks),
                "blocks": transcript_blocks,
            }, indent=2))

        downloaded.append({
            "audio_file": path.name,
            "sidecar": sidecar.name,
            "transcript_sidecar": transcript_path.name if transcript_path else None,
            "transcript_block_count": len(transcript_blocks),
            "source_url": url,
            "title": cand.get("title"),
        })
        sys.stderr.write(
            f"  [+] {path.name}"
            + (f" + {len(transcript_blocks)} transcript blocks" if transcript_blocks else " (no transcript)")
            + "\n"
        )

    # Analyze (only the just-downloaded set, scoped to this speaker)
    analysis: Optional[Dict] = None
    if downloaded:
        scoped_dir = target_dir  # analyzer scans whole dir; that's fine — gives us cumulative state
        analysis_out = scoped_dir / f"_features_{slugify(speaker)}.json"
        analysis = run_analyzer(
            scoped_dir, target_profile, analysis_out,
            max_seconds=float(clip_seconds),
            window_seconds=analyzer_window_seconds,
        )
        # Capstone enrichment: pair each acoustic window with the transcript
        # span at those time boundaries. Provides transcript-grounded speaker
        # attribution — the top window for each clip can be cross-checked
        # against what was actually said.
        if analysis:
            for record in analysis.get("results", []):
                fname = record.get("filename")
                if not fname:
                    continue
                transcript_path = scoped_dir / f"{Path(fname).stem}.transcript.json"
                if not transcript_path.exists():
                    continue
                try:
                    tdata = json.loads(transcript_path.read_text())
                except Exception:
                    continue
                blocks = tdata.get("blocks") or []
                offset = float(tdata.get("audio_offset_sec_from_source", 0))
                wsecs = float(record.get("window_seconds") or analyzer_window_seconds)
                for w in record.get("window_summaries") or []:
                    w["transcript_span"] = transcript_span_for_window(
                        blocks, float(w.get("start_sec", 0)), wsecs,
                        audio_offset_sec=offset,
                    )[:600]
                best_start = record.get("best_window_start_sec")
                if best_start is not None:
                    record["best_window_transcript"] = transcript_span_for_window(
                        blocks, float(best_start), wsecs, audio_offset_sec=offset,
                    )[:800]
            analysis_out.write_text(json.dumps(analysis, indent=2))


    return {
        "speaker": speaker,
        "register_label": register_label,
        "group": group,
        "region": region,
        "target_dir": str(target_dir),
        "candidates_found": len(candidates),
        "downloads": downloaded,
        "analysis_summary": (
            {
                "files_analyzed": analysis.get("files_analyzed") if analysis else None,
                "ranked_top": analysis.get("ranked", [])[:5] if analysis else None,
            }
            if analysis else None
        ),
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--speaker", help="Speaker name to research.")
    ap.add_argument("--register", default="general", help="Register label (e.g. queensbridge-baritone-5pct).")
    ap.add_argument("--group", default="URBANISM", help="Ethnic group (default URBANISM).")
    ap.add_argument("--region", default="general", help="Region (e.g. east-coast-ny, southern-coastal-georgia).")
    ap.add_argument("--target", help="Target acoustic profile name (e.g. acheevy_baritone).")
    ap.add_argument("--max-clips", type=int, default=3, help="Max clips to download per speaker (default 3).")
    ap.add_argument("--skip-intro", type=int, default=90, help="Skip N seconds at the start of each download (intros/ads). Default 90.")
    ap.add_argument("--clip-seconds", type=int, default=600, help="Seconds of audio to download per clip after the skip. Default 600 (10 min).")
    ap.add_argument("--analyzer-window-seconds", type=float, default=30.0, help="Sliding-window length used by analyzer to find the best speaker segment. Default 30.")
    ap.add_argument("--license-signal", default="public-interview")
    ap.add_argument("--source-type", default="interview-or-podcast")
    ap.add_argument("--notes", default=None, help="Free-form notes added to provenance sidecar.")
    ap.add_argument("--seed-file", help="JSON file: list of {speaker, register, group, region}.")
    ap.add_argument("--out", help="Write the final report JSON here.")
    ap.add_argument("--dry-run", action="store_true", help="Search only — do not download.")
    args = ap.parse_args()

    seeds: List[Dict] = []
    if args.seed_file:
        seeds = json.loads(Path(args.seed_file).read_text())
    elif args.speaker:
        seeds = [{
            "speaker": args.speaker,
            "register": args.register,
            "group": args.group,
            "region": args.region,
        }]
    else:
        ap.error("Must supply --speaker or --seed-file.")

    report = []
    for seed in seeds:
        sys.stderr.write(f"\n=== {seed['speaker']} ({seed.get('register', args.register)}) ===\n")
        result = procure_for_speaker(
            speaker=seed["speaker"],
            register_label=seed.get("register", args.register),
            group=seed.get("group", args.group),
            region=seed.get("region", args.region),
            target_profile=args.target,
            max_clips=args.max_clips,
            license_signal=args.license_signal,
            source_type=args.source_type,
            notes=args.notes,
            dry_run=args.dry_run,
            skip_intro_seconds=args.skip_intro,
            clip_seconds=args.clip_seconds,
            analyzer_window_seconds=args.analyzer_window_seconds,
        )
        report.append(result)
        if "ranked_top" in (result.get("analysis_summary") or {}):
            for entry in result["analysis_summary"].get("ranked_top") or []:
                sys.stderr.write(
                    f"  rank {entry.get('rank')}: {entry.get('match_percent', 0):>5.1f}%  "
                    f"{entry.get('file')}\n"
                )

    blob = json.dumps({"results": report, "ingested_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")}, indent=2)
    if args.out:
        Path(args.out).write_text(blob)
        sys.stderr.write(f"\nWrote {args.out}\n")
    else:
        print(blob)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
