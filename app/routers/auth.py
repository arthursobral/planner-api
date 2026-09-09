from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.config import settings
from app.schemas import Token
from app.security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends()) -> Token:
    """Usuário único (este é um app pessoal, não multiusuário): usuário e hash da
    senha vêm do `.env`, nunca de uma tabela. Ver app/security.py:hash_password
    para gerar `ADMIN_PASSWORD_HASH`."""
    senha_ok = bool(settings.admin_password_hash) and verify_password(form.password, settings.admin_password_hash)
    if form.username != settings.admin_user or not senha_ok:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuário ou senha inválidos")
    return Token(access_token=create_access_token(form.username))
