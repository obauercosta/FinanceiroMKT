// Main application
class App {
    constructor() {
        this.currentPage = 'dashboard';
        this.init();
    }

    // Initialize application
    init() {
        this.setupEventListeners();
        this.setupSidebar();
        this.setupSearch();
        this.loadPage('dashboard');
    }

    // Setup event listeners
    setupEventListeners() {
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }

        // Navigation links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                if (page) {
                    this.loadPage(page);
                }
            });
        });

        // Window resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Botões do dashboard
        this.setupDashboardButtons();
        
        // Botões gerais
        this.setupGeneralButtons();
    }

    // Setup dashboard buttons
    setupDashboardButtons() {
        // Botão de nova receita
        const newReceitaBtn = document.getElementById('new-receita');
        if (newReceitaBtn) {
            newReceitaBtn.addEventListener('click', () => this.showNewReceitaModal());
        }

        // Botão de nova despesa
        const newDespesaBtn = document.getElementById('new-despesa');
        if (newDespesaBtn) {
            newDespesaBtn.addEventListener('click', () => this.showNewDespesaModal());
        }

        // Botão de novo cliente
        const newClienteBtn = document.getElementById('new-cliente');
        if (newClienteBtn) {
            newClienteBtn.addEventListener('click', () => this.showNewClienteModal());
        }

        // Botão de novo contrato
        const newContratoBtn = document.getElementById('new-contrato');
        if (newContratoBtn) {
            newContratoBtn.addEventListener('click', () => this.showNewContratoModal());
        }

        // Botão de nova folha
        const newFolhaBtn = document.getElementById('new-folha');
        if (newFolhaBtn) {
            newFolhaBtn.addEventListener('click', () => this.showNewFolhaModal());
        }

        // Botão de novo imposto
        const newImpostoBtn = document.getElementById('new-imposto');
        if (newImpostoBtn) {
            newImpostoBtn.addEventListener('click', () => this.showNewImpostoModal());
        }

        // Botão de calcular folha
        const calculateFolhaBtn = document.getElementById('calculate-folha');
        if (calculateFolhaBtn) {
            calculateFolhaBtn.addEventListener('click', () => this.calculateAllFolha());
        }

        // Botão de calcular impostos
        const calculateImpostosBtn = document.getElementById('calculate-impostos');
        if (calculateImpostosBtn) {
            calculateImpostosBtn.addEventListener('click', () => this.calculateImpostos());
        }
    }

    // Setup general buttons
    setupGeneralButtons() {
        // Botão de configurações
        const settingsLink = document.getElementById('settings-link');
        if (settingsLink) {
            settingsLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSettingsModal();
            });
        }

        // Botão de perfil
        const profileLink = document.getElementById('profile-link');
        if (profileLink) {
            profileLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showProfileModal();
            });
        }

        // Botão de exportar dashboard
        const exportDashboardBtn = document.getElementById('export-dashboard');
        if (exportDashboardBtn) {
            exportDashboardBtn.addEventListener('click', () => this.exportDashboard());
        }
    }

    // Setup sidebar
    setupSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.querySelector('.main-content');
        
        // Check if sidebar should be collapsed on mobile
        if (window.innerWidth <= 768) {
            sidebar.classList.add('collapsed');
        }
    }

    // Setup search
    setupSearch() {
        const searchInput = document.querySelector('.search-box input');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.handleSearch(e.target.value);
            }, 300));
        }
    }

    // Toggle sidebar
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.querySelector('.main-content');
        
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
    }

    // Load page
    async loadPage(pageName) {
        try {
            // Update navigation
            this.updateNavigation(pageName);
            
            // Hide all pages
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });

            // Show current page
            const pageElement = document.getElementById(`${pageName}-page`);
            if (pageElement) {
                pageElement.classList.add('active');
            } else {
                // Load page dynamically
                await this.loadDynamicPage(pageName);
            }

            this.currentPage = pageName;

            // Reconfigurar botões após carregar a página
            setTimeout(() => {
                this.setupDashboardButtons();
                this.setupGeneralButtons();
            }, 100);

            // Load page-specific data
            this.loadPageData(pageName);

        } catch (error) {
            console.error(`Error loading page ${pageName}:`, error);
            Utils.showToast(`Erro ao carregar página ${pageName}`, 'error');
        }
    }

    // Load dynamic page
    async loadDynamicPage(pageName) {
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;

        // Create page container
        const pageElement = document.createElement('div');
        pageElement.id = `${pageName}-page`;
        pageElement.className = 'page active';
        
        // Load page content based on page name
        switch (pageName) {
            case 'receitas':
                pageElement.innerHTML = this.createReceitasPage();
                break;
            case 'despesas':
                pageElement.innerHTML = this.createDespesasPage();
                break;
            case 'clientes':
                pageElement.innerHTML = this.createClientesPage();
                break;
            case 'contratos':
                pageElement.innerHTML = this.createContratosPage();
                break;
            case 'folha':
                pageElement.innerHTML = this.createFolhaPage();
                break;
            case 'impostos':
                pageElement.innerHTML = this.createImpostosPage();
                break;
            case 'relatorios':
                pageElement.innerHTML = this.createRelatoriosPage();
                break;
            default:
                pageElement.innerHTML = `
                    <div class="page-header">
                        <h1>${this.getPageTitle(pageName)}</h1>
                    </div>
                    <div class="empty-state">
                        <i class="fas fa-construction"></i>
                        <h3>Página em desenvolvimento</h3>
                        <p>Esta funcionalidade será implementada em breve.</p>
                    </div>
                `;
        }

        pageContent.innerHTML = '';
        pageContent.appendChild(pageElement);
    }

    // Create receitas page
    createReceitasPage() {
        return `
            <div class="page-header">
                <h1>Receitas</h1>
                <div class="page-actions">
                    <button class="btn btn-outline" id="filter-receitas">
                        <i class="fas fa-filter"></i>
                        Filtrar
                    </button>
                    <button class="btn btn-primary" id="new-receita">
                        <i class="fas fa-plus"></i>
                        Nova Receita
                    </button>
                </div>
            </div>
            <div class="table-container">
                <table class="table" id="receitas-table">
                    <thead>
                        <tr>
                            <th>Descrição</th>
                            <th>Cliente</th>
                            <th>Valor</th>
                            <th>Data Prevista</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="6" class="text-center">
                                <div class="loading">
                                    <div class="loading-spinner"></div>
                                    <p>Carregando receitas...</p>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    // Create despesas page
    createDespesasPage() {
        return `
            <div class="page-header">
                <h1>Despesas</h1>
                <div class="page-actions">
                    <button class="btn btn-outline" id="filter-despesas">
                        <i class="fas fa-filter"></i>
                        Filtrar
                    </button>
                    <button class="btn btn-primary" id="new-despesa">
                        <i class="fas fa-plus"></i>
                        Nova Despesa
                    </button>
                </div>
            </div>
            <div class="table-container">
                <table class="table" id="despesas-table">
                    <thead>
                        <tr>
                            <th>Descrição</th>
                            <th>Categoria</th>
                            <th>Valor</th>
                            <th>Data Prevista</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="6" class="text-center">
                                <div class="loading">
                                    <div class="loading-spinner"></div>
                                    <p>Carregando despesas...</p>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    // Create clientes page
    createClientesPage() {
        return `
            <div class="page-header">
                <h1>Clientes</h1>
                <div class="page-actions">
                    <button class="btn btn-outline" id="filter-clientes">
                        <i class="fas fa-filter"></i>
                        Filtrar
                    </button>
                    <button class="btn btn-primary" id="new-cliente">
                        <i class="fas fa-plus"></i>
                        Novo Cliente
                    </button>
                </div>
            </div>
            <div class="table-container">
                <table class="table" id="clientes-table">
                    <thead>
                        <tr>
                            <th>Empresa</th>
                            <th>CNPJ/CPF</th>
                            <th>Contato</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="5" class="text-center">
                                <div class="loading">
                                    <div class="loading-spinner"></div>
                                    <p>Carregando clientes...</p>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    // Create contratos page
    createContratosPage() {
        return `
            <div class="page-header">
                <h1>Contratos</h1>
                <div class="page-actions">
                    <button class="btn btn-outline" id="filter-contratos">
                        <i class="fas fa-filter"></i>
                        Filtrar
                    </button>
                    <button class="btn btn-primary" id="new-contrato">
                        <i class="fas fa-plus"></i>
                        Novo Contrato
                    </button>
                </div>
            </div>
            <div class="table-container">
                <table class="table" id="contratos-table">
                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>Valor Mensal</th>
                            <th>Data Início</th>
                            <th>Data Fim</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="6" class="text-center">
                                <div class="loading">
                                    <div class="loading-spinner"></div>
                                    <p>Carregando contratos...</p>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    // Create folha page
    createFolhaPage() {
        return `
            <div class="page-header">
                <h1>Folha de Pagamento</h1>
                <div class="page-actions">
                    <button class="btn btn-outline" id="filter-folha">
                        <i class="fas fa-filter"></i>
                        Filtrar
                    </button>
                    <button class="btn btn-primary" id="new-folha">
                        <i class="fas fa-plus"></i>
                        Nova Folha
                    </button>
                    <button class="btn btn-success" id="calculate-folha">
                        <i class="fas fa-calculator"></i>
                        Calcular Todos
                    </button>
                </div>
            </div>
            <div class="table-container">
                <table class="table" id="folha-table">
                    <thead>
                        <tr>
                            <th>Funcionário</th>
                            <th>Mês/Ano</th>
                            <th>Salário Bruto</th>
                            <th>Salário Líquido</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="6" class="text-center">
                                <div class="loading">
                                    <div class="loading-spinner"></div>
                                    <p>Carregando folha de pagamento...</p>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    // Create impostos page
    createImpostosPage() {
        return `
            <div class="page-header">
                <h1>Impostos</h1>
                <div class="page-actions">
                    <button class="btn btn-outline" id="filter-impostos">
                        <i class="fas fa-filter"></i>
                        Filtrar
                    </button>
                    <button class="btn btn-primary" id="new-imposto">
                        <i class="fas fa-plus"></i>
                        Novo Imposto
                    </button>
                    <button class="btn btn-success" id="calculate-impostos">
                        <i class="fas fa-calculator"></i>
                        Calcular Mês
                    </button>
                </div>
            </div>
            <div class="table-container">
                <table class="table" id="impostos-table">
                    <thead>
                        <tr>
                            <th>Tipo</th>
                            <th>Base Cálculo</th>
                            <th>Alíquota</th>
                            <th>Valor</th>
                            <th>Vencimento</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="7" class="text-center">
                                <div class="loading">
                                    <div class="loading-spinner"></div>
                                    <p>Carregando impostos...</p>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    // Create relatorios page
    createRelatoriosPage() {
        return `
            <div class="page-header">
                <h1>Relatórios</h1>
                <div class="page-actions">
                    <button class="btn btn-primary" id="generate-dre">
                        <i class="fas fa-file-alt"></i>
                        DRE
                    </button>
                    <button class="btn btn-primary" id="generate-cashflow">
                        <i class="fas fa-chart-line"></i>
                        Fluxo de Caixa
                    </button>
                    <button class="btn btn-primary" id="generate-profitability">
                        <i class="fas fa-chart-pie"></i>
                        Rentabilidade
                    </button>
                </div>
            </div>
            <div class="reports-grid">
                <div class="report-card">
                    <h3>DRE - Demonstração do Resultado do Exercício</h3>
                    <p>Relatório completo de receitas, despesas e resultado do período</p>
                    <button class="btn btn-primary" onclick="app.generateReport('dre')">
                        Gerar DRE
                    </button>
                </div>
                <div class="report-card">
                    <h3>Fluxo de Caixa</h3>
                    <p>Análise de entradas e saídas de caixa por período</p>
                    <button class="btn btn-primary" onclick="app.generateReport('cashflow')">
                        Gerar Fluxo
                    </button>
                </div>
                <div class="report-card">
                    <h3>Rentabilidade por Cliente</h3>
                    <p>Análise de rentabilidade e performance por cliente</p>
                    <button class="btn btn-primary" onclick="app.generateReport('profitability')">
                        Gerar Análise
                    </button>
                </div>
            </div>
        `;
    }

    // Get page title
    getPageTitle(pageName) {
        const titles = {
            dashboard: 'Dashboard',
            receitas: 'Receitas',
            despesas: 'Despesas',
            clientes: 'Clientes',
            contratos: 'Contratos',
            folha: 'Folha de Pagamento',
            impostos: 'Impostos',
            relatorios: 'Relatórios'
        };
        return titles[pageName] || pageName;
    }

    // Update navigation
    updateNavigation(activePage) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === activePage) {
                link.classList.add('active');
            }
        });
    }

    // Load page data
    async loadPageData(pageName) {
        try {
            switch (pageName) {
                case 'receitas':
                    await this.loadReceitasData();
                    break;
                case 'despesas':
                    await this.loadDespesasData();
                    break;
                case 'clientes':
                    await this.loadClientesData();
                    break;
                case 'contratos':
                    await this.loadContratosData();
                    break;
                case 'folha':
                    await this.loadFolhaData();
                    break;
                case 'impostos':
                    await this.loadImpostosData();
                    break;
            }
        } catch (error) {
            console.error(`Error loading data for ${pageName}:`, error);
        }
    }

    // Load receitas data
    async loadReceitasData() {
        try {
            // Simular dados para demonstração
            const mockData = [
                {
                    id: 1,
                    descricao: 'Consultoria Marketing Digital',
                    cliente_nome: 'Cliente A',
                    valor: 5000.00,
                    data_prevista: '2024-01-15',
                    status: 'pendente'
                },
                {
                    id: 2,
                    descricao: 'Gestão de Tráfego Pago',
                    cliente_nome: 'Cliente B',
                    valor: 3000.00,
                    data_prevista: '2024-01-20',
                    status: 'recebido'
                }
            ];
            
            this.renderReceitasTable(mockData);
        } catch (error) {
            console.error('Error loading receitas:', error);
            this.renderReceitasTable([]);
        }
    }

    // Load despesas data
    async loadDespesasData() {
        try {
            // Simular dados para demonstração
            const mockData = [
                {
                    id: 1,
                    descricao: 'Mídia Paga Facebook',
                    categoria: 'midia_paga',
                    valor: 2000.00,
                    data_prevista: '2024-01-10',
                    status: 'pago'
                },
                {
                    id: 2,
                    descricao: 'Ferramentas de Marketing',
                    categoria: 'infraestrutura',
                    valor: 500.00,
                    data_prevista: '2024-01-15',
                    status: 'pendente'
                }
            ];
            
            this.renderDespesasTable(mockData);
        } catch (error) {
            console.error('Error loading despesas:', error);
            this.renderDespesasTable([]);
        }
    }

    // Load clientes data
    async loadClientesData() {
        try {
            // Simular dados para demonstração
            const mockData = [
                {
                    id: 1,
                    nome_empresa: 'Empresa ABC Ltda',
                    cnpj_cpf: '12.345.678/0001-90',
                    contato_nome: 'João Silva',
                    contato_email: 'joao@empresaabc.com',
                    status: 'ativo'
                },
                {
                    id: 2,
                    nome_empresa: 'Comércio XYZ',
                    cnpj_cpf: '987.654.321-00',
                    contato_nome: 'Maria Santos',
                    contato_email: 'maria@comercioxyz.com',
                    status: 'ativo'
                }
            ];
            
            this.renderClientesTable(mockData);
        } catch (error) {
            console.error('Error loading clientes:', error);
            this.renderClientesTable([]);
        }
    }

    // Load contratos data
    async loadContratosData() {
        try {
            // Simular dados para demonstração
            const mockData = [
                {
                    id: 1,
                    cliente_nome: 'Empresa ABC Ltda',
                    valor_mensal: 5000.00,
                    data_inicio: '2024-01-01',
                    data_fim: '2024-12-31',
                    status: 'ativo'
                },
                {
                    id: 2,
                    cliente_nome: 'Comércio XYZ',
                    valor_mensal: 3000.00,
                    data_inicio: '2024-02-01',
                    data_fim: null,
                    status: 'ativo'
                }
            ];
            
            this.renderContratosTable(mockData);
        } catch (error) {
            console.error('Error loading contratos:', error);
            this.renderContratosTable([]);
        }
    }

    // Load folha data
    async loadFolhaData() {
        try {
            // Simular dados para demonstração
            const mockData = [
                {
                    id: 1,
                    funcionario_nome: 'João Silva',
                    mes_referencia: 1,
                    ano_referencia: 2024,
                    salario_bruto: 5000.00,
                    salario_liquido: 4000.00,
                    status: 'pago'
                },
                {
                    id: 2,
                    funcionario_nome: 'Maria Santos',
                    mes_referencia: 1,
                    ano_referencia: 2024,
                    salario_bruto: 4000.00,
                    salario_liquido: 3200.00,
                    status: 'pendente'
                }
            ];
            
            this.renderFolhaTable(mockData);
        } catch (error) {
            console.error('Error loading folha:', error);
            this.renderFolhaTable([]);
        }
    }

    // Load impostos data
    async loadImpostosData() {
        try {
            // Simular dados para demonstração
            const mockData = [
                {
                    id: 1,
                    tipo: 'DAS',
                    base_calculo: 10000.00,
                    aliquota: 6.00,
                    valor: 600.00,
                    data_vencimento: '2024-01-20',
                    status: 'pendente'
                },
                {
                    id: 2,
                    tipo: 'ISS',
                    base_calculo: 5000.00,
                    aliquota: 5.00,
                    valor: 250.00,
                    data_vencimento: '2024-01-25',
                    status: 'pago'
                }
            ];
            
            this.renderImpostosTable(mockData);
        } catch (error) {
            console.error('Error loading impostos:', error);
            this.renderImpostosTable([]);
        }
    }

    // Render tables (simplified for now)
    renderReceitasTable(data) {
        const tbody = document.querySelector('#receitas-table tbody');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <p>Nenhuma receita encontrada</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${Utils.sanitizeHtml(item.descricao)}</td>
                <td>${Utils.sanitizeHtml(item.cliente_nome || '-')}</td>
                <td>${Utils.formatCurrency(item.valor)}</td>
                <td>${Utils.formatDate(item.data_prevista)}</td>
                <td><span class="status-badge ${item.status}">${item.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="app.editReceita(${item.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-error" onclick="app.deleteReceita(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Render despesas table
    renderDespesasTable(data) {
        const tbody = document.querySelector('#despesas-table tbody');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <p>Nenhuma despesa encontrada</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${Utils.sanitizeHtml(item.descricao)}</td>
                <td>${Utils.sanitizeHtml(item.categoria)}</td>
                <td>${Utils.formatCurrency(item.valor)}</td>
                <td>${Utils.formatDate(item.data_prevista)}</td>
                <td><span class="status-badge ${item.status}">${item.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="app.editDespesa(${item.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-error" onclick="app.deleteDespesa(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Render clientes table
    renderClientesTable(data) {
        const tbody = document.querySelector('#clientes-table tbody');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <p>Nenhum cliente encontrado</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${Utils.sanitizeHtml(item.nome_empresa)}</td>
                <td>${Utils.sanitizeHtml(item.cnpj_cpf)}</td>
                <td>${Utils.sanitizeHtml(item.contato_nome)}</td>
                <td><span class="status-badge ${item.status}">${item.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="app.editCliente(${item.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-error" onclick="app.deleteCliente(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Render contratos table
    renderContratosTable(data) {
        const tbody = document.querySelector('#contratos-table tbody');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <p>Nenhum contrato encontrado</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${Utils.sanitizeHtml(item.cliente_nome)}</td>
                <td>${Utils.formatCurrency(item.valor_mensal)}</td>
                <td>${Utils.formatDate(item.data_inicio)}</td>
                <td>${item.data_fim ? Utils.formatDate(item.data_fim) : 'Indefinido'}</td>
                <td><span class="status-badge ${item.status}">${item.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="app.editContrato(${item.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-error" onclick="app.deleteContrato(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Render folha table
    renderFolhaTable(data) {
        const tbody = document.querySelector('#folha-table tbody');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <p>Nenhuma folha de pagamento encontrada</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${Utils.sanitizeHtml(item.funcionario_nome)}</td>
                <td>${item.mes_referencia}/${item.ano_referencia}</td>
                <td>${Utils.formatCurrency(item.salario_bruto)}</td>
                <td>${Utils.formatCurrency(item.salario_liquido)}</td>
                <td><span class="status-badge ${item.status}">${item.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="app.editFolha(${item.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-error" onclick="app.deleteFolha(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Render impostos table
    renderImpostosTable(data) {
        const tbody = document.querySelector('#impostos-table tbody');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <p>Nenhum imposto encontrado</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${Utils.sanitizeHtml(item.tipo)}</td>
                <td>${Utils.formatCurrency(item.base_calculo)}</td>
                <td>${item.aliquota}%</td>
                <td>${Utils.formatCurrency(item.valor)}</td>
                <td>${Utils.formatDate(item.data_vencimento)}</td>
                <td><span class="status-badge ${item.status}">${item.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="app.editImposto(${item.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-error" onclick="app.deleteImposto(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Handle search
    handleSearch(query) {
        console.log('Searching for:', query);
        // Implement search functionality
    }

    // Handle window resize
    handleResize() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.querySelector('.main-content');
        
        if (window.innerWidth <= 768) {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('expanded');
        } else {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('expanded');
        }
    }

    // Handle keyboard shortcuts
    handleKeyboard(e) {
        // Ctrl/Cmd + K for search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.querySelector('.search-box input');
            if (searchInput) {
                searchInput.focus();
            }
        }
    }

    // Generate report
    generateReport(type) {
        Utils.showToast(`Gerando relatório ${type}...`, 'info');
        // Implement report generation
    }

    // Modal methods
    showNewReceitaModal() {
        const content = `
            <form id="receita-form">
                <div class="form-group">
                    <label class="form-label">Descrição *</label>
                    <input type="text" class="form-input" name="descricao" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Valor *</label>
                    <input type="number" class="form-input" name="valor" step="0.01" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Categoria *</label>
                    <select class="form-select" name="categoria" required>
                        <option value="">Selecione...</option>
                        <option value="consultoria">Consultoria</option>
                        <option value="gestao_trafego">Gestão de Tráfego</option>
                        <option value="criacao_conteudo">Criação de Conteúdo</option>
                        <option value="contrato_mensal">Contrato Mensal</option>
                        <option value="projeto_avulso">Projeto Avulso</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Data Prevista *</label>
                    <input type="date" class="form-input" name="data_prevista" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Forma de Pagamento</label>
                    <select class="form-select" name="forma_pagamento">
                        <option value="pix">PIX</option>
                        <option value="transferencia">Transferência</option>
                        <option value="boleto">Boleto</option>
                        <option value="cartao">Cartão</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Observações</label>
                    <textarea class="form-textarea" name="observacoes" rows="3"></textarea>
                </div>
            </form>
        `;
        
        const footer = `
            <button class="btn btn-outline" onclick="components.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="app.saveReceita()">Salvar</button>
        `;
        
        components.showModal('Nova Receita', content, { footer });
    }

    showNewDespesaModal() {
        const content = `
            <form id="despesa-form">
                <div class="form-group">
                    <label class="form-label">Descrição *</label>
                    <input type="text" class="form-input" name="descricao" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Categoria *</label>
                    <select class="form-select" name="categoria" required>
                        <option value="">Selecione...</option>
                        <option value="fixa">Fixa</option>
                        <option value="variavel">Variável</option>
                        <option value="midia_paga">Mídia Paga</option>
                        <option value="freelancers">Freelancers</option>
                        <option value="infraestrutura">Infraestrutura</option>
                        <option value="marketing">Marketing</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Valor *</label>
                    <input type="number" class="form-input" name="valor" step="0.01" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Data Prevista *</label>
                    <input type="date" class="form-input" name="data_prevista" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Fornecedor</label>
                    <input type="text" class="form-input" name="fornecedor">
                </div>
                <div class="form-group">
                    <label class="form-label">Forma de Pagamento</label>
                    <select class="form-select" name="forma_pagamento">
                        <option value="pix">PIX</option>
                        <option value="transferencia">Transferência</option>
                        <option value="boleto">Boleto</option>
                        <option value="cartao">Cartão</option>
                        <option value="dinheiro">Dinheiro</option>
                    </select>
                </div>
            </form>
        `;
        
        const footer = `
            <button class="btn btn-outline" onclick="components.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="app.saveDespesa()">Salvar</button>
        `;
        
        components.showModal('Nova Despesa', content, { footer });
    }

    showNewClienteModal() {
        const content = `
            <form id="cliente-form">
                <div class="form-group">
                    <label class="form-label">Nome da Empresa *</label>
                    <input type="text" class="form-input" name="nome_empresa" required>
                </div>
                <div class="form-group">
                    <label class="form-label">CNPJ/CPF *</label>
                    <input type="text" class="form-input" name="cnpj_cpf" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Nome do Contato</label>
                    <input type="text" class="form-input" name="contato_nome">
                </div>
                <div class="form-group">
                    <label class="form-label">Email do Contato</label>
                    <input type="email" class="form-input" name="contato_email">
                </div>
                <div class="form-group">
                    <label class="form-label">Telefone</label>
                    <input type="tel" class="form-input" name="contato_telefone">
                </div>
                <div class="form-group">
                    <label class="form-label">Endereço</label>
                    <textarea class="form-textarea" name="endereco" rows="2"></textarea>
                </div>
            </form>
        `;
        
        const footer = `
            <button class="btn btn-outline" onclick="components.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="app.saveCliente()">Salvar</button>
        `;
        
        components.showModal('Novo Cliente', content, { footer });
    }

    showNewContratoModal() {
        const content = `
            <form id="contrato-form">
                <div class="form-group">
                    <label class="form-label">Cliente *</label>
                    <select class="form-select" name="id_cliente" required>
                        <option value="">Selecione um cliente...</option>
                        <option value="1">Cliente A</option>
                        <option value="2">Cliente B</option>
                        <option value="3">Cliente C</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Valor Mensal *</label>
                    <input type="number" class="form-input" name="valor_mensal" step="0.01" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Data de Início *</label>
                    <input type="date" class="form-input" name="data_inicio" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Data de Fim</label>
                    <input type="date" class="form-input" name="data_fim">
                </div>
                <div class="form-group">
                    <label class="form-label">Reajuste Anual (%)</label>
                    <input type="number" class="form-input" name="reajuste_percentual" step="0.01" value="0">
                </div>
                <div class="form-group">
                    <label class="form-label">Observações</label>
                    <textarea class="form-textarea" name="observacoes" rows="3"></textarea>
                </div>
            </form>
        `;
        
        const footer = `
            <button class="btn btn-outline" onclick="components.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="app.saveContrato()">Salvar</button>
        `;
        
        components.showModal('Novo Contrato', content, { footer });
    }

    showNewFolhaModal() {
        const content = `
            <form id="folha-form">
                <div class="form-group">
                    <label class="form-label">Funcionário *</label>
                    <select class="form-select" name="id_usuario" required>
                        <option value="">Selecione um funcionário...</option>
                        <option value="1">João Silva</option>
                        <option value="2">Maria Santos</option>
                        <option value="3">Pedro Costa</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Mês *</label>
                    <select class="form-select" name="mes_referencia" required>
                        <option value="1">Janeiro</option>
                        <option value="2">Fevereiro</option>
                        <option value="3">Março</option>
                        <option value="4">Abril</option>
                        <option value="5">Maio</option>
                        <option value="6">Junho</option>
                        <option value="7">Julho</option>
                        <option value="8">Agosto</option>
                        <option value="9">Setembro</option>
                        <option value="10">Outubro</option>
                        <option value="11">Novembro</option>
                        <option value="12">Dezembro</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Ano *</label>
                    <input type="number" class="form-input" name="ano_referencia" value="2024" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Salário Bruto *</label>
                    <input type="number" class="form-input" name="salario_bruto" step="0.01" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Vale Transporte</label>
                    <input type="number" class="form-input" name="vale_transporte" step="0.01" value="0">
                </div>
                <div class="form-group">
                    <label class="form-label">Vale Refeição</label>
                    <input type="number" class="form-input" name="vale_refeicao" step="0.01" value="0">
                </div>
                <div class="form-group">
                    <label class="form-label">Outros Descontos</label>
                    <input type="number" class="form-input" name="outros_descontos" step="0.01" value="0">
                </div>
            </form>
        `;
        
        const footer = `
            <button class="btn btn-outline" onclick="components.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="app.saveFolha()">Calcular e Salvar</button>
        `;
        
        components.showModal('Nova Folha de Pagamento', content, { footer });
    }

    showNewImpostoModal() {
        const content = `
            <form id="imposto-form">
                <div class="form-group">
                    <label class="form-label">Tipo de Imposto *</label>
                    <select class="form-select" name="tipo" required>
                        <option value="">Selecione...</option>
                        <option value="DAS">DAS - Simples Nacional</option>
                        <option value="PIS/COFINS">PIS/COFINS</option>
                        <option value="ISS">ISS</option>
                        <option value="IRPJ">IRPJ</option>
                        <option value="CSLL">CSLL</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Base de Cálculo *</label>
                    <input type="number" class="form-input" name="base_calculo" step="0.01" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Alíquota (%) *</label>
                    <input type="number" class="form-input" name="aliquota" step="0.01" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Valor *</label>
                    <input type="number" class="form-input" name="valor" step="0.01" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Data de Vencimento *</label>
                    <input type="date" class="form-input" name="data_vencimento" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Observações</label>
                    <textarea class="form-textarea" name="observacoes" rows="3"></textarea>
                </div>
            </form>
        `;
        
        const footer = `
            <button class="btn btn-outline" onclick="components.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="app.saveImposto()">Salvar</button>
        `;
        
        components.showModal('Novo Imposto', content, { footer });
    }

    showSettingsModal() {
        const content = `
            <div class="settings-content">
                <h4>Configurações do Sistema</h4>
                <div class="form-group">
                    <label class="form-label">Regime Tributário</label>
                    <select class="form-select">
                        <option value="simples_nacional" selected>Simples Nacional</option>
                        <option value="lucro_presumido">Lucro Presumido</option>
                        <option value="lucro_real">Lucro Real</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Alíquota Simples Nacional (%)</label>
                    <input type="number" class="form-input" value="6.00" step="0.01">
                </div>
                <div class="form-group">
                    <label class="form-label">Reserva de Emergência (%)</label>
                    <input type="number" class="form-input" value="10.00" step="0.01">
                </div>
                <div class="form-group">
                    <label class="form-label">Reserva para Reinvestimento (%)</label>
                    <input type="number" class="form-input" value="20.00" step="0.01">
                </div>
            </div>
        `;
        
        const footer = `
            <button class="btn btn-outline" onclick="components.closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="app.saveSettings()">Salvar Configurações</button>
        `;
        
        components.showModal('Configurações', content, { footer });
    }

    showProfileModal() {
        const user = auth.getCurrentUser();
        const content = `
            <div class="profile-content">
                <h4>Perfil do Usuário</h4>
                <div class="form-group">
                    <label class="form-label">Nome</label>
                    <input type="text" class="form-input" value="${user ? user.nome : ''}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-input" value="${user ? user.email : ''}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Cargo</label>
                    <input type="text" class="form-input" value="${user ? user.cargo : ''}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Nível de Acesso</label>
                    <input type="text" class="form-input" value="${user ? user.nivel_acesso : ''}" readonly>
                </div>
            </div>
        `;
        
        const footer = `
            <button class="btn btn-outline" onclick="components.closeModal()">Fechar</button>
            <button class="btn btn-primary" onclick="app.changePassword()">Alterar Senha</button>
        `;
        
        components.showModal('Perfil do Usuário', content, { footer });
    }

    // Save methods
    async saveReceita() {
        const form = document.getElementById('receita-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            await api.revenues.create(data);
            Utils.showToast('Receita criada com sucesso!', 'success');
            components.closeModal();
            this.loadPageData('receitas');
        } catch (error) {
            Utils.showToast('Erro ao criar receita: ' + error.message, 'error');
        }
    }

    async saveDespesa() {
        const form = document.getElementById('despesa-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            await api.expenses.create(data);
            Utils.showToast('Despesa criada com sucesso!', 'success');
            components.closeModal();
            this.loadPageData('despesas');
        } catch (error) {
            Utils.showToast('Erro ao criar despesa: ' + error.message, 'error');
        }
    }

    async saveCliente() {
        const form = document.getElementById('cliente-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            await api.clients.create(data);
            Utils.showToast('Cliente criado com sucesso!', 'success');
            components.closeModal();
            this.loadPageData('clientes');
        } catch (error) {
            Utils.showToast('Erro ao criar cliente: ' + error.message, 'error');
        }
    }

    async saveContrato() {
        const form = document.getElementById('contrato-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            await api.contracts.create(data);
            Utils.showToast('Contrato criado com sucesso!', 'success');
            components.closeModal();
            this.loadPageData('contratos');
        } catch (error) {
            Utils.showToast('Erro ao criar contrato: ' + error.message, 'error');
        }
    }

    async saveFolha() {
        const form = document.getElementById('folha-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            await api.payroll.create(data);
            Utils.showToast('Folha de pagamento criada com sucesso!', 'success');
            components.closeModal();
            this.loadPageData('folha');
        } catch (error) {
            Utils.showToast('Erro ao criar folha: ' + error.message, 'error');
        }
    }

    async saveImposto() {
        const form = document.getElementById('imposto-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        try {
            await api.taxes.create(data);
            Utils.showToast('Imposto criado com sucesso!', 'success');
            components.closeModal();
            this.loadPageData('impostos');
        } catch (error) {
            Utils.showToast('Erro ao criar imposto: ' + error.message, 'error');
        }
    }

    async calculateAllFolha() {
        try {
            const mes = new Date().getMonth() + 1;
            const ano = new Date().getFullYear();
            
            await api.payroll.calculateAll({ mes, ano });
            Utils.showToast('Folha de pagamento calculada para todos os funcionários!', 'success');
            this.loadPageData('folha');
        } catch (error) {
            Utils.showToast('Erro ao calcular folha: ' + error.message, 'error');
        }
    }

    async calculateImpostos() {
        try {
            const mes = new Date().getMonth() + 1;
            const ano = new Date().getFullYear();
            
            await api.taxes.calculateMonth({ mes, ano });
            Utils.showToast('Impostos calculados para o mês!', 'success');
            this.loadPageData('impostos');
        } catch (error) {
            Utils.showToast('Erro ao calcular impostos: ' + error.message, 'error');
        }
    }

    async exportDashboard() {
        try {
            Utils.showToast('Exportando dashboard...', 'info');
            // Implementar exportação
            Utils.showToast('Dashboard exportado com sucesso!', 'success');
        } catch (error) {
            Utils.showToast('Erro ao exportar dashboard: ' + error.message, 'error');
        }
    }

    async saveSettings() {
        Utils.showToast('Configurações salvas com sucesso!', 'success');
        components.closeModal();
    }

    changePassword() {
        Utils.showToast('Funcionalidade de alteração de senha será implementada em breve', 'info');
    }

    // Edit methods
    editReceita(id) {
        Utils.showToast('Funcionalidade de edição será implementada em breve', 'info');
    }

    editDespesa(id) {
        Utils.showToast('Funcionalidade de edição será implementada em breve', 'info');
    }

    editCliente(id) {
        Utils.showToast('Funcionalidade de edição será implementada em breve', 'info');
    }

    editContrato(id) {
        Utils.showToast('Funcionalidade de edição será implementada em breve', 'info');
    }

    editFolha(id) {
        Utils.showToast('Funcionalidade de edição será implementada em breve', 'info');
    }

    editImposto(id) {
        Utils.showToast('Funcionalidade de edição será implementada em breve', 'info');
    }

    // Delete methods
    async deleteReceita(id) {
        if (confirm('Tem certeza que deseja excluir esta receita?')) {
            try {
                // Simular exclusão
                Utils.showToast('Receita excluída com sucesso!', 'success');
                this.loadPageData('receitas');
            } catch (error) {
                Utils.showToast('Erro ao excluir receita: ' + error.message, 'error');
            }
        }
    }

    async deleteDespesa(id) {
        if (confirm('Tem certeza que deseja excluir esta despesa?')) {
            try {
                // Simular exclusão
                Utils.showToast('Despesa excluída com sucesso!', 'success');
                this.loadPageData('despesas');
            } catch (error) {
                Utils.showToast('Erro ao excluir despesa: ' + error.message, 'error');
            }
        }
    }

    async deleteCliente(id) {
        if (confirm('Tem certeza que deseja excluir este cliente?')) {
            try {
                // Simular exclusão
                Utils.showToast('Cliente excluído com sucesso!', 'success');
                this.loadPageData('clientes');
            } catch (error) {
                Utils.showToast('Erro ao excluir cliente: ' + error.message, 'error');
            }
        }
    }

    async deleteContrato(id) {
        if (confirm('Tem certeza que deseja excluir este contrato?')) {
            try {
                // Simular exclusão
                Utils.showToast('Contrato excluído com sucesso!', 'success');
                this.loadPageData('contratos');
            } catch (error) {
                Utils.showToast('Erro ao excluir contrato: ' + error.message, 'error');
            }
        }
    }

    async deleteFolha(id) {
        if (confirm('Tem certeza que deseja excluir esta folha de pagamento?')) {
            try {
                // Simular exclusão
                Utils.showToast('Folha de pagamento excluída com sucesso!', 'success');
                this.loadPageData('folha');
            } catch (error) {
                Utils.showToast('Erro ao excluir folha: ' + error.message, 'error');
            }
        }
    }

    async deleteImposto(id) {
        if (confirm('Tem certeza que deseja excluir este imposto?')) {
            try {
                // Simular exclusão
                Utils.showToast('Imposto excluído com sucesso!', 'success');
                this.loadPageData('impostos');
            } catch (error) {
                Utils.showToast('Erro ao excluir imposto: ' + error.message, 'error');
            }
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
