from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(senha_crua: str) -> str:
    return bcrypt.hashpw(senha_crua.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(senha_crua: str, hash_guardado: str) -> bool:
    return bcrypt.checkpw(senha_crua.encode("utf-8"), hash_guardado.encode("utf-8"))


def create_access_token(subject: str) -> str:
    expira_em = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": subject, "exp": expira_em}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    erro_credenciais = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        usuario = payload.get("sub")
    except JWTError:
        raise erro_credenciais
    if usuario is None:
        raise erro_credenciais
    return usuario
