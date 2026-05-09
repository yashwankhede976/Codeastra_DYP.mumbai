from __future__ import annotations

from datetime import datetime, timezone

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .services import recommend_safe_routes
from tracking.google_maps import (
    nearby_safe_places as gmap_nearby,
    reverse_geocode,
    static_map_url,
    _is_configured as maps_configured,
)


@api_view(["POST"])
def safest_route(request):
    """
    POST /api/routes/safest/
    Return ranked safe route alternatives between an origin and destination.

    Request body:
      {
        "origin": {"latitude": 28.61, "longitude": 77.20, "label": "Home"},
        "destination": {"latitude": 28.65, "longitude": 77.22, "label": "Office"},
        "hourOfDay": 21,
        "areaType": "normal"
      }
    """
    payload = request.data or {}
    origin = payload.get("origin") or {}
    dest = payload.get("destination") or {}

    if not origin or not dest:
        return Response(
            {"error": "'origin' and 'destination' are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        routes = recommend_safe_routes(
            origin_lat=float(origin.get("latitude", 0)),
            origin_lng=float(origin.get("longitude", 0)),
            dest_lat=float(dest.get("latitude", 0)),
            dest_lng=float(dest.get("longitude", 0)),
            hour_of_day=int(payload.get("hourOfDay", datetime.now(timezone.utc).hour)),
            area_type=str(payload.get("areaType", "normal")),
            origin_label=str(origin.get("label", "Origin")),
            dest_label=str(dest.get("label", "Destination")),
        )
    except Exception as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    # Serialize waypoints
    serialised = []
    for r in routes:
        serialised.append({
            "route_id": r.route_id,
            "name": r.name,
            "safety_score": r.safety_score,
            "risk_score": r.risk_score,
            "estimated_minutes": r.estimated_minutes,
            "distance_km": r.distance_km,
            "safe_zone_proximity_m": r.safe_zone_proximity_m,
            "recommendation": r.recommendation,
            "factors": r.factors,
            "waypoints": [
                {"latitude": w.latitude, "longitude": w.longitude, "label": w.label}
                for w in r.waypoints
            ],
        })

    return Response(
        {
            "origin": origin,
            "destination": dest,
            "routes_count": len(serialised),
            "routes": serialised,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "maps_enriched": maps_configured(),
        }
    )


@api_view(["GET"])
def nearby_safe_places(request):
    """
    GET /api/routes/nearby-safe-places/?lat=18.93&lng=72.83&radius=1500
    Returns hospitals and police stations near the given coordinates.
    Falls back to configured safe zones when Maps API is not available.
    """
    lat = float(request.query_params.get("lat", 18.9398))
    lng = float(request.query_params.get("lng", 72.8355))
    radius = int(request.query_params.get("radius", 1500))

    places = gmap_nearby(lat, lng, radius_m=radius)

    return Response({
        "places": places,
        "count": len(places),
        "center": {"latitude": lat, "longitude": lng},
        "radius_m": radius,
        "source": "google_places" if maps_configured() else "fallback_config",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    })


@api_view(["GET"])
def geocode_location(request):
    """
    GET /api/routes/geocode/?lat=18.93&lng=72.83
    Reverse geocode GPS coordinates to a human-readable area name.
    """
    lat = float(request.query_params.get("lat", 18.9398))
    lng = float(request.query_params.get("lng", 72.8355))

    label = reverse_geocode(lat, lng)
    map_url = static_map_url(lat, lng)

    return Response({
        "latitude": lat,
        "longitude": lng,
        "label": label,
        "static_map_url": map_url,
        "maps_configured": maps_configured(),
    })


@api_view(["GET"])
def maps_status(request):
    """
    GET /api/routes/maps-status/
    Returns the current Google Maps integration status.
    """
    return Response({
        "google_maps_configured": maps_configured(),
        "available_apis": [
            "Geocoding API",
            "Places API (Nearby Search)",
            "Directions API (Walking Routes)",
            "Static Maps API",
        ] if maps_configured() else [],
        "fallback_mode": not maps_configured(),
        "default_region": "Mumbai, Maharashtra, India",
        "checked_at": datetime.now(timezone.utc).isoformat(),
    })
