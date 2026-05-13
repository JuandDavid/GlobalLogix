"""
Configuración principal del proyecto Django.

Este archivo controla las apps instaladas, la base de datos,
los archivos estáticos, los templates y variables importantes
como la clave de Azure Maps.
"""

from pathlib import Path
from decouple import config

# Ruta base del proyecto
BASE_DIR = Path(__file__).resolve().parent.parent

# Clave secreta de Django
SECRET_KEY = "django-insecure-logistics-dashboard-demo-key"

# En desarrollo se deja en True para ver errores detallados
DEBUG = True

ALLOWED_HOSTS = []

# Aplicaciones instaladas en el proyecto
INSTALLED_APPS = [
    # Apps internas de Django
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Librerías externas
    "rest_framework",

    # App propia del proyecto
    "logistics",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

# Configuración de templates HTML
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",

        # Carpeta global donde estarán base.html e index.html
        "DIRS": [BASE_DIR / "templates"],

        "APP_DIRS": True,

        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# Base de datos SQLite para mantener el proyecto simple
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# Validadores de contraseña por defecto de Django
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Idioma y zona horaria
LANGUAGE_CODE = "es-co"

TIME_ZONE = "America/Bogota"

USE_I18N = True

USE_TZ = True

# Archivos estáticos: CSS, JS e imágenes
STATIC_URL = "static/"

AZURE_MAPS_KEY = config("AZURE_MAPS_KEY", default="")

STATICFILES_DIRS = [
    BASE_DIR / "static",
]

# Campo automático por defecto para modelos
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
