import streamlit as st
from auth.autenticacao import logout

def show_navigation():
    """Mostrar barra lateral de navegação."""
    with st.sidebar:
        st.title("🎯 Sistema Attentus")
        
        if st.session_state.authenticated:
            user_info = st.session_state.user_info
            st.success(f"👋 Olá, {user_info['full_name']}!")
            st.write(f"**Função:** {user_info['role'].title()}")
            
            st.divider()
            
            # Menu de navegação
            pages = {
                "🏠 Painel": "dashboard",
                "💵 Otimização": "optimization"
            }
            
            if user_info['role'] == 'admin':
                pages["👥 Gerenciar Usuários"] = "user_management"
            
            # Seleção de página
            selected_page = st.radio("Navegar para:", list(pages.keys()))
            st.session_state.current_page = pages[selected_page]
            
            st.divider()
            
            if st.button("🚪 Sair", use_container_width=True):
                logout()
        else:
            st.info("Por favor, faça login para acessar o sistema")