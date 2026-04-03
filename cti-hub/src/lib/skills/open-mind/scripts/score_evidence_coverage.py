#!/usr/bin/env python3
"""
score_evidence_coverage.py — Open Mind Evidence Coverage Scorer

Computes evidence coverage metrics from an evidence ledger and
outputs a coverage report.

Usage:
    python score_evidence_coverage.py evidence_ledger.json [--min-coverage 0.85]
"""

import json
import sys
import argparse
from collections import Counter


def score_coverage(ledger: dict) -> dict:
    claims = ledger.get("claims", [])
    sources = ledger.get("sources", [])

    status_counts = Counter(c.get("status", "UNKNOWN") for c in claims)
    total = len(claims)
    key_claims = status_counts.get("VERIFIED", 0) + status_counts.get("PARTIALLY_SUPPORTED", 0)

    # Coverage by query cluster
    cluster_coverage = {}
    for source in sources:
        cluster = source.get("retrieval_cluster", "unknown")
        if cluster not in cluster_coverage:
            cluster_coverage[cluster] = {"sources": 0, "claims_supported": 0}
        cluster_coverage[cluster]["sources"] += 1

    # Map source IDs to clusters
    source_clusters = {s["id"]: s.get("retrieval_cluster", "unknown") for s in sources}

    for claim in claims:
        for support in claim.get("support", []):
            src_id = support.get("source_id", "")
            cluster = source_clusters.get(src_id, "unknown")
            if cluster in cluster_coverage:
                cluster_coverage[cluster]["claims_supported"] += 1

    # Confidence distribution
    confidences = [c.get("confidence", 0.0) for c in claims if "confidence" in c]
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

    # Gaps analysis
    gaps = []
    for claim in claims:
        if claim.get("status") in ("INFERENCE", "HYPOTHESIS"):
            if not claim.get("validation_needed"):
                gaps.append({
                    "claim_id": claim.get("claim_id"),
                    "issue": "No validation steps defined",
                    "status": claim.get("status")
                })
        if claim.get("status") == "VERIFIED" and not claim.get("support"):
            gaps.append({
                "claim_id": claim.get("claim_id"),
                "issue": "VERIFIED but no citations",
                "status": "VERIFIED"
            })

    # Conflict analysis
    conflicts = ledger.get("conflicts", [])
    resolved = sum(1 for c in conflicts if c.get("resolution_plan"))
    unresolved = len(conflicts) - resolved

    return {
        "total_claims": total,
        "status_distribution": dict(status_counts),
        "key_claims": key_claims,
        "coverage_rate": key_claims / total if total > 0 else 0.0,
        "cluster_coverage": cluster_coverage,
        "average_confidence": round(avg_confidence, 3),
        "gaps": gaps,
        "conflicts_total": len(conflicts),
        "conflicts_resolved": resolved,
        "conflicts_unresolved": unresolved,
        "retrieval_gaps": ledger.get("retrieval_gaps", []),
        "open_questions": ledger.get("open_questions", [])
    }


def main():
    parser = argparse.ArgumentParser(description="Score Open Mind evidence coverage")
    parser.add_argument("ledger_path", help="Path to evidence ledger JSON file")
    parser.add_argument("--min-coverage", type=float, default=0.85,
                        help="Minimum acceptable coverage rate (default: 0.85)")
    parser.add_argument("--json", action="store_true",
                        help="Output as JSON")

    args = parser.parse_args()

    try:
        with open(args.ledger_path, 'r') as f:
            ledger = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError) as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

    report = score_coverage(ledger)
    passed = report["coverage_rate"] >= args.min_coverage

    if args.json:
        report["passed"] = passed
        report["threshold"] = args.min_coverage
        print(json.dumps(report, indent=2))
    else:
        print(f"\n{'='*60}")
        print(f"  Open Mind Evidence Coverage Report")
        print(f"{'='*60}")
        print(f"  Status:          {'PASS' if passed else 'FAIL'}")
        print(f"  Coverage Rate:   {report['coverage_rate']:.2%} (min: {args.min_coverage:.0%})")
        print(f"  Total Claims:    {report['total_claims']}")
        print(f"  Avg Confidence:  {report['average_confidence']:.1%}")
        print(f"\n  Status Distribution:")
        for status, count in sorted(report["status_distribution"].items()):
            print(f"    {status}: {count}")
        print(f"\n  Query Cluster Coverage:")
        for cluster, data in report["cluster_coverage"].items():
            print(f"    {cluster}: {data['sources']} sources, {data['claims_supported']} claims")
        if report["gaps"]:
            print(f"\n  Gaps ({len(report['gaps'])}):")
            for gap in report["gaps"]:
                print(f"    {gap['claim_id']}: {gap['issue']}")
        print(f"\n  Conflicts: {report['conflicts_total']} total, "
              f"{report['conflicts_resolved']} resolved, "
              f"{report['conflicts_unresolved']} unresolved")
        if report["open_questions"]:
            print(f"\n  Open Questions:")
            for q in report["open_questions"]:
                print(f"    ? {q}")
        print(f"{'='*60}\n")

    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
