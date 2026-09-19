# Scout Group

Phase 1 development foundation for the Scout Group public website and management system.

## Architecture

- `frontend/`: React, TypeScript, Vite, Tailwind CSS, Axios, and React Router dependencies.
- `backend/`: Django REST API project configured for MongoDB and development CORS.
- The browser communicates with Django through the centralized client in `frontend/src/api/axios.ts`.

Frontend composition is component-based:

- `frontend/src/App.tsx` handles route selection, shared API state, and event callbacks.
- `frontend/src/components/` contains reusable navigation, hero, authentication, membership, events, and admin components.
- `frontend/src/pages/` contains route-specific public page content.
- `frontend/src/api/` contains typed API clients and no UI markup.

The current phase intentionally includes only the API health check. Authentication, memberships, admin workflows, and domain features will be added incrementally in later phases. Attendance and deployment infrastructure are out of scope.

The current development slice also includes events at `/api/events/`. Published upcoming events are public; event creation and editing require an Admin token. Authenticated users can register at `/api/events/{id}/register/` when registration is open and capacity remains.

## Local setup

1. Copy `.env.example` to `.env` and adjust values if needed.
2. Install frontend dependencies with `cd frontend` and `npm install`.
3. Install backend dependencies with `cd backend` and `python -m pip install -r requirements.txt`.
4. Start Django from `backend` with `python manage.py runserver 8000`.
5. Start Vite from `frontend` with `npm run dev`.

The development URLs are:

- Frontend: http://localhost:5173
- Backend health API: http://localhost:8000/api/health/

MongoDB should be available at the `MONGODB_URI` configured in the backend environment. No SQLite database is configured.

## Checks

- Backend: `python manage.py check`
- Frontend: `npm run lint` and `npm run build`