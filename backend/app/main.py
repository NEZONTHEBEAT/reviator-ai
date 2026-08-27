from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as transaction_router

from app.core.database import Base, engine

from app.models.customer import CustomerDB
from app.models.transaction_db import TransactionDB
from app.models.recovery_action_db import RecoveryActionDB


# --------------------------------
# Create database tables
# --------------------------------

Base.metadata.create_all(
    bind=engine
)


# --------------------------------
# FastAPI Application
# --------------------------------

app = FastAPI(
    title="Reviator AI",
    description="AI-Powered Revenue Recovery Agent",
    version="1.0.0",
)


# --------------------------------
# CORS Configuration - UPDATED
# --------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5500",      # frontend port
        "http://127.0.0.1:5500",      # frontend port
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------
# Include API Routes
# --------------------------------

app.include_router(
    transaction_router
)


# --------------------------------
# Root Endpoint
# --------------------------------

@app.get("/")
async def root():

    return {
        "project": "Reviator AI",
        "description": "AI-Powered Revenue Recovery Agent",
        "tagline": "Detect. Decide. Recover.",
        "status": "running",
    }


# --------------------------------
# Health Check
# --------------------------------

@app.get("/api/health")
async def health_check():

    return {
        "status": "healthy",
        "service": "reviator-ai-backend",
    }