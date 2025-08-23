import streamlit as st

def show_dashboard():
    """Exibir painel principal."""
    st.title("🏠 Painel - Sistema Attentus")
    
    user_info = st.session_state.user_info
    
    # Seção de boas-vindas
    st.markdown(f"""
    ### Bem-vindo de volta, {user_info['full_name']}! 👋
    
    **Attentus** é um sistema de otimização da força de trabalho que ajuda você a determinar o 
    número ideal de atendentes necessários para lidar com operações de call center de forma eficiente.
    """)
    
    # Atividades recentes ou dicas
    st.subheader("💡 Dicas para Usar o Attentus")
    
    tips = [
        "📊 **Carregue seus dados**: Certifique-se de ter dados de duração e volume de chamadas prontos",
        "⚙️ **Configure parâmetros**: Defina suas horas operacionais, tempos de pausa e padrões de turno",
        "🎯 **Revise os resultados**: Analise os resultados da otimização para tomar decisões informadas sobre pessoal",
        "📈 **Processo iterativo**: Execute múltiplos cenários para encontrar a melhor estratégia de pessoal"
    ]
    
    for tip in tips:
        st.markdown(f"- {tip}")