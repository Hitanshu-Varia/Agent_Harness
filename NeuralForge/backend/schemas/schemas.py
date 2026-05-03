from pydantic import BaseModel

class UserSchema(BaseModel):
    id: str
    username: str
    email: str

class ProjectSchema(BaseModel):
    id: str
    name: str

class AgentSchema(BaseModel):
    id: str
    name: str

class TaskSchema(BaseModel):
    id: str
    title: str

from typing import Optional, List, Dict
from datetime import datetime

class ApiKeyCreate(BaseModel):
    provider: str
    key_value: str
    alias: str

class ApiKeyTest(BaseModel):
    provider: str
    key_value: str

class ApiKeySchema(BaseModel):
    id: str
    alias: str
    provider: str
    is_active: int
    rate_limit_reset_at: Optional[datetime] = None
    calls_today: int
    tokens_today: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    key_masked: str  # e.g., "sk-...1234"

class ModelInfo(BaseModel):
    id: str
    name: str

class UsageStats(BaseModel):
    calls: int
    tokens_in: int
    tokens_out: int
    total_tokens: int

class ConversationSchema(BaseModel):
    id: str
    title: str
