#!/usr/bin/env bash
set -o errexit

# Render Python images do not include Node. Install it for the Vite build.
export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20

cd frontend
npm ci
npm run build
cd ../backend

pip install -r requirements.txt
python manage.py collectstatic --noinput
