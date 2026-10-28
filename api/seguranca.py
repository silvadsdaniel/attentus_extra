import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from dados.banco import AuthManager

RAIZ = Path(__file__).resolve().parent.parent

# Em produção, defina ATTENTUS_SECRET_KEY. Sem ela, uma chave aleatória é gerada a cada
# inicialização e os usuários precisam entrar de novo quando o servidor reinicia.
CHAVE_SECRETA = os.environ.get("ATTENTUS_SECRET_KEY") or secrets.token_hex(32)
ALGORITMO = "HS256"
VALIDADE_TOKEN = timedelta(hours=8)

EMAIL_VALIDO = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

auth_manager = AuthManager(db_path=str(RAIZ / "dados" / "usuarios.db"))
esquema_bearer = HTTPBearer(auto_error=False)


def gera_token(usuario_id: int) -> str:
    """Gera o token de acesso (JWT) de um usuário."""
    agora = datetime.now(timezone.utc)
    return jwt.encode({"sub": str(usuario_id), "iat": agora, "exp": agora + VALIDADE_TOKEN},
                      CHAVE_SECRETA, algorithm=ALGORITMO)


def busca_usuario(usuario_id: int) -> dict | None:
    """Busca um usuário pelo id."""
    return next((u for u in auth_manager.get_all_users() if u["id"] == usuario_id), None)


def usuario_atual(credenciais: HTTPAuthorizationCredentials | None = Depends(esquema_bearer)) -> dict:
    """Dependência que exige um token válido de um usuário ativo."""
    nao_autorizado = HTTPException(status_code=401, detail="Sua sessão expirou. Entre novamente.")
    if credenciais is None:
        raise nao_autorizado
    try:
        payload = jwt.decode(credenciais.credentials, CHAVE_SECRETA, algorithms=[ALGORITMO])
        usuario = busca_usuario(int(payload["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError):
        raise nao_autorizado
    # o usuário é relido do banco a cada requisição, então desativações e trocas de
    # função valem na hora
    if not usuario or not usuario["is_active"]:
        raise nao_autorizado
    return usuario


def exige_admin(usuario: dict = Depends(usuario_atual)) -> dict:
    """Dependência que exige um administrador."""
    if usuario["role"] != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem fazer isso.")
    return usuario


def valida_novo_usuario(full_name: str, username: str, email: str, password: str):
    """Valida os dados de cadastro, com mensagens prontas para a interface."""
    if not all([full_name.strip(), username.strip(), email.strip(), password]):
        raise HTTPException(status_code=400, detail="Preencha todos os campos.")
    if not EMAIL_VALIDO.match(email.strip()):
        raise HTTPException(status_code=400, detail="Digite um email válido.")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="A senha deve ter pelo menos 6 caracteres.")
