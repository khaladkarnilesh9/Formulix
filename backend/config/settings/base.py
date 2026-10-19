import os
import secrets
from pathlib import Path
from urllib.parse import unquote, urlparse
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env", override=False)
PRODUCTION = os.getenv("DJANGO_SETTINGS_MODULE", "").endswith("production")
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    if PRODUCTION:
        raise RuntimeError("DJANGO_SECRET_KEY is required in production.")
    secret_file = BASE_DIR / ".dev-secret"
    if not secret_file.exists():
        secret_file.write_text(secrets.token_urlsafe(64), encoding="utf-8")
    SECRET_KEY = secret_file.read_text(encoding="utf-8").strip()
DEBUG = False
ALLOWED_HOSTS = [value.strip() for value in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,testserver").split(",") if value.strip()]
INSTALLED_APPS = [
    "django.contrib.admin", "django.contrib.auth", "django.contrib.contenttypes",
    "django.contrib.sessions", "django.contrib.messages", "django.contrib.staticfiles",
    "rest_framework", "django_filters", "drf_spectacular", "corsheaders",
    *["apps." + name for name in [
        "core", "accounts", "taxonomy", "ingredients", "manufacturers", "brands",
        "formulations", "products", "regulatory", "patents", "documents", "workspace", "imports", "audit"]],
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware", "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware", "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware", "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware", "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
ROOT_URLCONF = "config.urls"
TEMPLATES = [{"BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [BASE_DIR / "templates"], "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.request", "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages"]}}]
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"
database_url = os.getenv("DATABASE_URL", "")
if database_url:
    url = urlparse(database_url)
    if url.scheme not in ("postgres", "postgresql"):
        raise RuntimeError("DATABASE_URL must use PostgreSQL.")
    DATABASES = {"default": {"ENGINE": "django.db.backends.postgresql", "NAME": unquote(url.path.lstrip("/")),
        "USER": unquote(url.username or ""), "PASSWORD": unquote(url.password or ""),
        "HOST": url.hostname, "PORT": url.port or 5432, "CONN_MAX_AGE": 60,
        "OPTIONS": {"sslmode": os.getenv("DB_SSLMODE", "require" if PRODUCTION else "prefer")}}}
else:
    if PRODUCTION:
        raise RuntimeError("PostgreSQL DATABASE_URL is required in production.")
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}
AUTH_USER_MODEL = "accounts.User"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
PRIVATE_MEDIA_ROOT = BASE_DIR / "private_media"
MEDIA_ROOT = PRIVATE_MEDIA_ROOT
MEDIA_URL = "/private-media/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [value.strip() for value in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",") if value.strip()]
CSRF_TRUSTED_ORIGINS = [value.strip() for value in os.getenv("CSRF_TRUSTED_ORIGINS", "").split(",") if value.strip()]
DATA_UPLOAD_MAX_MEMORY_SIZE = 12 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 2 * 1024 * 1024
MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticatedOrReadOnly"],
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend", "rest_framework.filters.SearchFilter", "rest_framework.filters.OrderingFilter"],
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.CatalogPagination", "PAGE_SIZE": 50,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.AnonRateThrottle", "rest_framework.throttling.UserRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {"anon": "300/hour", "user": "3000/hour", "catalog_anon": "60/min", "catalog_user": "120/min"},
}
SPECTACULAR_SETTINGS = {"TITLE": "Formulix Scientific Intelligence API", "VERSION": "1.0.0", "SERVE_INCLUDE_SCHEMA": False}
