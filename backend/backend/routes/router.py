from fastapi import APIRouter
from backend.routes.user_router import user_router
from backend.routes.general_router import general_router

router = APIRouter()

router.include_router(user_router)
router.include_router(general_router)