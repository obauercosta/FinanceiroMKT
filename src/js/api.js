// API service for communication with backend
class ApiService {
    constructor() {
        this.baseURL = 'http://localhost:3000/api';
        this.token = localStorage.getItem('token');
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }

    // Get headers with authentication
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    // Make HTTP request
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            // Handle different response types
            let data;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // GET request
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        return this.request(url, {
            method: 'GET'
        });
    }

    // POST request
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT request
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // PATCH request
    async patch(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }

    // Authentication endpoints
    auth = {
        login: (credentials) => this.post('/auth/login', credentials),
        verify: () => this.get('/auth/verify'),
        changePassword: (data) => this.put('/auth/change-password', data),
        getUsers: () => this.get('/auth/usuarios'),
        createUser: (data) => this.post('/auth/usuarios', data),
        updateUser: (id, data) => this.put(`/auth/usuarios/${id}`, data)
    };

    // Dashboard endpoints
    dashboard = {
        getData: (period) => this.get('/dashboard', { periodo: period }),
        getEvolution: (months) => this.get('/dashboard/evolucao', { meses: months }),
        getIndicators: (period) => this.get('/dashboard/indicadores', { periodo: period })
    };

    // Clients endpoints
    clients = {
        getAll: (params) => this.get('/clientes', params),
        getById: (id) => this.get(`/clientes/${id}`),
        create: (data) => this.post('/clientes', data),
        update: (id, data) => this.put(`/clientes/${id}`, data),
        delete: (id) => this.delete(`/clientes/${id}`),
        getStats: (id, params) => this.get(`/clientes/${id}/estatisticas`, params)
    };

    // Contracts endpoints
    contracts = {
        getAll: (params) => this.get('/contratos', params),
        getById: (id) => this.get(`/contratos/${id}`),
        create: (data) => this.post('/contratos', data),
        update: (id, data) => this.put(`/contratos/${id}`, data),
        delete: (id) => this.delete(`/contratos/${id}`),
        applyAdjustment: (id, data) => this.patch(`/contratos/${id}/reajuste`, data),
        getExpiring: (days) => this.get('/contratos/vencimento/proximos', { dias: days }),
        getStats: () => this.get('/contratos/estatisticas/geral')
    };

    // Revenues endpoints
    revenues = {
        getAll: (params) => this.get('/receitas', params),
        getById: (id) => this.get(`/receitas/${id}`),
        create: (data) => this.post('/receitas', data),
        update: (id, data) => this.put(`/receitas/${id}`, data),
        delete: (id) => this.delete(`/receitas/${id}`),
        markAsReceived: (id, data) => this.patch(`/receitas/${id}/receber`, data),
        getByCategory: (params) => this.get('/receitas/resumo/categorias', params),
        getOverdue: () => this.get('/receitas/atrasadas'),
        createRecurring: (data) => this.post('/receitas/faturamento-recorrente', data)
    };

    // Expenses endpoints
    expenses = {
        getAll: (params) => this.get('/despesas', params),
        getById: (id) => this.get(`/despesas/${id}`),
        create: (data) => this.post('/despesas', data),
        update: (id, data) => this.put(`/despesas/${id}`, data),
        delete: (id) => this.delete(`/despesas/${id}`),
        markAsPaid: (id, data) => this.patch(`/despesas/${id}/pagar`, data),
        getByCategory: (params) => this.get('/despesas/resumo/categorias', params),
        getOverdue: () => this.get('/despesas/vencidas')
    };

    // Payroll endpoints
    payroll = {
        getAll: (params) => this.get('/folha', params),
        getById: (id) => this.get(`/folha/${id}`),
        create: (data) => this.post('/folha', data),
        update: (id, data) => this.put(`/folha/${id}`, data),
        delete: (id) => this.delete(`/folha/${id}`),
        markAsPaid: (id, data) => this.patch(`/folha/${id}/pagar`, data),
        calculateAll: (data) => this.post('/folha/calcular-todos', data),
        getSummary: (params) => this.get('/folha/resumo/periodo', params)
    };

    // Taxes endpoints
    taxes = {
        getAll: (params) => this.get('/impostos', params),
        getById: (id) => this.get(`/impostos/${id}`),
        create: (data) => this.post('/impostos', data),
        update: (id, data) => this.put(`/impostos/${id}`, data),
        delete: (id) => this.delete(`/impostos/${id}`),
        markAsPaid: (id, data) => this.patch(`/impostos/${id}/pagar`, data),
        calculateMonth: (data) => this.post('/impostos/calcular-mes', data),
        getExpiring: (days) => this.get('/impostos/vencimento/proximos', { dias: days }),
        getSummary: (params) => this.get('/impostos/resumo/periodo', params)
    };

    // Reports endpoints
    reports = {
        getDRE: (params) => this.get('/relatorios/dre', params),
        getClientProfitability: (params) => this.get('/relatorios/rentabilidade-clientes', params),
        getCashFlow: (params) => this.get('/relatorios/fluxo-caixa', params),
        getOverdue: (params) => this.get('/relatorios/inadimplencia', params),
        getCampaignROI: (params) => this.get('/relatorios/roi-campanhas', params)
    };
}

// Create global API instance
window.api = new ApiService();
