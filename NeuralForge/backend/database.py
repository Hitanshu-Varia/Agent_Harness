from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from config import settings
import redis.asyncio as redis
import chromadb

engine = create_async_engine(settings.DATABASE_URL, echo=True)

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

chroma_client = chromadb.AsyncHttpClient(host=settings.CHROMA_HOST, port=settings.CHROMA_PORT)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with SessionLocal() as session:
        yield session
