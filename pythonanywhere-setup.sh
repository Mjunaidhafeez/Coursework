#!/usr/bin/env bash
set -euo pipefail

USERNAME="${1:-$USER}"
APP_DIR="${HOME}/Coursework"
VENV_DIR="${HOME}/.virtualenvs/mba-portal"

if [ ! -d "${APP_DIR}/backend" ]; then
  echo "Clone the repo first: git clone https://github.com/Mjunaidhafeez/Coursework.git ${APP_DIR}"
  exit 1
fi

mkdir -p "${HOME}/.virtualenvs"
if [ ! -d "${VENV_DIR}" ]; then
  python3.10 -m venv "${VENV_DIR}" || python3 -m venv "${VENV_DIR}"
fi

if command -v npm >/dev/null 2>&1; then
  cd "${APP_DIR}/frontend"
  npm ci
  npm run build
  rm -rf node_modules
fi

# shellcheck disable=SC1091
. "${VENV_DIR}/bin/activate"
pip install --upgrade pip
pip install -r "${APP_DIR}/backend/requirements.txt"

cat > "${APP_DIR}/backend/.env" <<EOF
DEBUG=False
SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(48))")
USE_SQLITE=True
DATABASE_URL=
ALLOWED_HOSTS=.pythonanywhere.com,${USERNAME}.pythonanywhere.com
CSRF_TRUSTED_ORIGINS=https://${USERNAME}.pythonanywhere.com
CORS_ALLOWED_ORIGINS=https://${USERNAME}.pythonanywhere.com
SECURE_SSL_REDIRECT=False
USE_S3=False
EOF

cd "${APP_DIR}/backend"
python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py seed_data

echo
echo "Done. Web tab settings:"
echo "  Source code: ${APP_DIR}/backend"
echo "  Working directory: ${APP_DIR}/backend"
echo "  Virtualenv: ${VENV_DIR}"
echo "  Static: /static/ -> ${APP_DIR}/backend/staticfiles"
echo "  Media:  /media/  -> ${APP_DIR}/backend/media"
echo "  Site: https://${USERNAME}.pythonanywhere.com"
