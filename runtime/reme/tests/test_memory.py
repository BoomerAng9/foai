"""
ReMe Memory Substrate — Test Suite
At least 10 test cases covering all gate criteria:
  - Token reduction >= 85%
  - Key information preservation
  - Store + search round-trip
  - Per-tenant isolation
  - Pre-reasoning hook enrichment
  - Hybrid search quality
  - Memory persistence across operations
"""

from __future__ import annotations

import sys
import os
import uuid

# Ensure the runtime package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))

from runtime.reme.memory_client import ReMemoryClient
from runtime.reme.compactor import summarize_memory, compact_context
from runtime.reme.search import BM25, HybridSearchEngine, embed_text, cosine_similarity
from runtime.reme.tokenizer import count_tokens, count_message_tokens
from runtime.reme.hooks import pre_reasoning_hook
from runtime.reme.storage import InMemoryStore

import numpy as np


# --- Helpers ---


def generate_long_context(approx_tokens: int = 10000) -> str:
    """Generate a realistic long context for compression testing."""
    paragraphs = [
        "The ACHIEVEMOR platform manages AI agents across multiple verticals including sports analytics, workforce training, and education technology. ACHEEVY serves as the primary user-facing agent, while Chicken Hawk acts as the second-in-command orchestrator.",
        "Per|Form is a sports data intelligence platform specializing in NFL Draft analysis, student-athlete NIL valuations, and recruiting communications. It uses the TIE (Talent & Innovation Engine) framework for cross-vertical analytics.",
        "SmelterOS is a three-layer operating system that sits above ACHEEVY at the platform level. AVVA NOON serves as its brain with dual consciousness architecture. The system uses RTCCF and FDH frameworks for reasoning.",
        "The Deploy Platform at deploy.foai.cloud provides AI-managed solutions with aiPLUG containers for automated business workflows. It uses navy, cyan, and orange branding with A.I.M.S. container aesthetics.",
        "CTI Hub is the owner-only admin interface at cti.foai.cloud, providing access to the Plug Bin, Marketplace (MindEdge integration), and role-based UI controls. Circuit Box absorbs settings panels.",
        "The agent hierarchy follows strict chain of command: Users speak only to ACHEEVY, who delegates to Chicken Hawk or Boomer_Angs. Chicken Hawk manages Lil_Hawks but cannot command Boomer_Angs.",
        "Grammar (NTNTN) is the intention engine that runs always-on for prompt efficiency. It acts as a filter only — never an executor, never speaks to users. ACHEEVY is the sole executor.",
        "Broad|Cast Studio provides full video production capabilities across four phases, managed by Iller_Ang as the design specialist. It uses dark gold and silver branding.",
        "The Sqwaadrun fleet consists of 17 specialized Hawks for web intelligence gathering, replacing Firecrawl. It operates through an HTTP gateway with Deploy Platform Mini SaaS integration.",
        "Voice capabilities use PersonaPlex (NVIDIA on Vertex AI) for solo voices, Microsoft VibeVoice for duos, ElevenLabs for refined solos, and Play.ht for character-specific voices.",
        "The AIMS pricing matrix at foai/aims-tools/aims-pricing-matrix/ serves as the single source of truth for models, plans, bundles, and workforce pricing across the ecosystem.",
        "Infrastructure runs on myclaw-vps (srv1492108) with Docker containers behind Traefik routing, plus GCP Cloud Run services in the ai-managed-services project.",
        "The TIE framework operates across six domains: Sports, Workforce, Student, Contractor, Founder, and Creative. Per|Form is one domain instantiation of this broader platform.",
        "Betty-Anne_Ang serves as the HR PMO evaluator with shop-steward personality, using HIDT 7 Core Values scoring. She reports to AVVA NOON and advocates for Lil_Hawks.",
        "The Spinner feature provides autonomous chat-execution similar to Genspark's Speakly, using RFP-BAMARAM intent detection with background execution and Live Look In visualization.",
    ]

    # Repeat to reach target token count
    result = ""
    while count_tokens(result) < approx_tokens:
        for p in paragraphs:
            result += p + " "
            if count_tokens(result) >= approx_tokens:
                break
    return result.strip()


# --- Test Cases ---


def test_01_summarize_achieves_85_percent_reduction():
    """Gate criterion: >= 85% token reduction on 10k token input."""
    context = generate_long_context(10000)
    original_tokens = count_tokens(context)
    assert original_tokens >= 9000, f"Test input too small: {original_tokens} tokens"

    max_tokens = int(original_tokens * 0.15)  # 15% of original = 85% reduction
    result = summarize_memory(context, max_tokens)
    result_tokens = count_tokens(result)

    reduction = 1.0 - (result_tokens / original_tokens)
    print(f"  Original: {original_tokens} tokens")
    print(f"  Compressed: {result_tokens} tokens")
    print(f"  Reduction: {reduction:.1%}")

    assert reduction >= 0.85, f"Reduction {reduction:.1%} < 85%"
    assert result_tokens <= max_tokens + 10, "Exceeded max_tokens budget"
    assert len(result) > 0, "Result should not be empty"


def test_02_summarize_preserves_key_information():
    """Compressed text should retain important entities and facts."""
    context = (
        "ACHEEVY is the primary user-facing agent in the ACHIEVEMOR platform. "
        "It delegates tasks to Chicken Hawk, the second-in-command. "
        "Per|Form handles NFL Draft analytics with a 40/30/30 TRCC formula. "
        "The platform runs on myclaw-vps with Docker and Traefik routing. "
        "SmelterOS uses AVVA NOON as its brain with dual consciousness. "
        "Betty-Anne_Ang evaluates agents using HIDT 7 Core Values scoring. "
        "The Deploy Platform serves at deploy.foai.cloud with aiPLUG containers. "
        "Grammar NTNTN runs as the intention engine filter, never an executor."
    )
    original_tokens = count_tokens(context)
    max_tokens = int(original_tokens * 0.4)  # Keep 40%

    result = summarize_memory(context, max_tokens)

    # Key entities that should survive compression
    # The extractive summarizer selects highest-scored sentences; check terms
    # that appear in those sentences (entities, proper nouns, numbers)
    key_terms = ["TRCC", "NTNTN", "HIDT", "NFL", "Betty-Anne"]
    found = sum(1 for t in key_terms if t in result)
    print(f"  Key terms preserved: {found}/{len(key_terms)}")
    print(f"  Result preview: {result[:300]}...")
    assert found >= 2, f"Only {found} key terms preserved, expected >= 2"


def test_03_compact_context_messages():
    """compact_context should reduce message list while preserving recent turns."""
    messages = [
        {"role": "system", "content": "You are ACHEEVY, the AI assistant."},
    ]
    # Add 20 conversation turns
    for i in range(20):
        messages.append({"role": "user", "content": f"Question {i}: " + "x " * 100})
        messages.append({"role": "assistant", "content": f"Answer {i}: " + "y " * 100})

    original_tokens = count_message_tokens(messages)
    result = compact_context(messages, target_ratio=0.15)
    result_tokens = count_message_tokens(result)

    reduction = 1.0 - (result_tokens / original_tokens)
    print(f"  Messages: {len(messages)} -> {len(result)}")
    print(f"  Tokens: {original_tokens} -> {result_tokens} ({reduction:.1%} reduction)")

    assert len(result) < len(messages), "Should reduce message count"
    assert reduction >= 0.5, f"Reduction {reduction:.1%} too low"

    # Last messages should be preserved
    last_user = [m for m in result if m["role"] == "user"]
    assert len(last_user) >= 1, "Should preserve at least one recent user message"


def test_04_store_and_search_roundtrip():
    """Store a memory and retrieve it via search."""
    client = ReMemoryClient(tenant_id="test-roundtrip")

    content = "The Per|Form platform uses TRCC scoring with a 40/30/30 formula for player evaluation."
    metadata = {"source": "test", "vertical": "sports"}
    memory_id = client.store_memory(content, metadata)

    assert memory_id is not None
    assert len(memory_id) > 0

    # Search should find it
    results = client.search_memory("TRCC player evaluation formula", top_k=5)
    assert len(results) >= 1, "Search should return at least one result"
    assert results[0]["content"] == content
    print(f"  Stored ID: {memory_id}")
    print(f"  Search score: {results[0]['score']:.4f}")


def test_05_per_tenant_isolation():
    """Memories stored for tenant A should NOT appear in tenant B searches."""
    store = InMemoryStore()

    client_a = ReMemoryClient(tenant_id="tenant-alpha", store=store)
    client_b = ReMemoryClient(tenant_id="tenant-beta", store=store)

    # Store in tenant A
    client_a.store_memory("Secret alpha data: ACHEEVY deployment key XYZ123")
    client_a.store_memory("Alpha project uses Per|Form analytics")

    # Store in tenant B
    client_b.store_memory("Beta project uses SmelterOS exclusively")

    # Tenant A search should find alpha data
    results_a = client_a.search_memory("ACHEEVY deployment", top_k=10)
    assert len(results_a) == 2, f"Tenant A should have 2 memories, got {len(results_a)}"

    # Tenant B search should NOT find alpha data
    results_b = client_b.search_memory("ACHEEVY deployment", top_k=10)
    assert len(results_b) == 1, f"Tenant B should have 1 memory, got {len(results_b)}"

    # Verify no cross-contamination
    for r in results_b:
        assert "alpha" not in r["content"].lower(), "Tenant isolation violated!"

    print("  Tenant isolation verified: no cross-contamination")


def test_06_pre_reasoning_hook_enriches_context():
    """pre_reasoning_hook should add relevant memories to context."""
    client = ReMemoryClient(tenant_id="test-hook")

    # Pre-populate memories
    client.store_memory(
        "ACHEEVY uses a chain of command: User -> ACHEEVY -> Chicken Hawk -> Lil_Hawks",
        {"type": "architecture"},
    )
    client.store_memory(
        "Per|Form TRCC formula is 40% talent, 30% resilience, 30% consistency",
        {"type": "analytics"},
    )
    client.store_memory(
        "Deploy Platform runs at deploy.foai.cloud with Traefik routing",
        {"type": "infrastructure"},
    )

    context = "How does the agent chain of command work in ACHEEVY?"
    enriched = pre_reasoning_hook(
        task_id="test-task-001",
        context=context,
        client=client,
        token_budget=2000,
    )

    assert len(enriched) > len(context), "Enriched context should be longer than input"
    assert "chain of command" in enriched.lower()
    print(f"  Input length: {len(context)} chars")
    print(f"  Enriched length: {len(enriched)} chars")


def test_07_pre_reasoning_hook_compacts_large_context():
    """Hook should compact context that exceeds token budget."""
    client = ReMemoryClient(tenant_id="test-hook-compact")

    large_context = generate_long_context(5000)
    token_budget = 500

    result = pre_reasoning_hook(
        task_id="test-compact",
        context=large_context,
        client=client,
        token_budget=token_budget,
    )

    result_tokens = count_tokens(result)
    print(f"  Input tokens: {count_tokens(large_context)}")
    print(f"  Output tokens: {result_tokens}")
    print(f"  Budget: {token_budget}")

    assert result_tokens <= token_budget + 20, (
        f"Result {result_tokens} exceeds budget {token_budget}"
    )


def test_08_hybrid_search_quality():
    """Hybrid search should rank relevant documents higher than irrelevant ones."""
    engine = HybridSearchEngine()

    docs = [
        {"id": "1", "content": "NFL Draft 2026 prospects and TRCC scoring methodology", "metadata": {}},
        {"id": "2", "content": "SmelterOS three-layer architecture with AVVA NOON brain", "metadata": {}},
        {"id": "3", "content": "Recipe for chocolate cake with vanilla frosting", "metadata": {}},
        {"id": "4", "content": "Per|Form player evaluation using talent analytics engine", "metadata": {}},
        {"id": "5", "content": "Weather forecast for Miami showing sunny conditions", "metadata": {}},
    ]
    engine.index_documents(docs)

    # Query about NFL drafting
    results = engine.search("NFL Draft player scoring evaluation", top_k=3)

    # The NFL/analytics docs should rank higher than cake/weather
    top_ids = [r["id"] for r in results]
    print(f"  Top 3 results: {top_ids}")
    print(f"  Scores: {['{:.4f}'.format(r['score']) for r in results]}")

    assert "1" in top_ids or "4" in top_ids, "At least one relevant doc should be in top 3"
    # Irrelevant docs should not be #1
    assert results[0]["id"] in ("1", "4"), f"Top result should be relevant, got id={results[0]['id']}"


def test_09_bm25_keyword_search():
    """BM25 should correctly score documents by keyword relevance."""
    bm25 = BM25()
    documents = [
        "ACHEEVY is the main agent that users interact with",
        "Chicken Hawk orchestrates Lil_Hawk worker agents",
        "Per|Form analyzes NFL Draft prospects using TRCC",
        "The weather today is sunny and warm",
        "ACHEEVY delegates tasks through the chain of command",
    ]
    bm25.index(documents)

    scores = bm25.score("ACHEEVY agent tasks")
    print(f"  BM25 scores: {[f'{s:.4f}' for s in scores]}")

    # Docs mentioning ACHEEVY should score highest
    assert scores[0] > scores[3], "ACHEEVY doc should beat weather doc"
    assert scores[4] > scores[3], "ACHEEVY delegate doc should beat weather doc"


def test_10_memory_persistence_across_operations():
    """Memories should persist across store, search, and delete operations."""
    client = ReMemoryClient(tenant_id="test-persistence")

    # Store three memories
    id1 = client.store_memory("Memory one: platform architecture", {"seq": 1})
    id2 = client.store_memory("Memory two: agent hierarchy", {"seq": 2})
    id3 = client.store_memory("Memory three: deployment process", {"seq": 3})

    # All should be retrievable
    m1 = client.retrieve_memory(id1)
    m2 = client.retrieve_memory(id2)
    m3 = client.retrieve_memory(id3)
    assert m1 is not None and m2 is not None and m3 is not None
    assert m1["content"] == "Memory one: platform architecture"

    # Delete one
    deleted = client.delete_memory(id2)
    assert deleted is True

    # Deleted memory should be gone
    m2_after = client.retrieve_memory(id2)
    assert m2_after is None

    # Others should still exist
    m1_after = client.retrieve_memory(id1)
    m3_after = client.retrieve_memory(id3)
    assert m1_after is not None
    assert m3_after is not None

    # Search should return only 2 results + the task context from hook
    results = client.search_memory("platform", top_k=10)
    contents = [r["content"] for r in results]
    assert "Memory two: agent hierarchy" not in contents

    print(f"  Stored: 3, Deleted: 1, Remaining: {len(results)}")


def test_11_vector_embedding_determinism():
    """Embeddings should be deterministic for the same input."""
    text = "ACHEEVY agent platform architecture"
    e1 = embed_text(text)
    e2 = embed_text(text)

    assert np.allclose(e1, e2), "Same input should produce same embedding"

    # Different inputs should produce different embeddings
    e3 = embed_text("Completely unrelated text about cooking recipes")
    sim = cosine_similarity(e1, e3)
    print(f"  Same-text similarity: {cosine_similarity(e1, e2):.4f}")
    print(f"  Diff-text similarity: {sim:.4f}")
    assert sim < 0.95, "Different texts should have lower similarity"


def test_12_token_counting_consistency():
    """Token counting should be consistent and reasonable."""
    short = "Hello world"
    medium = "The ACHIEVEMOR platform manages AI agents across multiple verticals."
    long_text = generate_long_context(1000)

    short_tokens = count_tokens(short)
    medium_tokens = count_tokens(medium)
    long_tokens = count_tokens(long_text)

    print(f"  Short: {short_tokens} tokens")
    print(f"  Medium: {medium_tokens} tokens")
    print(f"  Long: {long_tokens} tokens")

    assert short_tokens < medium_tokens < long_tokens
    assert short_tokens >= 2
    assert long_tokens >= 500


# --- Runner ---


def run_all_tests():
    """Run all tests and report results."""
    tests = [
        test_01_summarize_achieves_85_percent_reduction,
        test_02_summarize_preserves_key_information,
        test_03_compact_context_messages,
        test_04_store_and_search_roundtrip,
        test_05_per_tenant_isolation,
        test_06_pre_reasoning_hook_enriches_context,
        test_07_pre_reasoning_hook_compacts_large_context,
        test_08_hybrid_search_quality,
        test_09_bm25_keyword_search,
        test_10_memory_persistence_across_operations,
        test_11_vector_embedding_determinism,
        test_12_token_counting_consistency,
    ]

    passed = 0
    failed = 0
    errors = []

    print("=" * 60)
    print("ReMe Memory Substrate — Test Suite")
    print("=" * 60)

    for test_fn in tests:
        name = test_fn.__name__
        try:
            print(f"\n[RUN] {name}")
            test_fn()
            print(f"[PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"[FAIL] {name}: {e}")
            failed += 1
            errors.append((name, str(e)))

    print("\n" + "=" * 60)
    print(f"Results: {passed} passed, {failed} failed, {passed + failed} total")
    if errors:
        print("\nFailures:")
        for name, err in errors:
            print(f"  - {name}: {err}")
    print("=" * 60)

    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
