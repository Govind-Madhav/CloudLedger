from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import engine, Base, SessionLocal
from backend.app.services.seed import seed_demo_data

# Import API routers
from backend.app.api.auth import router as auth_router
from backend.app.api.analytics import router as analytics_router
from backend.app.api.students import router as students_router
from backend.app.api.resources import router as resources_router
from backend.app.api.activity import router as activity_router
from backend.app.api.costs import router as costs_router
from backend.app.api.system import router as system_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema
    Base.metadata.create_all(bind=engine)
    # Seed default admin and demo data
    db = SessionLocal()
    try:
        seed_demo_data(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AWS Student Cloud Usage & Cost Monitoring System API",
    lifespan=lifespan
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(analytics_router, prefix=settings.API_V1_PREFIX)
app.include_router(students_router, prefix=settings.API_V1_PREFIX)
app.include_router(resources_router, prefix=settings.API_V1_PREFIX)
app.include_router(activity_router, prefix=settings.API_V1_PREFIX)
app.include_router(costs_router, prefix=settings.API_V1_PREFIX)
app.include_router(system_router, prefix=settings.API_V1_PREFIX)

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "mock_aws": settings.MOCK_AWS
    }

@app.get("/", tags=["Health"])
def root():
    return {
        "message": "Welcome to CloudLedger API. Access documentation at /docs",
        "health": "/health"
    }
