#!/usr/bin/env python3
"""
score_novelty.py — Open Mind Novelty Scorer

Validates novelty scores from an Open Mind option output and
checks against passing thresholds.

Usage:
    python score_novelty.py options_output.json [--min-novelty 3.0]
"""

import json
import sys
import argparse


def score_novelty(output: dict) -> dict:
    scores = output.get("novelty_scores", {})
    dimension_scores = scores.get("dimension_scores", {})
    red_flags = output.get("red_flags", {})
    options = output.get("options", [])

    # Calculate dimension averages
    novelty_dims = [
        dimension_scores.get("Q1_originality", 0),
        dimension_scores.get("Q2_surprise", 0),
        dimension_scores.get("Q3_non_derivativeness", 0),
        dimension_scores.get("Q4_uniqueness", 0)
    ]
    quality_dims = [
        dimension_scores.get("Q5_requirements", 0),
        dimension_scores.get("Q6_coherence_novel", 0),
        dimension_scores.get("Q7_practicality", 0)
    ]
    coherence_dims = [
        dimension_scores.get("Q8_internal_consistency", 0),
        dimension_scores.get("Q9_integration_fitness", 0)
    ]

    avg_novelty = sum(novelty_dims) / len(novelty_dims) if novelty_dims else 0
    avg_quality = sum(quality_dims) / len(quality_dims) if quality_dims else 0
    avg_coherence = sum(coherence_dims) / len(coherence_dims) if coherence_dims else 0

    overall = (0.3 * avg_quality) + (0.4 * avg_novelty) + (0.3 * avg_coherence)

    # Check red flags
    red_flag_triggered = any(red_flags.values())
    red_flag_list = [k for k, v in red_flags.items() if v]

    # Option diversity check
    option_types = [o.get("type", "") for o in options]
    has_all_types = all(t in option_types for t in ["CONVENTIONAL", "DIFFERENTIATED", "EXPERIMENTAL"])

    # Check "what is original" is non-empty for non-conventional
    originality_gaps = []
    for opt in options:
        if opt.get("type") != "CONVENTIONAL":
            original = opt.get("what_is_original", [])
            if not original:
                originality_gaps.append(opt.get("type", "UNKNOWN"))

    return {
        "novelty_avg": round(avg_novelty, 2),
        "quality_avg": round(avg_quality, 2),
        "coherence_avg": round(avg_coherence, 2),
        "overall": round(overall, 2),
        "dimension_scores": dimension_scores,
        "red_flags_triggered": red_flag_triggered,
        "red_flag_details": red_flag_list,
        "option_diversity": has_all_types,
        "option_count": len(options),
        "originality_gaps": originality_gaps,
        "all_dimensions_above_3": (
            avg_novelty >= 3.0 and avg_quality >= 3.0 and avg_coherence >= 3.0
        )
    }


def main():
    parser = argparse.ArgumentParser(description="Score Open Mind novelty output")
    parser.add_argument("output_path", help="Path to Open Mind options output JSON")
    parser.add_argument("--min-novelty", type=float, default=3.0,
                        help="Minimum novelty average (0-6 scale, default: 3.0)")
    parser.add_argument("--min-overall", type=float, default=3.0,
                        help="Minimum overall score (0-6 scale, default: 3.0)")
    parser.add_argument("--json", action="store_true",
                        help="Output as JSON")

    args = parser.parse_args()

    try:
        with open(args.output_path, 'r') as f:
            output = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError) as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

    report = score_novelty(output)

    # Determine pass/fail
    passed = (
        report["novelty_avg"] >= args.min_novelty
        and report["overall"] >= args.min_overall
        and not report["red_flags_triggered"]
        and report["option_diversity"]
        and report["all_dimensions_above_3"]
        and not report["originality_gaps"]
    )

    if args.json:
        report["passed"] = passed
        report["thresholds"] = {
            "min_novelty": args.min_novelty,
            "min_overall": args.min_overall
        }
        print(json.dumps(report, indent=2))
    else:
        print(f"\n{'='*60}")
        print(f"  Open Mind Novelty Scoring Report")
        print(f"{'='*60}")
        print(f"  Status:           {'PASS' if passed else 'FAIL'}")
        print(f"  Overall Score:    {report['overall']}/6.0 (min: {args.min_overall})")
        print(f"  Novelty Avg:      {report['novelty_avg']}/6.0 (min: {args.min_novelty})")
        print(f"  Quality Avg:      {report['quality_avg']}/6.0")
        print(f"  Coherence Avg:    {report['coherence_avg']}/6.0")
        print(f"\n  Dimension Scores:")
        for dim, score in report["dimension_scores"].items():
            print(f"    {dim}: {score}/6")
        print(f"\n  Option Diversity:  {'PASS' if report['option_diversity'] else 'FAIL'}")
        print(f"  Options Count:     {report['option_count']}")
        if report["red_flags_triggered"]:
            print(f"\n  RED FLAGS TRIGGERED:")
            for flag in report["red_flag_details"]:
                print(f"    ✗ {flag}")
        if report["originality_gaps"]:
            print(f"\n  ORIGINALITY GAPS (missing 'what_is_original'):")
            for gap in report["originality_gaps"]:
                print(f"    ✗ {gap}")
        print(f"{'='*60}\n")

    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
