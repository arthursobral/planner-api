from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import settings
from app.db import Base, SessionLocal, engine, garantir_extensao_vector
from app.routers import (
    acompanhamentos,
    anotacoes,
    atividades,
    auth,
    eventos,
    pauta,
    pessoas,
    pontos,
    rag,
    reunioes,
    todos,
)
from app.seed import banco_esta_vazio, seed_demo


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ponytail: create_all em vez de Alembic — schema simples, sem dado em
    # produção ainda. Trocar por migrações no dia em que evoluir o schema sem
    # poder recriar o banco do zero.
    garantir_extensao_vector()
    Base.metadata.create_all(bind=engine)
    if settings.seed_demo_data:
        db = SessionLocal()
        try:
            if banco_esta_vazio(db):
                seed_demo(db)
        finally:
            db.close()
    yield


app = FastAPI(title="planner-api", lifespan=lifespan)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


for router in (auth, pessoas, atividades, todos, acompanhamentos, anotacoes, pontos, reunioes, eventos, pauta, rag):
    app.include_router(router.router)
