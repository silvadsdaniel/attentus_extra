import pandas as pd
from mmq import metodo_minimos_quadrados
import numpy as np
from datetime import datetime as dtm, timedelta as td

def retorna_lista(j, tamanho, lista_momentos):

    if j >= tamanho - 1:
        return lista_momentos[j - tamanho + 1:j + 1]
    else:
        return lista_momentos[j - tamanho + 1:] + lista_momentos[:j + 1]

def gera_resultados(prob, regimes, inicios):
    """
    Função para gerar os resultados da otimização

    Args:
        prob (plp.LpProblem): Problema de otimização resolvido. (obrigatório)
        regimes (dict): Dicionário com os regimes. (obrigatório)
        inicios (dict): Dicionário com os horários de início. (obrigatório)

    Returns:
        pd.DataFrame: DataFrame com os resultados da otimização
    """
    
    resultados = []
    for v in prob.variables():
        indice_regime, indice_inicio = list(map(int, str(v).replace("A_(", "").replace(")", "").split(",_")))
        regime = regimes[indice_regime]
        inicio = inicios[indice_inicio]

        resultados.append(
            {
                "regime": regime,
                "inicio": inicio,
                "valor": v.varValue
            }
        )

    df_resultados = pd.DataFrame(resultados)
    df_resultados_pivotado = \
        df_resultados.pivot_table(index="inicio",
                                columns="regime",
                                values="valor")
    
    return df_resultados_pivotado

def ajusta_polinomio(df_duracoes: pd.DataFrame, 
                     g: int) -> dict:
    """
    Função para ajustar o polinômio de grau g às durações das ligações

    Args:
        df_duracoes (pd.DataFrame): DataFrame com as durações das ligações. (obrigatório)
        g (int): Grau do polinômio de ajuste. (obrigatório)

    Returns:
        dict: Pontos originais, curva ajustada e coeficiente de determinação (R²)
    """
    
    percentagens_acumuladas = df_duracoes.loc[:, "percentagem_acumulada"]
    duracoes = df_duracoes.loc[:, "duracao_conexao"]

    coefs = metodo_minimos_quadrados.mmq(entradas=percentagens_acumuladas,
                                         saidas=duracoes,
                                         g=g)
    
    # gera 200 valores de zero à um
    x = np.linspace(start=0, stop=1, num=200)
    # usa o polinômio ajustado para gerar os valores de y
    y = np.polyval(p=coefs, x=x)

    # qualidade do ajuste nos pontos originais
    previstos = np.polyval(p=coefs, x=percentagens_acumuladas)
    soma_residuos = float(((duracoes - previstos) ** 2).sum())
    soma_total = float(((duracoes - duracoes.mean()) ** 2).sum())
    r2 = 1 - soma_residuos / soma_total if soma_total > 0 else 1.0

    return {
        "pontos": [{"x": float(px), "y": float(py)} 
                   for px, py in zip(percentagens_acumuladas, duracoes)],
        "curva": [{"x": float(cx), "y": float(cy)} for cx, cy in zip(x, y)],
        "r2": r2
    }

def calcula_cobertura(prob, regimes, inicios, minutos_dividir):
    """
    Função para calcular quantos atendentes estão trabalhando em cada período do dia,
    usando a mesma regra de cobertura das restrições do modelo attentus

    Args:
        prob (plp.LpProblem): Problema de otimização resolvido. (obrigatório)
        regimes (dict): Dicionário índice -> duração do turno em horas. (obrigatório)
        inicios (dict): Dicionário índice -> horário de início do período. (obrigatório)
        minutos_dividir (int): Duração de cada período em minutos. (obrigatório)

    Returns:
        list: Quantidade de atendentes trabalhando em cada período
    """

    valores = {}
    for v in prob.variables():
        indice_regime, indice_inicio = list(map(int, str(v).replace("A_(", "").replace(")", "").split(",_")))
        valores[(indice_regime, indice_inicio)] = v.varValue or 0

    cobertura = []
    for j in inicios:
        total = 0
        for indice_regime, regime in regimes.items():
            tamanho = int(regime * 60 / minutos_dividir)
            lista = retorna_lista(j=j + 1, tamanho=tamanho, 
                                  lista_momentos=list(inicios.keys()))
            total += sum(valores.get((indice_regime, k), 0) for k in lista)
        cobertura.append(int(round(total)))

    return cobertura

def gera_tabelas(
        qtd_horas_total, minutos_dividir,
        hora_inicial, minuto_inicial,
        turnos, encargos):

    # o dia operacional pode atravessar a meia-noite; o fim é exclusivo
    inicio = dtm(2000, 1, 1, hora_inicial, minuto_inicial)
    fim = inicio + td(hours=qtd_horas_total)
    
    inicios = pd.date_range(start=inicio, end=fim, freq=f"{minutos_dividir}min",
                            inclusive="left").strftime("%H:%M:%S").tolist()
    
    finais = \
        [(dtm.strptime(inicio, "%H:%M:%S") + td(minutes=minutos_dividir)).strftime("%H:%M:%S") 
        for inicio in inicios]
    
    df_nad = pd.DataFrame({
        "regime": turnos,
        "enc": encargos})
    
    df_tabela_ligantes = pd.DataFrame({
        "rotulo": range(1, len(inicios) + 1),
        "hora_inicio": inicios,
        "hora_fim": finais})
    df_tabela_ligantes["numero_medio_ligantes"] = ""

    return df_nad, df_tabela_ligantes

def encontra_divisores(n):
    """
    Função para encontrar os divisores de um número inteiro n.
    Args:
        n (int): Número inteiro para encontrar os divisores. (obrigatório)
    Returns:
        list: Lista de divisores de n.
    """
    divisores = []
    for i in range(1, n + 1):
        if n % i == 0:
            divisores.append(i)
    return divisores

def lista_turnos_possiveis(horas_minimas, horas_maximas, minutos_dividir):

    passo = 1 / 60 # 1 minuto
    turnos_horas = np.arange(start=horas_minimas, 
                             stop=horas_maximas + passo, 
                             step=passo).round(5)
    turnos_horas_possiveis = []
    for turno_hora in turnos_horas:
        fracao = (turno_hora * 60 / minutos_dividir).as_integer_ratio()
        if fracao[1] == 1:
            turnos_horas_possiveis.append(turno_hora)
    return turnos_horas_possiveis


def gerar_tabela_nan(df_tabela_ligantes: pd.DataFrame,
                     df_duracoes: pd.DataFrame,
                     tempo_maximo_espera: float = 10,
                     tempo_descanso: int = 0,
                     g: int = 5) -> list:

    """
    Função para gerar a lista de NANs para cada período do dia

    Args:
        df_tabela_ligantes (pd.DataFrame): DataFrame com a quantidade de ligantes. 
        (obrigatório)
        df_duracoes (pd.DataFrame): DataFrame com as durações das ligações. 
        (obrigatório)
        tempo_maximo_espera (float): Tempo máximo de espera (opcional, default=10)
        g (int): Grau do polinômio de ajuste (opcional, default=5)
    Returns:
        pd.DataFrame: DataFrame com a quantidade de NANs
    """

    coefs = metodo_minimos_quadrados.mmq(
        entradas=df_duracoes.loc[:, "percentagem_acumulada"],
        saidas=df_duracoes.loc[:, "duracao_conexao"],
        g=g)


    # conjunto de nan para cada periodo do dia 
    # (18:15 - 18:30, 18:30 - 18:45, ..., 18:00 - 18:15)
    coluna_nan = []

    # para cada linha (periodo do dia) da tabela de ligantes (96 linhas)
    for i, linha in df_tabela_ligantes.iterrows():

        # pega a qtd_ligantes para cada periodo do dia
        qtd_ligantes = linha["numero_medio_ligantes"]

        # gera aleatoriamente os momentos de ligação para cada periodo do dia
        momentos_ligacoes = np.random.randint(low=0, high=900, size=qtd_ligantes)
        # ordena os momentos de ligação para executar o algoritmo nan
        momentos_ligacoes.sort()
        
        # cria uma lista de atendentes necessários para atender as ligações para cada 
        # periodo do dia
        atendentes: list[dict] = []

        # para cada ligação
        for momento_ligacao in momentos_ligacoes:
            
            # gerando a duração da ligação
            aleatorio = np.random.rand()

            # gerando a duração da ligação
            duracao = abs(np.polyval(coefs, aleatorio))

            # para cada atendente, checar se ele estará ocupado no momento da 
            # ligação + tempo máximo de espera. Se não estiver, ele atende a ligação
            # se todos estiverem ocupados, criar um novo atendente
            for atendente in atendentes:

                fim_atendimento = atendente["fim_atendimento"] + tempo_descanso

                # checando se o atendente está ocupado daqui a 10 segundos do momento 
                # da ligação ocupado = atendente.checar_ocupado(momento_ligacao + 10)
                if momento_ligacao + tempo_maximo_espera > fim_atendimento:
                    ocupado = False
                else:
                    ocupado = True

                if not ocupado:
                    # se o atendente não estiver ocupado, ele atende a ligação
                    # atendente.atender_ligacao_futura(duracao)
                    if momento_ligacao + tempo_maximo_espera > fim_atendimento:
                        atendente["inicio_atendimento"] = \
                            momento_ligacao + tempo_maximo_espera
                    else:
                        atendente["inicio_atendimento"] = fim_atendimento
                    
                    atendente["fim_atendimento"] = \
                        atendente["inicio_atendimento"] + duracao
                    break
            else:
                # entra aqui apenas se nunca ocorrer o break (ou seja, 
                # se todos os atendentes estiverem ocupados)

                novo_atendende = {"inicio_atendimento": momento_ligacao, 
                                "fim_atendimento": momento_ligacao + duracao}
                atendentes.append(novo_atendende)

        # após 'varrer' todas as ligações simuladas de cada período do dia, coletar a 
        # quantidade de atendentes criados para atender todas as ligações com 
        # 10 segundos de tempo máximo de espera    
        nan = len(atendentes)
        
        # antes de partir para a simulação do próximo período do dia, adicionar o 
        # resultado na coleção de nan para cada período do dia
        coluna_nan.append(nan)

    return coluna_nan