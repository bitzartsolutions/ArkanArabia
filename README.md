# Arkan Arabia Atomic Structure

## Folder structure

- `frontend/`
- `frontend/index.html`
- `frontend/assets/`
- `frontend/components/`
- `frontend/pages/`
- `backend/`
- `backend/server.js`
- `backend/data/`
- `backend/uploads/`

## Environment variables

1. Copy `backend/.env.example` to `backend/.env`
2. Set values:

- `PORT=4000`
- `FRONTEND_ORIGIN=https://your-frontend-domain.com` (optional, supports comma-separated list)
- `ADMIN_USERNAME=admin`
- `ADMIN_PASSWORD=your_secure_password`
- `ADMIN_REQUIRE_USERNAME=false`

If `FRONTEND_ORIGIN` is empty, backend CORS allows all origins.

## Frontend API config (no env vars needed)

Frontend pages read API base URL from `frontend/assets/js/runtime-config.js`.

Default behavior:

- On localhost: API base URL is `http://localhost:4000`
- On hosted domains: API base URL is same-origin (expects reverse proxy for `/api`)

Optional override without env vars:

- Add `<meta name="arkan-api-base-url" content="https://your-backend-domain.com">` in the page `<head>`, or
- Set `window.ARKAN_CONFIG = { apiBaseUrl: 'https://your-backend-domain.com' }` before loading page scripts.

Current production fallback:

- If frontend host ends with `.vercel.app`, API base URL defaults to `https://arkanarabia.onrender.com`.

## Vercel deployment

- Deploy using repo root with `vercel.json` (routes map to `frontend/` static pages).
- This avoids running `backend/server.js` as a Vercel Serverless Function.

## Run

1. `npm install`
2. `npm start`
3. Open `http://localhost:3000`

## Notes

- Backend serves frontend statically from `frontend/`.
- Admin login API reads credentials from `backend/.env`.
- If `ADMIN_REQUIRE_USERNAME=true`, login requires both username and password.
- If `ADMIN_REQUIRE_USERNAME=false`, password-only login still works for existing gallery/blog modals.
- Main dashboard page is `frontend/pages/admin.html`.
# ArkanArabia
# ArkanArabia
# ArkanArabia
