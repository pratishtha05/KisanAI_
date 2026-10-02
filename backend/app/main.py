from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth, users, farms, weather, farm_advisor, disease_detection
from app.core.config import settings
from app.db.database import Base
from app.db.session import engine

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(farms.router, prefix=f"{settings.API_V1_STR}/farms", tags=["farms"])
app.include_router(weather.router, prefix=f"{settings.API_V1_STR}/weather", tags=["weather"])
app.include_router(farm_advisor.router, prefix=f"{settings.API_V1_STR}/farm-advisor", tags=["farm-advisor"])
app.include_router(disease_detection.router, prefix=f"{settings.API_V1_STR}/disease-detection", tags=["disease-detection"])

@app.get("/")
def root():
    return {"message": "Welcome to KisanAI API"}
