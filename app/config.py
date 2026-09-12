from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "postgresql+psycopg://planner:planner@db:5432/planner"
    jwt_secret: str = "change-me-in-.env"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 12

    # Usuário único: este é um app pessoal, não multiusuário. admin_password_hash
    # é um hash bcrypt (gerar com app/security.py:hash_password), nunca a senha crua.
    admin_user: str = "arthur"
    admin_password_hash: str = ""

    # Liga o seed de demonstração (nomes falsos, via Faker) quando o banco está
    # vazio. Nunca usar dado real aqui — ver README, seção Privacidade.
    seed_demo_data: bool = True

    # Origem do frontend em dev (Vite). Uso pessoal, um usuário só — não vale a
    # complexidade de uma lista configurável por ambiente.
    frontend_origin: str = "http://localhost:5173"


settings = Settings()
