# Student Coursework Submission Portal (MBA)

Production-oriented full-stack scaffold for MBA semesters 1-8 coursework workflows:

- Backend: Django + DRF + JWT + PostgreSQL
- Frontend: React + Vite + Material UI
- Auth: role-based access control (Super Admin, Teacher, Student)
- Storage: local media, optional S3-compatible backend
- Docs: OpenAPI/Swagger via drf-spectacular

## Key Features

- Multi-semester structure (1-8), courses linked to semesters
- Coursework types: assignment, quiz, exam, presentation, project
- Individual and group submission support
- Deadline and late submission logic
- Feedback + grading with admin override path
- Audit log and in-app notifications model
- Filtering, pagination, search-ready DRF endpoints
- Role-scoped dashboards and navigation

## Project Structure

```text
backend/
  config/
  apps/
    accounts/      # Custom user, profiles, auth, RBAC permissions
    academics/     # Semester, course, enrollment
    groups/        # Group + member + approvals
    coursework/    # Coursework, submission, grading
    common/        # Audit log, notifications, shared pagination/mixins
frontend/
  src/
    api/
    context/
    routes/
    layouts/
    pages/
      admin/
      teacher/
      student/
```

## Backend Setup

1. Create venv and install dependencies:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

2. Configure environment:

```bash
copy .env.example .env
```

3. Ensure PostgreSQL DB exists with values in `.env`.

4. Run migrations + seed:

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py seed_data
```

5. Start backend:

```bash
python manage.py runserver
```

Backend URLs:

- API root modules:
  - `http://localhost:8000/api/accounts/`
  - `http://localhost:8000/api/academics/`
  - `http://localhost:8000/api/groups/`
  - `http://localhost:8000/api/coursework/`
- Auth:
  - `POST /api/auth/login/`
  - `POST /api/auth/refresh/`
  - `GET /api/accounts/me/`
- Swagger:
  - `http://localhost:8000/api/docs/swagger/`

## Frontend Setup

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend app:

- `http://localhost:5173`

## Demo Seed Accounts

- Super Admin: `admin` / `AdminPass123!`
- Teacher: `teacher1` / `TeacherPass123!`
- Student: `student1` / `StudentPass123!`

## API Modules Implemented

- `accounts/users/` user management + roles
- `academics/semesters/`, `academics/courses/`, `academics/enrollments/`
- `groups/groups/`, `groups/members/`
- `coursework/courseworks/`, `coursework/submissions/`, `coursework/feedback/`

## Deploy on PythonAnywhere (free, no card)

1. Create a free account at [pythonanywhere.com](https://www.pythonanywhere.com).
2. Open a **Bash** console and run:

```bash
git clone https://github.com/Mjunaidhafeez/Coursework.git ~/Coursework
bash ~/Coursework/pythonanywhere-setup.sh YOUR_USERNAME
```

3. Open the **Web** tab → **Add a new web app** → **Manual configuration** → Python 3.10.
4. Set **Source code** and working directory to `/home/YOUR_USERNAME/Coursework/backend`.
5. Set **Virtualenv** to `/home/YOUR_USERNAME/.virtualenvs/mba-portal`.
6. Open the WSGI file, delete everything, paste `pythonanywhere_wsgi.py`, and put your username in `USERNAME`.
7. Add static files: `/static/` → `/home/YOUR_USERNAME/Coursework/backend/staticfiles` and `/media/` → `/home/YOUR_USERNAME/Coursework/backend/media`.
8. Click **Reload**. Site: `https://YOUR_USERNAME.pythonanywhere.com`

## Deploy on Render (free)

1. Create a free Postgres database at [Neon](https://neon.tech) and copy the connection string.
2. Push this repo to GitHub.
3. In [Render](https://dashboard.render.com), click **New +** → **Blueprint** and select the repo, or create a **Web Service** with:
   - **Runtime:** Python
   - **Build command:** `bash render-build.sh`
   - **Start command:** `cd backend && python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 120`
4. Set environment variables:
   - `DEBUG=False`
   - `USE_SQLITE=False`
   - `SECRET_KEY` = a long random string
   - `DATABASE_URL` = Neon connection string
   - `DB_SSL_REQUIRE=True`
   - `ALLOWED_HOSTS=.onrender.com`
   - `SECURE_SSL_REDIRECT=False`
5. After the first deploy succeeds, open the Render **Shell** and seed demo users:

```bash
cd backend
python manage.py seed_data
```

The live URL is `https://<service-name>.onrender.com`. Uploaded files are stored on the server disk and are lost when the free instance restarts unless you later enable S3/R2 (`USE_S3=True`). Render may ask for a card even on the free plan.

## Notes for Production Hardening

- Add background worker (Celery/RQ) for reminders and notifications
- Add websocket layer (Django Channels) for real-time dashboard updates
- Add file version history table per submission
- Configure CI, test suite, and security headers (`SECURE_*`)
- Configure cloud object storage and CDN for media delivery
