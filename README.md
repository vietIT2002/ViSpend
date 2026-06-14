# Vispend

Vispend is a personal expense management web app for recording income and expenses, organizing transactions by category, and viewing clear cash-flow insights.

The app is split into a FastAPI backend and a React/Vite frontend. The backend owns authentication, authorization, persistence, and aggregation logic. The frontend provides the responsive product interface.

## Features

- Email/password registration and login with JWT authentication
- Protected user-specific transactions and categories
- Manual income and expense entry
- Inline custom category creation while recording a transaction
- Category management with icons and colors
- Dashboard summary for income, expenses, and net balance
- Period selector for this month, last month, 3 months, 6 months, and custom ranges
- Category spend charts, spending mix pie chart, and cash-flow bar chart
- Responsive UI for desktop and mobile

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- TanStack Query
- React Hook Form
- Zod
- Recharts
- React Router

### Backend

- Python
- FastAPI
- SQLModel / SQLAlchemy
- PostgreSQL
- Alembic
- JWT auth with `python-jose`
- Password hashing with `passlib[argon2]`
- SlowAPI rate limiting
- Pytest

## Project Structure

```text
backend/
  app/
    auth/
    budgets/
    categories/
    core/
    dashboard/
    transactions/
    main.py
    models.py
    schemas.py
  alembic/
  tests/
  requirements.txt

frontend/
  src/
    components/
    features/
    lib/
    types/
    App.tsx
    main.tsx
  package.json
```

## Environment Variables

Create `backend/.env` from `backend/.env.example`.

```env
DATABASE_URL=postgresql+psycopg://postgres:<url-encoded-password>@<host>:5432/postgres?sslmode=require
JWT_SECRET=replace-with-a-strong-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
CORS_ORIGINS=http://localhost:5173
```

For Supabase, use the PostgreSQL connection string from:

```text
Supabase Dashboard -> Project Settings -> Database -> Connection string
```

Use the Transaction Pooler connection string if your local network does not support direct IPv6 database connections.

The frontend defaults to calling `/api`, which Vite proxies to the backend during local development.

## Local Development

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8080
```

Health check:

```text
http://127.0.0.1:8080/api/health
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Verification

Run backend tests:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m pytest -v
```

Build frontend:

```powershell
cd frontend
npm run build
```

## Deployment Notes

### Backend

The repository includes `render.yaml` for deploying the FastAPI backend as a Render Blueprint.

Required Render environment variables:

- `DATABASE_URL`: Supabase Transaction Pooler URL, using the `postgresql+psycopg://` scheme.
- `JWT_SECRET`: strong random secret. The blueprint can generate this automatically.
- `JWT_ALGORITHM`: `HS256`.
- `ACCESS_TOKEN_EXPIRE_MINUTES`: `15`.
- `CORS_ORIGINS`: deployed frontend origin, for example `https://vispend.vercel.app`.

Render start command:

```bash
python -m alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Frontend

The frontend is a Vite SPA. The repository includes `frontend/vercel.json` for Vercel.

When importing the repository in Vercel:

- Set the project root directory to `frontend`.
- Set `VITE_API_URL` to the deployed backend API base URL.

```env
VITE_API_URL=https://your-api-domain.com/api
```

After Vercel provides the frontend domain, add that domain to the backend `CORS_ORIGINS` value.

## Security Notes

- Do not commit `.env`, local databases, logs, or API keys.
- Use a strong production `JWT_SECRET`.
- Use HTTPS in production.
- Restrict `CORS_ORIGINS` to trusted frontend domains.
- Rotate any credential that may have been shared in chat or logs.

## License

Private project unless a license is added.
