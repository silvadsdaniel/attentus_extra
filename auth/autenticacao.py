import streamlit as st
from paginas.login import show_login_page
from paginas.registramento import show_registration_page
from dados.banco import AuthManager

# ------------------------------------------------------------------------------------
# Fluxo principal de autenticação
def handle_authentication():
    """Gerenciar o fluxo de autenticação."""
    init_session_state()
    
    # Inicializar estado de registro
    if 'show_register' not in st.session_state:
        st.session_state.show_register = False
    
    if not st.session_state.authenticated:
        if st.session_state.show_register:
            show_registration_page()
        else:
            show_login_page()
        return False
    
    return True

# ------------------------------------------------------------------------------------
# Fluxo principal de autenticação
def handle_authentication():
    """Gerenciar o fluxo de autenticação."""
    init_session_state()
    
    # Inicializar estado de registro
    if 'show_register' not in st.session_state:
        st.session_state.show_register = False
    
    if not st.session_state.authenticated:
        if st.session_state.show_register:
            show_registration_page()
        else:
            show_login_page()
        return False
    
    return True

# ------------------------------------------------------------------------------------
# Initialize session state
def init_session_state():
    """Initialize session state variables."""
    if 'authenticated' not in st.session_state:
        st.session_state.authenticated = False
    if 'user_info' not in st.session_state:
        st.session_state.user_info = None
    if 'auth_manager' not in st.session_state:
        st.session_state.auth_manager = AuthManager()

# ------------------------------------------------------------------------------------
def logout():
    """Logout the current user."""
    st.session_state.authenticated = False
    st.session_state.user_info = None
    st.rerun()

# ------------------------------------------------------------------------------------
def require_auth(required_role=None):
    """Decorator to require authentication for a function."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            if not st.session_state.authenticated:
                st.error("❌ You need to login to access this page.")
                return None
            
            if required_role and st.session_state.user_info['role'] != required_role:
                st.error(f"❌ You need {required_role} privileges to access this page.")
                return None
            
            return func(*args, **kwargs)
        return wrapper
    return decorator