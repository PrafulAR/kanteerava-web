# Scout Group

Phase 1 development foundation for the Scout Group public website and management system.

## Architecture

- `frontend/`: React, TypeScript, Vite, Tailwind CSS, Axios, and React Router dependencies.
- `backend/`: Django REST API project configured for MongoDB and development CORS.
- The browser communicates with Django through the centralized client in `frontend/src/api/axios.ts`.

The production target is Vercel for the frontend, a Render Web Service running
Django through Gunicorn, a fresh MongoDB Atlas database, Cloudinary for durable
uploaded media, and Brevo for transactional authentication email.

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
5. Initialize a fresh database with `cd backend` and `python manage.py migrate`. The `prepare_auth_storage` command is only for backfilling security defaults in legacy account documents.
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

- Deploy `frontend/` to Vercel. Its `vercel.json` sends direct SPA route requests to `index.html`. Set only public browser values there: `VITE_API_URL=https://<render-domain>/api` and `VITE_GOOGLE_CLIENT_ID`.
- Deploy `backend/` as a Render Web Service with `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`. Set `TRUST_X_FORWARDED_PROTO=True` only because Render controls the forwarded HTTPS protocol header.
- Set `DEBUG=False`, a unique long `SECRET_KEY`, the real comma-separated `ALLOWED_HOSTS`, and the HTTPS Vercel origin in `CORS_ALLOWED_ORIGINS` (and `CSRF_TRUSTED_ORIGINS` if cookie/CSRF-protected endpoints are added).
- Set `VITE_API_URL` to the public HTTPS API URL and register the production frontend origin for the Google web client ID. Never expose a Google client secret, Brevo key, database URI, or Django secret through a `VITE_` variable.
- Enable `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, and `CSRF_COOKIE_SECURE` after HTTPS is terminated correctly. Enable HSTS gradually with `SECURE_HSTS_SECONDS`, then include subdomains/preload only after confirming every relevant host supports HTTPS.
- Use a fresh, secured MongoDB Atlas database with authentication, TLS, backups, and restricted network access. Local `scout_group` data is not a production migration source.
- Set `USE_CLOUDINARY=True` on Render and provide the backend-only `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and secret `CLOUDINARY_API_SECRET`. Existing `ImageField` and `FileField` uploads retain their current paths. In Cloudinary Security settings, enable **Allow delivery of PDF and ZIP files** before verifying Event circular and Newsroom attachment delivery.
- Run `python manage.py collectstatic --noinput` during the Render build. WhiteNoise serves collected Django static assets only; Cloudinary serves user-uploaded images and PDFs. Render's ephemeral filesystem is not used for persistent media.
- Keep `USE_CLOUDINARY=False` locally to retain `FileSystemStorage`, `MEDIA_ROOT`, `MEDIA_URL`, and the existing `DEBUG`-only development media route.
- Configure the production Brevo sender, secret management, monitoring, and log retention outside source control. Run `python manage.py check --deploy`, the backend tests, and the frontend production build with the deployment environment before release.

Before launch, perform one real Cloudinary image upload and delivery check, one
real PDF upload and delivery check, and one delete check. Replacing or deleting
a model file does not automatically guarantee deletion of the previous
Cloudinary asset; orphan-media cleanup is a separate follow-up and is not part
of this deployment-preparation stage.
