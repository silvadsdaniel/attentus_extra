from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from api import rotas_auth, rotas_otimizacao, rotas_usuarios
from api.seguranca import RAIZ

app = FastAPI(title="Attentus API", description="Otimização da força de trabalho")

app.include_router(rotas_auth.router, prefix="/api/auth")
app.include_router(rotas_usuarios.router, prefix="/api/usuarios")
app.include_router(rotas_otimizacao.router, prefix="/api/otimizacao")


@app.get("/api/saude", tags=["infraestrutura"])
def saude():
    """Verificação de saúde usada pela plataforma de hospedagem."""
    return {"status": "ok"}


# Em produção, a própria API serve o frontend compilado (cd frontend && npm run build).
# Durante o desenvolvimento, o Vite serve o frontend e repassa /api para cá.
DIST = RAIZ / "frontend" / "dist"

if DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{caminho:path}", include_in_schema=False)
    def frontend(caminho: str):
        if caminho.startswith("api/"):
            raise HTTPException(status_code=404)
        arquivo = (DIST / caminho).resolve()
        if caminho and arquivo.is_file() and arquivo.is_relative_to(DIST):
            return FileResponse(arquivo)
        # rotas do React Router (/painel, /otimizacao...) caem no index.html
        return FileResponse(DIST / "index.html")
