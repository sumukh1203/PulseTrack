from fastapi import APIRouter

from app.api.v1 import applications, events, health, metrics

api_v1_router = APIRouter(prefix="/v1")
api_v1_router.include_router(health.router)
api_v1_router.include_router(applications.router)
api_v1_router.include_router(events.router)
api_v1_router.include_router(metrics.router)
