import pandas as pd
from itertools import product
import pulp as plp
from utilidades.utils import retorna_lista

def attentus(df_nan: pd.DataFrame, 
             df_nad: pd.DataFrame, 
             minutos_dividir: int) -> plp.LpProblem:
    """
    Função para resolver o problema de otimização de atendentes

    Args:
        df_nan (pd.DataFrame): DataFrame com a quantidade de NANs. (obrigatório)
        
        df_nad (pd.DataFrame): DataFrame com os regimes e Números de Atendentes 
        Disponíveis. (obrigatório)

    Returns:
        pd.DataFrame: DataFrame com os resultados da otimização
    """
    prob = plp.LpProblem(name="Attentus", sense=plp.LpMinimize)

    regimes = df_nad["regime"].to_dict()
    inicios = df_nan["hora_inicio"].to_dict()

    lista_variaveis = list(product(regimes, inicios))
    pulp_variaveis = plp.LpVariable.dicts(
        "A",
        lista_variaveis,
        lowBound=0,
        cat=plp.LpInteger
    )

    coeficientes = []
    for indice_regime, _ in lista_variaveis:
        encargo = df_nad.loc[indice_regime, "enc"]
        coeficientes.append(encargo)

    fo = plp.lpSum([coef * pulp_variaveis[var] 
                for coef, var in zip(coeficientes, lista_variaveis)])
    prob += fo, "funcao_objetivo"

    for j in inicios:
        nan = df_nan.loc[j, "nan"]

        linha = []
        for indice_regime, regime in regimes.items():
            tamanho = int(regime * 60 / minutos_dividir)
            lista = retorna_lista(j=j + 1, tamanho=tamanho, 
                                  lista_momentos=list(inicios.keys()))

            linha += [pulp_variaveis[(indice_regime, k)] for k in lista]
        
        nome_restricao = f"01_{j:05}"
        prob += plp.lpSum(linha) >= nan, nome_restricao

    solver = plp.getSolver("PULP_CBC_CMD", msg=False)
    prob.solve(solver=solver)

    return prob