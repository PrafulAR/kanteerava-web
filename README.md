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

Authentication includes verified email registration, purpose-bound email OTPs, password recovery with session invalidation, and Google Identity Services. Membership, admin, events, gallery, achievements, and newsroom features use the same account and permission model.

The current development slice also includes events at `/api/events/`. Published upcoming events are public; event creation and editing require an Admin token. Authenticated users can register at `/api/events/{id}/register/` when registration is open and capacity remains.

## Local setup

1. Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env`.
2. Configure the backend-only Brevo API key and verified sender for verification/reset emails. Set the same Google web client ID in `GOOGLE_OAUTH_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`; neither the Brevo API key nor any client secret belongs in the frontend.
3. Install frontend dependencies with `cd frontend` and `npm install`.
4. Install backend dependencies with `cd backend` and `python -m pip install -r requirements.txt`.
5. Prepare the authentication indexes/defaults with `cd backend` and `python manage.py prepare_auth_storage`.
6. Start Django from `backend` with `python manage.py runserver 8000`.
7. Start Vite from `frontend` with `npm run dev`.

The development URLs are:

- Frontend: http://localhost:5173
- Backend health API: http://localhost:8000/api/health/

MongoDB should be available at the `MONGODB_URI` configured in the backend environment. No SQLite database is configured.

## Checks

- Backend: `python manage.py check`
- Backend tests: `python manage.py test accounts.tests memberships.tests gallery.tests events.tests`
- Frontend: `npm run lint` and `npm run build`

## Production configuration

Keep the local values above for development. Before deployment:

- Set `DEBUG=False`, a unique long `SECRET_KEY`, the real comma-separated `ALLOWED_HOSTS`, and the HTTPS frontend origin in `CORS_ALLOWED_ORIGINS` (and `CSRF_TRUSTED_ORIGINS` if cookie/CSRF-protected endpoints are added).
- Set `VITE_API_URL` to the public HTTPS API URL and register the production frontend origin for the Google web client ID. Never expose a Google client secret, Brevo key, database URI, or Django secret through a `VITE_` variable.
- Enable `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, and `CSRF_COOKIE_SECURE` after HTTPS is terminated correctly. Enable HSTS gradually with `SECURE_HSTS_SECONDS`, then include subdomains/preload only after confirming every relevant host supports HTTPS.
- Use a secured production MongoDB deployment with authentication, TLS, backups, and restricted network access.
- Serve collected static files and uploaded media through a production web server or object-storage/CDN setup. Django serves uploaded media only while `DEBUG=True`.
- Configure the production Brevo sender, secret management, monitoring, and log retention outside source control. Run `python manage.py check --deploy`, the backend tests, and the frontend production build with the deployment environment before release.
