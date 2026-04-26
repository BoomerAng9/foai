#!/usr/bin/env python3
"""Create a Feynman research ticket from a task packet."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from datetime import datetime, timezone

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("task_packet")
    parser.add_argument("--out-dir", default="research/tickets")
    args = parser.parse_args()

    packet = json.loads(Path(args.task_packet).read_text(encoding="utf-8"))
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    task_id = packet.get("task_id", "research_task")
    topic = packet.get("objective", "Research task")
    now = datetime.now(timezone.utc).isoformat()

    body = f"""# Feynman Research Ticket: {task_id}

Created: {now}

## Objective

{topic}

## Required output

- Cited research brief
- Source list
- Claims allowed
- Claims rejected
- Confidence level
- Follow-up questions

## Context

```json
{json.dumps(packet, indent=2)}
```

## Suggested command

```bash
feynman "{topic}"
```
"""

    out_path = out_dir / f"{task_id}.md"
    out_path.write_text(body, encoding="utf-8")
    print(out_path)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
