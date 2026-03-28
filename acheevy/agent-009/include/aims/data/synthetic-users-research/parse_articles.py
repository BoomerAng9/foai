#!/usr/bin/env python3
"""
Parse 21 Academic Research Articles on Synthetic Users/LLMs into structured formats.
Creates:
- JSONL for AI training (preserves hierarchical structure)
- CSV for spreadsheet review (flattened fields)
"""

import json
import csv
import re
from pathlib import Path

def parse_articles(raw_text: str) -> list[dict]:
    """Parse raw article text into structured data."""
    articles = []

    # Split by article numbers (1. Title, 2. Title, etc.)
    article_pattern = r'\n(\d+)\. ([^\n]+)\n'
    splits = re.split(article_pattern, raw_text)

    # First element is preamble, then groups of (number, title, content)
    i = 1
    while i < len(splits) - 2:
        article_num = splits[i]
        article_title = splits[i + 1].strip()
        article_content = splits[i + 2]

        article = parse_single_article(article_num, article_title, article_content)
        articles.append(article)
        i += 3

    return articles

def parse_single_article(num: str, title: str, content: str) -> dict:
    """Parse a single article's content into structured fields."""
    article = {
        "id": int(num),
        "title": title,
        "authors": "",
        "published": "",
        "research_question": "",
        "key_methodologies": [],
        "primary_findings": [],
        "relevance_to_synthetic_users": [],
        "supporting_evidence": [],
        "contradictory_evidence": [],
        "gaps_and_opportunities": [],
        "ethical_considerations": [],
        "practical_applications": [],
        "limitations_and_challenges": [],
        "future_research_directions": [],
        "accuracy_of_demographic_mimicry": {
            "findings": "",
            "implications": ""
        },
        "overall_assessment": "",
        "relation_to_synthetic_users": "",
        "suggested_refinements": []
    }

    lines = content.strip().split('\n')
    current_section = None
    current_text = []

    section_map = {
        "authors:": "authors",
        "published:": "published",
        "research question:": "research_question",
        "key methodologies": "key_methodologies",
        "primary findings": "primary_findings",
        "relevance to synthetic users": "relevance_to_synthetic_users",
        "supporting evidence": "supporting_evidence",
        "contradictory evidence": "contradictory_evidence",
        "gaps and opportunities": "gaps_and_opportunities",
        "ethical considerations": "ethical_considerations",
        "practical applications": "practical_applications",
        "limitations and challenges": "limitations_and_challenges",
        "future research directions": "future_research_directions",
        "accuracy of demographic mimicry": "accuracy_of_demographic_mimicry",
        "overall assessment": "overall_assessment",
        "relation to synthetic users:": "relation_to_synthetic_users",
        "suggested refinements": "suggested_refinements"
    }

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Check if this line starts a new section
        line_lower = line.lower()
        new_section = None

        for header, field in section_map.items():
            if line_lower.startswith(header):
                new_section = field
                # Extract value if it's on the same line (for single-value fields)
                remaining = line[len(header):].strip()
                if remaining and field in ["authors", "published", "research_question", "relation_to_synthetic_users"]:
                    article[field] = remaining
                break

        if new_section:
            current_section = new_section
            continue

        # Add content to current section
        if current_section:
            if current_section == "accuracy_of_demographic_mimicry":
                if line_lower.startswith("findings:"):
                    article[current_section]["findings"] = line[9:].strip()
                elif line_lower.startswith("implications for synthetic users:"):
                    article[current_section]["implications"] = line[33:].strip()
                else:
                    # Continuation of previous field
                    if article[current_section]["implications"]:
                        article[current_section]["implications"] += " " + line
                    elif article[current_section]["findings"]:
                        article[current_section]["findings"] += " " + line
            elif current_section == "overall_assessment":
                if article[current_section]:
                    article[current_section] += " " + line
                else:
                    article[current_section] = line
            elif isinstance(article.get(current_section), list):
                # For list fields, add non-empty lines as items
                if line and not line.lower().startswith(("impact on synthetic users:", "relevance to synthetic users:", "potential solution:", "potential mitigation:", "comparison to traditional methods:", "rationale:", "justification:")):
                    article[current_section].append(line)
                elif line.lower().startswith(("impact on synthetic users:", "relevance to synthetic users:", "potential solution:", "potential mitigation:", "comparison to traditional methods:", "rationale:", "justification:")):
                    # Append as context to last item
                    if article[current_section]:
                        article[current_section][-1] += " | " + line

    return article

def create_jsonl(articles: list[dict], output_path: Path):
    """Create JSONL file for AI training."""
    with open(output_path, 'w', encoding='utf-8') as f:
        for article in articles:
            f.write(json.dumps(article, ensure_ascii=False) + '\n')
    print(f"Created JSONL: {output_path}")

def create_csv(articles: list[dict], output_path: Path):
    """Create flattened CSV for spreadsheet review."""
    # Define columns for flattened CSV
    columns = [
        "id", "title", "authors", "published", "research_question",
        "key_methodologies", "primary_findings",
        "relevance_to_synthetic_users", "supporting_evidence",
        "contradictory_evidence", "gaps_and_opportunities",
        "ethical_considerations", "practical_applications",
        "limitations_and_challenges", "future_research_directions",
        "demographic_mimicry_findings", "demographic_mimicry_implications",
        "overall_assessment", "relation_to_synthetic_users",
        "suggested_refinements"
    ]

    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()

        for article in articles:
            row = {
                "id": article["id"],
                "title": article["title"],
                "authors": article["authors"],
                "published": article["published"],
                "research_question": article["research_question"],
                "key_methodologies": " | ".join(article["key_methodologies"]),
                "primary_findings": " | ".join(article["primary_findings"]),
                "relevance_to_synthetic_users": " | ".join(article["relevance_to_synthetic_users"]),
                "supporting_evidence": " | ".join(article["supporting_evidence"]),
                "contradictory_evidence": " | ".join(article["contradictory_evidence"]),
                "gaps_and_opportunities": " | ".join(article["gaps_and_opportunities"]),
                "ethical_considerations": " | ".join(article["ethical_considerations"]),
                "practical_applications": " | ".join(article["practical_applications"]),
                "limitations_and_challenges": " | ".join(article["limitations_and_challenges"]),
                "future_research_directions": " | ".join(article["future_research_directions"]),
                "demographic_mimicry_findings": article["accuracy_of_demographic_mimicry"]["findings"],
                "demographic_mimicry_implications": article["accuracy_of_demographic_mimicry"]["implications"],
                "overall_assessment": article["overall_assessment"],
                "relation_to_synthetic_users": article["relation_to_synthetic_users"],
                "suggested_refinements": " | ".join(article["suggested_refinements"])
            }
            writer.writerow(row)

    print(f"Created CSV: {output_path}")

def create_training_dataset(articles: list[dict], output_path: Path):
    """Create training-ready JSONL with instruction/response pairs."""
    training_examples = []

    for article in articles:
        # Example 1: Research summary generation
        training_examples.append({
            "instruction": f"Summarize the research paper '{article['title']}' and its relevance to Synthetic Users in AI.",
            "response": f"Title: {article['title']}\nAuthors: {article['authors']}\nPublished: {article['published']}\n\nResearch Question: {article['research_question']}\n\nKey Findings:\n" + "\n".join(f"- {f}" for f in article['primary_findings'][:5]) + f"\n\nRelevance to Synthetic Users: {article['relation_to_synthetic_users']}\n\nThis research " + ("supports" if "support" in article['relation_to_synthetic_users'].lower() else "challenges" if "challeng" in article['relation_to_synthetic_users'].lower() else "provides insights for") + " the development of AI-based synthetic user methodologies.",
            "metadata": {
                "article_id": article['id'],
                "title": article['title'],
                "type": "research_summary"
            }
        })

        # Example 2: Methodology extraction
        if article['key_methodologies']:
            training_examples.append({
                "instruction": f"What research methodologies were used in the study '{article['title']}'?",
                "response": "The following methodologies were employed:\n" + "\n".join(f"- {m}" for m in article['key_methodologies']),
                "metadata": {
                    "article_id": article['id'],
                    "title": article['title'],
                    "type": "methodology_extraction"
                }
            })

        # Example 3: Ethical considerations
        if article['ethical_considerations']:
            training_examples.append({
                "instruction": f"What ethical considerations are raised in '{article['title']}' regarding AI and synthetic users?",
                "response": "Key ethical considerations include:\n" + "\n".join(f"- {e}" for e in article['ethical_considerations']),
                "metadata": {
                    "article_id": article['id'],
                    "title": article['title'],
                    "type": "ethics_analysis"
                }
            })

        # Example 4: Demographic mimicry accuracy
        if article['accuracy_of_demographic_mimicry']['findings']:
            training_examples.append({
                "instruction": f"How accurately can AI mimic different demographics according to '{article['title']}'?",
                "response": f"Findings: {article['accuracy_of_demographic_mimicry']['findings']}\n\nImplications: {article['accuracy_of_demographic_mimicry']['implications']}",
                "metadata": {
                    "article_id": article['id'],
                    "title": article['title'],
                    "type": "demographic_accuracy"
                }
            })

    with open(output_path, 'w', encoding='utf-8') as f:
        for example in training_examples:
            f.write(json.dumps(example, ensure_ascii=False) + '\n')

    print(f"Created training dataset: {output_path} ({len(training_examples)} examples)")

def main():
    base_dir = Path("/home/user/AIMS/data/synthetic-users-research")
    raw_file = base_dir / "raw_articles.txt"

    print("Reading raw articles...")
    with open(raw_file, 'r', encoding='utf-8') as f:
        raw_text = f.read()

    print("Parsing articles...")
    articles = parse_articles(raw_text)
    print(f"Parsed {len(articles)} articles")

    # Create outputs
    create_jsonl(articles, base_dir / "articles.jsonl")
    create_csv(articles, base_dir / "articles.csv")
    create_training_dataset(articles, base_dir / "training_dataset.jsonl")

    # Create metadata file
    metadata = {
        "name": "Synthetic Users Research Dataset",
        "description": "21 academic articles on LLMs, Synthetic Users, and AI persona generation",
        "version": "1.0.0",
        "created": "2026-02-06",
        "article_count": len(articles),
        "fields": [
            "id", "title", "authors", "published", "research_question",
            "key_methodologies", "primary_findings", "relevance_to_synthetic_users",
            "supporting_evidence", "contradictory_evidence", "gaps_and_opportunities",
            "ethical_considerations", "practical_applications", "limitations_and_challenges",
            "future_research_directions", "accuracy_of_demographic_mimicry",
            "overall_assessment", "relation_to_synthetic_users", "suggested_refinements"
        ],
        "formats": {
            "articles.jsonl": "Full structured data, one JSON object per line (best for AI training)",
            "articles.csv": "Flattened data for spreadsheet viewing (lists joined with ' | ')",
            "training_dataset.jsonl": "Instruction/response pairs for fine-tuning"
        },
        "usage_notes": [
            "JSONL preserves hierarchical structure and is recommended for LLM training",
            "CSV is suitable for human review and filtering in Excel/Google Sheets",
            "Training dataset provides ready-to-use instruction-response pairs"
        ]
    }

    with open(base_dir / "dataset_metadata.json", 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)

    print(f"\nCreated dataset_metadata.json")
    print(f"\nDataset creation complete!")
    print(f"Location: {base_dir}")

if __name__ == "__main__":
    main()
