#!/usr/bin/env python3
"""
CFB Coaches Contact + Social Media Scrape
============================================
Scrapes coaching staff directories from each FBS university's
athletics site + ESPN coach profiles. Extracts:
- Names, titles, roles
- Email addresses (published on staff pages)
- Phone numbers (published)
- Twitter/X handles
- Instagram handles
- Other social media links
- University staff directory URLs

Run AFTER scrape-all-cfb.py (needs the team list).

Run: cd smelter-os/sqwaadrun && .venv/Scripts/python.exe scripts/scrape-cfb-coaches-contacts.py
"""

import asyncio
import json
import os
import re
import hashlib
from datetime import datetime, timezone
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))
from sqwaadrun.lil_scrapp_hawk import FullScrappHawkSquadrun

DATA_DIR = Path(__file__).parent.parent / 'data' / 'college-football'
COACHES_DIR = DATA_DIR / 'coaches-contacts'
LOG_FILE = DATA_DIR / 'coaches-scrape-log.txt'

def log(msg: str):
    ts = datetime.now().strftime('%H:%M:%S')
    line = f'[{ts}] {msg}'
    print(line)
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(line + '\n')

def save_result(source_name: str, result) -> dict | None:
    md = getattr(result, 'markdown', '')
    title = getattr(result, 'title', '')
    url = getattr(result, 'url', '')
    status = getattr(result, 'status_code', 0)
    links = getattr(result, 'links', [])
    if not md or status != 200:
        log(f'  SKIP [{status}] {source_name}')
        return None
    safe_name = re.sub(r'[^a-z0-9-]', '-', source_name.lower())[:80]
    md_path = COACHES_DIR / f'{safe_name}.md'
    md_path.write_text(
        f'# {title}\n\n> Source: {url}\n> Scraped: {datetime.now(timezone.utc).isoformat()}\n\n{md}',
        encoding='utf-8',
    )
    meta = {
        'title': title, 'url': url, 'status_code': status,
        'chars': len(md), 'links_count': len(links),
        'scraped_at': datetime.now(timezone.utc).isoformat(),
        'content_hash': hashlib.sha256(md.encode()).hexdigest()[:16],
        'file': str(md_path),
    }
    # Extract social media handles from the content
    social = extract_social_handles(md, links)
    if social:
        meta['social_media'] = social
    # Extract emails
    emails = extract_emails(md)
    if emails:
        meta['emails'] = emails
    # Extract phone numbers
    phones = extract_phones(md)
    if phones:
        meta['phones'] = phones

    meta_path = COACHES_DIR / f'{safe_name}.meta.json'
    meta_path.write_text(json.dumps(meta, indent=2))
    log(f'  SAVED [{status}] {source_name} -- {len(md):,} chars, {len(social)} social, {len(emails)} emails')
    return meta

def extract_social_handles(text: str, links: list) -> list[dict]:
    """Pull Twitter/X, Instagram, Facebook, LinkedIn handles from text + links."""
    handles = []
    # Twitter/X patterns
    for m in re.finditer(r'(?:twitter\.com|x\.com)/([A-Za-z0-9_]{1,30})', text):
        handles.append({'platform': 'twitter', 'handle': f'@{m.group(1)}', 'url': f'https://x.com/{m.group(1)}'})
    # Instagram
    for m in re.finditer(r'instagram\.com/([A-Za-z0-9_.]{1,30})', text):
        handles.append({'platform': 'instagram', 'handle': f'@{m.group(1)}', 'url': f'https://instagram.com/{m.group(1)}'})
    # Facebook
    for m in re.finditer(r'facebook\.com/([A-Za-z0-9.]{1,60})', text):
        handles.append({'platform': 'facebook', 'handle': m.group(1), 'url': f'https://facebook.com/{m.group(1)}'})
    # From link URLs
    for link in links:
        url = link if isinstance(link, str) else getattr(link, 'url', str(link))
        if 'twitter.com' in url or 'x.com/' in url:
            m = re.search(r'(?:twitter\.com|x\.com)/([A-Za-z0-9_]+)', url)
            if m:
                handles.append({'platform': 'twitter', 'handle': f'@{m.group(1)}', 'url': url})
        elif 'instagram.com' in url:
            m = re.search(r'instagram\.com/([A-Za-z0-9_.]+)', url)
            if m:
                handles.append({'platform': 'instagram', 'handle': f'@{m.group(1)}', 'url': url})
    # Dedupe
    seen = set()
    deduped = []
    for h in handles:
        key = f'{h["platform"]}:{h["handle"]}'
        if key not in seen:
            seen.add(key)
            deduped.append(h)
    return deduped

def extract_emails(text: str) -> list[str]:
    """Pull email addresses from text."""
    emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)
    return list(set(emails))

def extract_phones(text: str) -> list[str]:
    """Pull US phone numbers from text."""
    phones = re.findall(r'\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}', text)
    return list(set(phones))


# University athletics staff directory URLs
# These are the coaching staff pages for major FBS programs
# Format varies by school — most use {school}sports.com or go{mascot}.com
COACHING_STAFF_URLS = [
    ('Alabama', 'https://rolltide.com/sports/football/coaches'),
    ('Georgia', 'https://georgiadogs.com/sports/football/coaches'),
    ('Michigan', 'https://mgoblue.com/sports/football/coaches'),
    ('Ohio State', 'https://ohiostatebuckeyes.com/sports/football/coaches'),
    ('Clemson', 'https://clemsontigers.com/sports/football/coaches'),
    ('Texas', 'https://texassports.com/sports/football/coaches'),
    ('Oregon', 'https://goducks.com/sports/football/coaches'),
    ('Penn State', 'https://gopsusports.com/sports/football/coaches'),
    ('Florida State', 'https://seminoles.com/sports/football/coaches'),
    ('USC', 'https://usctrojans.com/sports/football/coaches'),
    ('LSU', 'https://lsusports.net/sports/football/coaches'),
    ('Notre Dame', 'https://und.com/sports/football/coaches'),
    ('Florida', 'https://floridagators.com/sports/football/coaches'),
    ('Tennessee', 'https://utsports.com/sports/football/coaches'),
    ('Oklahoma', 'https://soonersports.com/sports/football/coaches'),
    ('Auburn', 'https://auburntigers.com/sports/football/coaches'),
    ('Texas A&M', 'https://12thman.com/sports/football/coaches'),
    ('Miami', 'https://miamihurricanes.com/sports/football/coaches'),
    ('Wisconsin', 'https://uwbadgers.com/sports/football/coaches'),
    ('Iowa', 'https://hawkeyesports.com/sports/football/coaches'),
    ('Michigan State', 'https://msuspartans.com/sports/football/coaches'),
    ('North Carolina', 'https://goheels.com/sports/football/coaches'),
    ('UCLA', 'https://uclabruins.com/sports/football/coaches'),
    ('Colorado', 'https://cubuffs.com/sports/football/coaches'),
    ('Arkansas', 'https://arkansasrazorbacks.com/sports/football/coaches'),
    ('Kentucky', 'https://ukathletics.com/sports/football/coaches'),
    ('Ole Miss', 'https://olemisssports.com/sports/football/coaches'),
    ('Mississippi State', 'https://hailstate.com/sports/football/coaches'),
    ('South Carolina', 'https://gamecocksonline.com/sports/football/coaches'),
    ('Baylor', 'https://baylorbears.com/sports/football/coaches'),
    ('TCU', 'https://gofrogs.com/sports/football/coaches'),
    ('Kansas State', 'https://kstatesports.com/sports/football/coaches'),
    ('Oklahoma State', 'https://okstate.com/sports/football/coaches'),
    ('West Virginia', 'https://wvusports.com/sports/football/coaches'),
    ('Virginia Tech', 'https://hokiesports.com/sports/football/coaches'),
    ('Duke', 'https://goduke.com/sports/football/coaches'),
    ('Syracuse', 'https://cuse.com/sports/football/coaches'),
    ('Pittsburgh', 'https://pittsburghpanthers.com/sports/football/coaches'),
    ('NC State', 'https://gopack.com/sports/football/coaches'),
    ('Wake Forest', 'https://godeacs.com/sports/football/coaches'),
    ('Louisville', 'https://gocards.com/sports/football/coaches'),
    ('Virginia', 'https://virginiasports.com/sports/football/coaches'),
    ('Stanford', 'https://gostanford.com/sports/football/coaches'),
    ('California', 'https://calbears.com/sports/football/coaches'),
    ('Washington', 'https://gohuskies.com/sports/football/coaches'),
    ('Arizona State', 'https://thesundevils.com/sports/football/coaches'),
    ('Arizona', 'https://arizonawildcats.com/sports/football/coaches'),
    ('Utah', 'https://utahutes.com/sports/football/coaches'),
    ('BYU', 'https://byucougars.com/sports/football/coaches'),
    ('Boise State', 'https://broncosports.com/sports/football/coaches'),
]

# ESPN coach profile URLs (head coaches from team pages)
ESPN_COACH_URLS = [
    ('ESPN-All-Coaches-Salaries', 'https://sports.usatoday.com/ncaa/salaries/'),
    ('ESPN-CFB-Rankings', 'https://www.espn.com/college-football/rankings'),
]


async def main():
    COACHES_DIR.mkdir(parents=True, exist_ok=True)
    log(f'=== COACHES CONTACT + SOCIAL MEDIA SCRAPE ===')
    log(f'Targets: {len(COACHING_STAFF_URLS)} university staff pages + {len(ESPN_COACH_URLS)} directories')

    squad = FullScrappHawkSquadrun()
    await squad.startup()
    all_meta = []

    # ── Phase 1: University coaching staff pages ──
    log(f'\n=== PHASE 1: UNIVERSITY STAFF DIRECTORIES ({len(COACHING_STAFF_URLS)} schools) ===')
    batch_size = 5
    for i in range(0, len(COACHING_STAFF_URLS), batch_size):
        batch = COACHING_STAFF_URLS[i:i + batch_size]
        urls = [url for _, url in batch]
        names = [name for name, _ in batch]
        log(f'  Batch {i // batch_size + 1}: {", ".join(names)}')
        results = await squad.batch_scrape(urls)
        for (school, _), result in zip(batch, results):
            m = save_result(f'{school}-coaching-staff', result)
            if m:
                all_meta.append(m)

    # ── Phase 2: Coach salary/directory pages ──
    log('\n=== PHASE 2: COACH DIRECTORIES ===')
    for name, url in ESPN_COACH_URLS:
        r = await squad.scrape(url)
        m = save_result(name, r)
        if m: all_meta.append(m)

    # ── Phase 3: Search for head coach Twitter/social handles ──
    # Use web search to find social profiles for top 25 coaches
    log('\n=== PHASE 3: SOCIAL MEDIA SEARCH (Top 25 coaches) ===')
    top_coaches = [
        'Kirby Smart Georgia', 'Ryan Day Ohio State', 'Dabo Swinney Clemson',
        'Steve Sarkisian Texas', 'Dan Lanning Oregon', 'James Franklin Penn State',
        'Nick Saban Alabama', 'Lincoln Riley USC', 'Mike Norvell Florida State',
        'Brian Kelly LSU', 'Marcus Freeman Notre Dame', 'Billy Napier Florida',
        'Josh Heupel Tennessee', 'Brent Venables Oklahoma', 'Hugh Freeze Auburn',
        'Jimbo Fisher Texas A&M', 'Mario Cristobal Miami', 'Luke Fickell Wisconsin',
        'Kirk Ferentz Iowa', 'Jonathan Smith Michigan State',
        'Mack Brown North Carolina', 'Deion Sanders Colorado',
        'Sam Pittman Arkansas', 'Lane Kiffin Ole Miss', 'Mike Gundy Oklahoma State',
    ]
    for coach_query in top_coaches:
        search_url = f'https://www.google.com/search?q={coach_query.replace(" ", "+")}+football+coach+twitter+instagram+contact'
        r = await squad.scrape(search_url)
        m = save_result(f'search-{coach_query.replace(" ", "-").lower()}', r)
        if m: all_meta.append(m)

    await squad.shutdown()

    # ── Aggregate social media handles into one master file ──
    log('\n=== AGGREGATING SOCIAL MEDIA HANDLES ===')
    all_social = []
    all_emails = []
    all_phones = []
    for m in all_meta:
        if 'social_media' in m:
            for s in m['social_media']:
                s['source_file'] = m['file']
                all_social.append(s)
        if 'emails' in m:
            for e in m['emails']:
                all_emails.append({'email': e, 'source_file': m['file']})
        if 'phones' in m:
            for p in m['phones']:
                all_phones.append({'phone': p, 'source_file': m['file']})

    contacts_summary = {
        'scraped_at': datetime.now(timezone.utc).isoformat(),
        'total_files': len(all_meta),
        'total_social_handles': len(all_social),
        'total_emails': len(all_emails),
        'total_phones': len(all_phones),
        'social_media': all_social,
        'emails': all_emails,
        'phones': all_phones,
    }
    summary_path = COACHES_DIR / 'contacts-summary.json'
    summary_path.write_text(json.dumps(contacts_summary, indent=2))

    manifest = {
        'scraped_at': datetime.now(timezone.utc).isoformat(),
        'total_files': len(all_meta),
        'total_chars': sum(m['chars'] for m in all_meta),
        'social_handles_found': len(all_social),
        'emails_found': len(all_emails),
        'phones_found': len(all_phones),
        'files': all_meta,
    }
    manifest_path = COACHES_DIR / 'coaches-manifest.json'
    manifest_path.write_text(json.dumps(manifest, indent=2))

    log(f'\n{"=" * 60}')
    log(f'COMPLETE: {len(all_meta)} files, {sum(m["chars"] for m in all_meta):,} chars')
    log(f'Social handles found: {len(all_social)}')
    log(f'Emails found: {len(all_emails)}')
    log(f'Phones found: {len(all_phones)}')
    log(f'Summary: {summary_path}')
    log(f'{"=" * 60}')


if __name__ == '__main__':
    asyncio.run(main())
