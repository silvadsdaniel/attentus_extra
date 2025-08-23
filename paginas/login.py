import streamlit as st

def show_login_page():
    """Exibir página de login."""
    st.title("🔐 Login - Sistema Attentus")
    
    with st.form("login_form"):
        st.subheader("Digite suas credenciais")
        username = st.text_input("Nome de usuário", placeholder="Digite seu nome de usuário")
        password = st.text_input("Senha", type="password", placeholder="Digite sua senha")
        
        col1, col2 = st.columns(2)
        with col1:
            login_button = st.form_submit_button("🚪 Entrar", use_container_width=True)
        with col2:
            register_button = st.form_submit_button("📝 Registrar", use_container_width=True)
    
    if login_button:
        if username and password:
            auth_manager = st.session_state.auth_manager
            user_info = auth_manager.authenticate_user(username, password)
            
            if user_info:
                st.session_state.authenticated = True
                st.session_state.user_info = user_info
                st.success(f"✅ Bem-vindo de volta, {user_info['full_name']}!")
                st.rerun()
            else:
                st.error("❌ Nome de usuário ou senha inválidos")
        else:
            st.error("❌ Por favor, digite o nome de usuário e a senha")
    
    if register_button:
        st.session_state.show_register = True
        st.rerun()