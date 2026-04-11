# II-Commons — Vendored Source

| Field | Value |
|-------|-------|
| **Repository** | https://github.com/Intelligent-Internet/II-Commons |
| **Commit** | 421ee7f29db0468b7507dc2251a84a0b404b1698 |
| **Date** | 2025-07-22 |
| **Branch** | main |
| **License** | See LICENSE in this directory |
| **Tech Stack** | Python 3.x, sentence-transformers, NLTK, psycopg, GCS, boto3 |
| **Vendored** | 2026-04-10 (Wave 4) |

## What was removed during vendoring

- `.git/` directory (not a submodule)
- `meta/` (large dataset metadata files)
- `models/` (model download scripts)
- `II-Commons.png` (repo banner image)

## Purpose in FOAI

II-Commons provides the file preprocessing and text chunking layer.
The `file_forge.py` wrapper in this directory adapts it to support
PDF, DOCX, TXT, MD, and CSV ingestion with structured document output
and configurable chunking for the embedding/search pipeline.
