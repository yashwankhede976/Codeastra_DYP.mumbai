"""
SafeHer AI – ML Risk Prediction Engine
=======================================
Uses a GradientBoostingClassifier trained on synthetic data at import time.
No external model files are required – the model is fit in memory on startup.

Feature vector (7 features):
  0  hour_of_day        (0–23)
  1  is_night           (0 or 1)
  2  area_type_enc      (0=normal, 1=crowded, 2=isolated)
  3  latitude           (float)
  4  longitude          (float)
  5  speed_kmh          (float, clamped 0–200)
  6  sos_triggered      (0 or 1)
"""
from __future__ import annotations

import logging
import random
from dataclasses import dataclass
from typing import List

import numpy as np

logger = logging.getLogger(__name__)

_AREA_ENC = {"normal": 0, "crowded": 1, "isolated": 2}


def _build_synthetic_dataset(n: int = 2000):
    """Generate labelled synthetic safety data for model training."""
    rng = random.Random(42)
    X, y = [], []
    for _ in range(n):
        hour = rng.randint(0, 23)
        is_night = 1 if hour >= 20 or hour <= 5 else 0
        area_enc = rng.choice([0, 1, 2])
        lat = rng.uniform(28.4, 28.8)
        lng = rng.uniform(76.8, 77.5)
        speed = rng.uniform(0, 60)
        sos = rng.choices([0, 1], weights=[0.97, 0.03])[0]

        # Risk score (ground truth) – rule-based labelling
        score = 10
        score += 25 if is_night else 5
        score += {0: 20, 1: 10, 2: 40}[area_enc]
        score += min(speed * 0.3, 15)
        score += 60 if sos else 0
        score = min(100, score + rng.gauss(0, 5))

        level = 2 if score >= 70 else 1 if score >= 40 else 0  # 0=Low, 1=Medium, 2=High
        X.append([hour, is_night, area_enc, lat, lng, speed, sos])
        y.append(level)
    return np.array(X, dtype=float), np.array(y, dtype=int)


class RiskMLEngine:
    """Singleton ML engine.  Call ``predict(features_dict)`` to score a location."""

    _instance: "RiskMLEngine | None" = None
    _LEVEL_LABELS = ["Low", "Medium", "High"]

    def __init__(self):
        self._model = None
        self._trained = False
        self._train()

    # ── Singleton ──────────────────────────────────────────────────────────────

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

            X, y = _build_synthetic_dataset(2000)
            self._model = Pipeline([
                ("scaler", StandardScaler()),
                ("clf", GradientBoostingClassifier(
                    n_estimators=120,
                    max_depth=4,
                    learning_rate=0.1,
                    random_state=42,
                )),
            ])
            self._model.fit(X, y)
            self._trained = True
            logger.info("SafeHer ML risk engine trained successfully.")
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
    ) -> dict:
        """Return a risk assessment dict with score, level, confidence and factors."""
        is_night = 1 if demo_night or (hour_of_day >= 20 or hour_of_day <= 5) else 0
        area_enc = _AREA_ENC.get("isolated" if demo_isolated else area_type, 0)
        speed = max(0.0, min(200.0, speed_kmh))
        sos_int = 1 if sos_triggered else 0

        features = np.array(
            [[hour_of_day, is_night, area_enc, latitude, longitude, speed, sos_int]],
            dtype=float,
        )

        if self._trained and self._model is not None:
            probs = self._model.predict_proba(features)[0]
            level_idx = int(np.argmax(probs))
            confidence = float(probs[level_idx])
        else:
            # Rule-based fallback
            score = 10 + (25 if is_night else 5) + {0: 20, 1: 10, 2: 40}[area_enc]
            score += min(speed * 0.3, 15) + (60 if sos_int else 0)
            score = min(100, score)
            level_idx = 2 if score >= 70 else 1 if score >= 40 else 0
            probs = [0.0, 0.0, 0.0]
            probs[level_idx] = 1.0
            confidence = 1.0

        risk_score = self._level_to_risk_score(level_idx, probs, sos_triggered)
        safety_score = max(0, 100 - risk_score)
        level_label = self._LEVEL_LABELS[level_idx]

        factors = self._explain_factors(
            is_night=bool(is_night),
            area_enc=area_enc,
            speed=speed,
            sos_triggered=sos_triggered,
        )

        return {
            "risk_score": risk_score,
            "safety_score": safety_score,
            "risk_level": level_label,
            "confidence": round(confidence, 3),
            "factors": factors,
            "alert_triggered": risk_score >= 70,
            "probabilities": {
                "Low": round(float(probs[0]), 3),
                "Medium": round(float(probs[1]), 3),
                "High": round(float(probs[2]), 3),
            },
        }

    # ── Helpers ────────────────────────────────────────────────────────────────

    @staticmethod
    def _level_to_risk_score(level_idx: int, probs: list, sos_triggered: bool) -> int:
        """Map class probabilities to a 0–100 integer risk score."""
        if sos_triggered:
            return 95
        # Weighted average of class midpoints
        midpoints = [20.0, 55.0, 85.0]
        score = sum(midpoints[i] * probs[i] for i in range(3))
        return int(round(min(100, max(0, score))))

    @staticmethod
    def _explain_factors(*, is_night: bool, area_enc: int, speed: float, sos_triggered: bool) -> dict:
        factors = {}
        if sos_triggered:
            factors["sos_triggered"] = "SOS manually activated – maximum risk override"
        if is_night:
            factors["time_of_day"] = "Night hours increase risk significantly"
        area_labels = {0: None, 1: None, 2: "Isolated area detected – limited visibility and crowd presence"}
        if area_labels.get(area_enc):
            factors["area_type"] = area_labels[area_enc]
        if speed > 40:
            factors["speed"] = f"High movement speed ({speed:.0f} km/h) detected"
        if not factors:
            factors["summary"] = "Conditions appear safe"
        return factors
