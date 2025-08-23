import streamlit as st
from auth.autenticacao import require_auth
import pandas as pd
from utilidades.utils import (encontra_divisores, lista_turnos_possiveis, 
                              gera_tabelas, gera_resultados, ajusta_polinomio,
                              gerar_tabela_nan)
from modelo.attentus import attentus
from pulp import LpStatus
from plotly import express as px

@require_auth()
def show_optimization():
    """Exibir interface de otimização."""
    st.title("🔧 Otimização da Força de Trabalho")
    st.markdown("Configure e execute o modelo de otimização Attentus para determinar os níveis ideais de pessoal.")
    
    # Barra lateral de configuração
    with st.sidebar:
        st.header("⚙️ Configuração")
        
        # Parâmetros básicos
        st.subheader("🕐 Parâmetros de Tempo")
        qtd_horas_total = st.number_input(
            "Total de horas de trabalho por dia",
            min_value=1, max_value=24, value=24, step=1,
            help="Número total de horas no dia operacional"
        )
        
        col1, col2 = st.columns(2)
        hora_inicial = col1.number_input("Hora inicial (0-23)", min_value=0, 
                                         max_value=23, value=0, step=1)
        minuto_inicial = col2.number_input("Minuto inicial (0-59)", min_value=0, 
                                           max_value=59, value=0, step=1)
        
        # Divisão de tempo
        qtd_dias_total = qtd_horas_total / 24
        qtd_minutos_total = qtd_horas_total * 60
        divisores = encontra_divisores(qtd_minutos_total)
        
        minutos_dividir = st.selectbox(
            "Intervalo de tempo (minutos)",
            options=divisores,
            index=divisores.index(15) if 15 in divisores else 0,
            help="Dividir o dia em intervalos de tantos minutos"
        )
        
        st.divider()
        
        # Configuração de turnos
        st.subheader("👥 Configuração de Turnos")
        turnos_possiveis = lista_turnos_possiveis(
            horas_minimas=1,
            horas_maximas=qtd_horas_total,
            minutos_dividir=minutos_dividir
        )
        
        dict_turnos_possiveis = {}
        for turno in turnos_possiveis:
            horas = int(turno)
            minutos = int((turno - horas) * 60)
            dict_turnos_possiveis[f"{horas:02}h{minutos:02}"] = turno
        
        qtd_turnos = st.number_input("Número de tipos de turno", min_value=1, 
                                     max_value=5, value=3, step=1)
        
        turnos = []
        turnos_traduzidos = {}
        encargos = []
        for i in range(qtd_turnos):
            st.write(f"**Turno {i + 1}**")
            col1, col2 = st.columns(2)
            
            turno = col1.selectbox(
                f"Duração",
                options=list(dict_turnos_possiveis.keys()),
                index=min(i, len(dict_turnos_possiveis) - 1),
                key=f"turno_{i}"
            )
            
            encargo = col2.number_input(
                f"Custo",
                min_value=0.0, max_value=10000.0,
                value=540.0, step=0.1,
                key=f"encargo_{i}"
            )
            
            turnos_traduzidos.update({i: turno})
            turnos.append(dict_turnos_possiveis[turno])
            encargos.append(encargo)
        
        st.divider()
        
        # Parâmetros operacionais
        st.subheader("📞 Parâmetros Operacionais")
        tempo_descanso = st.number_input(
            "Tempo de descanso entre chamadas (segundos)",
            min_value=0, max_value=1000, value=0, step=1
        )
        
        tempo_maximo_espera = st.number_input(
            "Tempo máximo de espera (segundos)",
            min_value=0, max_value=1000, value=10, step=1
        )
        
        grau_polinomio = st.number_input(
            "Grau do polinômio para predição",
            min_value=1, max_value=10, value=2, step=1
        )
    
    # Área de conteúdo principal
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.subheader("📊 Upload de Dados")
        
        # Gerar tabelas de exemplo
        df_nad, df_tabela_ligantes_vazia = gera_tabelas(
            qtd_horas_total, minutos_dividir,
            hora_inicial, minuto_inicial,
            turnos, encargos
        )
        
        # Mostrar dados de exemplo
        with st.expander("👁️ Visualizar Tabelas Geradas", expanded=False):
            st.write("**Pessoal Disponível (NAD)**")
            st.dataframe(df_nad, use_container_width=True)
            
            st.write("**Template de Intervalos de Tempo**")
            st.dataframe(df_tabela_ligantes_vazia.head(10), use_container_width=True)
        
        # Baixar template
        csv_data = df_tabela_ligantes_vazia.to_csv(index=False).encode('utf-8')
        st.download_button(
            label="📥 Baixar Template (Volume de Chamadas)",
            data=csv_data,
            file_name='template_volume_chamadas.csv',
            mime='text/csv',
            help="Baixe este template e preencha com os dados de volume de chamadas"
        )
    
    with col2:
        st.subheader("📁 Upload de Arquivo")
        
        # Upload de arquivos
        uploaded_file_duracoes = st.file_uploader(
            "Upload de dados de duração de chamadas",
            type=["csv", "xlsx"],
            help="Envie arquivo com estatísticas de duração de chamadas"
        )
        
        uploaded_file_ligantes = st.file_uploader(
            "Upload de dados de volume de chamadas", 
            type=["csv", "xlsx"],
            help="Envie arquivo com número de chamadas por intervalo de tempo"
        )
    
    # Opções de análise
    st.divider()
    
    option_tabs = st.tabs(["📈 Ajuste Polinomial", "🎯 Executar Otimização"])
    
    with option_tabs[0]:
        st.subheader("📈 Análise de Ajuste Polinomial")
        st.write("Analise e ajuste o modelo polinomial para predição da duração das chamadas.")
        
        if uploaded_file_duracoes is not None:
            try:
                if uploaded_file_duracoes.name.endswith('.csv'):
                    df_duracoes = pd.read_csv(uploaded_file_duracoes)
                else:
                    df_duracoes = pd.read_excel(uploaded_file_duracoes)
                
                st.success("✅ Dados de duração carregados com sucesso!")
                
                st.write("**Visualização dos Dados:**")
                st.dataframe(df_duracoes.head(), use_container_width=True)
                
                if st.button("🔍 Analisar Ajuste Polinomial", type="primary"):
                    with st.spinner("Analisando ajuste polinomial..."):
                        try:
                            fig = ajusta_polinomio(df_duracoes, grau_polinomio)
                            st.pyplot(fig)
                            st.success("✅ Análise polinomial concluída!")
                        except Exception as e:
                            st.error(f"❌ Erro na análise polinomial: {str(e)}")
            
            except Exception as e:
                st.error(f"❌ Erro ao carregar dados de duração: {str(e)}")
        else:
            st.info("📁 Por favor, faça upload dos dados de duração de chamadas para analisar o ajuste polinomial")
    
    with option_tabs[1]:
        st.subheader("🎯 Otimização da Força de Trabalho")
        st.write("Execute o modelo completo de otimização para determinar os níveis ideais de pessoal.")
        
        if uploaded_file_duracoes is not None and uploaded_file_ligantes is not None:
            try:
                # Carregar arquivos de dados
                if uploaded_file_duracoes.name.endswith('.csv'):
                    df_duracoes = pd.read_csv(uploaded_file_duracoes)
                else:
                    df_duracoes = pd.read_excel(uploaded_file_duracoes)
                
                if uploaded_file_ligantes.name.endswith('.csv'):
                    df_tabela_ligantes = pd.read_csv(uploaded_file_ligantes)
                else:
                    df_tabela_ligantes = pd.read_excel(uploaded_file_ligantes)
                
                st.success("✅ Ambos os arquivos de dados carregados com sucesso!")
                
                # Mostrar visualização dos dados
                col1, col2 = st.columns(2)
                with col1:
                    st.write("**Dados de Duração de Chamadas:**")
                    st.dataframe(df_duracoes.head(3), use_container_width=True)
                
                with col2:
                    st.write("**Dados de Volume de Chamadas:**")
                    st.dataframe(df_tabela_ligantes.head(3), use_container_width=True)
                
                # Botão de otimização
                if st.button("🚀 Executar Otimização", type="primary", use_container_width=True):
                    with st.spinner("Executando modelo de otimização... Isso pode levar alguns minutos."):
                        try:
                            # Gerar coluna NAN
                            coluna_nan = gerar_tabela_nan(
                                df_tabela_ligantes=df_tabela_ligantes,
                                df_duracoes=df_duracoes,
                                tempo_maximo_espera=tempo_maximo_espera,
                                tempo_descanso=tempo_descanso,
                                g=grau_polinomio
                            )
                            
                            df_tabela_ligantes["nan"] = coluna_nan
                            
                            # Run optimization
                            prob = attentus(
                                df_nan=df_tabela_ligantes,
                                df_nad=df_nad,
                                minutos_dividir=minutos_dividir
                            )
                            
                            status = LpStatus[prob.status]
                            
                            if status == "Optimal":
                                st.success("✅ Otimização concluída com sucesso!")
                                
                                # Gerar resultados
                                # regimes = df_nad["regime"].to_dict()
                                # regimes = {i: turno for i, turno in enumerate(turnos)}
                                inicios = df_tabela_ligantes["hora_inicio"].to_dict()
                                df_resultados = gera_resultados(prob, 
                                                                turnos_traduzidos, 
                                                                inicios)
                                
                                df_totais = df_resultados.sum(axis=0)
                                
                                # Exibir resultados em abas
                                result_tabs = st.tabs(["📊 Resultados Detalhados", "📈 Resumo", "💰 Análise de Custos"])
                                
                                with result_tabs[0]:
                                    st.subheader("📊 Cronograma de Pessoal")
                                    st.dataframe(df_resultados, use_container_width=True)
                                    
                                    # Baixar resultados
                                    csv_results = df_resultados.to_csv().encode('utf-8')
                                    st.download_button(
                                        label="📥 Baixar Resultados Detalhados",
                                        data=csv_results,
                                        file_name='resultados_otimizacao.csv',
                                        mime='text/csv'
                                    )
                                
                                with result_tabs[1]:
                                    st.subheader("📈 Resumo do Pessoal")
                                    
                                    col1, col2 = st.columns(2)
                                    with col1:
                                        st.dataframe(
                                            df_totais.reset_index().rename(columns={0: 'Total de Pessoal', 'index': 'Tipo de Turno'}),
                                            use_container_width=True,
                                            hide_index=True
                                        )
                                    
                                    with col2:
                                        # Criar gráfico de barras
                                        fig = px.bar(
                                            x=df_totais.index,
                                            y=df_totais.values,
                                            title="Distribuição de Pessoal por Tipo de Turno",
                                            labels={'x': 'Tipo de Turno (horas)', 'y': 'Número de Funcionários'}
                                        )
                                        st.plotly_chart(fig, use_container_width=True)
                                
                                with result_tabs[2]:
                                    st.subheader("💰 Análise de Custos")
                                    
                                    total_cost = prob.objective.value()
                                    
                                    col1, col2, col3 = st.columns(3)
                                    with col1:
                                        st.metric("💰 Custo Total Diário", f"R$ {total_cost:,.2f}")
                                    
                                    with col2:
                                        total_staff = df_totais.sum()
                                        avg_cost_per_staff = total_cost / total_staff if total_staff > 0 else 0
                                        st.metric("👤 Custo Médio por Funcionário", f"R$ {avg_cost_per_staff:,.2f}")
                                    
                                    with col3:
                                        st.metric("👥 Total de Pessoal Necessário", f"{int(total_staff)}")
                                    
                                    # Detalhamento de custos
                                    cost_breakdown = []
                                    for i, (regime, total_staff_type) in enumerate(df_totais.items()):
                                        cost_per_type = total_staff_type * encargos[i]
                                        cost_breakdown.append({
                                            'Tipo de Turno': f"{regime}",
                                            'Qtd. Funcionários': int(total_staff_type),
                                            'Custo por Funcionário': f"R$ {encargos[i]:,.2f}",
                                            'Custo Total': f"R$ {cost_per_type:,.2f}"
                                        })
                                    
                                    st.subheader("📋 Detalhamento de Custos por Tipo de Turno")
                                    st.dataframe(pd.DataFrame(cost_breakdown), use_container_width=True, hide_index=True)
                                
                            else:
                                st.error(f"❌ Otimização falhou com status: {status}")
                                st.write("Isso pode indicar que o problema é inviável ou ilimitado.")
                                st.write("Tente ajustar seus parâmetros ou dados.")
                        
                        except Exception as e:
                            st.error(f"❌ Erro durante a otimização: {str(e)}")
                            st.write("Por favor, verifique seus arquivos de dados e parâmetros.")
            
            except Exception as e:
                st.error(f"❌ Erro ao carregar arquivos de dados: {str(e)}")
        
        else:
            st.info("📁 Por favor, faça upload dos arquivos de dados de duração e volume de chamadas para executar a otimização")