import os

folders = [
    "app",
    "app/api",
    "app/api/routes",
    "app/models",
    "app/schemas",
    "app/services",
    "app/db",
    "app/core"
]

files = [
    "app/main.py",
    "app/api/__init__.py",
    "app/api/routes/__init__.py",
    "app/api/routes/auth.py",
    "app/api/routes/users.py",
    "app/api/routes/farms.py",
    "app/api/routes/weather.py",
    "app/api/routes/farm_advisor.py",
    "app/api/routes/disease_detection.py",
    "app/models/__init__.py",
    "app/models/user.py",
    "app/models/farmer_profile.py",
    "app/models/farm.py",
    "app/models/disease_analysis.py",
    "app/models/farm_advisor_query.py",
    "app/schemas/__init__.py",
    "app/schemas/auth.py",
    "app/schemas/farmer.py",
    "app/schemas/farm.py",
    "app/schemas/weather.py",
    "app/schemas/farm_advisor.py",
    "app/schemas/disease_detection.py",
    "app/services/__init__.py",
    "app/services/auth_service.py",
    "app/services/otp_service.py",
    "app/services/weather_service.py",
    "app/services/farm_advisor_service.py",
    "app/services/disease_detection_service.py",
    "app/db/__init__.py",
    "app/db/database.py",
    "app/db/session.py",
    "app/core/__init__.py",
    "app/core/config.py",
    "app/core/security.py",
    "requirements.txt",
    ".env.example",
    "README.md"
]

for folder in folders:
    os.makedirs(folder, exist_ok=True)

for file in files:
    with open(file, "w") as f:
        pass

print('Backend scaffolded')
