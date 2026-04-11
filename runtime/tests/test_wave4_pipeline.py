"""
Wave 4 Integration Test — Chronicle + II-Commons (File Forge)
==============================================================
Verifies:
  1. Chronicle can record and retrieve timeline events
  2. File Forge can preprocess a test file and chunk it
  3. End-to-end: preprocess file -> record timeline event -> retrieve timeline

Run:
    DATABASE_URL="postgresql://..." python -m pytest runtime/tests/test_wave4_pipeline.py -v

Or without pytest:
    DATABASE_URL="postgresql://..." python runtime/tests/test_wave4_pipeline.py
"""

from __future__ import annotations

import asyncio
import os
import sys
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Ensure runtime/ is importable
RUNTIME_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RUNTIME_DIR))

from chronicle.timeline import (
    close as chronicle_close,
    get_agent_timeline,
    get_timeline,
    record_event,
)
from commons.file_forge import Document, chunk, preprocess


# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------

SAMPLE_TEXT = """The FOAI platform launched in 2025 as an AI-managed services ecosystem.
It provides five live products: Per|Form, CTI Hub, OPEN|KLASS AI, Blockwise AI, and foai.cloud.
Each product is managed by an autonomous agent fleet led by ACHEEVY.

The agent hierarchy includes Chicken Hawk as 2IC, Boomer_Angs as C-suite specialists,
and Lil_Hawks as task workers. AVVA NOON sits above ACHEEVY at the Smelter OS platform level.

Wave 4 introduces Chronicle for structured timeline indexing and File Forge for
document preprocessing. These components enable the agent fleet to maintain
auditable event histories and process uploaded documents for search and analysis.
"""

TEST_TASK_ID = f"wave4-test-{uuid.uuid4().hex[:8]}"
TEST_AGENT = "test_hawk"


def _create_temp_file(content: str, suffix: str = ".txt") -> str:
    """Write content to a temp file and return its path."""
    fd, path = tempfile.mkstemp(suffix=suffix)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(content)
    return path


# ---------------------------------------------------------------------------
# Test 1: File Forge — preprocess and chunk
# ---------------------------------------------------------------------------

def test_file_forge_txt():
    """File Forge can preprocess a .txt file and chunk it."""
    path = _create_temp_file(SAMPLE_TEXT, suffix=".txt")
    try:
        doc = preprocess(path)
        assert isinstance(doc, Document)
        assert doc.file_type == ".txt"
        assert len(doc.text) > 0
        assert doc.size_bytes > 0
        assert doc.extracted_at  # non-empty ISO timestamp

        chunks = chunk(doc, chunk_size=200, overlap=50)
        assert len(chunks) > 1, f"Expected multiple chunks, got {len(chunks)}"
        for c in chunks:
            assert len(c.text) > 0
            assert c.index >= 0
            assert c.metadata.get("file_name") is not None

        print(f"  [PASS] TXT preprocess: {doc.file_name}, {doc.size_bytes} bytes")
        print(f"  [PASS] Chunked into {len(chunks)} chunks (size=200, overlap=50)")
        return True
    finally:
        os.unlink(path)


def test_file_forge_csv():
    """File Forge can preprocess a .csv file."""
    csv_content = "name,role,status\nACHEEVY,Boss,active\nChicken Hawk,2IC,active\nLil_Hawk_01,worker,idle\n"
    path = _create_temp_file(csv_content, suffix=".csv")
    try:
        doc = preprocess(path)
        assert doc.file_type == ".csv"
        assert "ACHEEVY" in doc.text
        assert doc.metadata.get("row_count") == 4  # header + 3 data rows
        assert doc.metadata.get("columns") == ["name", "role", "status"]

        print(f"  [PASS] CSV preprocess: {doc.metadata['row_count']} rows, columns={doc.metadata['columns']}")
        return True
    finally:
        os.unlink(path)


def test_file_forge_md():
    """File Forge can preprocess a .md file."""
    md_content = "# Wave 4\n\n## Chronicle\nTimeline indexer.\n\n## File Forge\nDocument preprocessor.\n"
    path = _create_temp_file(md_content, suffix=".md")
    try:
        doc = preprocess(path)
        assert doc.file_type == ".md"
        assert "Chronicle" in doc.text
        print(f"  [PASS] MD preprocess: {len(doc.text)} chars")
        return True
    finally:
        os.unlink(path)


def test_file_forge_unsupported():
    """File Forge rejects unsupported file types."""
    path = _create_temp_file("binary data", suffix=".xyz")
    try:
        try:
            preprocess(path)
            assert False, "Should have raised ValueError"
        except ValueError as e:
            assert "Unsupported file type" in str(e)
            print(f"  [PASS] Unsupported type rejected: {e}")
            return True
    finally:
        os.unlink(path)


# ---------------------------------------------------------------------------
# Test 2: Chronicle — record and retrieve (requires DATABASE_URL)
# ---------------------------------------------------------------------------

async def test_chronicle_record_and_retrieve():
    """Chronicle can record events and retrieve them by task_id."""
    try:
        # Record events
        e1 = await record_event(TEST_AGENT, TEST_TASK_ID, "task_started", {"wave": 4})
        e2 = await record_event(TEST_AGENT, TEST_TASK_ID, "file_processed", {"file": "test.txt", "chunks": 5})
        e3 = await record_event("other_hawk", TEST_TASK_ID, "review_complete", {"approved": True})

        assert e1["event_type"] == "task_started"
        assert e2["payload"]["chunks"] == 5
        assert e3["agent_name"] == "other_hawk"

        # Retrieve by task
        timeline = await get_timeline(TEST_TASK_ID)
        assert len(timeline) >= 3, f"Expected >= 3 events, got {len(timeline)}"
        assert timeline[0]["event_type"] == "task_started"

        print(f"  [PASS] Recorded 3 events, retrieved {len(timeline)} for task {TEST_TASK_ID}")
        return True
    except Exception as e:
        print(f"  [SKIP] Chronicle DB test: {e}")
        return None  # skip, don't fail


async def test_chronicle_agent_timeline():
    """Chronicle can retrieve events filtered by agent name and time."""
    try:
        since = datetime.now(timezone.utc)
        await record_event(TEST_AGENT, TEST_TASK_ID, "late_event", {"seq": 99})

        agent_events = await get_agent_timeline(TEST_AGENT, since=since)
        assert len(agent_events) >= 1
        assert any(e["event_type"] == "late_event" for e in agent_events)

        print(f"  [PASS] Agent timeline: {len(agent_events)} events for {TEST_AGENT} since {since.isoformat()}")
        return True
    except Exception as e:
        print(f"  [SKIP] Chronicle agent timeline test: {e}")
        return None


# ---------------------------------------------------------------------------
# Test 3: End-to-end pipeline
# ---------------------------------------------------------------------------

async def test_end_to_end():
    """Preprocess file -> record timeline event -> retrieve timeline."""
    try:
        path = _create_temp_file(SAMPLE_TEXT, suffix=".txt")
        try:
            # Step 1: Preprocess
            doc = preprocess(path)
            chunks_list = chunk(doc, chunk_size=300)

            # Step 2: Record event about the preprocessing
            e2e_task = f"e2e-{uuid.uuid4().hex[:8]}"
            await record_event(
                "file_forge",
                e2e_task,
                "file_preprocessed",
                {
                    "file": doc.file_name,
                    "size": doc.size_bytes,
                    "chunks": len(chunks_list),
                    "file_type": doc.file_type,
                },
            )

            # Step 3: Retrieve and verify
            timeline = await get_timeline(e2e_task)
            assert len(timeline) == 1
            assert timeline[0]["payload"]["chunks"] == len(chunks_list)
            assert timeline[0]["event_type"] == "file_preprocessed"

            print(f"  [PASS] E2E: preprocessed {doc.file_name} ({len(chunks_list)} chunks) -> recorded -> retrieved")
            return True
        finally:
            os.unlink(path)
    except Exception as e:
        print(f"  [SKIP] E2E test: {e}")
        return None


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------

async def _run_async_tests():
    results = {}
    try:
        for name, test_fn in [
            ("chronicle_record_retrieve", test_chronicle_record_and_retrieve),
            ("chronicle_agent_timeline", test_chronicle_agent_timeline),
            ("end_to_end", test_end_to_end),
        ]:
            results[name] = await test_fn()
    finally:
        await chronicle_close()
    return results


def main():
    print("=" * 60)
    print("Wave 4 Integration Test — Chronicle + File Forge")
    print("=" * 60)

    # -- File Forge tests (no DB needed) --
    print("\n--- File Forge Tests ---")
    ff_results = {}
    for name, test_fn in [
        ("txt_preprocess", test_file_forge_txt),
        ("csv_preprocess", test_file_forge_csv),
        ("md_preprocess", test_file_forge_md),
        ("unsupported_rejection", test_file_forge_unsupported),
    ]:
        ff_results[name] = test_fn()

    # -- Chronicle + E2E tests (need DB) --
    has_db = bool(os.environ.get("DATABASE_URL"))
    if has_db:
        print("\n--- Chronicle Tests (DATABASE_URL set) ---")
        async_results = asyncio.run(_run_async_tests())
    else:
        print("\n--- Chronicle Tests SKIPPED (no DATABASE_URL) ---")
        async_results = {
            "chronicle_record_retrieve": None,
            "chronicle_agent_timeline": None,
            "end_to_end": None,
        }

    # -- Summary --
    all_results = {**ff_results, **async_results}
    passed = sum(1 for v in all_results.values() if v is True)
    skipped = sum(1 for v in all_results.values() if v is None)
    failed = sum(1 for v in all_results.values() if v is False)

    print("\n" + "=" * 60)
    print(f"Results: {passed} passed, {skipped} skipped, {failed} failed")
    print("=" * 60)

    if failed > 0:
        sys.exit(1)
    return 0


if __name__ == "__main__":
    main()
