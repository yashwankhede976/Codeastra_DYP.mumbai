# SafeHer AI - Backend Architecture

This is the core intelligence layer for **SafeHer AI**. It is built with Django and Django REST Framework, shifting the paradigm from *reactive emergency response* to *proactive intelligent protection* using machine learning and Agentic AI workflows.

---

## 🏗️ Architecture & Modules

The backend is structured into 5 modular, microservice-inspired Django apps:

### 1. 🔐 Accounts App (`/accounts`)
Handles secure user authentication and trusted emergency contacts.
- Custom User Model with phone numbers and verification status.
- JWT-based authentication using `djangorestframework-simplejwt`.

### 2. 📍 Tracking & ML Engine (`/tracking`)
The core analytics engine. It ingests live telemetry (location, speed, area type, time of day) and evaluates risk in real-time.
- Contains the **`RiskMLEngine`**: A self-contained `GradientBoostingClassifier` trained dynamically at startup. It does not rely on external model files.
- Persists telemetry data via `LocationLog` and `RiskAnalysis` models for historical dashboards.
- Computes `risk_score` (0-100) and extracts risk factors.

### 3. 🤖 Agentic Engine (`/agents`)
The autonomous brain. Evaluates risk thresholds and triggers defensive actions without user intervention.
- Evaluates risk thresholds:
  - **>= 85 (Full Emergency)**: Automatically triggers SOS, alerts authorities, starts audio recording.
  - **>= 70 (High Risk)**: Shares location with trusted contacts, suggests safe routes.
  - **>= 50 (Medium Risk)**: Increases polling rate, switches to active monitoring.
- Persists actions via the `AgentAction` model.

### 4. 🚨 Alerts & Voice Detection (`/alerts`)
Manages emergency dispatches and voice triggers.
- Provides `/api/sos/activate/` to dispatch emergency alerts to trusted contacts.
- Exposes a voice detection endpoint that scans incoming transcripts for keywords (`"HELP"`, `"EMERGENCY"`, `"SAVE ME"`).

### 5. 🗺️ Safe Route Intelligence (`/routes`)
Provides proactive pathing using geometric intelligence.
- The **`SafeRouteEngine`** ranks routes based on the Haversine distance to known safe zones (hospitals, police stations), time of day, and area isolation metrics.

---

## 🛠️ Technology Stack

- **Framework**: Django 5.x & Django REST Framework
- **Machine Learning**: `scikit-learn`, `pandas`, `numpy` (Gradient Boosting Classifier)
- **Geospatial Processing**: `geopy` (Haversine formula for safe zones)
- **Authentication**: JWT (JSON Web Tokens)
- **Database**: SQLite (Development) / Ready for PostgreSQL (Production)

---

## 🚀 Setup & Installation

### Prerequisites
- Python 3.10+
- `pip` package manager

### 1. Environment Setup
```bash
cd backend
python -m venv .venv
# On Windows
.\.venv\Scripts\activate
# On Mac/Linux
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Database Migrations
Initialize the database models across all 5 apps.
```bash
python manage.py makemigrations accounts tracking agents alerts routes
python manage.py migrate
```

### 4. Run the Development Server
```bash
python manage.py runserver 8000
```
The API will be available at `http://localhost:8000/api/`.

---

## 📡 Key API Endpoints

### ML & Intelligence
- `POST /api/risk/analyze/` - Submit live telemetry to get ML risk scores, confidence, and factors.
- `GET /api/risk/history/` - Retrieve historical risk logs.

### Agentic AI
- `POST /api/agent/trigger/` - Pass a risk score to let the autonomous engine dictate the next defensive workflow (e.g., dispatch SOS, start recording).

### Emergency Response
- `POST /api/sos/activate/` - Manually trigger a full emergency workflow.
- `POST /api/voice/detect/` - Submit speech transcripts for keyword-based SOS activation.

### Proactive Navigation
- `POST /api/routes/safest/` - Submit an origin and destination to get ranked route recommendations based on safety algorithms.

### Authentication
- `POST /api/register/` - Create a new user account.
- `POST /api/login/` - Obtain JWT Access and Refresh tokens.

---

## 🛡️ Integration Notes for Frontend

- All endpoints are strictly nested under the `/api/` prefix.
- The legacy mock endpoints (`/start-tracking`, `/location`, `/risk`) have been retained for backward compatibility but should be deprecated in favor of the new ML endpoints.
- The ML API returns snake_case JSON by default.

---
*SafeHer AI Backend - Built for the Hackathon Pitch.*
