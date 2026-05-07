# SafeHer AI – Development Guide

## Git Workflow

### Branch Naming

```
feature/[description]    – New feature
  feature/auth-layer
  feature/trusted-contacts

bugfix/[description]     – Bug fix
  bugfix/sms-notification-timeout

docs/[description]       – Documentation
  docs/api-examples

refactor/[description]   – Code refactoring
  refactor/api-client-types
```

### Pull Request Process

1. **Create a branch from main**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Commit with clear messages**
   ```bash
   git commit -m "Add auth layer for user sessions"
   ```

3. **Push to origin**
   ```bash
   git push origin feature/my-feature
   ```

4. **Create a Pull Request**
   - Title: "Add auth layer for user sessions"
   - Description: Explain the changes, link issues
   - Link any related issues or Jira tickets

5. **Code Review**
   - At least 1 team member reviews
   - Address feedback
   - Merge when approved

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` – New feature
- `fix` – Bug fix
- `docs` – Documentation
- `refactor` – Code refactoring
- `test` – Adding tests
- `chore` – Build, dependencies

**Example:**
```
feat(tracking): add autonomous alert logic

When risk score exceeds 70, automatically trigger alerts
to trusted contacts and emergency services. Adds new field
"alertChannel" to distinguish between SOS and autonomous alerts.

Fixes: ISSUE-42
```

---

## Frontend Development

### File Organization

```
frontend/src/
├── components/
│   ├── ui/               – shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── ...
│   └── safeher/          – SafeHer-specific components
│       ├── SafeHerProvider.tsx  – STATE (do not modify lightly)
│       ├── Dashboard.tsx
│       ├── LiveTracking.tsx
│       ├── Hero.tsx
│       ├── AlertAndSOS.tsx
│       └── Footer.tsx
├── lib/
│   ├── safeher-api.ts    – API client (do not modify lightly)
│   └── utils.ts
├── hooks/
│   └── [custom hooks]
├── pages/
│   ├── Index.tsx         – Main landing page
│   └── NotFound.tsx
└── main.tsx
```

### Frontend Ownership Rules

- Put UI and interaction changes in `frontend/src/components/` or `frontend/src/pages/`
- Keep API calls in `frontend/src/lib/safeher-api.ts` so the backend contract stays centralized
- Keep state orchestration in `frontend/src/components/safeher/SafeHerProvider.tsx`
- Prefer small reusable components over large page-only blocks when a pattern repeats

### Adding a New Component

**Example: Add a "Trusted Contacts" panel**

1. **Create the component:**
   ```bash
  touch frontend/src/components/safeher/TrustedContacts.tsx
   ```

2. **Import useSafeHer if you need state:**
   ```tsx
   import { useSafeHer } from "./SafeHerProvider";

   export const TrustedContacts = () => {
     const { sessionId, alertTriggered } = useSafeHer();

     return (
       <section className="glass rounded-[2rem] p-6">
         <h3>Trusted Contacts</h3>
         {/* Render contacts here */}
       </section>
     );
   };
   ```

3. **Add to the page (Index.tsx):**
   ```tsx
   import { TrustedContacts } from "@/components/safeher/TrustedContacts";

   const Index = () => (
     <main className="min-h-screen">
       <Hero />
       <Dashboard />
       <TrustedContacts />  {/* Add here */}
       <LiveTracking />
       <AlertAndSOS />
       <Footer />
     </main>
   );
   ```

4. **Test locally:**
   ```bash
  cd frontend
  npm run dev
   ```
   Open http://localhost:8080 and verify the component renders.

### Styling Guidelines

**Use Tailwind + custom color tokens:**

```tsx
// Good: Uses theme tokens
<div className="glass rounded-[2rem] p-6 bg-surface text-soft-highlight">
  Safe
</div>

// Bad: Hard-coded colors
<div className="rounded-lg p-6 bg-blue-500 text-white">
  Safe
</div>
```

**Available tokens (frontend/src/index.css):**
- `bg-deep`, `bg-surface`, `bg-background`
- `text-soft-highlight`, `text-neutral-light`, `text-green-accent`
- `border-soft-highlight`, `border-green-accent`
- `.glass` class for glassmorphism cards

### State Management Best Practices

**1. Use useSafeHer() only where needed:**
```tsx
// Good: Hook only in components that need state
const Dashboard = () => {
  const { safetyScore } = useSafeHer();
  return <div>{safetyScore}</div>;
};

// Bad: Passing through multiple layers
const Parent = () => {
  const state = useSafeHer();  // Don't hoist state unnecessarily
  return <Child state={state} />;
};
```

**2. Don't call hooks conditionally:**
```tsx
// Good
const Component = () => {
  const { isTracking } = useSafeHer();
  return isTracking ? <Tracking /> : <Idle />;
};

// Bad
const Component = ({ condition }) => {
  if (condition) {
    const state = useSafeHer();  // Breaks Rules of Hooks
  }
};
```

---

## Backend Development

### File Organization

```
backend/
├── safeher_ai/
│   ├── settings.py       – Django config (modify for prod env)
│   ├── urls.py           – Root URL routing
│   ├── asgi.py, wsgi.py  – Server entry points
│   └── __init__.py
├── tracking/
│   ├── apps.py
│   ├── views.py          – API endpoints (modify endpoints here)
│   ├── services.py       – Risk calculation (modify algorithm here)
│   ├── state.py          – Session storage (replace with DB models)
│   ├── urls.py           – App-specific routes
│   └── migrations/       – Database migrations (auto-generated)
├── manage.py
└── requirements.txt
```

### Backend Ownership Rules

- Put request/response handling in `backend/tracking/views.py`
- Put scoring and business rules in `backend/tracking/services.py`
- Put session shape and transient state in `backend/tracking/state.py`
- Keep Django project settings isolated in `backend/safeher_ai/`
- Avoid mixing frontend concerns into backend modules, even for demo shortcuts

### Adding a New Endpoint

**Example: Add a "get-session-history" endpoint**

1. **Add view in backend/tracking/views.py:**
   ```python
   @api_view(["GET"])
   def session_history(request):
       """Return all sessions for the current user."""
       # For now, return an empty list
       sessions = []
       return Response(sessions)
   ```

2. **Add route in backend/tracking/urls.py:**
   ```python
   urlpatterns = [
       path("start-tracking", start_tracking),
       path("location", location_update),
       path("risk", current_risk),
       path("session-history", session_history),  # Add here
   ]
   ```

3. **Test:**
   ```bash
   curl http://localhost:8000/api/session-history
   ```

### Modifying the Risk Algorithm

**File: backend/tracking/services.py**

Find the `risk_from_context()` function:

```python
def risk_from_context(*, demo_night, demo_isolated, location, source, sos_triggered):
    time_risk = 35 if demo_night else 15  # Adjust these numbers
    area_risk = 45 if demo_isolated else 20
    manual_risk = 90 if sos_triggered else 6

    risk_score = min(100, max(0, time_risk + area_risk + manual_risk))
    # ...
```

**To increase night-time risk:**
```python
time_risk = 50 if demo_night else 15  # Changed from 35 to 50
```

**Test the change:**
```bash
# Run backend
python manage.py runserver 8000

# In another terminal, test
curl -X POST http://localhost:8000/api/start-tracking \
  -H "Content-Type: application/json" \
  -d '{"demoNight": true, "demoIsolated": false, ...}'

# Check the riskScore in response
```

### Django Management Commands

**Common commands:**

```bash
# Create migrations (after model changes)
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create a superuser (admin)
python manage.py createsuperuser

# Open Django shell
python manage.py shell

# Run tests
python manage.py test
```

---

## Testing

### Frontend Tests

**Run tests:**
```bash
npm run test
```

**Run tests in watch mode:**
```bash
npm run test:watch
```

**Add a test for SafeHer state (frontend/src/components/safeher/SafeHerProvider.test.tsx):**
```typescript
import { render, screen } from "@testing-library/react";
import { SafeHerProvider } from "./SafeHerProvider";

test("SafeHerProvider initializes with safe state", () => {
  render(
    <SafeHerProvider>
      <div>{/* Test component */}</div>
    </SafeHerProvider>
  );
  // Add assertions
});
```

### Backend Tests

**Create test file (backend/tracking/tests.py):**
```python
from django.test import TestCase
from .services import risk_from_context

class RiskCalculationTest(TestCase):
    def test_night_increases_risk(self):
        snapshot = risk_from_context(
            demo_night=True,
            demo_isolated=False,
            location=...,
            source="auto",
            sos_triggered=False
        )
        self.assertGreater(snapshot.risk_score, 50)
```

**Run tests:**
```bash
python manage.py test tracking
```

---

## Performance & Debugging

### Frontend Debugging

**Browser DevTools:**
- Open http://localhost:8080
- Press F12 to open DevTools
- **Network tab:** Monitor API calls to /api/...
- **Console tab:** Check for errors
- **React DevTools:** Inspect component state

**Common issues:**

| Issue | Debug Steps |
|-------|-------------|
| API not called | Network tab → check /api URL, status code |
| State not updating | React DevTools → check SafeHerProvider state |
| Location not moving | Console → check syncLocation() interval |

### Backend Debugging

**Django Debug Toolbar:**
```python
# Add to settings.py (dev only)
DEBUG = True
INSTALLED_APPS += ["debug_toolbar"]
MIDDLEWARE += ["debug_toolbar.middleware.DebugToolbarMiddleware"]
INTERNAL_IPS = ["127.0.0.1"]
```

**Print debugging:**
```python
# In backend/tracking/views.py
print(f"Received request: {request.data}")
print(f"Calculated risk: {snapshot.risk_score}")
```

**Django shell for live testing:**
```bash
python manage.py shell

>>> from tracking.services import risk_from_context
>>> snapshot = risk_from_context(demo_night=True, demo_isolated=False, ...)
>>> print(snapshot.risk_score)
```

---

## Deployment Checklist

- [ ] All tests passing
- [ ] Code reviewed and merged
- [ ] Environment variables configured (SECRET_KEY, DEBUG=False, etc.)
- [ ] Database migrated
- [ ] Static files collected
- [ ] CORS origins restricted (not ALLOW_ALL)
- [ ] HTTPS enabled
- [ ] Error logging configured
- [ ] Performance monitored (New Relic, Datadog, etc.)

---

## Getting Help

**Team communication:**
- Slack: #safeher-ai
- Issues: GitHub/Jira
- Documentation: This guide + API_REFERENCE.md

**Common questions:**
- "Where do I add a new API endpoint?" → backend/tracking/views.py
- "How do I access the current safety state?" → useSafeHer() hook
- "Where is the risk algorithm?" → backend/tracking/services.py
- "Why is my component not updating?" → Check if you're using useSafeHer() correctly
