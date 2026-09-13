# Paste this into the PythonAnywhere WSGI file.
# Change only the username on the next line.
USERNAME = "YOUR_USERNAME"

import os
import sys
from pathlib import Path

PROJECT_HOME = Path("/home") / USERNAME / "Coursework"
BACKEND_HOME = PROJECT_HOME / "backend"

for path in (str(PROJECT_HOME), str(BACKEND_HOME)):
    if path not in sys.path:
        sys.path.insert(0, path)

from dotenv import load_dotenv

load_dotenv(BACKEND_HOME / ".env")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from django.core.wsgi import get_wsgi_application

application = get_wsgi_application()
