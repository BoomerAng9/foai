"""
Wave 6 Integration Tests — CommonGround Observer + Live Look In + ii-researcher.

Tests:
  1. Observer records events correctly
  2. Observer retrieves events with time filter
  3. Observer retrieves events with agent filter
  4. Subscribe receives real-time events
  5. Live Look In formats SSE correctly
  6. Live Look In stream yields events
  7. Research client returns structured output
  8. Summarize sources synthesizes content
  9. SSE history replay works
  10. Observer respects max_size limit
"""

import asyncio
import json
import sys
import time
import os
import unittest

# Add runtime to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from common_ground.observer import ObserverStore, Observation, observe, get_observations, subscribe
from common_ground.live_look_in import format_sse, sse_stream, sse_stream_with_history
from ii_researcher.research_client import (
    Source,
    ResearchResult,
    summarize_sources,
    _search_duckduckgo,
    research,
    search_and_extract,
)


class TestObserverRecord(unittest.TestCase):
    """Test 1: Observer records events correctly."""

    def setUp(self):
        self.store = ObserverStore()

    def test_observe_creates_observation(self):
        obs = self.store.observe("ACHEEVY", "task_start", {"task": "research"})
        self.assertIsInstance(obs, Observation)
        self.assertEqual(obs.agent_name, "ACHEEVY")
        self.assertEqual(obs.action, "task_start")
        self.assertEqual(obs.payload["task"], "research")
        self.assertGreater(obs.timestamp, 0)
        self.assertTrue(obs.iso_time.endswith("+00:00"))
        self.assertEqual(self.store.count, 1)

    def test_observe_default_payload(self):
        obs = self.store.observe("Chicken_Hawk", "dispatch")
        self.assertEqual(obs.payload, {})


class TestObserverTimeFilter(unittest.TestCase):
    """Test 2: Observer retrieves events with time filter."""

    def setUp(self):
        self.store = ObserverStore()

    def test_get_observations_since(self):
        self.store.observe("Agent_A", "action_1")
        cutoff = time.time()
        time.sleep(0.01)
        self.store.observe("Agent_B", "action_2")

        results = self.store.get_observations(since=cutoff)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].agent_name, "Agent_B")


class TestObserverAgentFilter(unittest.TestCase):
    """Test 3: Observer retrieves events with agent filter."""

    def setUp(self):
        self.store = ObserverStore()

    def test_get_observations_agent_filter(self):
        self.store.observe("ACHEEVY", "start")
        self.store.observe("Scout_Ang", "search")
        self.store.observe("ACHEEVY", "delegate")

        results = self.store.get_observations(agent_filter="ACHEEVY")
        self.assertEqual(len(results), 2)
        for r in results:
            self.assertEqual(r.agent_name, "ACHEEVY")


class TestObserverSubscribe(unittest.TestCase):
    """Test 4: Subscribe receives real-time events."""

    def setUp(self):
        self.store = ObserverStore()

    def test_subscribe_receives_events(self):
        received = []
        self.store.subscribe(lambda obs: received.append(obs))

        self.store.observe("Lil_Hawk_1", "crawl", {"url": "https://example.com"})
        self.store.observe("Lil_Hawk_2", "extract", {"url": "https://test.com"})

        self.assertEqual(len(received), 2)
        self.assertEqual(received[0].agent_name, "Lil_Hawk_1")
        self.assertEqual(received[1].action, "extract")

    def test_unsubscribe_stops_events(self):
        received = []
        sub_id = self.store.subscribe(lambda obs: received.append(obs))

        self.store.observe("Agent_A", "action_1")
        self.store.unsubscribe(sub_id)
        self.store.observe("Agent_B", "action_2")

        self.assertEqual(len(received), 1)


class TestSSEFormat(unittest.TestCase):
    """Test 5: Live Look In formats SSE correctly."""

    def test_format_sse_structure(self):
        obs = Observation(
            id="abc123",
            agent_name="Scout_Ang",
            action="search",
            payload={"query": "test research"},
            timestamp=1000000.0,
            iso_time="2026-04-10T12:00:00+00:00",
        )
        sse = format_sse(obs)

        self.assertIn("event: agent_activity\n", sse)
        self.assertIn("id: abc123\n", sse)
        self.assertIn("data: ", sse)
        self.assertTrue(sse.endswith("\n\n"))

        # Parse the data line
        for line in sse.strip().split("\n"):
            if line.startswith("data: "):
                data = json.loads(line[6:])
                self.assertEqual(data["agent"], "Scout_Ang")
                self.assertEqual(data["action"], "search")
                self.assertIn("summary", data)
                self.assertIn("timestamp", data)


class TestSSEStream(unittest.TestCase):
    """Test 6: Live Look In stream yields events."""

    def test_sse_stream_receives_events(self):
        store = ObserverStore()
        events_received = []

        async def _run():
            stream = sse_stream(store=store, heartbeat_interval=0.1)
            # Get connection event
            conn = await stream.__anext__()
            events_received.append(conn)

            # Push an observation
            store.observe("ACHEEVY", "research_complete", {"result": "done"})

            # Get the observation event
            evt = await stream.__anext__()
            events_received.append(evt)

            await stream.aclose()

        asyncio.run(_run())

        self.assertEqual(len(events_received), 2)
        self.assertIn("connection", events_received[0])
        self.assertIn("agent_activity", events_received[1])
        self.assertIn("ACHEEVY", events_received[1])


class TestResearchStructuredOutput(unittest.TestCase):
    """Test 7: Research client returns structured output."""

    def test_research_result_structure(self):
        result = research("test query that should return something", depth=1)
        self.assertIsInstance(result, ResearchResult)
        self.assertEqual(result.query, "test query that should return something")
        self.assertIsInstance(result.summary, str)
        self.assertIsInstance(result.sources, list)
        self.assertEqual(result.depth, 1)
        self.assertGreater(result.duration_ms, 0)

        # to_dict should produce serializable output
        d = result.to_dict()
        self.assertIn("query", d)
        self.assertIn("summary", d)
        json.dumps(d)  # Should not raise

    def test_source_model(self):
        src = Source(title="Test", url="https://example.com", content="Content here")
        d = src.to_dict()
        self.assertEqual(d["title"], "Test")
        self.assertEqual(d["relevance"], 0.0)


class TestSummarizeSources(unittest.TestCase):
    """Test 8: Summarize sources synthesizes content."""

    def test_summarize_with_content(self):
        sources = [
            Source("Article 1", "https://a.com", "This is a detailed finding about topic X that spans more than thirty characters."),
            Source("Article 2", "https://b.com", "Another important discovery about topic Y with sufficient length to be meaningful."),
        ]
        summary = summarize_sources(sources)
        self.assertIn("Key findings:", summary)
        self.assertIn("Article 1", summary)

    def test_summarize_empty(self):
        summary = summarize_sources([])
        self.assertEqual(summary, "No sources found.")

    def test_summarize_titles_only(self):
        sources = [Source("Title Only", "https://c.com", "short")]
        summary = summarize_sources(sources)
        self.assertIn("Title Only", summary)


class TestSSEHistoryReplay(unittest.TestCase):
    """Test 9: SSE history replay works."""

    def test_replay_then_live(self):
        store = ObserverStore()
        store.observe("Agent_A", "past_action")

        events = []

        async def _run():
            stream = sse_stream_with_history(store=store, history_limit=10, heartbeat_interval=0.1)
            # Connection event
            conn = await stream.__anext__()
            events.append(conn)
            # Replay event
            replay = await stream.__anext__()
            events.append(replay)

            # Now push a live event
            store.observe("Agent_B", "live_action")
            live = await stream.__anext__()
            events.append(live)

            await stream.aclose()

        asyncio.run(_run())

        self.assertIn("connection", events[0])
        self.assertIn("agent_activity_replay", events[1])
        self.assertIn("agent_activity", events[2])
        self.assertIn("Agent_B", events[2])


class TestObserverMaxSize(unittest.TestCase):
    """Test 10: Observer respects max_size limit."""

    def test_max_size_trimming(self):
        store = ObserverStore(max_size=5)
        for i in range(10):
            store.observe(f"Agent_{i}", "action")

        self.assertEqual(store.count, 5)
        results = store.get_observations()
        # Should have the last 5
        self.assertEqual(results[0].agent_name, "Agent_9")
        self.assertEqual(results[-1].agent_name, "Agent_5")


if __name__ == "__main__":
    unittest.main()
