from sqlalchemy import Column, String, Integer, DateTime
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)

class Project(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)

class Agent(Base):
    __tablename__ = "agents"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)

class Task(Base):
    __tablename__ = "tasks"
    id = Column(String, primary_key=True, index=True)
    title = Column(String)

class ApiKey(Base):
    __tablename__ = "api_keys"
    id = Column(String, primary_key=True, index=True)
    key_value = Column(String)
    alias = Column(String)
    provider = Column(String, index=True)
    is_active = Column(Integer, default=1)  # 1 for active, 0 for inactive
    rate_limit_reset_at = Column(DateTime, nullable=True)
    calls_today = Column(Integer, default=0)
    tokens_today = Column(Integer, default=0)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)

class LlmCallLog(Base):
    __tablename__ = "llm_call_logs"
    id = Column(String, primary_key=True, index=True)
    provider = Column(String, index=True)
    model = Column(String)
    tokens_in = Column(Integer, default=0)
    tokens_out = Column(Integer, default=0)
    latency_ms = Column(Integer, default=0)
    agent_id = Column(String, nullable=True)
    timestamp = Column(DateTime)

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(String, primary_key=True, index=True)
    title = Column(String)
