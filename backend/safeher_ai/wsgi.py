"""WSGI config for SafeHer AI."""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "safeher_ai.settings")

application = get_wsgi_application()
