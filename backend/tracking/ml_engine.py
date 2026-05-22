"""
SafeHer AI – ML Risk Prediction Engine (v2)
============================================
Combines a GradientBoostingClassifier (trained on synthetic data at import
time) with a transparent, explainable rule-based fallback.

Feature vector (9 features):
  0  hour_of_day            (0–23)
  1  is_night               (0 or 1)
  2  area_type_enc          (0=normal, 1=crowded, 2=isolated)
  3  latitude               (float)
  4  longitude              (float)
  5  speed_kmh              (float, clamped 0–200)
  6  sos_triggered          (0 or 1)
  7  route_deviation_km     (float, clamped 0–10)
  8  unsafe_zone_score      (0=none, 1=nearby, 2=inside)

Risk Formula (rule-based score, also used as ML training signal):
  risk_score = night_factor        (5 day / 30 night)
             + area_factor         (10 crowded / 20 normal / 40 isolated)
             + movement_factor     (0–15, proportional to speed)
             + deviation_factor    (0 none / 10 minor / 20 major deviation)
             + unsafe_zone_factor  (0 none / 10 nearby / 20 inside)
             + sos_override        (60 if SOS triggered)

Risk Levels:
   0–30  →  Low    (Safe)
  31–70  →  Medium (Moderate)
  71–100 →  High   (High Risk)
"""
from __future__ import annotations

import logging
import random
from dataclasses import dataclass
from typing import List

import numpy as np

logger = logging.getLogger(__name__)

_AREA_ENC = {"normal": 0, "crowded": 1, "isolated": 2}
_UNSAFE_ENC = {"none": 0, "nearby": 1, "inside": 2}

# ── Risk formula weights ────────────────────────────────────────────────────────

NIGHT_FACTOR_DAY   =  5
NIGHT_FACTOR_NIGHT = 30

AREA_FACTOR = {0: 20, 1: 10, 2: 40}          # normal / crowded / isolated

MOVEMENT_FACTOR_MAX = 15                       # reached at ~100 km/h
MOVEMENT_SPEED_CAP  = 100.0

DEVIATION_FACTOR = {0: 0, 1: 10, 2: 20}       # none / minor / major

UNSAFE_ZONE_FACTOR = {0: 0, 1: 10, 2: 20}     # none / nearby / inside

SOS_OVERRIDE = 60                              # added on top when SOS triggered


def _compute_rule_score(
    *,
    is_night: int,
    area_enc: int,
    speed_kmh: float,
    deviation_enc: int,
    unsafe_enc: int,
    sos_triggered: bool,
) -> float:
    """Transparent formula — used both for training labels and live fallback."""
    night  = NIGHT_FACTOR_NIGHT if is_night else NIGHT_FACTOR_DAY
    area   = AREA_FACTOR.get(area_enc, 20)
    move   = min(speed_kmh / MOVEMENT_SPEED_CAP, 1.0) * MOVEMENT_FACTOR_MAX
    dev    = DEVIATION_FACTOR.get(deviation_enc, 0)
    unsafe = UNSAFE_ZONE_FACTOR.get(unsafe_enc, 0)
    sos    = SOS_OVERRIDE if sos_triggered else 0

    return min(100.0, max(0.0, night + area + move + dev + unsafe + sos))


def _build_synthetic_dataset(n: int = 3000):
    """Generate labelled synthetic safety data for model training."""
    rng = random.Random(42)
    X, y = [], []
    for _ in range(n):
        hour       = rng.randint(0, 23)
        is_night   = 1 if hour >= 20 or hour <= 5 else 0
        area_enc   = rng.choice([0, 1, 2])
        lat        = rng.uniform(18.8, 19.2)   # Mumbai-centric
        lng        = rng.uniform(72.7, 73.0)
        speed      = rng.uniform(0, 80)
        sos        = rng.choices([0, 1], weights=[0.97, 0.03])[0]
        dev_enc    = rng.choices([0, 1, 2], weights=[0.80, 0.15, 0.05])[0]
        unsafe_enc = rng.choices([0, 1, 2], weights=[0.75, 0.18, 0.07])[0]

        score = _compute_rule_score(
            is_night=is_night,
            area_enc=area_enc,
            speed_kmh=speed,
            deviation_enc=dev_enc,
            unsafe_enc=unsafe_enc,
            sos_triggered=bool(sos),
        )
        # Add realistic label noise
        score = min(100, score + rng.gauss(0, 4))

        level = 2 if score >= 71 else 1 if score >= 31 else 0
        X.append([hour, is_night, area_enc, lat, lng, speed, sos, dev_enc, unsafe_enc])
        y.append(level)
    return np.array(X, dtype=float), np.array(y, dtype=int)


class RiskMLEngine:
    """Singleton ML engine.  Call ``predict()`` to score a location."""

    _instance: "RiskMLEngine | None" = None
    _LEVEL_LABELS = ["Low", "Medium", "High"]

    def __init__(self):
        self._model = None
        self._trained = False
        self._train()

    @classmethod
    def get(cls) -> "RiskMLEngine":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # ── Training ───────────────────────────────────────────────────────────────

    def _train(self):
        try:
            from sklearn.ensemble import GradientBoostingClassifier
            from sklearn.preprocessing import StandardScaler
            from sklearn.pipeline import Pipeline

            X, y = _build_synthetic_dataset(3000)
            self._model = Pipeline([
                ("scaler", StandardScaler()),
                ("clf", GradientBoostingClassifier(
                    n_estimators=150,
                    max_depth=4,
                    learning_rate=0.08,
                    random_state=42,
                )),
            ])
            self._model.fit(X, y)
            self._trained = True
            logger.info("SafeHer ML risk engine v2 trained (9 features, 3000 samples).")
        except Exception as exc:
            logger.warning("ML engine training failed – falling back to rule engine: %s", exc)

    # ── Prediction ─────────────────────────────────────────────────────────────

    def predict(
        self,
        *,
        latitude: float,
        longitude: float,
        hour_of_day: int,
        area_type: str = "normal",
        speed_kmh: float = 0.0,
        sos_triggered: bool = False,
        demo_night: bool = False,
        demo_isolated: bool = False,
        route_deviation_km: float = 0.0,
        unsafe_zone_proximity: str = "none",
    ) -> dict:
        """Return a risk assessment dict with score, level, confidence and factors."""
        is_night   = 1 if demo_night or (hour_of_day >= 20 or hour_of_day <= 5) else 0
        area_enc   = _AREA_ENC.get("isolated" if demo_isolated else area_type, 0)
        speed      = max(0.0, min(200.0, speed_kmh))
        sos_int    = 1 if sos_triggered else 0

        # Route deviation encoding: none / minor (< 0.5 km) / major (≥ 0.5 km)
        if route_deviation_km <= 0.0:
            dev_enc = 0
        elif route_deviation_km < 0.5:
            dev_enc = 1
        else:
            dev_enc = 2

        unsafe_enc = _UNSAFE_ENC.get(unsafe_zone_proximity.lower(), 0)

        features = np.array(
            [[hour_of_day, is_night, area_enc, latitude, longitude,
              speed, sos_int, dev_enc, unsafe_enc]],
            dtype=float,
        )

        if self._trained and self._model is not None:
            probs      = self._model.predict_proba(features)[0]
            level_idx  = int(np.argmax(probs))
            confidence = float(probs[level_idx])
        else:
            # Rule-based fallback
            rule_score = _compute_rule_score(
                is_night=is_night,
                area_enc=area_enc,
                speed_kmh=speed,
                deviation_enc=dev_enc,
                unsafe_enc=unsafe_enc,
                sos_triggered=sos_triggered,
            )
            level_idx = 2 if rule_score >= 71 else 1 if rule_score >= 31 else 0
            probs = [0.0, 0.0, 0.0]
            probs[level_idx] = 1.0
            confidence = 1.0

        risk_score   = self._level_to_risk_score(level_idx, list(probs), sos_triggered)
        safety_score = max(0, 100 - risk_score)
        level_label  = self._LEVEL_LABELS[level_idx]

        factors = self._explain_factors(
            is_night=bool(is_night),
            area_enc=area_enc,
            speed=speed,
            sos_triggered=sos_triggered,
            dev_enc=dev_enc,
            unsafe_enc=unsafe_enc,
        )

        # Structured factor breakdown (for frontend visualisation)
        risk_factors_detail = self._factor_breakdown(
            is_night=bool(is_night),
            area_enc=area_enc,
            speed=speed,
            sos_triggered=sos_triggered,
            dev_enc=dev_enc,
            unsafe_enc=unsafe_enc,
        )

        return {
            "risk_score":          risk_score,
            "safety_score":        safety_score,
            "risk_level":          level_label,
            "confidence":          round(confidence, 3),
            "factors":             factors,
            "risk_factors_detail": risk_factors_detail,
            "alert_triggered":     risk_score >= 71,
            "probabilities": {
                "Low":    round(float(probs[0]), 3),
                "Medium": round(float(probs[1]), 3),
                "High":   round(float(probs[2]), 3),
            },
        }

    # ── Helpers ────────────────────────────────────────────────────────────────

    @staticmethod
    def _level_to_risk_score(level_idx: int, probs: list, sos_triggered: bool) -> int:
        """Map class probabilities to a 0–100 integer risk score."""
        if sos_triggered:
            return 95
        midpoints = [15.0, 50.0, 85.0]
        score = sum(midpoints[i] * probs[i] for i in range(3))
        return int(round(min(100, max(0, score))))

    @staticmethod
    def _explain_factors(
        *, is_night: bool, area_enc: int, speed: float,
        sos_triggered: bool, dev_enc: int, unsafe_enc: int,
    ) -> dict:
        factors = {}
        if sos_triggered:
            factors["sos_triggered"] = "SOS manually activated – maximum risk override"
        if is_night:
            factors["time_of_day"] = "Night hours significantly increase risk"
        area_msgs = {2: "Isolated area – limited visibility and crowd presence"}
        if area_enc in area_msgs:
            factors["area_type"] = area_msgs[area_enc]
        if speed > 40:
            factors["speed"] = f"High movement speed ({speed:.0f} km/h) detected"
        if dev_enc == 1:
            factors["route_deviation"] = "Minor route deviation detected"
        elif dev_enc == 2:
            factors["route_deviation"] = "Major route deviation – possible danger"
        if unsafe_enc == 1:
            factors["unsafe_zone"] = "Near an unsafe zone"
        elif unsafe_enc == 2:
            factors["unsafe_zone"] = "Inside an unsafe zone – seek safe area immediately"
        if not factors:
            factors["summary"] = "Conditions appear safe"
        return factors

    @staticmethod
    def _factor_breakdown(
        *, is_night: bool, area_enc: int, speed: float,
        sos_triggered: bool, dev_enc: int, unsafe_enc: int,
    ) -> dict:
        """Return each factor's raw score contribution for frontend display."""
        night  = NIGHT_FACTOR_NIGHT if is_night else NIGHT_FACTOR_DAY
        area   = AREA_FACTOR.get(area_enc, 20)
        move   = round(min(speed / MOVEMENT_SPEED_CAP, 1.0) * MOVEMENT_FACTOR_MAX, 1)
        dev    = DEVIATION_FACTOR.get(dev_enc, 0)
        unsafe = UNSAFE_ZONE_FACTOR.get(unsafe_enc, 0)

        return {
            "night_factor":      night,
            "area_factor":       area,
            "movement_factor":   move,
            "deviation_factor":  dev,
            "unsafe_zone_factor": unsafe,
            "sos_override":      SOS_OVERRIDE if sos_triggered else 0,
            "max_possible": {
                "night":     NIGHT_FACTOR_NIGHT,
                "area":      40,
                "movement":  MOVEMENT_FACTOR_MAX,
                "deviation": 20,
                "unsafe":    20,
            },
        }
