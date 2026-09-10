from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def garantir_extensao_vector() -> None:
    """A coluna Vector (app/models.py, Fragmento) precisa da extensão pgvector
    já existir no banco antes do create_all. A imagem `pgvector/pgvector`
    embute a extensão; só falta ativá-la, uma vez, por banco."""
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
