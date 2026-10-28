import io
import logging

import numpy as np
# O pandas só importa o openpyxl na primeira leitura de .xlsx; com dois uploads chegando ao
# mesmo tempo, essa primeira importação concorrente falha. Importar aqui evita a disputa.
import openpyxl  # noqa: F401
import pandas as pd
import pulp as plp
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field, ValidationError

from api.seguranca import RAIZ, usuario_atual
from modelo.attentus import attentus
from utilidades.utils import (ajusta_polinomio, calcula_cobertura, encontra_divisores,
                              gera_resultados, gera_tabelas, gerar_tabela_nan,
                              lista_turnos_possiveis)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["otimização"], dependencies=[Depends(usuario_atual)])

COLUNAS_OBRIGATORIAS = {
    "duracoes": ["percentagem_acumulada", "duracao_conexao"],
    "volume": ["hora_inicio", "numero_medio_ligantes"],
}


class Turno(BaseModel):
    duracao_horas: float
    custo: float = Field(ge=0)


class Parametros(BaseModel):
    horas_total: int = Field(24, ge=1, le=24)
    hora_inicial: int = Field(0, ge=0, le=23)
    minuto_inicial: int = Field(0, ge=0, le=59)
    intervalo: int = Field(15, ge=1)
    turnos: list[Turno] = Field(min_length=1)
    tempo_descanso: int = Field(0, ge=0, le=1000)
    tempo_maximo_espera: int = Field(10, ge=0, le=1000)
    grau: int = Field(2, ge=1, le=10)
    semente: int | None = Field(None, ge=0, le=2**32 - 1)


# ------------------------------------------------------------------------------------
def rotulo_turno(duracao_horas: float) -> str:
    """Rótulo de um turno no formato usado na interface (ex.: 06h30)."""
    horas = int(duracao_horas)
    minutos = int(round((duracao_horas - horas) * 60))
    return f"{horas:02}h{minutos:02}"


def le_planilha(arquivo: UploadFile, tipo: str) -> pd.DataFrame:
    """Lê e valida um CSV/XLSX enviado, com mensagens de erro para a interface."""
    nome = arquivo.filename or "arquivo"
    conteudo = arquivo.file.read()
    try:
        if nome.lower().endswith(".csv"):
            df = pd.read_csv(io.BytesIO(conteudo))
        else:
            df = pd.read_excel(io.BytesIO(conteudo))
    except Exception:
        logger.exception("Falha ao ler %s", nome)
        raise HTTPException(status_code=400,
                            detail=f"Não foi possível ler “{nome}”. Envie um arquivo CSV ou XLSX.")

    faltando = [c for c in COLUNAS_OBRIGATORIAS[tipo] if c not in df.columns]
    if faltando:
        raise HTTPException(status_code=400,
                            detail=f"Faltam colunas em “{nome}”: {', '.join(faltando)}.")

    if tipo == "duracoes":
        for coluna in COLUNAS_OBRIGATORIAS["duracoes"]:
            df[coluna] = pd.to_numeric(df[coluna], errors="coerce")
        df = df.dropna(subset=COLUNAS_OBRIGATORIAS["duracoes"]).reset_index(drop=True)
        if len(df) < 2:
            raise HTTPException(status_code=400,
                                detail=f"“{nome}” precisa de pelo menos 2 linhas numéricas.")
    else:
        ligantes = pd.to_numeric(df["numero_medio_ligantes"], errors="coerce")
        vazias = int(ligantes.isna().sum())
        if vazias:
            raise HTTPException(status_code=400,
                                detail=f"Preencha numero_medio_ligantes em todas as linhas "
                                       f"de “{nome}” ({vazias} vazia(s)).")
        if (ligantes < 0).any() or (ligantes % 1 != 0).any():
            raise HTTPException(status_code=400,
                                detail="numero_medio_ligantes deve ter apenas números inteiros "
                                       "maiores ou iguais a zero.")
        df["numero_medio_ligantes"] = ligantes.astype(int)
        df["hora_inicio"] = df["hora_inicio"].map(lambda v: str(v)[:5])
        df = df.reset_index(drop=True)

    return df


def valida_parametros(p: Parametros) -> pd.DataFrame:
    """Valida a configuração e devolve a tabela de períodos do dia."""
    if p.intervalo not in encontra_divisores(p.horas_total * 60):
        raise HTTPException(status_code=400,
                            detail=f"O intervalo de {p.intervalo} min não divide "
                                   f"{p.horas_total} h em partes iguais.")

    possiveis = {round(t, 5) for t in lista_turnos_possiveis(1, p.horas_total, p.intervalo)}
    for turno in p.turnos:
        if round(turno.duracao_horas, 5) not in possiveis:
            raise HTTPException(status_code=400,
                                detail=f"O turno de {rotulo_turno(turno.duracao_horas)} não é "
                                       f"múltiplo de {p.intervalo} min ou passa de {p.horas_total} h.")

    rotulos = [rotulo_turno(t.duracao_horas) for t in p.turnos]
    if len(set(rotulos)) != len(rotulos):
        raise HTTPException(status_code=400,
                            detail="Cada tipo de turno deve ter uma duração diferente.")

    _, df_periodos = gera_tabelas(p.horas_total, p.intervalo, p.hora_inicial,
                                  p.minuto_inicial, [], [])
    return df_periodos


def le_parametros(parametros: str) -> Parametros:
    try:
        return Parametros.model_validate_json(parametros)
    except ValidationError:
        raise HTTPException(status_code=400, detail="Parâmetros de otimização inválidos.")


# ------------------------------------------------------------------------------------
@router.get("/modelo-planilha")
def modelo_planilha(horas_total: int = 24, hora_inicial: int = 0, minuto_inicial: int = 0,
                    intervalo: int = 15):
    """Planilha-modelo de volume de ligações para a configuração informada."""
    p = Parametros(horas_total=horas_total, hora_inicial=hora_inicial,
                   minuto_inicial=minuto_inicial, intervalo=intervalo,
                   turnos=[Turno(duracao_horas=1, custo=0)])
    df_periodos = valida_parametros(p)
    return Response(content=df_periodos.to_csv(index=False).encode("utf-8"),
                    media_type="text/csv",
                    headers={"Content-Disposition":
                             'attachment; filename="modelo_volume_chamadas.csv"'})


@router.get("/exemplo/{tipo}")
def arquivo_exemplo(tipo: str):
    """Planilhas de exemplo de dados/ para experimentar o sistema sem dados próprios."""
    arquivos = {"duracoes": "df_duracoes.xlsx", "volume": "df_tabela_ligantes.xlsx"}
    if tipo not in arquivos:
        raise HTTPException(status_code=404, detail="Exemplo não encontrado.")
    return FileResponse(RAIZ / "dados" / arquivos[tipo], filename=f"exemplo_{arquivos[tipo]}")


@router.post("/arquivos")
def valida_arquivo(tipo: str = Form(...), arquivo: UploadFile = File(...)):
    """Valida um arquivo enviado e devolve um resumo para a interface."""
    if tipo not in COLUNAS_OBRIGATORIAS:
        raise HTTPException(status_code=400, detail="Tipo de arquivo desconhecido.")
    df = le_planilha(arquivo, tipo)

    if tipo == "duracoes":
        resumo = {"maior_duracao": float(df["duracao_conexao"].max())}
    else:
        resumo = {"total_ligacoes": int(df["numero_medio_ligantes"].sum()),
                  "pico_ligacoes": int(df["numero_medio_ligantes"].max())}

    return {
        "nome": arquivo.filename,
        "linhas": len(df),
        "colunas": list(map(str, df.columns)),
        "amostra": df.head(5).astype(str).to_dict(orient="records"),
        "resumo": resumo,
    }


@router.post("/ajuste")
def ajuste_polinomial(grau: int = Form(2, ge=1, le=10), duracoes: UploadFile = File(...)):
    """Pontos e curva do ajuste polinomial das durações."""
    df_duracoes = le_planilha(duracoes, "duracoes")
    try:
        return ajusta_polinomio(df_duracoes, grau)
    except Exception:
        raise HTTPException(status_code=400,
                            detail="Não foi possível ajustar o polinômio. Tente um grau menor.")


@router.post("/executar")
def executar(parametros: str = Form(...), duracoes: UploadFile = File(...),
             volume: UploadFile = File(...)):
    """Executa a simulação (NAN) e o modelo de otimização Attentus."""
    p = le_parametros(parametros)
    df_periodos = valida_parametros(p)
    df_duracoes = le_planilha(duracoes, "duracoes")
    df_volume = le_planilha(volume, "volume")

    if len(df_volume) != len(df_periodos):
        raise HTTPException(status_code=400,
                            detail=f"O arquivo de volume tem {len(df_volume)} linhas, mas a "
                                   f"configuração gera {len(df_periodos)} períodos de "
                                   f"{p.intervalo} min. Baixe a planilha-modelo atualizada.")

    avisos = []
    horarios = df_periodos["hora_inicio"].str[:5]
    if df_volume["hora_inicio"].iloc[0] != horarios.iloc[0]:
        avisos.append(f"O arquivo de volume começa em {df_volume['hora_inicio'].iloc[0]}, mas a "
                      f"operação começa às {horarios.iloc[0]}. Foram usados os horários da "
                      f"configuração.")
    # os horários da configuração rotulam os períodos (o modelo usa a ordem das linhas)
    df_volume["hora_inicio"] = horarios
    df_volume["hora_fim"] = df_periodos["hora_fim"].str[:5]

    if p.semente is not None:
        np.random.seed(p.semente)

    try:
        df_volume["nan"] = gerar_tabela_nan(df_tabela_ligantes=df_volume,
                                            df_duracoes=df_duracoes,
                                            tempo_maximo_espera=p.tempo_maximo_espera,
                                            tempo_descanso=p.tempo_descanso,
                                            g=p.grau,
                                            duracao_periodo=p.intervalo * 60)
    except Exception:
        raise HTTPException(status_code=400,
                            detail="Falha ao simular a demanda. Verifique o arquivo de durações.")

    duracoes_turnos = [t.duracao_horas for t in p.turnos]
    custos_turnos = [t.custo for t in p.turnos]
    df_nad, _ = gera_tabelas(p.horas_total, p.intervalo, p.hora_inicial, p.minuto_inicial,
                             duracoes_turnos, custos_turnos)

    prob = attentus(df_nan=df_volume, df_nad=df_nad, minutos_dividir=p.intervalo)
    status = plp.LpStatus[prob.status]
    if status != "Optimal":
        raise HTTPException(status_code=422,
                            detail=f"O otimizador não encontrou uma solução ótima (status: "
                                   f"{status}). Revise os turnos e os parâmetros.")

    rotulos = {i: rotulo_turno(d) for i, d in enumerate(duracoes_turnos)}
    inicios = df_volume["hora_inicio"].to_dict()
    df_resultados = (gera_resultados(prob, rotulos, inicios)
                     .reindex(index=list(inicios.values()), columns=list(rotulos.values()))
                     .fillna(0).round().astype(int))
    cobertura = calcula_cobertura(prob, dict(enumerate(duracoes_turnos)), inicios, p.intervalo)

    turnos = []
    for i, rotulo in rotulos.items():
        atendentes = int(df_resultados[rotulo].sum())
        turnos.append({"rotulo": rotulo, "duracao_horas": duracoes_turnos[i],
                       "custo": custos_turnos[i], "atendentes": atendentes,
                       "custo_total": atendentes * custos_turnos[i]})

    periodos = []
    for j, linha in df_volume.iterrows():
        periodos.append({
            "inicio": linha["hora_inicio"],
            "fim": linha["hora_fim"],
            "ligacoes": int(linha["numero_medio_ligantes"]),
            "necessarios": int(linha["nan"]),
            "escalados": cobertura[j],
            "entradas": {r: int(df_resultados.loc[linha["hora_inicio"], r])
                         for r in rotulos.values()},
        })

    return {
        "status": status,
        "custo_total": float(prob.objective.value() or 0),
        "total_atendentes": int(df_resultados.to_numpy().sum()),
        "pico_necessarios": int(df_volume["nan"].max()),
        "turnos": turnos,
        "periodos": periodos,
        "avisos": avisos,
    }
