import streamlit as st
import pandas as pd

def show_user_management():
    """Exibir página de gerenciamento de usuários (somente admin)."""
    st.title("👥 Gerenciamento de Usuários")
    
    if st.session_state.user_info['role'] != 'admin':
        st.error("❌ Privilégios de administrador necessários")
        return
    
    auth_manager = st.session_state.auth_manager
    
    # Abas para diferentes funções de gerenciamento
    tab1, tab2 = st.tabs(["👤 Usuários",  "➕ Adicionar Usuário"])
    
    with tab1:
        st.subheader("Gerenciar Usuários")
        
        users = auth_manager.get_all_users()
        
        if users:
            df_users = pd.DataFrame(users)
            
            # Exibir usuários de forma mais interativa
            for i, user in enumerate(users):
                with st.expander(f"👤 {user['full_name']} (@{user['username']})", expanded=False):
                    col1, col2, col3, col4 = st.columns(4)
                    
                    with col1:
                        st.write(f"**Email:** {user['email']}")
                        st.write(f"**Função:** {user['role']}")
                    
                    with col2:
                        st.write(f"**Criado em:** {user['created_at']}")
                        st.write(f"**Último Login:** {user['last_login'] or 'Nunca'}")
                    
                    with col3:
                        status = "🟢 Ativo" if user['is_active'] else "🔴 Inativo"
                        st.write(f"**Status:** {status}")
                    
                    with col4:
                        # Botões de ação
                        if user['username'] != st.session_state.user_info['username']:  # Não pode modificar a si mesmo
                            new_role = st.selectbox("Alterar Função", ["user", "admin"], 
                                                   index=0 if user['role'] == 'user' else 1,
                                                   key=f"role_{user['id']}")
                            
                            if st.button(f"Atualizar Função", key=f"update_role_{user['id']}"):
                                if auth_manager.update_user_role(user['id'], new_role):
                                    st.success("Função atualizada!")
                                    st.rerun()
                            
                            if user['is_active']:
                                if st.button("🚫 Desativar", key=f"deactivate_{user['id']}"):
                                    if auth_manager.update_user_status(user['id'], False):
                                        st.success("Usuário desativado!")
                                        st.rerun()
                            else:
                                if st.button("✅ Ativar", key=f"activate_{user['id']}"):
                                    if auth_manager.update_user_status(user['id'], True):
                                        st.success("Usuário ativado!")
                                        st.rerun()
                            
                            if st.button("🗑️ Excluir", key=f"delete_{user['id']}", type="secondary"):
                                if st.button("⚠️ Confirmar Exclusão", key=f"confirm_delete_{user['id']}", type="primary"):
                                    if auth_manager.delete_user(user['id']):
                                        st.success("Usuário excluído!")
                                        st.rerun()
        else:
            st.info("Nenhum usuário encontrado")
    
    with tab2:
        st.subheader("Adicionar Novo Usuário")
        
        with st.form("add_user_form"):
            col1, col2 = st.columns(2)
            
            with col1:
                new_full_name = st.text_input("Nome Completo")
                new_username = st.text_input("Nome de usuário")
            
            with col2:
                new_email = st.text_input("Email")
                new_role = st.selectbox("Função", ["user", "admin"])
            
            new_password = st.text_input("Senha", type="password")
            
            if st.form_submit_button("➕ Adicionar Usuário"):
                if all([new_full_name, new_username, new_email, new_password]):
                    if auth_manager.register_user(new_username, new_email, new_password, new_full_name, new_role):
                        st.success("✅ Usuário adicionado com sucesso!")
                        st.rerun()
                    else:
                        st.error("❌ Nome de usuário ou email já existem")
                else:
                    st.error("❌ Por favor, preencha todos os campos")