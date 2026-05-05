# SafeHer AI – Local Development Setup

Follow these steps to get SafeHer AI running on your machine. The system has two parts: a React frontend (Vite) and a Django REST backend.

## Prerequisites

- **Node.js 18+** – [Download here](https://nodejs.org/)
- **Python 3.10+** – [Download here](https://www.python.org/)
- **Git** – [Download here](https://git-scm.com/)
- **Terminal/Command Prompt**

## Part 1: Frontend Setup (React + Vite)

### Step 1: Install Node Dependencies

```bash
npm install
```

This installs React, Vite, Tailwind, shadcn/ui, and all UI dependencies into `node_modules/`.

### Step 2: Start the Dev Server

```bash
npm run dev
```

**Expected output:**
```
> vite

  VITE v5.4.19  ready in XXX ms

  ➜  Local:   http://localhost:8080/
  ➜  Press h to show help
```

**Open http://localhost:8080 in your browser.** You should see the SafeHer AI landing page.

## Part 2: Backend Setup (Django REST)

### Step 1: Navigate to Backend Folder

```bash
cd backend
```

### Step 2: Create a Virtual Environment

**On Windows:**
```bash
python -m venv .venv
.\venv\Scripts\activate
```

**On macOS/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

**Expected:** Your prompt should now show `(.venv)` prefix.

### Step 3: Install Python Dependencies

```bash
pip install -r requirements.txt
```

This installs Django 5.1, Django REST Framework, and CORS support.

### Step 4: Start the Django Server

```bash
python manage.py runserver 8000
```

**Expected output:**
```
Starting development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.
```

## Part 3: Test the Integration

### With Both Servers Running:

1. **Frontend:** http://localhost:8080 should be open in your browser
2. **Backend:** http://localhost:8000 should be running (no UI, just API endpoints)
3. **Click "Start tracking"** on the dashboard
4. You should see:
   - Safety score updates
   - Live location with moving pin on the map
   - "Restart tracking" button appears
   - Demo toggles (Night mode, Isolated area) become active

### Testing SOS Flow:

1. Click the red **SOS** button
2. Watch the toast notification: "SOS sent"
3. Check browser console for network call to `POST /api/location`
4. Backend responds with `"alertTriggered": true` if risk > 70

### Testing Demo Mode:

1. Click **"Night mode on"** button
2. Risk score should increase
3. Click **"Isolated area on"** button
4. Risk score increases further
5. If risk > 70, alert auto-triggers

## Troubleshooting

### "npm run dev" fails
- **Check:** `npm -v` returns 9.0+
- **Fix:** Run `npm install` again
- **If still failing:** Delete `node_modules/` and `package-lock.json`, then run `npm install`

### "python manage.py runserver" fails
- **Check:** `python --version` returns 3.10+
- **Fix:** Make sure you activated the venv (prompt shows `(.venv)`)
- **If still failing:** Delete `.venv/` folder and create a new one

### Frontend shows "Cannot reach /api"
- **Check:** Is the Django server running on port 8000?
- **Check:** Are you accessing frontend on http://localhost:8080 (not 127.0.0.1)?
- **Fix:** Restart both servers

### Port already in use (8080 or 8000)
- **Check:** Run `lsof -i :8080` (macOS/Linux) or `netstat -ano | findstr :8080` (Windows)
- **Fix:** Kill the process or use a different port: `npm run dev -- --port 3000`

## File Structure

```
Codeastra_DYP.mumbai/
├── src/
│   ├── lib/
│   │   └── safeher-api.ts          # API client
│   ├── components/safeher/
│   │   ├── SafeHerProvider.tsx     # State provider
│   │   ├── Dashboard.tsx            # Updated: wired to state
│   │   ├── LiveTracking.tsx         # Updated: wired to state
│   │   └── ...
│   ├── App.tsx                      # Updated: SafeHerProvider wrapper
│   └── main.tsx
├── backend/
│   ├── safeher_ai/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── asgi.py
│   │   └── wsgi.py
│   ├── tracking/
│   │   ├── views.py                # API endpoints
│   │   ├── services.py             # Risk calculation
│   │   ├── state.py                # In-memory state
│   │   └── urls.py
│   ├── manage.py
│   └── requirements.txt
├── vite.config.ts                  # Updated: /api proxy
├── README.md
└── docs/
    ├── SETUP.md                    # This file
    ├── ARCHITECTURE.md
    ├── API_REFERENCE.md
    └── DEVELOPMENT.md
```

## Next Steps

- **For developers:** Read `docs/ARCHITECTURE.md` to understand the system design
- **For API integration:** Read `docs/API_REFERENCE.md` for endpoint details
- **For contributors:** Read `docs/DEVELOPMENT.md` for workflow and git practices
