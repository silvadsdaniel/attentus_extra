import streamlit as st

def show_registration_page():
    """Exibir página de registro."""
    st.title("📝 Registro - Sistema Attentus")
    
    with st.form("registration_form"):
        st.subheader("Crie sua conta")
        
        col1, col2 = st.columns(2)
        with col1:
            full_name = st.text_input("Nome Completo *", placeholder="Digite seu nome completo")
            username = st.text_input("Nome de usuário *", placeholder="Escolha um nome de usuário")
        
        with col2:
            email = st.text_input("Email *", placeholder="Digite seu email")
            role = st.selectbox("Função", ["user", "admin"], index=0)
        
        password = st.text_input("Senha *", type="password", placeholder="Crie uma senha")
        confirm_password = st.text_input("Confirmar Senha *", type="password", placeholder="Confirme sua senha")
        
        col1, col2 = st.columns(2)
        with col1:
            register_button = st.form_submit_button("✅ Criar Conta", use_container_width=True)
        with col2:
            back_button = st.form_submit_button("⬅️ Voltar ao Login", use_container_width=True)
    
    if register_button:
        if all([full_name, username, email, password, confirm_password]):
            if password != confirm_password:
                st.error("❌ As senhas não coincidem")
            elif len(password) < 6:
                st.error("❌ A senha deve ter pelo menos 6 caracteres")
            else:
                auth_manager = st.session_state.auth_manager
                if auth_manager.register_user(username, email, password, full_name, role):
                    st.success("✅ Conta criada com sucesso! Por favor, faça login.")
                    st.session_state.show_register = False
                    st.rerun()
                else:
                    st.error("❌ Nome de usuário ou email já existem")
        else:
            st.error("❌ Por favor, preencha todos os campos obrigatórios")
    
    if back_button:
        st.session_state.show_register = False
        st.rerun()