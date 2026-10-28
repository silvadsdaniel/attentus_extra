from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.seguranca import auth_manager, busca_usuario, exige_admin, valida_novo_usuario

router = APIRouter(tags=["usuários"])


class NovoUsuario(BaseModel):
    full_name: str
    username: str
    email: str
    password: str
    role: Literal["admin", "user"] = "user"


class AtualizaUsuario(BaseModel):
    role: Literal["admin", "user"] | None = None
    is_active: bool | None = None


def usuario_alvo(usuario_id: int, admin: dict) -> dict:
    """Busca o usuário a ser alterado; o admin não pode alterar a própria conta."""
    usuario = busca_usuario(usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    if usuario["id"] == admin["id"]:
        raise HTTPException(status_code=400, detail="Você não pode alterar a sua própria conta.")
    return usuario


@router.get("")
def lista_usuarios(_: dict = Depends(exige_admin)):
    return auth_manager.get_all_users()


@router.post("", status_code=201)
def cria_usuario(dados: NovoUsuario, _: dict = Depends(exige_admin)):
    valida_novo_usuario(dados.full_name, dados.username, dados.email, dados.password)
    if not auth_manager.register_user(dados.username.strip(), dados.email.strip(),
                                      dados.password, dados.full_name.strip(), dados.role):
        raise HTTPException(status_code=409, detail="Nome de usuário ou email já cadastrados.")
    return {"ok": True}


@router.patch("/{usuario_id}")
def atualiza_usuario(usuario_id: int, dados: AtualizaUsuario, admin: dict = Depends(exige_admin)):
    usuario = usuario_alvo(usuario_id, admin)
    if dados.role is not None and not auth_manager.update_user_role(usuario["id"], dados.role):
        raise HTTPException(status_code=500, detail="Não foi possível alterar a função.")
    if dados.is_active is not None and not auth_manager.update_user_status(usuario["id"], dados.is_active):
        raise HTTPException(status_code=500, detail="Não foi possível alterar o status.")
    return busca_usuario(usuario_id)


@router.delete("/{usuario_id}", status_code=204)
def exclui_usuario(usuario_id: int, admin: dict = Depends(exige_admin)):
    usuario = usuario_alvo(usuario_id, admin)
    if not auth_manager.delete_user(usuario["id"]):
        raise HTTPException(status_code=500, detail="Não foi possível excluir o usuário.")
