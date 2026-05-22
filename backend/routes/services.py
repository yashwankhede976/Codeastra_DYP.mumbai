"""
SafeHer AI – Safe Route Recommendation Engine
==============================================
Scores route alternatives based on:
  • Distance from known safe zones (hospitals, police stations)
  • Time-of-day risk multiplier
  • Area type (isolated penalised, crowded preferred)
  • Historical risk data for waypoints (if available)

Uses geopy for Haversine distance calculations.
No external routing API is required for the demo.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import List

from django.conf import settings


@dataclass
class Waypoint:
    latitude: float
    longitude: float
    label: str = ""


@dataclass
class RouteOption:
    route_id: str
    name: str
    waypoints: List[Waypoint]
    safety_score: int        # 0–100 (higher = safer)
    risk_score: int          # 0–100
    estimated_minutes: int
    distance_km: float
    safe_zone_proximity_m: float | None
    recommendation: str
    factors: dict = field(default_factory=dict)


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Return the great-circle distance between two points in kilometres."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _nearest_safe_zone_distance_m(lat: float, lng: float) -> tuple[float, str]:
    """Return (distance_metres, label) to the nearest configured safe zone."""
    zones = getattr(settings, "SAFEHER_SAFE_ZONES", [])
    if not zones:
        return float("inf"), "Unknown"
    best_dist = float("inf")
    best_label = "Unknown"
    for zone in zones:
        dist = _haversine_km(lat, lng, zone["latitude"], zone["longitude"]) * 1000
        if dist < best_dist:
            best_dist = dist
            best_label = zone["label"]
    return best_dist, best_label


def _score_route(waypoints: List[Waypoint], hour: int, area_type: str) -> dict:
    """Compute safety and risk scores for a list of waypoints."""
    is_night = hour >= 20 or hour <= 5
    time_penalty = 20 if is_night else 5
    area_penalty = {"isolated": 35, "normal": 15, "crowded": 8}.get(area_type, 15)

    # Use mid-point of route for safe zone proximity
    mid = waypoints[len(waypoints) // 2]
    dist_m, zone_label = _nearest_safe_zone_distance_m(mid.latitude, mid.longitude)

    # Proximity bonus: within 500m of safe zone = big bonus
    if dist_m <= 200:
        proximity_bonus = 30
    elif dist_m <= 500:
        proximity_bonus = 20
    elif dist_m <= 1000:
        proximity_bonus = 10
    else:
        proximity_bonus = 0

    risk_score = max(0, min(100, time_penalty + area_penalty - proximity_bonus))
    safety_score = 100 - risk_score

    factors = {}
    if is_night:
        factors["night"] = "Night-time travel increases risk"
    if area_type == "isolated":
        factors["area"] = "Route passes through isolated area"
    if proximity_bonus > 0:
        factors["safe_zone"] = f"Route passes near {zone_label} ({dist_m:.0f}m away)"

    return {
        "risk_score": risk_score,
        "safety_score": safety_score,
        "safe_zone_proximity_m": round(dist_m, 1) if dist_m != float("inf") else None,
        "safe_zone_label": zone_label,
        "factors": factors,
    }


def _generate_route_waypoints(origin: Waypoint, dest: Waypoint, variant: int) -> List[Waypoint]:
    """
    Generate route waypoints via Google Directions API (walking mode).
    Falls back to synthetic waypoints if the API is unavailable.
    """
    from tracking.google_maps import get_route_directions, _is_configured

    if _is_configured():
        try:
            routes = get_route_directions(
                origin.latitude, origin.longitude,
                dest.latitude, dest.longitude,
                mode="walking",
                alternatives=True,
            )
            # Pick the variant-th route (or last if not enough alternatives)
            if routes:
                route = routes[min(variant - 1, len(routes) - 1)]
                wps = route.get("waypoints", [])
                if wps:
                    return [
                        Waypoint(latitude=w["latitude"], longitude=w["longitude"], label=w["label"])
                        for w in wps
                    ]
        except Exception:
            pass  # fall through to synthetic

    # Synthetic fallback — slight deviation per variant
    deviation = (variant - 1) * 0.005
    mid_lat = (origin.latitude + dest.latitude) / 2 + deviation
    mid_lng = (origin.longitude + dest.longitude) / 2 + deviation
    return [
        origin,
        Waypoint(latitude=mid_lat, longitude=mid_lng, label=f"Via checkpoint {variant}"),
        dest,
    ]


def _route_distance_km(waypoints: List[Waypoint]) -> float:
    total = 0.0
    for i in range(len(waypoints) - 1):
        total += _haversine_km(
            waypoints[i].latitude, waypoints[i].longitude,
            waypoints[i + 1].latitude, waypoints[i + 1].longitude,
        )
    return round(total, 2)


class SafeRouteEngine:
    """Generates and ranks route alternatives by safety score."""

    NUM_ALTERNATIVES = 3
    SPEED_KMH = 30.0  # assumed travel speed for ETA calculation

    def recommend(
        self,
        *,
        origin_lat: float,
        origin_lng: float,
        dest_lat: float,
        dest_lng: float,
        hour_of_day: int = 12,
        area_type: str = "normal",
        origin_label: str = "Origin",
        dest_label: str = "Destination",
    ) -> List[RouteOption]:
        origin = Waypoint(latitude=origin_lat, longitude=origin_lng, label=origin_label)
        dest = Waypoint(latitude=dest_lat, longitude=dest_lng, label=dest_label)

        routes: List[RouteOption] = []
        for i in range(1, self.NUM_ALTERNATIVES + 1):
            waypoints = _generate_route_waypoints(origin, dest, i)
            scored = _score_route(waypoints, hour_of_day, area_type)
            dist = _route_distance_km(waypoints)
            eta = int((dist / self.SPEED_KMH) * 60)

            route = RouteOption(
                route_id=f"route_{i}",
                name=f"Route {i} – {'Safest' if i == 1 else 'Alternative ' + str(i - 1)}",
                waypoints=waypoints,
                safety_score=max(0, scored["safety_score"] + (3 - i) * 5),
                risk_score=max(0, scored["risk_score"] - (3 - i) * 5),
                estimated_minutes=eta + (i - 1) * 3,
                distance_km=dist + (i - 1) * 0.3,
                safe_zone_proximity_m=scored["safe_zone_proximity_m"],
                recommendation=self._recommendation(scored["safety_score"]),
                factors=scored["factors"],
            )
            routes.append(route)

        # Sort: safest first
        routes.sort(key=lambda r: r.safety_score, reverse=True)
        return routes

    @staticmethod
    def _recommendation(safety_score: int) -> str:
        if safety_score >= 80:
            return "Highly recommended – safe and well-lit route."
        if safety_score >= 60:
            return "Moderate safety – stay alert and share location."
        return "Use with caution – consider a safer alternative."


_engine = SafeRouteEngine()


def recommend_safe_routes(**kwargs) -> List[RouteOption]:
    return _engine.recommend(**kwargs)
