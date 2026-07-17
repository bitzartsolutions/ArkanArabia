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

- `PORT=3000`
- `ADMIN_USERNAME=admin`
- `ADMIN_PASSWORD=your_secure_password`
- `ADMIN_REQUIRE_USERNAME=false`

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
