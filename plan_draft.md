1. **Backend Authentication & Models**
   - Add `hashed_password` to `User` model in `backend/models/models.py`.
   - Update Alembic migrations for `hashed_password`.
   - Create `backend/core/security.py` for hashing and JWT utilities.
   - Create `backend/core/dependencies.py` for `get_current_user`.
   - Implement `backend/routers/auth.py` for register, login, refresh, logout, me. Token storage via httpOnly cookies.
   - Update `main.py` to route `auth.router` and others under `/api` prefix.

2. **Backend Error Handling & Health Check**
   - Create `backend/core/exceptions.py` with custom exceptions.
   - Add global exception handler in `main.py`.
   - Add `GET /api/health` endpoint in `main.py`.

3. **Frontend API & Auth Pages**
   - Create `frontend/src/lib/axios.ts` with interceptors (401 refresh, 429 toast, 503 banner).
   - Implement `frontend/src/app/(auth)/login/page.tsx` and `frontend/src/app/(auth)/register/page.tsx`.
   - Install `react-hot-toast` and implement toast notification system.

4. **Frontend Skeletons & WebSocket Reconnect**
   - Create Skeletons using Tailwind `animate-pulse` (AgentCard, MessageThread, KnowledgeBase).
   - Implement WebSocket reconnection logic with exponential backoff.

5. **Frontend Keyboard Shortcuts & PWA**
   - Install/implement `useHotkeys` (or `react-hotkeys-hook`) for global shortcuts. Add tooltips.
   - Add `next-pwa` to `next.config.mjs`, create `manifest.json`, generate SVG icons, create offline fallback page.
   - Create Status dashboard `frontend/src/app/status/page.tsx`.

6. **Production Dockerfiles & CI/CD**
   - Create `frontend/Dockerfile` and `backend/Dockerfile` (multi-stage).
   - Create `docker-compose.prod.yml` and `nginx/nginx.conf`.
   - Create `.github/workflows/ci.yml`.

7. **Documentation**
   - Complete `README.md` with instructions, architecture, env vars, etc.

8. **Pre-commit Steps**
   - Run `pre_commit_instructions` and fix any issues to ensure the codebase passes all checks.
