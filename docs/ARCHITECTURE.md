# SafeHer AI – System Architecture

## Overview

SafeHer AI is a full-stack SaaS for women's safety, combining real-time location tracking with AI-powered risk assessment. The system is split into frontend (React/Vite) and backend (Django REST), connected via HTTP API.

## High-Level Flow

```
User Opens App (http://localhost:8080)
        ↓
  [React Components]
        ↓
  [SafeHer Provider] ← Manages state, calls API
        ↓
  [safeher-api.ts] ← HTTP client to /api endpoints
        ↓
  [Vite Proxy] → http://localhost:8000/api
        ↓
  [Django REST Framework]
        ↓
  [tracking/views.py] ← Process requests
        ↓
  [tracking/services.py] ← Calculate risk
        ↓
  [tracking/state.py] ← Store session (in-memory for demo)
        ↓
  Return JSON response → Frontend updates UI
```

## Frontend Architecture

### 1. SafeHerProvider (src/components/safeher/SafeHerProvider.tsx)

**Responsibility:** Centralized state management for tracking.

**State:**
- `isTracking` (boolean) – Is a session active?
- `location` (SafeHerLocation) – Current GPS position with jitter
- `snapshot` (SafeHerRiskSnapshot) – Full risk assessment
- `demoNight`, `demoIsolated` (boolean) – Demo mode toggles

**Key Methods:**
- `startMonitoring()` – Begin tracking, start 5s polling interval
- `triggerSOS()` – Send emergency alert
- `syncLocation(source)` – Update location and recalculate risk

**Hook Export:**
```typescript
const { isTracking, safetyScore, status, triggerSOS, startMonitoring, demoNight } = useSafeHer();
```

### 2. SafeHer API Client (src/lib/safeher-api.ts)

**Responsibility:** HTTP communication with Django backend.

**Endpoints:**
```
POST /api/start-tracking   → Begin session
POST /api/location         → Update location
GET  /api/risk             → Fetch current risk
```

**Fallback Logic:**
- If backend unreachable, calculate risk locally (TypeScript)
- Allows demo to work offline
- User gets real-time feedback even if API is down

### 3. Components Using SafeHer State

#### Dashboard.tsx
- Displays safety score (0–100)
- Shows status: "Safe", "Moderate", "High Risk"
- Buttons: "Start tracking", "Night mode", "Isolated area"
- Updates: Real-time from `useSafeHer()` hook

#### LiveTracking.tsx
- Map visualization with user pin
- Pin position updated every 5 seconds
- SOS button triggers `triggerSOS()`
- Risk status badge (top-right)
- Dynamic location label

### 4. App.tsx (Root)

```tsx
<QueryClientProvider>
  <SafeHerProvider>  ← All children access useSafeHer()
    <TooltipProvider>
      <Routes>...</Routes>
    </TooltipProvider>
  </SafeHerProvider>
</QueryClientProvider>
```

## Backend Architecture

### 1. Risk Calculation Engine (backend/tracking/services.py)

**Algorithm:**
```python
time_risk = 35 (night) or 15 (day)
area_risk = 45 (isolated) or 12 (crowded) or 20 (normal)
manual_risk = 90 (SOS) or 6 (manual start) or 0 (auto)

risk_score = min(100, max(0, time_risk + area_risk + manual_risk))
safety_score = 100 - risk_score
status = "High Risk" (risk ≥ 70) or "Moderate" (risk ≥ 40) or "Safe"
alert_triggered = risk_score > 70
```

**Factors:**
- **Time-of-Day Risk:** Night travel is inherently riskier
- **Area-Type Risk:** Isolated areas increase risk; crowded areas decrease it
- **Manual Risk:** SOS button or manual start increases risk; autonomous polling keeps it low

### 2. Session State (backend/tracking/state.py)

**Current Implementation:** In-memory global dict
```python
CURRENT_STATE = {
    "sessionId": "uuid...",
    "safetyScore": 94,
    "riskScore": 6,
    "status": "Safe",
    "alertTriggered": False,
    ...
}
```

**Why in-memory?**
- Fast for demo and development
- Simple, no database setup needed
- Sufficient for single-user testing

**Production:** Replace with Django ORM models (Session, LocationLog, Alert)

### 3. REST Endpoints (backend/tracking/views.py)

#### POST /api/start-tracking
**Request:**
```json
{
  "demoNight": false,
  "demoIsolated": false,
  "location": { "latitude": 28.6139, "longitude": 77.209, "label": "Connaught Place", "areaType": "normal", "timeOfDay": "day" },
  "source": "manual"
}
```

**Response:**
```json
{
  "sessionId": "uuid...",
  "safetyScore": 94,
  "riskScore": 6,
  "status": "Safe",
  "alertTriggered": false,
  "emergencyMessage": "Tracking is active...",
  "alertChannel": "Monitoring",
  "location": { ... },
  "timestamp": "2025-..."
}
```

#### POST /api/location
**Request:** (Same structure as start-tracking, but source="auto" or "sos")

**Response:** (Updated SafeHerRiskSnapshot)

**Alert Logic:**
```python
if riskScore > 70:
    snapshot.alertTriggered = True
    snapshot.emergencyMessage = "Emergency alert generated..."
    # In production: trigger SMS/email/push notifications
```

#### GET /api/risk
**Response:** Current CURRENT_STATE (no update)

### 4. Django Configuration (backend/safeher_ai/)

**settings.py:**
- `DEBUG = True` (dev mode from env)
- `CORS_ALLOW_ALL_ORIGINS = True` (allow frontend requests)
- `INSTALLED_APPS = ["rest_framework", "corsheaders", "tracking"]`
- Database: SQLite (changeable to PostgreSQL)

**urls.py:**
```python
urlpatterns = [
    path("api/", include("tracking.urls")),
]
```

**tracking/urls.py:**
```python
urlpatterns = [
    path("start-tracking", start_tracking),
    path("location", location_update),
    path("risk", current_risk),
]
```

## Data Flow Example: "User Triggers SOS"

1. **User clicks SOS button on LiveTracking.tsx**
   ```tsx
   <SOSButton onClick={() => void triggerSOS()} />
   ```

2. **SafeHerProvider.triggerSOS() called**
   ```tsx
   const triggerSOS = async () => {
     await syncLocation("sos");  // source = "sos"
   };
   ```

3. **syncLocation() posts to /api/location**
   ```tsx
   await postLocation({
     source: "sos",
     sosTriggered: true,
     location: { ... }
   });
   ```

4. **Django /api/location endpoint called**
   ```python
   def location_update(request):
       sos_triggered = request.data.get("sosTriggered")  # true
       snapshot = risk_from_context(..., sos_triggered=True)
   ```

5. **Risk calculation in services.py**
   ```python
   manual_risk = 90  # SOS = high manual risk
   risk_score = min(100, time_risk + area_risk + 90)  # Usually > 70
   alert_triggered = True
   ```

6. **Response sent back to frontend**
   ```json
   { "alertTriggered": true, "emergencyMessage": "Emergency alert generated..." }
   ```

7. **Frontend updates UI**
   ```tsx
   toast.error("High risk detected", { description: emergencyMessage });
   setSnapshot(nextSnapshot);
   ```

## Vite Dev Proxy

**vite.config.ts:**
```typescript
server: {
  proxy: {
    "/api": {
      target: "http://127.0.0.1:8000",
      changeOrigin: true,
    },
  },
}
```

**Effect:**
- Frontend at `http://localhost:8080` makes request to `/api/location`
- Vite intercepts and forwards to `http://127.0.0.1:8000/api/location`
- Django backend responds; Vite relays back to frontend
- No CORS issues in development

## Security Considerations (Not Implemented Yet)

1. **Authentication:** JWT or session tokens needed to tie tracks to users
2. **Authorization:** Only logged-in users can access their own sessions
3. **Rate Limiting:** Prevent abuse of location polling endpoint
4. **HTTPS:** Production must use SSL/TLS
5. **Data Validation:** Sanitize location inputs
6. **Logging:** Track all alert triggers for audit trail

## Production Next Steps

1. **Database Migration:**
   - Replace `CURRENT_STATE` dict with Django ORM
   - Models: Session, LocationLog, Alert, TrustedContact, User

2. **Authentication:**
   - Implement JWT or session-based auth
   - Protect API endpoints with `@authentication_classes`

3. **Notifications:**
   - Send SMS/email/push when alert triggers
   - Integrate with Twilio, SendGrid, or Firebase

4. **Deployment:**
   - Docker Compose for local dev
   - Cloud hosting (AWS, GCP, Heroku)
   - PostgreSQL instead of SQLite
   - Redis for session caching
