from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.db.session import engine, Base, SessionLocal
from app.services.risk.rule_engine import init_rule_configurations
from app.api.routes import (
    auth, institutions, fdr, documents, risk,
    graph, cases, maturity, audit, reports, analytics
)

# Auto-create tables for instant SQLite or PostgreSQL zero-friction setup
Base.metadata.create_all(bind=engine)

# Seed default rule configs
with SessionLocal() as db:
    init_rule_configurations(db)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_FULL_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers under /api/v1
api_prefix = settings.API_V1_STR
app.include_router(auth.router, prefix=api_prefix)
app.include_router(institutions.router, prefix=api_prefix)
app.include_router(fdr.router, prefix=api_prefix)
app.include_router(documents.router, prefix=api_prefix)
app.include_router(risk.router, prefix=api_prefix)
app.include_router(graph.router, prefix=api_prefix)
app.include_router(cases.router, prefix=api_prefix)
app.include_router(maturity.router, prefix=api_prefix)
app.include_router(audit.router, prefix=api_prefix)
app.include_router(reports.router, prefix=api_prefix)
app.include_router(analytics.router, prefix=api_prefix)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENV
    }

