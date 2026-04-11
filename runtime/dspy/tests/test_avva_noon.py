"""
AVVA NOON Reasoning Spine — Test Suite (20 test cases)

Uses real Per|Form TIE engine prospect data from Neon as fixtures.
Tests all three reasoning modes: Simple, Deep, Heavy.

Gate criteria: >=90% pass rate (18/20).
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from avva_noon import (
    AVVAExecutor,
    NOONValidator,
    SimpleMode,
    DeepMode,
    HeavyMode,
    FAILURES_PATH,
    log_failure,
    read_failures,
    run_mode,
)

# ---------------------------------------------------------------------------
# Real Per|Form prospect fixtures (from Neon performdb)
# ---------------------------------------------------------------------------

PROSPECT_LOVE = {
    "name": "Jeremiyah Love",
    "school": "Notre Dame",
    "position": "RB",
    "grade": "93.0",
    "tie_grade": "Blue Chip",
    "tie_tier": "Tier 1",
    "projected_round": 1,
    "strengths": "Speed 10/10; Ball security 10/10; Vision 9.5; Receiving 9.5; Contact balance 9.5",
    "weaknesses": "Durability 8.5; shared backfield usage",
    "nfl_comparison": "Jahmyr Gibbs",
    "scouting_summary": "Consensus #1 overall. Rare combination of speed, hands, and ball security.",
}

PROSPECT_DOWNS = {
    "name": "Caleb Downs",
    "school": "Ohio State",
    "position": "S",
    "grade": "89.0",
    "tie_grade": "First Round Lock",
    "tie_tier": "Tier 2",
    "projected_round": 1,
    "strengths": "Coverage 9.0; Versatility 9.0; Football IQ 9.5; Leadership 9.5",
    "weaknesses": "Athleticism 7.5",
    "nfl_comparison": "Jessie Bates III",
}

PROSPECT_MAUIGOA = {
    "name": "Francis Mauigoa",
    "school": "Miami (FL)",
    "position": "OT",
    "grade": "90.0",
    "tie_grade": "Elite Prospect",
    "tie_tier": "ELITE",
    "projected_round": 1,
    "strengths": "Mauler in the run game, 329 pounds with real feet, 87.6 PFF pass blocking grade",
    "weaknesses": "Guard-or-tackle debate follows him, minor technique lapses under speed pressure",
}

PROSPECT_BAIN = {
    "name": "Rueben Bain Jr.",
    "school": "Miami (FL)",
    "position": "EDGE",
    "grade": "91.0",
    "tie_grade": "Elite Prospect",
    "tie_tier": "ELITE",
    "projected_round": 1,
    "strengths": "20.5 career sacks, 92.4 PFF pass-rush grade, quick-twitch burst",
    "weaknesses": "Sub-31-inch arms, 6-2 is short for the position",
}

PROSPECT_TYSON = {
    "name": "Jordyn Tyson",
    "school": "Arizona State",
    "position": "WR",
    "grade": "81.0",
    "tie_grade": "Solid Starter",
    "tie_tier": "Tier 4",
    "projected_round": 2,
    "trend": "falling",
    "strengths": "Playmaking 9.5; Route running 9.0; Ball tracking 9.0; YAC 9.0",
    "weaknesses": "Durability 6.0; Risk factor 6.5",
}


def _prospect_context(p: dict) -> str:
    return json.dumps(p, indent=2)


# ---------------------------------------------------------------------------
# Mock DSPy LM to avoid real API calls in tests
# ---------------------------------------------------------------------------

class MockLM:
    """Mock LM that returns deterministic outputs for DSPy signatures."""

    def __init__(self):
        self.history = []

    def __call__(self, prompt=None, **kwargs):
        return self._generate(prompt, **kwargs)

    def _generate(self, prompt=None, **kwargs):
        # Return a mock completion that DSPy can parse
        return ["reasoning_chain: Step 1: Analyze the prospect data. Step 2: Apply TIE grading criteria.\n"
                "candidate_answer: Based on the TIE engine analysis, this prospect grades as a first-round talent.\n"
                "passed: True\n"
                "critique: The analysis is consistent with the provided data.\n"
                "refined_answer: Based on the TIE engine analysis, this prospect grades as a first-round talent."]


def mock_dspy_predict(signature_class):
    """Create a mock predictor that returns valid outputs."""
    class MockPredictor:
        def __init__(self, *args, **kwargs):
            pass

        def __call__(self, **kwargs):
            import dspy
            if signature_class == AVVAExecutor or (hasattr(signature_class, '__name__') and 'AVVA' in str(signature_class)):
                return dspy.Prediction(
                    reasoning_chain="Step 1: Analyzed prospect metrics. Step 2: Applied TIE grading formula. Step 3: Cross-referenced with historical comps.",
                    candidate_answer="Based on TIE engine analysis, this prospect projects as a high-impact NFL starter with first-round value.",
                )
            else:
                return dspy.Prediction(
                    passed=True,
                    critique="Analysis is consistent and well-grounded in the provided prospect data.",
                    refined_answer="Based on TIE engine analysis, this prospect projects as a high-impact NFL starter with first-round value.",
                )

    return MockPredictor


# ---------------------------------------------------------------------------
# Fixture: patch DSPy to use mock LM
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def mock_dspy_lm(monkeypatch, tmp_path):
    """Patch DSPy to use a mock LM and use temp failures file."""
    import dspy
    import avva_noon

    # Use a temp failures file
    temp_failures = tmp_path / "failures.jsonl"
    temp_failures.touch()
    monkeypatch.setattr(avva_noon, "FAILURES_PATH", temp_failures)

    # Patch ChainOfThought and MultiChainComparison
    original_cot = dspy.ChainOfThought
    original_mcc = dspy.MultiChainComparison

    class MockChainOfThought:
        def __init__(self, signature, *args, **kwargs):
            self.signature = signature

        def __call__(self, **kwargs):
            if 'assertions' in kwargs or 'reasoning_chain' in kwargs:
                # NOONValidator signature
                return dspy.Prediction(
                    passed=True,
                    critique="Analysis is consistent with provided data.",
                    refined_answer=kwargs.get('candidate_answer', 'Validated answer'),
                )
            else:
                # AVVAExecutor signature
                context = kwargs.get('context', '')
                return dspy.Prediction(
                    reasoning_chain=f"Step 1: Parse prospect data. Step 2: Apply TIE formula. Step 3: Generate grade. Context length: {len(context)}",
                    candidate_answer=f"TIE analysis complete. Prospect evaluated based on provided metrics.",
                )

    class MockMultiChainComparison:
        def __init__(self, signature, M=5, **kwargs):
            self.signature = signature
            self.M = M

        def __call__(self, completions=None, **kwargs):
            return dspy.Prediction(
                reasoning_chain="Compared 5 chains. Best chain selected based on consistency and depth of analysis.",
                candidate_answer="Multi-chain consensus: Prospect grades as a high-impact talent based on combined analysis.",
            )

    monkeypatch.setattr(dspy, "ChainOfThought", MockChainOfThought)
    monkeypatch.setattr(dspy, "MultiChainComparison", MockMultiChainComparison)

    yield temp_failures

    # Restore
    monkeypatch.setattr(dspy, "ChainOfThought", original_cot)
    monkeypatch.setattr(dspy, "MultiChainComparison", original_mcc)


# ===========================================================================
# TEST CASES — 20 total
# ===========================================================================

# --- Group 1: Simple mode produces valid TIE-compatible outputs (5 tests) ---

class TestSimpleMode:
    def test_simple_returns_structured_output(self):
        """Simple mode returns all required fields."""
        module = SimpleMode()
        result = module(task="Grade this prospect", context=_prospect_context(PROSPECT_LOVE))
        assert hasattr(result, "reasoning_chain")
        assert hasattr(result, "answer")
        assert hasattr(result, "confidence")
        assert hasattr(result, "mode_used")

    def test_simple_mode_label(self):
        """Simple mode stamps output with mode_used='simple'."""
        module = SimpleMode()
        result = module(task="Evaluate draft position", context=_prospect_context(PROSPECT_DOWNS))
        assert result.mode_used == "simple"

    def test_simple_confidence_baseline(self):
        """Simple mode returns a reasonable confidence value."""
        module = SimpleMode()
        result = module(task="Analyze strengths", context=_prospect_context(PROSPECT_MAUIGOA))
        assert 0.0 < result.confidence <= 1.0

    def test_simple_reasoning_chain_nonempty(self):
        """Simple mode produces a non-empty reasoning chain."""
        module = SimpleMode()
        result = module(task="Compare to NFL comp", context=_prospect_context(PROSPECT_BAIN))
        assert len(result.reasoning_chain) > 10

    def test_simple_answer_nonempty(self):
        """Simple mode produces a non-empty answer."""
        module = SimpleMode()
        result = module(task="Summarize weaknesses", context=_prospect_context(PROSPECT_TYSON))
        assert len(result.answer) > 5


# --- Group 2: Deep mode produces higher-confidence answers than Simple (5 tests) ---

class TestDeepMode:
    def test_deep_returns_structured_output(self):
        """Deep mode returns all required fields."""
        module = DeepMode()
        result = module(
            task="Full TIE analysis",
            context=_prospect_context(PROSPECT_LOVE),
            assertions=["Grade must be consistent with TIE tier"],
        )
        assert hasattr(result, "reasoning_chain")
        assert hasattr(result, "answer")
        assert hasattr(result, "confidence")
        assert hasattr(result, "mode_used")

    def test_deep_mode_label(self):
        """Deep mode stamps output with mode_used='deep'."""
        module = DeepMode()
        result = module(task="Evaluate draft stock", context=_prospect_context(PROSPECT_DOWNS))
        assert result.mode_used == "deep"

    def test_deep_confidence_higher_than_simple(self):
        """Deep mode confidence >= Simple mode confidence."""
        simple = SimpleMode()
        deep = DeepMode()

        s_result = simple(task="Grade prospect", context=_prospect_context(PROSPECT_MAUIGOA))
        d_result = deep(task="Grade prospect", context=_prospect_context(PROSPECT_MAUIGOA))

        assert d_result.confidence >= s_result.confidence

    def test_deep_runs_validation(self):
        """Deep mode produces validation_passed field."""
        module = DeepMode()
        result = module(
            task="Validate TIE grade",
            context=_prospect_context(PROSPECT_BAIN),
            assertions=["Grade must match projected round"],
        )
        assert hasattr(result, "validation_passed")

    def test_deep_with_multiple_assertions(self):
        """Deep mode handles multiple assertions."""
        module = DeepMode()
        result = module(
            task="Comprehensive evaluation",
            context=_prospect_context(PROSPECT_TYSON),
            assertions=[
                "Grade must be consistent with TIE tier",
                "Strengths must be cited in reasoning",
                "Weaknesses must be acknowledged",
            ],
        )
        assert result.mode_used == "deep"
        assert result.confidence > 0


# --- Group 3: Heavy mode activates only on explicit trigger (4 tests) ---

class TestHeavyMode:
    def test_heavy_returns_structured_output(self):
        """Heavy mode returns all required fields."""
        module = HeavyMode()
        result = module(task="Deep scouting report", context=_prospect_context(PROSPECT_LOVE))
        assert hasattr(result, "reasoning_chain")
        assert hasattr(result, "answer")
        assert hasattr(result, "confidence")
        assert hasattr(result, "mode_used")

    def test_heavy_mode_label(self):
        """Heavy mode stamps output with mode_used='heavy'."""
        module = HeavyMode()
        result = module(task="LATS analysis", context=_prospect_context(PROSPECT_DOWNS))
        assert result.mode_used == "heavy"

    def test_heavy_has_search_trace(self):
        """Heavy mode includes search trace from LATS."""
        module = HeavyMode()
        result = module(task="Tree search evaluation", context=_prospect_context(PROSPECT_MAUIGOA))
        assert hasattr(result, "search_trace")
        assert len(result.search_trace) > 0

    def test_heavy_only_via_explicit_mode(self):
        """run_mode only triggers heavy when mode='heavy' is explicitly passed."""
        # Simple does not produce search_trace
        simple_result = run_mode("simple", "Grade prospect", _prospect_context(PROSPECT_BAIN))
        assert simple_result["mode_used"] == "simple"

        heavy_result = run_mode("heavy", "Grade prospect", _prospect_context(PROSPECT_BAIN))
        assert heavy_result["mode_used"] == "heavy"


# --- Group 4: Reflexion memory grows when validation fails (3 tests) ---

class TestReflexionMemory:
    def test_log_failure_appends(self, mock_dspy_lm):
        """log_failure appends to failures.jsonl."""
        log_failure("test-001", "Grade inconsistency", "Re-evaluate with updated metrics")
        failures = read_failures()
        assert len(failures) >= 1
        assert failures[-1]["task_id"] == "test-001"

    def test_failure_record_format(self, mock_dspy_lm):
        """Failure records contain required fields."""
        log_failure("test-002", "Missing comparison", "Add NFL comp analysis")
        failures = read_failures()
        last = failures[-1]
        assert "task_id" in last
        assert "timestamp" in last
        assert "failure_reason" in last
        assert "suggested_fix" in last

    def test_deep_mode_logs_on_validation_failure(self, mock_dspy_lm, monkeypatch):
        """Deep mode writes to reflexion log when validation fails."""
        import dspy
        import avva_noon

        # Make validator return passed=False
        class FailingValidator:
            def __init__(self, *args, **kwargs):
                pass
            def __call__(self, **kwargs):
                return dspy.Prediction(
                    passed=False,
                    critique="Grade does not match the provided TIE tier data.",
                    refined_answer="Corrected: Prospect should be Tier 2, not Tier 1.",
                )

        original_cot = dspy.ChainOfThought

        call_count = [0]
        class SelectiveValidator:
            def __init__(self, signature, *args, **kwargs):
                self.signature = signature
                self.is_validator = 'assertions' in str(getattr(signature, '__annotations__', {})) or 'NOONValidator' in str(signature)

            def __call__(self, **kwargs):
                if 'assertions' in kwargs or 'reasoning_chain' in kwargs:
                    return dspy.Prediction(
                        passed=False,
                        critique="Grade mismatch detected.",
                        refined_answer="Corrected analysis.",
                    )
                return dspy.Prediction(
                    reasoning_chain="Analysis chain",
                    candidate_answer="Initial answer",
                )

        monkeypatch.setattr(dspy, "ChainOfThought", SelectiveValidator)

        before_count = len(read_failures())
        module = DeepMode()
        module(
            task="Validate grade",
            context=_prospect_context(PROSPECT_TYSON),
            assertions=["Grade must match tier"],
        )
        after_count = len(read_failures())

        assert after_count > before_count, "Reflexion log should grow on validation failure"

        monkeypatch.setattr(dspy, "ChainOfThought", original_cot)


# --- Group 5: All three modes return properly structured output (3 tests) ---

class TestStructuredOutput:
    def test_run_mode_simple_structure(self):
        """run_mode('simple') returns dict with all required keys."""
        result = run_mode("simple", "Evaluate", _prospect_context(PROSPECT_LOVE))
        assert isinstance(result, dict)
        for key in ["reasoning_chain", "answer", "confidence", "mode_used"]:
            assert key in result, f"Missing key: {key}"

    def test_run_mode_deep_structure(self):
        """run_mode('deep') returns dict with all required keys."""
        result = run_mode("deep", "Evaluate", _prospect_context(PROSPECT_DOWNS))
        assert isinstance(result, dict)
        for key in ["reasoning_chain", "answer", "confidence", "mode_used"]:
            assert key in result

    def test_run_mode_unknown_raises(self):
        """run_mode with unknown mode raises ValueError."""
        with pytest.raises(ValueError, match="Unknown mode"):
            run_mode("turbo", "Evaluate", _prospect_context(PROSPECT_MAUIGOA))
