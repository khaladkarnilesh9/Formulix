from .base import *  # noqa: F403
DEBUG = True
if not CORS_ALLOWED_ORIGINS:  # noqa: F405
    CORS_ALLOWED_ORIGINS = [f"http://{host}:{port}" for host in ("localhost", "127.0.0.1") for port in (3000, 3001, 3002, 3003, 5173)]
if not CSRF_TRUSTED_ORIGINS:  # noqa: F405
    CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS
