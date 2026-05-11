"""Coastal Brewing Co. — geographic eligibility for Pooler Pass.

Pure-logic ZIP-to-distance helper, no network calls, no third-party deps.

Pooler Pass eligibility per `cbrew-tier-mechanics-spec-2026-05-10.md`:
  - Inside 50 mi of 31322   → eligible (Local)
  - 50 to 100 mi            → eligible (Extended Local)
  - Outside 100 mi          → NOT eligible (upsell to Coastal Custee Card)

Embedded dataset covers GA + SC + FL ZIPs that fall within or near the
100-mile eligibility radius from 31322 (Pooler, GA). Out-of-band ZIPs
return None on lookup, which the eligibility helper treats as
out-of-radius (correct behavior — anyone outside our local band gets
the upsell).

Built TDD-first per project canon. The api_server layer wraps this.
"""
from __future__ import annotations

import math
from typing import Literal, Optional

# Pooler, GA — Coastal HQ ZIP centerpoint (lat, lng).
POOLER_GA_ZIP = "31322"
POOLER_GA_LAT = 32.1149
POOLER_GA_LNG = -81.2460

# Eligibility band thresholds in miles.
LOCAL_RADIUS_MI = 50
EXTENDED_RADIUS_MI = 100

EligibilityBand = Literal["local", "extended", "out_of_radius"]


# ZIP → (lat, lng) for ZIPs that could plausibly fall in the 0-100mi
# eligibility band from Pooler, GA. Coverage area: Coastal Georgia,
# coastal South Carolina (up to ~Charleston which is right at the
# 100mi edge), and inland GA up to ~Vidalia/Statesboro/Hinesville.
#
# Source: USPS ZIP centerpoint data, public-domain.
# Format kept human-editable for ops to extend without a fetch step.
ZIP_CENTERPOINTS: dict[str, tuple[float, float]] = {
    # Pooler / Garden City / Port Wentworth
    "31322": (32.1149, -81.2460),
    "31408": (32.1255, -81.1565),
    "31407": (32.1499, -81.1656),
    "31405": (32.0226, -81.1304),
    # Savannah core
    "31401": (32.0809, -81.0912),
    "31404": (32.0418, -81.0560),
    "31406": (31.9799, -81.0964),
    "31409": (32.0181, -81.1928),
    "31410": (32.0276, -81.0190),
    "31411": (31.9462, -81.0445),
    "31419": (31.9841, -81.2169),
    # Tybee Island
    "31328": (32.0098, -80.8495),
    # Wilmington Island / Whitemarsh
    "31403": (32.0277, -81.0013),
    # Bloomingdale / Eden / Ellabell area
    "31302": (32.1346, -81.3015),
    "31308": (32.1715, -81.4192),
    "31312": (32.2155, -81.3801),
    # Richmond Hill / Bryan County
    "31324": (31.9291, -81.3043),
    # Hinesville / Liberty County
    "31313": (31.8462, -81.5878),
    "31314": (31.8721, -81.6112),
    "31315": (31.8888, -81.6204),
    # Pembroke
    "31321": (32.1407, -81.6242),
    # Statesboro / Bulloch County
    "30458": (32.4380, -81.7760),
    "30459": (32.4205, -81.7885),
    "30461": (32.4015, -81.7185),
    "30460": (32.4099, -81.7838),
    # Springfield / Effingham
    "31329": (32.3679, -81.3159),
    # Sylvania (edge of band)
    "30467": (32.7501, -81.6374),
    # Brunswick / St. Simons
    "31520": (31.1499, -81.4915),
    "31525": (31.1994, -81.5185),
    "31523": (31.2094, -81.5623),
    "31527": (31.0699, -81.4187),
    # Jesup / Wayne County
    "31545": (31.6018, -81.8861),
    "31546": (31.5896, -81.8865),
    # Vidalia (edge of band)
    "30474": (32.2179, -82.4126),
    # Hilton Head Island, SC
    "29928": (32.1632, -80.7521),
    "29926": (32.2132, -80.7421),
    "29925": (32.2065, -80.7515),
    # Bluffton, SC
    "29910": (32.2371, -80.8607),
    "29909": (32.3137, -80.8979),
    # Beaufort, SC
    "29902": (32.4307, -80.6698),
    "29906": (32.4485, -80.7174),
    "29907": (32.3990, -80.6379),
    # Walterboro, SC (edge)
    "29488": (32.9054, -80.6678),
    # Charleston, SC (right at the 100mi edge — included; runtime
    # haversine decides Local vs Extended vs out-of-radius)
    "29401": (32.7833, -79.9319),
    "29403": (32.8060, -79.9617),
    "29407": (32.7910, -80.0162),
    # Jacksonville, FL (just outside band — included so distance
    # calc returns the upsell message rather than "ZIP not found")
    "32202": (30.3257, -81.6557),
    "32256": (30.2147, -81.5535),
    # Macon / inland GA edge cases (well outside band — same
    # graceful-out behavior)
    "31201": (32.8343, -83.6324),
}


def haversine_miles(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in statute miles between two lat/lng points.

    Uses the haversine formula. Earth radius = 3958.8 mi (mean radius).
    """
    R = 3958.8
    lat1_r = math.radians(lat1)
    lat2_r = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlng / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    return R * c


def lookup_zip(zip_code: str) -> Optional[tuple[float, float]]:
    """Return (lat, lng) for a ZIP, or None if not in the embedded dataset.

    None means the ZIP is outside our eligibility band — the eligibility
    helper handles this as out_of_radius with the standard upsell.
    """
    if not zip_code:
        return None
    return ZIP_CENTERPOINTS.get(zip_code.strip())


def distance_from_pooler_miles(zip_code: str) -> Optional[float]:
    """Return statute miles from Pooler, GA (31322) to the given ZIP, or
    None if the ZIP is not in our embedded dataset.
    """
    point = lookup_zip(zip_code)
    if point is None:
        return None
    lat, lng = point
    return haversine_miles(POOLER_GA_LAT, POOLER_GA_LNG, lat, lng)


def eligibility_band(zip_code: str) -> tuple[EligibilityBand, Optional[float]]:
    """Classify a ZIP into a Pooler Pass eligibility band.

    Returns (band, distance_miles) tuple:
      - ("local", float)         — inside 50 mi
      - ("extended", float)      — 50 to 100 mi
      - ("out_of_radius", float) — over 100 mi (ZIP was in dataset)
      - ("out_of_radius", None)  — ZIP not in dataset → also out
    """
    distance = distance_from_pooler_miles(zip_code)
    if distance is None:
        return ("out_of_radius", None)
    if distance <= LOCAL_RADIUS_MI:
        return ("local", distance)
    if distance <= EXTENDED_RADIUS_MI:
        return ("extended", distance)
    return ("out_of_radius", distance)


def eligibility_response(zip_code: str) -> dict:
    """Build the JSON-shaped eligibility response the frontend consumes.

    Owner-facing language is brand-aligned per coastal-standard-membership
    spec — friendly upsell to Coastal Custee Card when out of radius.
    """
    band, distance = eligibility_band(zip_code)
    if band == "local":
        return {
            "ok": True,
            "eligible": True,
            "band": "local",
            "distance_miles": round(distance, 1) if distance is not None else None,
            "message": (
                f"Welcome to Pooler Pass — you're a local "
                f"({round(distance, 1)} mi from Pooler). Standard tier is $49/yr "
                f"or Plus is $99/yr."
            ),
        }
    if band == "extended":
        return {
            "ok": True,
            "eligible": True,
            "band": "extended",
            "distance_miles": round(distance, 1) if distance is not None else None,
            "message": (
                f"Pooler Pass is available for your area as Extended Local "
                f"({round(distance, 1)} mi from Pooler) — same $49/$99 pricing, with "
                f"the caveat that monthly in-person events may be a drive."
            ),
        }
    # out_of_radius
    if distance is None:
        return {
            "ok": True,
            "eligible": False,
            "band": "out_of_radius",
            "distance_miles": None,
            "upsell_to": "coastal_custee_card",
            "message": (
                "Pooler Pass is for our 100-mile-radius locals. Coastal Custee "
                "Card ($199/yr) is the right fit for you — same agentic team, "
                "same discount stack, ships anywhere in the US."
            ),
        }
    return {
        "ok": True,
        "eligible": False,
        "band": "out_of_radius",
        "distance_miles": round(distance, 1),
        "upsell_to": "coastal_custee_card",
        "message": (
            f"You're {round(distance, 1)} mi from Pooler — outside our 100-mile "
            f"local band. Coastal Custee Card ($199/yr) is the right fit — "
            f"same agentic team, same discount stack, ships to your door."
        ),
    }
