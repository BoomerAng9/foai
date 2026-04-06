"""Unit tests for the TRCC parser pipeline."""
import pytest
from sqwaadrun.lil_scrapp_hawk import ScrapeResult
from sqwaadrun.trcc_pipeline import (
    parse_athlete_from_result,
    parse_nil_signals,
    _normalize_count,
)


def make_result(**overrides) -> ScrapeResult:
    defaults = dict(
        url='https://example-recruiting.com/2026/test',
        status_code=200,
        title='',
        meta_description='',
        markdown='',
        clean_text='',
        raw_html='',
        links=[],
        images=[],
        structured_data={},
        scraped_at='2026-04-06T18:00:00+00:00',
        elapsed_ms=120,
        error=None,
    )
    defaults.update(overrides)
    return ScrapeResult(**defaults)


def test_parse_athlete_from_json_ld_person():
    result = make_result(
        title='Cooper Flagg | Duke',
        structured_data={
            '@context': 'https://schema.org',
            '@type': 'Person',
            'name': 'Cooper Flagg',
            'description': 'Star recruit',
            'height': "6'8\"",
            'weight': '205 lbs',
            'affiliation': {'@type': 'CollegeOrUniversity', 'name': 'Duke'},
        },
    )
    athlete = parse_athlete_from_result(result)
    assert athlete is not None
    assert athlete.name == 'Cooper Flagg'
    assert athlete.school == 'Duke'
    assert athlete.height == "6'8\""
    assert athlete.weight == '205 lbs'


def test_parse_athlete_falls_back_to_title_when_no_json_ld():
    result = make_result(title='Jeremiyah Love | Notre Dame | RB - 247Sports')
    athlete = parse_athlete_from_result(result)
    assert athlete is not None
    assert athlete.name == 'Jeremiyah Love'
    assert athlete.school == 'Notre Dame'


def test_parse_athlete_extracts_star_rating_from_text():
    result = make_result(
        title='Test Athlete',
        clean_text='Star rating: 5★ Composite: 99.5',
    )
    athlete = parse_athlete_from_result(result)
    assert athlete is not None
    assert athlete.star_rating == 5.0
    assert athlete.composite_rating == 99.5


def test_parse_athlete_extracts_social_handles():
    result = make_result(
        title='Test Athlete',
        markdown='Find him on twitter.com/testhandle and instagram.com/test.handle',
    )
    athlete = parse_athlete_from_result(result)
    assert athlete is not None
    assert athlete.twitter_handle == 'testhandle'
    assert athlete.instagram_handle == 'test.handle'


def test_parse_athlete_returns_none_when_no_name():
    result = make_result(title='', structured_data={})
    athlete = parse_athlete_from_result(result)
    assert athlete is None


def test_parse_nil_signals_extracts_all_platforms():
    result = make_result(
        clean_text='1.2M Twitter followers 850K Instagram followers 2.3M TikTok followers NIL valuation: $3.4M',
    )
    signals = parse_nil_signals(result, 'Test Athlete', 'Test School')
    metrics = {(s.platform, s.metric): s.value_numeric for s in signals}
    assert metrics[('twitter', 'followers')] == 1_200_000.0
    assert metrics[('instagram', 'followers')] == 850_000.0
    assert metrics[('tiktok', 'followers')] == 2_300_000.0
    # Valuation captured under the source domain
    valuation_signals = [s for s in signals if s.metric == 'valuation']
    assert len(valuation_signals) == 1
    assert valuation_signals[0].value_numeric == 3_400_000.0


def test_normalize_count_handles_K_M_B():
    assert _normalize_count('1.2M') == 1_200_000.0
    assert _normalize_count('850K') == 850_000.0
    assert _normalize_count('2.3B') == 2_300_000_000.0
    assert _normalize_count('6,789') == 6789.0
    assert _normalize_count('not a number') is None


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
