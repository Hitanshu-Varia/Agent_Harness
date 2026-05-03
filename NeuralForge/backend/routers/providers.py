from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Dict

from database import get_db
from models.models import ApiKey
from schemas.schemas import ApiKeyCreate, ApiKeySchema, ModelInfo, UsageStats, ApiKeyTest
from services.api_manager import api_manager, fernet

router = APIRouter()

@router.post("/keys", response_model=ApiKeySchema)
async def add_key(data: ApiKeyCreate, db: AsyncSession = Depends(get_db)):
    try:
        new_key = await api_manager.add_key(db, data.provider, data.key_value, data.alias)

        # Determine masked value
        if len(data.key_value) > 8:
            masked = data.key_value[:3] + "..." + data.key_value[-4:]
        else:
            masked = "***" + data.key_value[-4:] if len(data.key_value) >= 4 else "***"

        return ApiKeySchema(
            id=new_key.id,
            alias=new_key.alias,
            provider=new_key.provider,
            is_active=new_key.is_active,
            rate_limit_reset_at=new_key.rate_limit_reset_at,
            calls_today=new_key.calls_today,
            tokens_today=new_key.tokens_today,
            created_at=new_key.created_at,
            updated_at=new_key.updated_at,
            key_masked=masked
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/keys/{key_id}")
async def remove_key(key_id: str, db: AsyncSession = Depends(get_db)):
    success = await api_manager.remove_key(db, key_id)
    if not success:
        raise HTTPException(status_code=404, detail="Key not found")
    return {"success": True}

@router.get("/keys", response_model=List[ApiKeySchema])
async def list_keys(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ApiKey))
    keys = result.scalars().all()

    response = []
    for k in keys:
        try:
            raw_key = fernet.decrypt(k.key_value.encode('utf-8')).decode('utf-8')
            if len(raw_key) > 8:
                masked = raw_key[:3] + "..." + raw_key[-4:]
            else:
                masked = "***" + raw_key[-4:] if len(raw_key) >= 4 else "***"
        except:
            masked = "***"

        response.append(ApiKeySchema(
            id=k.id,
            alias=k.alias,
            provider=k.provider,
            is_active=k.is_active,
            rate_limit_reset_at=k.rate_limit_reset_at,
            calls_today=k.calls_today,
            tokens_today=k.tokens_today,
            created_at=k.created_at,
            updated_at=k.updated_at,
            key_masked=masked
        ))
    return response

@router.get("/{provider}/models", response_model=List[ModelInfo])
async def list_models(provider: str):
    models = await api_manager.list_available_models(provider)
    return [ModelInfo(id=m["id"], name=m["name"]) for m in models]

@router.post("/keys/test")
async def test_key(data: ApiKeyTest):
    result = await api_manager.test_key(data.provider, data.key_value)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Key test failed"))
    return {"success": True}

@router.get("/usage", response_model=Dict[str, UsageStats])
async def get_usage(db: AsyncSession = Depends(get_db)):
    stats = await api_manager.get_usage_stats(db)
    return {k: UsageStats(**v) for k, v in stats.items()}
