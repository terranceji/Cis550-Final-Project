from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from ..config.config import settings

# Creates connection pool to your AWS RDS database
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True  # Shows SQL queries in console, set to False in production
)

# Creates session factory for database operations
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close() 