from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.seguranca import auth_manager, gera_token, usuario_atual, valida_novo_usuario

router = APIRouter(tags=["autenticação"])


class Login(BaseModel):
    username: str
    password: str


class Cadastro(BaseModel):
    full_name: str
    username: str
    email: str
    password: str


def existe_admin() -> bool:
    return any(u["role"] == "admin" for u in auth_manager.get_all_users())


@router.post("/login")
def login(dados: Login):
    usuario = auth_manager.authenticate_user(dados.username.strip(), dados.password)
    if not usuario:
        raise HTTPException(status_code=401,
                            detail="Nome de usuário ou senha inválidos, ou conta desativada.")
    return {"token": gera_token(usuario["id"]), "usuario": usuario}


@router.get("/cadastro")
def info_cadastro():
    """Informa se a próxima conta criada será a de administrador."""
    return {"primeiro_admin": not existe_admin()}


@router.post("/cadastro", status_code=201)
def cadastro(dados: Cadastro):
    valida_novo_usuario(dados.full_name, dados.username, dados.email, dados.password)
    # O cadastro público sempre cria usuários comuns; a única exceção é a primeira conta
    # de uma instalação sem administradores, para que alguém possa gerenciar o sistema.
    role = "user" if existe_admin() else "admin"
    if not auth_manager.register_user(dados.username.strip(), dados.email.strip(),
                                      dados.password, dados.full_name.strip(), role):
        raise HTTPException(status_code=409, detail="Nome de usuário ou email já cadastrados.")
    return {"role": role}


@router.get("/me")
def me(usuario: dict = Depends(usuario_atual)):
    return usuario
