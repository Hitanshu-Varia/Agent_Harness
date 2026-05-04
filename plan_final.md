1. **Backend Authentication DB Updates**
   - Add `hashed_password` column to `User` model in `backend/models/models.py`. Verify with `read_file`.
   - Update Alembic migrations for `hashed_password` and run migration locally to ensure DB applies correctly.

2. **Backend Security Core**
   - Create `backend/core/security.py` using `passlib[bcrypt]` for password hashing and `python-jose` for JWT utility functions. Verify with `read_file`.

3. **Backend Dependencies Core**
   - Create `backend/core/dependencies.py` with `get_current_user` dependency logic. Verify with `read_file`.

4. **Backend Authentication Endpoints**
   - Implement `backend/routers/auth.py` for `register`, `login`, `refresh`, `logout`, and `me` endpoints. Use `Response.set_cookie` for `httpOnly` cookies (`access_token` and `refresh_token`). Store blacklist tokens in Redis upon logout. Verify with `read_file`.

5. **Backend Error Exceptions**
   - Implement `backend/core/exceptions.py` with custom exception classes: `AgentException`, `CapacityExceededException`, `AllKeysExhaustedException`, `MemoryException`, `ProviderException`. Verify with `read_file`.

6. **Backend Router & Error Handler Fixes**
   - Update `backend/main.py` to route `auth.router`, `system.router`, `projects.router`, etc., under an `/api` prefix (except standard websocket routes). Add global exception handler. Add `GET /api/health` endpoint. Verify with `read_file`.

7. **Frontend Packages & Interceptor**
   - Install `axios` and `react-hot-toast` via `npm install axios react-hot-toast`. Verify with `cat package.json`.
   - Create `frontend/src/lib/api/client.ts` configuring an `axios` instance to `/api` and adding interceptors for 401 (refresh token), 429 (rate limit toast with retry delay), and 503 (service unavailable banner). Verify with `read_file`.

8. **Frontend Login & Register Pages**
   - Create `frontend/src/app/(auth)/login/page.tsx` with a clean centered card design ("Sign in with password"). Verify with `read_file`.
   - Create `frontend/src/app/(auth)/register/page.tsx` with a clean centered card design. Verify with `read_file`.

9. **Frontend Toast & Error Boundaries Setup**
   - Modify `frontend/src/app/layout.tsx` to wrap the app with `Toaster` component from `react-hot-toast`. Verify with `read_file`.
   - Create `frontend/src/components/ErrorBoundary.tsx` and modify `frontend/src/app/layout.tsx` to wrap major sections in React Error Boundaries. Verify with `read_file`.

10. **Frontend Toast Triggers**
    - Update `frontend/src/store/projectStore.ts` inside `handleSocketEvent` to trigger `toast` popups for events: Agent spawned, Agent error, Task plan created. Verify with `read_file`.
    - Update `frontend/src/components/settings/ApiKeyManager.tsx` to show toast when an API key is successfully added. Verify with `read_file`.
    - Update `frontend/src/components/memory/KnowledgeBase.tsx` to trigger toast on memory compressed. Verify with `read_file`.

11. **Frontend Skeleton Components**
    - Create skeleton components in `frontend/src/components/ui/skeletons.tsx` (using `animate-pulse`): `AgentCardSkeleton`, `MessageThreadSkeleton`, `KnowledgeBaseSkeleton`. Verify with `read_file`.

12. **Frontend WebSocket Reconnect**
    - Update `frontend/src/lib/ws/useProjectSocket.ts` to show "Reconnecting..." toast on disconnect and use exponential backoff for max 5 retries. Verify with `read_file`.

13. **Frontend Keyboard Shortcuts**
    - Install `react-hotkeys-hook` via `npm install react-hotkeys-hook`. Verify with `cat package.json`.
    - Update `frontend/src/app/providers.tsx` to define global shortcuts using `useHotkeys` (Cmd+K, Cmd+Enter, Cmd+., Escape, Cmd+B, Cmd+Shift+M). Verify with `read_file`.
    - Add tooltip hints (using `title` or simple tooltip component) to buttons in `frontend/src/components/layout/TopBar.tsx`, `frontend/src/components/layout/Sidebar.tsx`, and `frontend/src/components/layout/RightSidebar.tsx`. Verify with `read_file`.

14. **Frontend PWA Setup**
    - Install `next-pwa` via `npm install next-pwa`. Verify with `cat package.json`. Rename `frontend/next.config.mjs` to `frontend/next.config.js` and update for PWA support. Verify with `read_file`.
    - Create `frontend/public/manifest.json`, generate SVG icons, and create an offline fallback page in `frontend/src/app/offline/page.tsx`. Verify with `read_file`.

15. **Frontend Status Page**
    - Create `frontend/src/app/status/page.tsx` for simple status dashboard showing service health. Verify with `read_file`.

16. **Production Dockerfiles**
    - Create `frontend/Dockerfile` (multi-stage). Verify with `read_file`.
    - Create `backend/Dockerfile` (multi-stage). Verify with `read_file`.

17. **Production Docker Compose & Nginx**
    - Create `docker-compose.prod.yml` mapping built images and removing volume mounts. Verify with `read_file`.
    - Create `nginx/nginx.conf` routing `/`, `/api`, and `/ws` correctly. Verify with `read_file`.

18. **CI/CD Configuration**
    - Create `.github/workflows/ci.yml` running `pytest` for backend, and `npm run build` for frontend, and publishing docker images. Verify with `read_file`.

19. **Documentation**
    - Complete `README.md` with instructions, architecture, env vars, etc. Verify with `read_file`.

20. **Testing**
    - Run standard tests to ensure nothing was broken (`pytest` for backend, `npm run build` and `npm run lint` for frontend).

21. **Pre-commit Steps**
    - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
