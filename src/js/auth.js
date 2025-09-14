// Authentication management
class AuthService {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    // Initialize authentication
    init() {
        const token = localStorage.getItem('token');
        if (token) {
            this.verifyToken();
        } else {
            this.showLogin();
        }
    }

    // Verify token validity
    async verifyToken() {
        try {
            const response = await api.auth.verify();
            this.currentUser = response.user;
            this.showApp();
            this.updateUserInterface();
        } catch (error) {
            console.error('Token verification failed:', error);
            this.logout();
        }
    }

    // Login user
    async login(credentials) {
        try {
            Utils.showLoading(document.getElementById('login-form'));
            
            const response = await api.auth.login(credentials);
            
            api.setToken(response.token);
            this.currentUser = response.usuario;
            
            this.showApp();
            this.updateUserInterface();
            
            Utils.showToast('Login realizado com sucesso!', 'success');
            
        } catch (error) {
            console.error('Login failed:', error);
            Utils.showToast(error.message || 'Erro ao fazer login', 'error');
        } finally {
            Utils.hideLoading(document.getElementById('login-form'));
        }
    }

    // Logout user
    logout() {
        api.setToken(null);
        this.currentUser = null;
        this.showLogin();
        Utils.showToast('Logout realizado com sucesso!', 'info');
    }

    // Show login screen
    showLogin() {
        Utils.hide(document.getElementById('main-app'));
        Utils.hide(document.getElementById('loading-screen'));
        Utils.show(document.getElementById('login-screen'));
    }

    // Show main app
    showApp() {
        Utils.hide(document.getElementById('login-screen'));
        Utils.hide(document.getElementById('loading-screen'));
        Utils.show(document.getElementById('main-app'));
    }

    // Update user interface with current user data
    updateUserInterface() {
        if (this.currentUser) {
            const userNameElement = document.getElementById('user-name');
            if (userNameElement) {
                userNameElement.textContent = this.currentUser.nome;
            }
        }
    }

    // Check if user has permission
    hasPermission(level) {
        if (!this.currentUser) return false;
        return this.currentUser.nivel_acesso >= level;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.currentUser;
    }
}

// Create global auth instance
window.auth = new AuthService();

// Login form handler
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            if (!email || !password) {
                Utils.showToast('Por favor, preencha todos os campos', 'error');
                return;
            }
            
            await auth.login({ email, senha: password });
        });
    }

    // Logout handler
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            auth.logout();
        });
    }

    // User menu toggle
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');
    
    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.classList.toggle('open');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.remove('open');
            }
        });
    }
});
