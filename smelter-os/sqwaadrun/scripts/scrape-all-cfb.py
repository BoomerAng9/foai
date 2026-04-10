#!/usr/bin/env python3
"""
Full FBS College Football Scrape
==================================
Scrapes ALL ~133 FBS team rosters, stats, coaches, recruiting,
headlines, and standings. Saves everything to data/college-football/
with metadata JSON per file and a master manifest.

Run: cd smelter-os/sqwaadrun && .venv/Scripts/python.exe scripts/scrape-all-cfb.py

Per Rish 2026-04-09: this data feeds into Per|Form's player index.
"""

import asyncio
import json
import os
import re
import hashlib
from datetime import datetime, timezone
from pathlib import Path

# Add parent to path so sqwaadrun package imports work
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqwaadrun.lil_scrapp_hawk import FullScrappHawkSquadrun

DATA_DIR = Path(__file__).parent.parent / 'data' / 'college-football'
LOG_FILE = DATA_DIR / 'scrape-log.txt'

def log(msg: str):
    ts = datetime.now().strftime('%H:%M:%S')
    line = f'[{ts}] {msg}'
    print(line)
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(line + '\n')

def save_result(category: str, source_name: str, result) -> dict | None:
    md = getattr(result, 'markdown', '')
    title = getattr(result, 'title', '')
    url = getattr(result, 'url', '')
    status = getattr(result, 'status_code', 0)
    links = getattr(result, 'links', [])

    if not md or status != 200:
        log(f'  SKIP [{status}] {source_name}')
        return None

    cat_dir = DATA_DIR / category
    cat_dir.mkdir(parents=True, exist_ok=True)

    safe_name = re.sub(r'[^a-z0-9-]', '-', source_name.lower())[:80]
    md_path = cat_dir / f'{safe_name}.md'
    md_path.write_text(
        f'# {title}\n\n> Source: {url}\n'
        f'> Scraped: {datetime.now(timezone.utc).isoformat()}\n\n{md}',
        encoding='utf-8',
    )

    meta = {
        'title': title,
        'url': url,
        'status_code': status,
        'chars': len(md),
        'links_count': len(links),
        'scraped_at': datetime.now(timezone.utc).isoformat(),
        'content_hash': hashlib.sha256(md.encode()).hexdigest()[:16],
        'category': category,
        'file': str(md_path),
    }
    meta_path = cat_dir / f'{safe_name}.meta.json'
    meta_path.write_text(json.dumps(meta, indent=2))

    log(f'  SAVED [{status}] {source_name} -- {len(md):,} chars')
    return meta


# ESPN FBS team IDs — all 133 FBS programs
# Sourced from ESPN's team index
ESPN_FBS_TEAMS = [
    ('Air Force', '2005'), ('Akron', '2006'), ('Alabama', '333'),
    ('Appalachian State', '2026'), ('Arizona', '12'), ('Arizona State', '9'),
    ('Arkansas', '8'), ('Arkansas State', '2032'), ('Army', '349'),
    ('Auburn', '2'), ('Ball State', '2050'), ('Baylor', '239'),
    ('Boise State', '68'), ('Boston College', '103'), ('Bowling Green', '189'),
    ('Buffalo', '2084'), ('BYU', '252'), ('California', '25'),
    ('Central Michigan', '2117'), ('Charlotte', '2429'),
    ('Cincinnati', '2132'), ('Clemson', '228'), ('Coastal Carolina', '324'),
    ('Colorado', '38'), ('Colorado State', '36'), ('Connecticut', '41'),
    ('Duke', '150'), ('East Carolina', '151'), ('Eastern Michigan', '2199'),
    ('FIU', '2229'), ('Florida', '57'), ('Florida Atlantic', '2226'),
    ('Florida State', '52'), ('Fresno State', '278'), ('Georgia', '61'),
    ('Georgia Southern', '290'), ('Georgia State', '2247'),
    ('Georgia Tech', '59'), ('Hawaii', '62'), ('Houston', '248'),
    ('Illinois', '356'), ('Indiana', '84'), ('Iowa', '2294'),
    ('Iowa State', '66'), ('Jacksonville State', '55'),
    ('James Madison', '256'), ('Kansas', '2305'), ('Kansas State', '2306'),
    ('Kent State', '2309'), ('Kentucky', '96'), ('Liberty', '2335'),
    ('Louisiana', '309'), ('Louisiana Monroe', '2433'),
    ('Louisiana Tech', '2348'), ('Louisville', '97'), ('LSU', '99'),
    ('Marshall', '276'), ('Maryland', '120'), ('Memphis', '235'),
    ('Miami', '2390'), ('Miami (OH)', '193'), ('Michigan', '130'),
    ('Michigan State', '127'), ('Middle Tennessee', '2393'),
    ('Minnesota', '135'), ('Mississippi State', '344'), ('Missouri', '142'),
    ('Navy', '2426'), ('NC State', '152'), ('Nebraska', '158'),
    ('Nevada', '2440'), ('New Mexico', '167'), ('New Mexico State', '166'),
    ('North Carolina', '153'), ('North Texas', '249'),
    ('Northern Illinois', '2459'), ('Northwestern', '77'),
    ('Notre Dame', '87'), ('Ohio', '195'), ('Ohio State', '194'),
    ('Oklahoma', '201'), ('Oklahoma State', '197'), ('Old Dominion', '295'),
    ('Ole Miss', '145'), ('Oregon', '2483'), ('Oregon State', '204'),
    ('Penn State', '213'), ('Pittsburgh', '221'), ('Purdue', '2509'),
    ('Rice', '242'), ('Rutgers', '164'), ('Sam Houston', '2534'),
    ('San Diego State', '21'), ('San Jose State', '23'),
    ('SMU', '2567'), ('South Alabama', '6'), ('South Carolina', '2579'),
    ('South Florida', '58'), ('Southern Miss', '2572'),
    ('Stanford', '24'), ('Syracuse', '183'), ('TCU', '2628'),
    ('Temple', '218'), ('Tennessee', '2633'), ('Texas', '251'),
    ('Texas A&M', '245'), ('Texas State', '326'), ('Texas Tech', '2641'),
    ('Toledo', '2649'), ('Troy', '2653'), ('Tulane', '2655'),
    ('Tulsa', '202'), ('UAB', '5'), ('UCF', '2116'), ('UCLA', '26'),
    ('UNLV', '2439'), ('USC', '30'), ('Utah', '254'),
    ('Utah State', '328'), ('UTEP', '2638'), ('UTSA', '2636'),
    ('Vanderbilt', '238'), ('Virginia', '258'), ('Virginia Tech', '259'),
    ('Wake Forest', '154'), ('Washington', '264'),
    ('Washington State', '265'), ('West Virginia', '277'),
    ('Western Kentucky', '98'), ('Western Michigan', '2711'),
    ('Wisconsin', '275'), ('Wyoming', '2751'),
]


async def main():
    (DATA_DIR / 'rosters-full').mkdir(parents=True, exist_ok=True)
    (DATA_DIR / 'team-stats').mkdir(parents=True, exist_ok=True)

    log(f'=== FULL CFB SCRAPE START — {len(ESPN_FBS_TEAMS)} teams ===')

    squad = FullScrappHawkSquadrun()
    await squad.startup()

    all_meta = []

    # ── Phase 1: ALL team rosters ──
    log(f'\n=== PHASE 1: ROSTERS ({len(ESPN_FBS_TEAMS)} teams) ===')
    batch_size = 10
    for i in range(0, len(ESPN_FBS_TEAMS), batch_size):
        batch = ESPN_FBS_TEAMS[i:i + batch_size]
        urls = [
            f'https://www.espn.com/college-football/team/roster/_/id/{tid}'
            for _, tid in batch
        ]
        log(f'  Batch {i // batch_size + 1}: {", ".join(n for n, _ in batch)}')
        results = await squad.batch_scrape(urls)
        for (team_name, _), result in zip(batch, results):
            m = save_result('rosters-full', f'ESPN-{team_name}-roster', result)
            if m:
                all_meta.append(m)

    # ── Phase 2: ALL team stats pages ──
    log(f'\n=== PHASE 2: TEAM STATS ({len(ESPN_FBS_TEAMS)} teams) ===')
    for i in range(0, len(ESPN_FBS_TEAMS), batch_size):
        batch = ESPN_FBS_TEAMS[i:i + batch_size]
        urls = [
            f'https://www.espn.com/college-football/team/stats/_/id/{tid}'
            for _, tid in batch
        ]
        log(f'  Batch {i // batch_size + 1}: {", ".join(n for n, _ in batch)}')
        results = await squad.batch_scrape(urls)
        for (team_name, _), result in zip(batch, results):
            m = save_result('team-stats', f'ESPN-{team_name}-stats', result)
            if m:
                all_meta.append(m)

    # ── Phase 3: Conference standings (refresh) ──
    log('\n=== PHASE 3: STANDINGS ===')
    for name, url in [
        ('ESPN-Full-Standings', 'https://www.espn.com/college-football/standings'),
        ('NCAA-Full-Standings', 'https://www.ncaa.com/standings/football/fbs'),
    ]:
        r = await squad.scrape(url)
        m = save_result('standings', name, r)
        if m: all_meta.append(m)

    # ── Phase 4: Stat leaders ──
    log('\n=== PHASE 4: STAT LEADERS ===')
    stat_categories = [
        ('passing', 'https://www.espn.com/college-football/stats/player/_/stat/passing'),
        ('rushing', 'https://www.espn.com/college-football/stats/player/_/stat/rushing'),
        ('receiving', 'https://www.espn.com/college-football/stats/player/_/stat/receiving'),
        ('defense', 'https://www.espn.com/college-football/stats/player/_/stat/defense'),
        ('kicking', 'https://www.espn.com/college-football/stats/player/_/stat/kicking'),
        ('returning', 'https://www.espn.com/college-football/stats/player/_/stat/returning'),
    ]
    for cat_name, url in stat_categories:
        r = await squad.scrape(url)
        m = save_result('stats', f'ESPN-{cat_name}-leaders', r)
        if m: all_meta.append(m)

    # ── Phase 5: Recruiting ──
    log('\n=== PHASE 5: RECRUITING ===')
    for year in ['2025', '2026', '2024']:
        r = await squad.scrape(f'https://247sports.com/season/{year}-football/compositeteamrankings/')
        m = save_result('recruiting', f'247-{year}-team-rankings', r)
        if m: all_meta.append(m)

    # ── Phase 6: Coaches ──
    log('\n=== PHASE 6: COACHES ===')
    r = await squad.scrape('https://sports.usatoday.com/ncaa/salaries/')
    m = save_result('coaches', 'USA-Today-all-coaches-salaries', r)
    if m: all_meta.append(m)

    # ── Phase 7: Headlines ──
    log('\n=== PHASE 7: HEADLINES ===')
    for name, url in [
        ('Athletic-CFB-Headlines', 'https://www.theathletic.com/college-football/'),
        ('ESPN-CFB-Headlines', 'https://www.espn.com/college-football/'),
    ]:
        r = await squad.scrape(url)
        m = save_result('headlines', name, r)
        if m: all_meta.append(m)

    await squad.shutdown()

    # ── Write master manifest ──
    manifest = {
        'scraped_at': datetime.now(timezone.utc).isoformat(),
        'total_files': len(all_meta),
        'total_chars': sum(m['chars'] for m in all_meta),
        'categories': {},
        'teams_scraped': len([m for m in all_meta if m['category'] == 'rosters-full']),
        'files': all_meta,
    }
    for m in all_meta:
        cat = m['category']
        manifest['categories'][cat] = manifest['categories'].get(cat, 0) + 1

    manifest_path = DATA_DIR / 'full-manifest.json'
    manifest_path.write_text(json.dumps(manifest, indent=2))

    log(f'\n{"=" * 60}')
    log(f'COMPLETE: {len(all_meta)} files, {sum(m["chars"] for m in all_meta):,} chars')
    log(f'Teams with rosters: {manifest["teams_scraped"]}')
    log(f'Categories: {json.dumps(manifest["categories"])}')
    log(f'Manifest: {manifest_path}')
    log(f'{"=" * 60}')


if __name__ == '__main__':
    asyncio.run(main())
