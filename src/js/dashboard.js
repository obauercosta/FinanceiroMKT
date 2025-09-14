// Dashboard functionality
class Dashboard {
    constructor() {
        this.charts = {};
        this.currentPeriod = 'mes';
        this.init();
    }

    // Initialize dashboard
    init() {
        this.loadDashboardData();
        this.setupEventListeners();
    }

    // Setup event listeners
    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadDashboardData());
        }

        // Export button
        const exportBtn = document.getElementById('export-dashboard');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportDashboard());
        }

        // Chart period selector
        const chartPeriod = document.getElementById('chart-period');
        if (chartPeriod) {
            chartPeriod.addEventListener('change', (e) => {
                this.currentPeriod = e.target.value;
                this.loadEvolutionChart();
            });
        }
    }

    // Load dashboard data
    async loadDashboardData() {
        try {
            Utils.showLoading(document.getElementById('refresh-dashboard'));
            
            // Dados simulados para demonstração (sem dados pré-carregados)
            const dashboardData = {
                resumo_financeiro: {
                    receitas: { total: 0, recebido: 0, pendente: 0 },
                    despesas: { total: 0, pago: 0, pendente: 0 },
                    lucro_liquido: 0,
                    folha_pagamento: { total_liquido: 0 },
                    impostos: { total: 0 }
                },
                top_clientes: [],
                categorias_despesas: [],
                contas_vencidas: [],
                proximos_vencimentos: []
            };
            
            const evolutionData = [];

            this.updateDashboardCards(dashboardData);
            this.updateActivityLists(dashboardData);
            this.loadEvolutionChart(evolutionData);
            this.loadExpensesChart(dashboardData);

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            Utils.showToast('Erro ao carregar dados do dashboard', 'error');
        } finally {
            Utils.hideLoading(document.getElementById('refresh-dashboard'));
        }
    }

    // Update dashboard cards
    updateDashboardCards(data) {
        const { resumo_financeiro } = data;

        // Receitas
        this.updateCard('receitas-total', Utils.formatCurrency(resumo_financeiro.receitas.total));
        this.updateCard('receitas-recebido', Utils.formatCurrency(resumo_financeiro.receitas.recebido));
        this.updateCard('receitas-pendente', Utils.formatCurrency(resumo_financeiro.receitas.pendente));

        // Despesas
        this.updateCard('despesas-total', Utils.formatCurrency(resumo_financeiro.despesas.total));
        this.updateCard('despesas-pago', Utils.formatCurrency(resumo_financeiro.despesas.pago));
        this.updateCard('despesas-pendente', Utils.formatCurrency(resumo_financeiro.despesas.pendente));

        // Lucro Líquido
        const lucroLiquido = resumo_financeiro.lucro_liquido;
        const lucroElement = document.getElementById('lucro-liquido');
        if (lucroElement) {
            lucroElement.textContent = Utils.formatCurrency(lucroLiquido);
            lucroElement.className = `metric-value ${lucroLiquido >= 0 ? 'text-success' : 'text-error'}`;
        }

        // Margem
        const margem = resumo_financeiro.receitas.total > 0 ? 
            (lucroLiquido / resumo_financeiro.receitas.total) * 100 : 0;
        this.updateCard('margem-lucro', Utils.formatPercentage(margem));

        // Clientes Ativos
        this.updateCard('clientes-ativos', data.top_clientes.length);
        
        // Ticket Médio
        const ticketMedio = data.top_clientes.length > 0 ? 
            data.top_clientes.reduce((sum, c) => sum + c.total_receita, 0) / data.top_clientes.length : 0;
        this.updateCard('ticket-medio', Utils.formatCurrency(ticketMedio));
    }

    // Update individual card value
    updateCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    // Update activity lists
    updateActivityLists(data) {
        this.updateActivityList('contas-vencidas', data.contas_vencidas, 'Vencidas');
        this.updateActivityList('proximos-vencimentos', data.proximos_vencimentos, 'Próximos Vencimentos');
    }

    // Update activity list
    updateActivityList(containerId, items, emptyMessage) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!items || items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>Nenhuma conta ${emptyMessage.toLowerCase()}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = items.map(item => this.createActivityItem(item)).join('');
    }

    // Create activity item
    createActivityItem(item) {
        const isOverdue = Utils.isOverdue(item.data_vencimento);
        const daysOverdue = isOverdue ? Utils.daysBetween(item.data_vencimento, new Date()) : 0;
        
        return `
            <div class="activity-item">
                <div class="activity-icon ${item.tipo}">
                    <i class="fas fa-${item.tipo === 'receita' ? 'arrow-up' : 'arrow-down'}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${Utils.sanitizeHtml(item.descricao)}</div>
                    <div class="activity-description">
                        ${Utils.formatDate(item.data_vencimento)}
                        ${isOverdue ? ` • ${daysOverdue} dias em atraso` : ''}
                    </div>
                    <div class="activity-meta">
                        <span class="status-badge ${item.status}">${item.status}</span>
                    </div>
                </div>
                <div class="activity-value ${item.tipo === 'receita' ? 'positive' : 'negative'}">
                    ${item.tipo === 'receita' ? '+' : '-'}${Utils.formatCurrency(item.valor)}
                </div>
            </div>
        `;
    }

    // Load evolution chart
    async loadEvolutionChart(data = null) {
        try {
            if (!data) {
                data = await api.dashboard.getEvolution(12);
            }

            const ctx = document.getElementById('evolution-chart');
            if (!ctx) return;

            // Destroy existing chart
            if (this.charts.evolution) {
                this.charts.evolution.destroy();
            }

            const labels = data.map(item => {
                const date = new Date(item.ano, item.mes - 1);
                return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
            });

            this.charts.evolution = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Receitas',
                            data: data.map(item => item.receitas),
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            tension: 0.4,
                            fill: false
                        },
                        {
                            label: 'Despesas',
                            data: data.map(item => item.despesas),
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            tension: 0.4,
                            fill: false
                        },
                        {
                            label: 'Lucro',
                            data: data.map(item => item.lucro),
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            tension: 0.4,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + Utils.formatCurrency(context.parsed.y);
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return Utils.formatCurrency(value);
                                }
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Error loading evolution chart:', error);
        }
    }

    // Load expenses chart
    loadExpensesChart(data) {
        const ctx = document.getElementById('expenses-chart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts.expenses) {
            this.charts.expenses.destroy();
        }

        const categories = data.categorias_despesas || [];
        
        if (categories.length === 0) {
            ctx.parentElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-pie"></i>
                    <p>Nenhuma despesa encontrada</p>
                </div>
            `;
            return;
        }

        this.charts.expenses = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories.map(cat => cat.categoria),
                datasets: [{
                    data: categories.map(cat => cat.total),
                    backgroundColor: [
                        '#3b82f6',
                        '#10b981',
                        '#f59e0b',
                        '#ef4444',
                        '#8b5cf6',
                        '#06b6d4',
                        '#84cc16',
                        '#f97316'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return context.label + ': ' + Utils.formatCurrency(context.parsed) + ' (' + percentage + '%)';
                            }
                        }
                    }
                }
            }
        });
    }

    // Export dashboard data
    async exportDashboard() {
        try {
            const data = await api.dashboard.getData(this.currentPeriod);
            
            // Create CSV content
            const csvContent = this.createDashboardCSV(data);
            
            // Download file
            const filename = `dashboard_${this.currentPeriod}_${new Date().toISOString().split('T')[0]}.csv`;
            Utils.downloadFile(csvContent, filename, 'text/csv');
            
            Utils.showToast('Dashboard exportado com sucesso!', 'success');
            
        } catch (error) {
            console.error('Error exporting dashboard:', error);
            Utils.showToast('Erro ao exportar dashboard', 'error');
        }
    }

    // Create CSV content for dashboard
    createDashboardCSV(data) {
        const { resumo_financeiro, top_clientes, categorias_despesas } = data;
        
        let csv = 'Dashboard Financeiro\n\n';
        csv += 'Resumo Financeiro\n';
        csv += 'Receitas Total,' + resumo_financeiro.receitas.total + '\n';
        csv += 'Receitas Recebidas,' + resumo_financeiro.receitas.recebido + '\n';
        csv += 'Receitas Pendentes,' + resumo_financeiro.receitas.pendente + '\n';
        csv += 'Despesas Total,' + resumo_financeiro.despesas.total + '\n';
        csv += 'Despesas Pagas,' + resumo_financeiro.despesas.pago + '\n';
        csv += 'Despesas Pendentes,' + resumo_financeiro.despesas.pendente + '\n';
        csv += 'Lucro Líquido,' + resumo_financeiro.lucro_liquido + '\n\n';
        
        csv += 'Top Clientes\n';
        csv += 'Cliente,Receita Total\n';
        top_clientes.forEach(cliente => {
            csv += cliente.nome_empresa + ',' + cliente.total_receita + '\n';
        });
        
        csv += '\nCategorias de Despesas\n';
        csv += 'Categoria,Total\n';
        categorias_despesas.forEach(categoria => {
            csv += categoria.categoria + ',' + categoria.total + '\n';
        });
        
        return csv;
    }

    // Refresh dashboard data
    refresh() {
        this.loadDashboardData();
    }
}

// Create global dashboard instance
window.dashboard = new Dashboard();
