import os

import bcrypt

SENHA_TESTE = "teste-senha"

# Precisa vir antes de qualquer import de `app.*`, `app.config.settings` é um
# singleton criado na importação do módulo. Atribuição direta, não `setdefault`:
# rodando via `docker compose run` (dev local), o container já herda
# ADMIN_USER/ADMIN_PASSWORD_HASH reais do `.env` via `env_file:` — setdefault
# não pisaria neles, e os testes de auth tentariam logar com o usuário de teste
# contra o hash de produção.
#
# O hash é calculado com `bcrypt` puro, não com `app.security.hash_password`:
# importar `app.security` aqui dispararia `from app.config import settings`
# ANTES desta linha rodar, congelando o singleton com o ADMIN_PASSWORD_HASH
# antigo — exatamente o bug que isto evita.
os.environ["DATABASE_URL"] = os.environ.get(
    "DATABASE_URL", "postgresql+psycopg://planner:planner@localhost:5432/planner"
)
os.environ["SEED_DEMO_DATA"] = "false"
os.environ["JWT_SECRET"] = os.environ.get("JWT_SECRET", "teste-secret")
os.environ["ADMIN_USER"] = "teste"
os.environ["ADMIN_PASSWORD_HASH"] = bcrypt.hashpw(SENHA_TESTE.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base, get_db
from app.main import app


@pytest.fixture()
def db_session():
    engine = create_engine(os.environ["DATABASE_URL"])
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.rollback()
        for tabela in reversed(Base.metadata.sorted_tables):
            session.execute(tabela.delete())
        session.commit()
        session.close()


@pytest.fixture()
def client(db_session):
    app.dependency_overrides[get_db] = lambda: (yield db_session)
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def auth_headers(client):
    resp = client.post("/auth/login", data={"username": "teste", "password": SENHA_TESTE})
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
