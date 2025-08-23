import hashlib
import sqlite3
import streamlit as st
from pathlib import Path

class AuthManager:
    def __init__(self, db_path="dados/usuarios.db"):
        """Initialize the authentication manager with SQLite database."""
        self.db_path = db_path
        # Create auth directory if it doesn't exist
        Path(db_path).parent.mkdir(exist_ok=True)
        self._init_database()
    
    def _init_database(self):
        """Initialize the users database."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                is_active BOOLEAN DEFAULT 1
            )
        """)
        
        # Create sessions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                session_end TIMESTAMP,
                ip_address TEXT,
                user_agent TEXT
            )
        """)
        
        conn.commit()
        conn.close()
    
    def _hash_password(self, password: str) -> str:
        """Hash a password using SHA-256."""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def register_user(self, username: str, email: str, password: str, 
                     full_name: str, role: str = "user") -> bool:
        """Register a new user."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Check if user already exists
            cursor.execute("SELECT username FROM users WHERE username = ? OR email = ?", 
                         (username, email))
            if cursor.fetchone():
                return False
            
            # Insert new user
            password_hash = self._hash_password(password)
            cursor.execute("""
                INSERT INTO users (username, email, password_hash, full_name, role)
                VALUES (?, ?, ?, ?, ?)
            """, (username, email, password_hash, full_name, role))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            st.error(f"Error registering user: {e}")
            return False
    
    def authenticate_user(self, username: str, password: str) -> dict:
        """Authenticate a user and return user info if successful."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            password_hash = self._hash_password(password)
            cursor.execute("""
                SELECT id, username, email, full_name, role, is_active
                FROM users 
                WHERE username = ? AND password_hash = ? AND is_active = 1
            """, (username, password_hash))
            
            user = cursor.fetchone()
            
            if user:
                # Update last login
                cursor.execute("""
                    UPDATE users SET last_login = CURRENT_TIMESTAMP 
                    WHERE username = ?
                """, (username,))
                
                # Log session
                cursor.execute("""
                    INSERT INTO user_sessions (username) VALUES (?)
                """, (username,))
                
                conn.commit()
                
                return {
                    'id': user[0],
                    'username': user[1],
                    'email': user[2],
                    'full_name': user[3],
                    'role': user[4],
                    'is_active': user[5]
                }
            
            conn.close()
            return None
        except Exception as e:
            st.error(f"Error authenticating user: {e}")
            return None
    
    def get_all_users(self) -> list:
        """Get all users (admin only)."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, username, email, full_name, role, created_at, last_login, is_active
                FROM users ORDER BY created_at DESC
            """)
            
            users = cursor.fetchall()
            conn.close()
            
            return [{
                'id': user[0],
                'username': user[1],
                'email': user[2],
                'full_name': user[3],
                'role': user[4],
                'created_at': user[5],
                'last_login': user[6],
                'is_active': bool(user[7])
            } for user in users]
        except Exception as e:
            st.error(f"Error getting users: {e}")
            return []
    
    def update_user_status(self, user_id: int, is_active: bool) -> bool:
        """Update user active status."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE users SET is_active = ? WHERE id = ?
            """, (is_active, user_id))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            st.error(f"Error updating user status: {e}")
            return False
    
    def update_user_role(self, user_id: int, role: str) -> bool:
        """Update user role."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE users SET role = ? WHERE id = ?
            """, (role, user_id))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            st.error(f"Error updating user role: {e}")
            return False
    
    def delete_user(self, user_id: int) -> bool:
        """Delete a user (admin only)."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Delete user sessions first
            cursor.execute("DELETE FROM user_sessions WHERE username = (SELECT username FROM users WHERE id = ?)", (user_id,))
            
            # Delete user
            cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            st.error(f"Error deleting user: {e}")
            return False
    
    def get_user_sessions(self, username: str = None) -> list:
        """Get user sessions."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            if username:
                cursor.execute("""
                    SELECT username, session_start, session_end, ip_address, user_agent
                    FROM user_sessions WHERE username = ?
                    ORDER BY session_start DESC LIMIT 20
                """, (username,))
            else:
                cursor.execute("""
                    SELECT username, session_start, session_end, ip_address, user_agent
                    FROM user_sessions
                    ORDER BY session_start DESC LIMIT 100
                """)
            
            sessions = cursor.fetchall()
            conn.close()
            
            return [{
                'username': session[0],
                'session_start': session[1],
                'session_end': session[2],
                'ip_address': session[3],
                'user_agent': session[4]
            } for session in sessions]
        except Exception as e:
            st.error(f"Error getting sessions: {e}")
            return []
