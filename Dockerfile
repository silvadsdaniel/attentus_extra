# ---------------------------------------------------------------------------------------
# 1) Compila o frontend React
FROM node:22-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------------------------------------------------------------------------------------
# 2) API Python, que também serve o frontend compilado
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# o solver CBC que vem com o PuLP é ligado dinamicamente à libstdc++
RUN apt-get update \
    && apt-get install -y --no-install-recommends libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

# confere já no build que o solver roda nesta imagem (evita descobrir só na 1ª otimização)
RUN python -c "import pulp; p = pulp.LpProblem('teste', pulp.LpMinimize); x = pulp.LpVariable('x', lowBound=0, cat='Integer'); p += x; p += x >= 1; p.solve(pulp.PULP_CBC_CMD(msg=False)); assert pulp.LpStatus[p.status] == 'Optimal', pulp.LpStatus[p.status]"

COPY api/ api/
COPY dados/ dados/
COPY modelo/ modelo/
COPY utilidades/ utilidades/
COPY --from=frontend /app/frontend/dist frontend/dist

# /data é onde o disco persistente é montado. O processo roda como root (padrão do Render)
# porque o disco montado pertence ao root e o PuLP ajusta a permissão do CBC ao iniciar.
RUN mkdir -p /data
ENV ATTENTUS_DB_PATH=/data/usuarios.db
EXPOSE 8000

# um único processo: a chave de sessão e o SQLite não são compartilhados entre workers
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
