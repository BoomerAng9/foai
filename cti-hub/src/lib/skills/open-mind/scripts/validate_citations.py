#!/usr/bin/env python3
"""
validate_citations.py — Open Mind Citation Integrity Validator

Validates that:
1. Every VERIFIED claim has at least one source citation
2. Source IDs in claims match source entries in the ledger
3. No orphaned citations (claim references non-existent source)
4. Coverage rate meets threshold

Usage:
    python validate_citations.py evidence_ledger.json [--threshold 0.85]
"""

import json
import sys
import argparse
from pathlib import Path


def load_ledger(path: str) -> dict:
    with open(path, 'r') as f:
        return json.load(f)


def validate_citations(ledger: dict, threshold: float = 0.85) -> dict:
    results = {
        "passed": True,
        "coverage_rate": 0.0,
        "integrity_rate": 0.0,
        "errors": [],
        "warnings": [],
        "stats": {
            "total_claims": 0,
            "verified_claims": 0,
            "partially_supported": 0,
            "inference_claims": 0,
            "hypothesis_claims": 0,
            "claims_with_citations": 0,
            "orphaned_citations": 0,
            "total_sources": 0,
            "unused_sources": 0
        }
    }

    sources = {s["id"]: s for s in ledger.get("sources", [])}
    claims = ledger.get("claims", [])

    results["stats"]["total_claims"] = len(claims)
    results["stats"]["total_sources"] = len(sources)

    cited_source_ids = set()
    key_claims = 0
    backed_claims = 0

    for claim in claims:
        claim_id = claim.get("claim_id", "UNKNOWN")
        status = claim.get("status", "UNKNOWN")
        support = claim.get("support", [])

        # Count by status
        if status == "VERIFIED":
            results["stats"]["verified_claims"] += 1
            key_claims += 1
        elif status == "PARTIALLY_SUPPORTED":
            results["stats"]["partially_supported"] += 1
            key_claims += 1
        elif status == "INFERENCE":
            results["stats"]["inference_claims"] += 1
        elif status == "HYPOTHESIS":
            results["stats"]["hypothesis_claims"] += 1

        # Check citations exist for VERIFIED claims
        if status == "VERIFIED" and not support:
            results["errors"].append(
                f"VERIFIED claim {claim_id} has no supporting citations"
            )
            results["passed"] = False

        # Check source IDs are valid
        for s in support:
            src_id = s.get("source_id", "")
            cited_source_ids.add(src_id)
            if src_id not in sources:
                results["errors"].append(
                    f"Claim {claim_id} cites non-existent source {src_id}"
                )
                results["stats"]["orphaned_citations"] += 1
                results["passed"] = False

        if support:
            results["stats"]["claims_with_citations"] += 1
            if status in ("VERIFIED", "PARTIALLY_SUPPORTED"):
                backed_claims += 1

        # Check INFERENCE/HYPOTHESIS have validation steps
        if status in ("INFERENCE", "HYPOTHESIS"):
            validation = claim.get("validation_needed", [])
            if not validation:
                results["warnings"].append(
                    f"{status} claim {claim_id} has no validation_needed steps"
                )

        # Check HYPOTHESIS has falsification criteria
        if status == "HYPOTHESIS":
            if not claim.get("falsification_criteria"):
                results["warnings"].append(
                    f"HYPOTHESIS claim {claim_id} has no falsification_criteria"
                )

    # Calculate coverage rate
    if key_claims > 0:
        results["coverage_rate"] = backed_claims / key_claims
    else:
        results["coverage_rate"] = 1.0  # No key claims = vacuously true

    # Check threshold
    if results["coverage_rate"] < threshold:
        results["errors"].append(
            f"Coverage rate {results['coverage_rate']:.2f} below threshold {threshold}"
        )
        results["passed"] = False

    # Check for unused sources
    unused = set(sources.keys()) - cited_source_ids
    results["stats"]["unused_sources"] = len(unused)
    if unused:
        results["warnings"].append(
            f"Unused sources: {', '.join(sorted(unused))}"
        )

    # Calculate integrity rate
    total_citations = sum(len(c.get("support", [])) for c in claims)
    valid_citations = total_citations - results["stats"]["orphaned_citations"]
    results["integrity_rate"] = (
        valid_citations / total_citations if total_citations > 0 else 1.0
    )

    return results


def main():
    parser = argparse.ArgumentParser(description="Validate Open Mind evidence ledger citations")
    parser.add_argument("ledger_path", help="Path to evidence ledger JSON file")
    parser.add_argument("--threshold", type=float, default=0.85,
                        help="Minimum evidence coverage rate (default: 0.85)")
    parser.add_argument("--strict", action="store_true",
                        help="Use high-risk threshold (0.95)")
    parser.add_argument("--json", action="store_true",
                        help="Output results as JSON")

    args = parser.parse_args()

    threshold = 0.95 if args.strict else args.threshold

    try:
        ledger = load_ledger(args.ledger_path)
    except (json.JSONDecodeError, FileNotFoundError) as e:
        print(f"ERROR: Could not load ledger: {e}", file=sys.stderr)
        sys.exit(1)

    results = validate_citations(ledger, threshold)

    if args.json:
        print(json.dumps(results, indent=2))
    else:
        print(f"\n{'='*60}")
        print(f"  Open Mind Citation Validation Report")
        print(f"{'='*60}")
        print(f"  Status:           {'PASS' if results['passed'] else 'FAIL'}")
        print(f"  Coverage Rate:    {results['coverage_rate']:.2%} (threshold: {threshold:.0%})")
        print(f"  Integrity Rate:   {results['integrity_rate']:.2%}")
        print(f"{'='*60}")
        print(f"  Claims: {results['stats']['total_claims']} total")
        print(f"    VERIFIED:           {results['stats']['verified_claims']}")
        print(f"    PARTIALLY_SUPPORTED:{results['stats']['partially_supported']}")
        print(f"    INFERENCE:          {results['stats']['inference_claims']}")
        print(f"    HYPOTHESIS:         {results['stats']['hypothesis_claims']}")
        print(f"  Sources: {results['stats']['total_sources']} total, "
              f"{results['stats']['unused_sources']} unused")
        print(f"  Orphaned Citations:   {results['stats']['orphaned_citations']}")

        if results["errors"]:
            print(f"\n  ERRORS:")
            for e in results["errors"]:
                print(f"    ✗ {e}")

        if results["warnings"]:
            print(f"\n  WARNINGS:")
            for w in results["warnings"]:
                print(f"    ⚠ {w}")

        print(f"{'='*60}\n")

    sys.exit(0 if results["passed"] else 1)


if __name__ == "__main__":
    main()
