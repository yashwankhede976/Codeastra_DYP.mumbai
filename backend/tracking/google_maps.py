"""
SafeHer AI — Google Maps Service Layer
=======================================
Central module for all Google Maps REST API interactions.

APIs used:
  • Geocoding API   — reverse geocode GPS → area name
  • Places API      — nearby hospitals, police stations, area classification
  • Directions API  — real walking/driving routes with polyline waypoints
  • Static Maps API — snapshot URL for SOS alert messages

All calls fail gracefully and return sensible fallback values
so the app keeps working even if the API key is not configured.
"""
from __future__ import annotations

import logging
import os
from typing import Any

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# ── Helpers ───────────────────────────────────────────────────────────────────

def _api_key() -> str:
    """Return the Google Maps API key from settings or env."""
    key = getattr(settings, "GOOGLE_MAPS_API_KEY", "") or os.getenv("GOOGLE_MAPS_API_KEY", "")
    return key.strip()


def _is_configured() -> bool:
    key = _api_key()
    return bool(key and key != "YOUR_GOOGLE_MAPS_API_KEY_HERE" and key.startswith("AIzaSy"))


def _get(url: str, params: dict) -> dict | None:
    """Execute a GET request. Returns parsed JSON or None on failure."""
    try:
        resp = requests.get(url, params=params, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        status = data.get("status", "")
        if status not in ("OK", "ZERO_RESULTS"):
            logger.warning("Google Maps API returned status=%s for %s", status, url)
            return None
        return data
    except Exception as exc:  # noqa: BLE001
        logger.warning("Google Maps request failed: %s", exc)
        return None


# ── Geocoding ─────────────────────────────────────────────────────────────────

def reverse_geocode(lat: float, lng: float) -> str:
    """
    Convert GPS coordinates to a human-readable neighbourhood / area name.
    Returns 'Mumbai' as fallback.
    """
    if not _is_configured():
        return "Mumbai"

    data = _get(
        "https://maps.googleapis.com/maps/api/geocode/json",
        {"latlng": f"{lat},{lng}", "key": _api_key(), "language": "en"},
    )
    if not data or not data.get("results"):
        return "Mumbai"

    for result in data["results"]:
        for comp in result.get("address_components", []):
            if any(t in comp["types"] for t in ("neighborhood", "sublocality", "locality")):
                return comp["long_name"]

    # fallback: first component of formatted_address
    return data["results"][0].get("formatted_address", "Mumbai").split(",")[0]


# ── Area Classification ────────────────────────────────────────────────────────

def classify_area_type(lat: float, lng: float, radius_m: int = 250) -> str:
    """
    Determine area type (isolated / normal / crowded) from nearby place count.
    Uses Google Places Nearby Search.

    Returns: 'isolated' | 'normal' | 'crowded'
    """
    if not _is_configured():
        return "normal"

    data = _get(
        "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
        {
            "location": f"{lat},{lng}",
            "radius": radius_m,
            "type": "establishment",
            "key": _api_key(),
        },
    )
    if not data:
        return "normal"

    count = len(data.get("results", []))
    if count >= 10:
        return "crowded"
    if count <= 2:
        return "isolated"
    return "normal"


# ── Nearby Safe Places ────────────────────────────────────────────────────────

def nearby_safe_places(lat: float, lng: float, radius_m: int = 1500) -> list[dict]:
    """
    Return nearby hospitals and police stations as a list of dicts:
      [{ name, latitude, longitude, place_type, address, place_id }]
    """
    if not _is_configured():
        return _fallback_safe_places(lat, lng)

    results: list[dict] = []
    for place_type in ("hospital", "police"):
        data = _get(
            "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
            {
                "location": f"{lat},{lng}",
                "radius": radius_m,
                "type": place_type,
                "key": _api_key(),
            },
        )
        if not data:
            continue

        for place in data.get("results", [])[:5]:
            geo = place.get("geometry", {}).get("location", {})
            results.append(
                {
                    "name": place.get("name", ""),
                    "latitude": geo.get("lat", lat),
                    "longitude": geo.get("lng", lng),
                    "place_type": place_type,
                    "address": place.get("vicinity", ""),
                    "place_id": place.get("place_id", ""),
                    "rating": place.get("rating"),
                    "open_now": place.get("opening_hours", {}).get("open_now"),
                }
            )

    return results


def _fallback_safe_places(lat: float, lng: float) -> list[dict]:
    """Return configured safe zones when Maps API is unavailable."""
    zones = getattr(settings, "SAFEHER_SAFE_ZONES", [])
    return [
        {
            "name": z["label"],
            "latitude": z["latitude"],
            "longitude": z["longitude"],
            "place_type": "safe_zone",
            "address": "",
            "place_id": "",
            "rating": None,
            "open_now": None,
        }
        for z in zones
    ]


# ── Directions API ─────────────────────────────────────────────────────────────

def get_route_directions(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    mode: str = "walking",
    alternatives: bool = True,
) -> list[dict[str, Any]]:
    """
    Fetch real routes from Google Directions API.

    Returns a list of route dicts:
      [{
        summary: str,
        distance_km: float,
        duration_minutes: int,
        waypoints: [{ latitude, longitude, label }],
        overview_polyline: str,
      }]

    Returns empty list on failure (caller falls back to synthetic routes).
    """
    if not _is_configured():
        return []

    data = _get(
        "https://maps.googleapis.com/maps/api/directions/json",
        {
            "origin": f"{origin_lat},{origin_lng}",
            "destination": f"{dest_lat},{dest_lng}",
            "mode": mode,
            "alternatives": "true" if alternatives else "false",
            "key": _api_key(),
        },
    )
    if not data or not data.get("routes"):
        return []

    routes = []
    for r in data["routes"]:
        leg = r["legs"][0] if r.get("legs") else {}
        dist_km = leg.get("distance", {}).get("value", 0) / 1000.0
        dur_min = leg.get("duration", {}).get("value", 0) // 60

        # Decode simplified waypoints from steps
        waypoints = _decode_steps_to_waypoints(leg.get("steps", []))

        routes.append(
            {
                "summary": r.get("summary", "Route"),
                "distance_km": round(dist_km, 2),
                "duration_minutes": dur_min,
                "waypoints": waypoints,
                "overview_polyline": r.get("overview_polyline", {}).get("points", ""),
            }
        )

    return routes


def _decode_steps_to_waypoints(steps: list[dict]) -> list[dict]:
    """Extract start location of each step as a waypoint."""
    waypoints = []
    for step in steps:
        loc = step.get("start_location", {})
        instruction = step.get("html_instructions", "")
        # Strip HTML tags simply
        import re
        clean = re.sub(r"<[^>]+>", "", instruction)[:60]
        waypoints.append(
            {
                "latitude": loc.get("lat", 0.0),
                "longitude": loc.get("lng", 0.0),
                "label": clean or "Waypoint",
            }
        )
    return waypoints


# ── Static Map URL ─────────────────────────────────────────────────────────────

def static_map_url(lat: float, lng: float, zoom: int = 15, size: str = "400x300") -> str:
    """
    Return a stable Google Maps link for the given coordinates.

    NOTE:
    We intentionally return a regular Google Maps search URL instead of
    a Static Maps image endpoint to avoid hard dependency on the
    "Static Maps API" activation/billing state. This keeps SOS/location
    links functional even when only partial Google Maps APIs are enabled.
    """
    return f"https://www.google.com/maps/search/?api=1&query={lat:.6f},{lng:.6f}"
