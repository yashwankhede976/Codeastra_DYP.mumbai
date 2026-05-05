# SafeHer AI – API Reference

All API endpoints are prefixed with `/api`. During development, requests from the frontend are automatically proxied to `http://localhost:8000`.

## Endpoints

### 1. POST /api/start-tracking

**Description:** Initialize a new tracking session and calculate initial risk.

**Request:**
```bash
curl -X POST http://localhost:8000/api/start-tracking \
  -H "Content-Type: application/json" \
  -d '{
    "demoNight": false,
    "demoIsolated": false,
    "location": {
      "latitude": 28.6139,
      "longitude": 77.209,
      "label": "Connaught Place",
      "areaType": "normal",
      "timeOfDay": "day"
    },
    "source": "manual"
  }'
```

**Request Body:**
| Field | Type | Description |
|-------|------|-------------|
| demoNight | boolean | Simulate nighttime (increases time-based risk) |
| demoIsolated | boolean | Simulate isolated area (increases area-based risk) |
| location.latitude | number | GPS latitude |
| location.longitude | number | GPS longitude |
| location.label | string | Human-readable location name |
| location.areaType | string | "normal", "isolated", or "crowded" |
| location.timeOfDay | string | "day" or "night" |
| source | string | "manual", "auto", or "sos" |

**Response (200 OK):**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "safetyScore": 94,
  "riskScore": 6,
  "status": "Safe",
  "alertTriggered": false,
  "emergencyMessage": "Tracking is active and conditions remain within the expected safety range.",
  "alertChannel": "Monitoring",
  "location": {
    "latitude": 28.6139,
    "longitude": 77.209,
    "label": "Connaught Place",
    "areaType": "normal",
    "timeOfDay": "day"
  },
  "timestamp": "2025-01-19T12:34:56.789Z"
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| sessionId | string | Unique session identifier |
| safetyScore | number | 0–100 (100 = safest) |
| riskScore | number | 0–100 (0 = safest) |
| status | string | "Safe", "Moderate", "High Risk" |
| alertTriggered | boolean | True if riskScore > 70 |
| emergencyMessage | string | Human-readable alert or status message |
| alertChannel | string | "Monitoring", "Autonomous", or "SOS" |
| location | object | Current location details |
| timestamp | string | ISO 8601 timestamp |

---

### 2. POST /api/location

**Description:** Update user location and recalculate risk.

**Request:**
```bash
curl -X POST http://localhost:8000/api/location \
  -H "Content-Type: application/json" \
  -d '{
    "demoNight": false,
    "demoIsolated": false,
    "location": {
      "latitude": 28.6150,
      "longitude": 77.2100,
      "label": "Market Road",
      "areaType": "crowded",
      "timeOfDay": "day"
    },
    "source": "auto",
    "sosTriggered": false
  }'
```

**Request Body:**
| Field | Type | Description |
|-------|------|-------------|
| demoNight | boolean | Demo mode: simulate night |
| demoIsolated | boolean | Demo mode: simulate isolated |
| location | object | Current location (see structure above) |
| source | string | "auto" (polling), "manual" (user), "sos" |
| sosTriggered | boolean | True if user pressed SOS button |

**Response (200 OK):**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "safetyScore": 88,
  "riskScore": 12,
  "status": "Safe",
  "alertTriggered": false,
  "emergencyMessage": "Tracking is active and conditions remain within the expected safety range.",
  "alertChannel": "Monitoring",
  "location": { ... },
  "timestamp": "2025-01-19T12:34:59.789Z"
}
```

**High-Risk Response (risk > 70):**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "safetyScore": 25,
  "riskScore": 75,
  "status": "High Risk",
  "alertTriggered": true,
  "emergencyMessage": "Emergency alert generated. Trusted contacts and emergency services should be notified immediately.",
  "alertChannel": "SOS",
  "location": { ... },
  "timestamp": "2025-01-19T12:35:02.789Z"
}
```

---

### 3. GET /api/risk

**Description:** Fetch the current risk snapshot without updating state.

**Request:**
```bash
curl -X GET http://localhost:8000/api/risk
```

**Response (200 OK):**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "safetyScore": 94,
  "riskScore": 6,
  "status": "Safe",
  "alertTriggered": false,
  "emergencyMessage": "Tracking is idle. Start monitoring to evaluate your route in real time.",
  "alertChannel": "Monitoring",
  "location": { ... },
  "timestamp": "2025-01-19T12:30:00.000Z"
}
```

---

## Risk Score Calculation

**Formula:**
```
time_risk = 35 (if night) or 15 (if day)
area_risk = 45 (if isolated) or 12 (if crowded) or 20 (if normal)
manual_risk = 90 (if SOS) or 6 (if manual start) or 0 (if auto)

risk_score = min(100, max(0, time_risk + area_risk + manual_risk))
```

**Examples:**

| Scenario | time_risk | area_risk | manual_risk | risk_score | status |
|----------|-----------|-----------|-------------|-----------|--------|
| Day, normal, auto | 15 | 20 | 0 | 35 | Safe |
| Night, normal, auto | 35 | 20 | 0 | 55 | Moderate |
| Night, isolated, auto | 35 | 45 | 0 | 80 | **High Risk** |
| Day, crowded, manual | 15 | 12 | 6 | 33 | Safe |
| Night, isolated, SOS | 35 | 45 | 90 | 100 | **High Risk** |

---

## Error Responses

**400 Bad Request** – Invalid input
```json
{
  "error": "Invalid location data",
  "details": "latitude must be a number"
}
```

**500 Internal Server Error** – Server error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

---

## Testing the API

### Using cURL

**1. Start tracking:**
```bash
curl -X POST http://localhost:8000/api/start-tracking \
  -H "Content-Type: application/json" \
  -d '{
    "demoNight": false,
    "demoIsolated": false,
    "location": {
      "latitude": 28.6139,
      "longitude": 77.209,
      "label": "Connaught Place",
      "areaType": "normal",
      "timeOfDay": "day"
    },
    "source": "manual"
  }'
```

**2. Update location (high risk):**
```bash
curl -X POST http://localhost:8000/api/location \
  -H "Content-Type: application/json" \
  -d '{
    "demoNight": true,
    "demoIsolated": true,
    "location": {
      "latitude": 28.6139,
      "longitude": 77.209,
      "label": "Service Lane",
      "areaType": "isolated",
      "timeOfDay": "night"
    },
    "source": "auto",
    "sosTriggered": false
  }'
```

**3. Trigger SOS:**
```bash
curl -X POST http://localhost:8000/api/location \
  -H "Content-Type: application/json" \
  -d '{
    "demoNight": false,
    "demoIsolated": false,
    "location": {
      "latitude": 28.6139,
      "longitude": 77.209,
      "label": "Connaught Place",
      "areaType": "normal",
      "timeOfDay": "day"
    },
    "source": "sos",
    "sosTriggered": true
  }'
```

**4. Get current risk:**
```bash
curl http://localhost:8000/api/risk
```

### Using Postman

1. **Create a new POST request**
2. **Set URL:** http://localhost:8000/api/start-tracking
3. **Set Body → raw → JSON**
4. **Paste the request JSON**
5. **Click Send**

---

## Frontend Integration

The frontend API client (src/lib/safeher-api.ts) abstracts these endpoints:

```typescript
// Start tracking
const snapshot = await startTracking({
  demoNight: false,
  demoIsolated: false,
  location: { ... },
});

// Update location
const updated = await postLocation({
  demoNight: false,
  demoIsolated: false,
  location: { ... },
  source: "auto",
  sosTriggered: false,
});

// Get current risk
const current = await fetchRisk();
```
