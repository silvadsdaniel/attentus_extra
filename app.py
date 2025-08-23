import streamlit as st
from auth.autenticacao import handle_authentication
from paginas.navegacao import show_navigation
from paginas.indice import show_dashboard
from paginas.gerenciamento_usuarios import show_user_management
from paginas.otimizacao import show_optimization

def main():
    """Ponto de entrada principal da aplicação."""
    # Configurar página
    st.set_page_config(
        page_title="Attentus - Otimização da Força de Trabalho",
        page_icon="🎯",
        layout="wide",
        initial_sidebar_state="expanded"
    )
    
    # Gerenciar autenticação
    if not handle_authentication():
        return
    
    # Mostrar navegação
    show_navigation()
    
    # Inicializar página atual se não definida
    if 'current_page' not in st.session_state:
        st.session_state.current_page = "dashboard"
    
    # Rotear para a página apropriada
    if st.session_state.current_page == "dashboard":
        show_dashboard()
    elif st.session_state.current_page == "user_management":
        show_user_management()
    elif st.session_state.current_page == "optimization":
        show_optimization()

if __name__ == "__main__":
    main()
