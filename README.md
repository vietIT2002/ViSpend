# ViSpend

> A personal expense manager that turns a photo of a receipt into a ready-to-save transaction — and learns your categories as you go. Bilingual (English / Tiếng Việt), free to run.

ViSpend records income and expenses, organizes them by category, tracks monthly budgets,
and shows clear cash‑flow insights. It is split into a **FastAPI** backend (auth, data,
aggregation, the receipt pipeline) and a **React + Vite** frontend.

---

## Highlights

- 📸 **Scan a receipt or transfer screenshot** → the form is pre‑filled (amount, date,
  type, category, method, note) for you to review and save. OCR runs **in your browser**
  (`tesseract.js`) — free, private, no API keys.
- 🧠 **Self‑learning categories** — every time you save or correct a transaction, a
  per‑user model learns "this merchant/text → this category". It gets more accurate the
  more you use it. Cold start is covered by built‑in keyword rules.
- 🌐 **Bilingual UI (EN / VI)** — switch language anytime; the choice is saved to your
  profile. Default categories are localized.
- 🧾 **Budgets** — per‑category monthly limits with safe/watch/tight/over alerts, "days
  left" and daily‑pace hints, and one‑click copy from last month.
- 📊 **Dashboard insights** — net balance, income/expense, savings rate, cash‑flow and
  category charts, weekly pattern, top spending days, and recent activity.
- 🔐 **Accounts** — email/username + password or Google sign‑in, JWT auth, rate limiting.

> The receipt reader is free and heuristic, so always glance at the pre‑filled form before
> saving — nothing is created automatically. The read/classify layer is pluggable, so a
> vision LLM can be added later without changing the UI.

## Tech stack

**Frontend:** React 19 · TypeScript · Vite · Tailwind CSS v4 · TanStack Query ·
React Hook Form · Zod · Recharts · React Router · tesseract.js

**Backend:** Python · FastAPI · SQLModel / SQLAlchemy · PostgreSQL · Alembic ·
scikit‑learn (category learning) · JWT (`python-jose`) · `passlib[argon2]` · SlowAPI · Pytest

---

## Quick start

Prerequisites: **Python 3.12**, **Node 18+**, and a PostgreSQL database
(local, or a free [Supabase](https://supabase.com) project).

### 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
Copy-Item .env.example .env           # then edit .env (see below)
python -m alembic upgrade head        # create / update the database schema
uvicorn app.main:app --reload --port 8080
```

Health check: <http://127.0.0.1:8080/api/health> → `{"status":"ok"}`

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. In development Vite proxies `/api` to the backend, so no
extra config is needed.

---

## Environment variables (`backend/.env`)

```env
# Required
DATABASE_URL=postgresql+psycopg://postgres:<url-encoded-password>@<host>:5432/postgres?sslmode=require
JWT_SECRET=replace-with-a-strong-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
CORS_ORIGINS=http://localhost:5173

# Optional — only needed to store/view receipt images (Supabase Storage)
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_KEY=<service_role / sb_secret_ key>   # server-side only, never in the frontend
SUPABASE_BUCKET=receipts
```

- For Supabase Postgres, copy the connection string from
  **Project Settings → Database → Connection string** (use the Transaction Pooler URL if
  your network has no direct IPv6).
- Receipt **scanning + auto‑categorization work without Supabase.** The Supabase variables
  are only for **saving/viewing the original image**; create a **private** Storage bucket
  named to match `SUPABASE_BUCKET`. Without them, image upload returns a clear
  "storage not configured" message and everything else keeps working.

---

## How the receipt feature works

```
image ─▶ tesseract.js (browser OCR) ─▶ POST /api/transactions/parse
            │                                   │
            │                       regex: amount · date · type · method · note
            │                       classify category: history → ML → keyword rules
            ▼                                   ▼
   raw OCR text kept              pre-filled "New transaction" modal (you review)
            │                                   │ Save
            └──────────────▶ transaction stored (with OCR text) ──▶ model trains on it
                                                                      (gets smarter)
```

- **Amount** handles e‑wallet screenshots (`33.000đ`) and paper receipts with bare totals
  by anchoring on "Tổng tiền thanh toán / Thanh toán / Trả qua".
- **Category** prefers an exact match from your history, then a per‑user scikit‑learn
  model, then keyword rules (e.g. *Highlands* → Food, *Grab* → Transport, *WinMart* →
  Shopping); otherwise it’s left blank for you to choose — and your choice is learned.
- **Method** is inferred from wallet/bank keywords (ShopeePay/MoMo/CK/bank → Transfer,
  Visa/card → Card, else Cash).

---

## Project structure

```text
backend/
  app/
    auth/  budgets/  categories/  dashboard/  transactions/
    intake/        # OCR-text parsing, keyword rules, self-learning classifier, storage
    core/  main.py  models.py  schemas.py
  alembic/         # database migrations
  tests/
frontend/
  src/
    components/  features/  lib/  lib/i18n/  types/
```

---

## Testing & build

```powershell
# Backend tests
cd backend; .\.venv\Scripts\Activate.ps1; python -m pytest -v

# Frontend production build (also type-checks)
cd frontend; npm run build
```

---

## Deployment

- **Backend (Render):** the repo includes `render.yaml`. Set `DATABASE_URL`, `JWT_SECRET`,
  `CORS_ORIGINS` (your frontend origin), and the optional `SUPABASE_*` vars. The start
  command runs `alembic upgrade head` then launches Uvicorn.
- **Frontend (Vercel):** set the project root to `frontend` and `VITE_API_URL` to your
  deployed API base URL (e.g. `https://your-api.onrender.com/api`); then add that frontend
  domain to the backend `CORS_ORIGINS`.

---

## Contributing / for newcomers

- Backend changes follow TDD — add a test under `backend/tests/` and run `pytest`.
- Frontend strings go through the i18n dictionaries (`frontend/src/lib/i18n/en.ts` is the
  source of truth; `vi.ts` must mirror it or the build fails).
- Keep secrets out of the repo and out of chats/logs; rotate anything that leaks.
- Run the backend tests and `npm run build` before opening a PR.

## License

Private project unless a license is added.
