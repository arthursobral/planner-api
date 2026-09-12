from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import Base, SessionLocal, engine
from app.routers import (
    acompanhamentos,
    anotacoes,
    atividades,
    auth,
    eventos,
    pauta,
    pessoas,
    pontos,
    reunioes,
    todos,
)
from app.seed import banco_esta_vazio, seed_demo


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ponytail: create_all em vez de Alembic — schema simples, sem dado em
    # produção ainda. Trocar por migrações no dia em que evoluir o schema sem
    # poder recriar o banco do zero.
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


for router in (auth, pessoas, atividades, todos, acompanhamentos, anotacoes, pontos, reunioes, eventos, pauta):
    app.include_router(router.router)
