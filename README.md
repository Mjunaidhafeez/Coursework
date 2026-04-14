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

## Notes for Production Hardening

- Add background worker (Celery/RQ) for reminders and notifications
- Add websocket layer (Django Channels) for real-time dashboard updates
- Add file version history table per submission
- Configure CI, test suite, and security headers (`SECURE_*`)
- Configure cloud object storage and CDN for media delivery
