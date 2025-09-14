# FinanceiroMKT - Sistema Financeiro para Marketing Digital

Sistema completo de gestão financeira desenvolvido especificamente para agências de marketing digital.

## 🚀 Funcionalidades

### Módulos Principais
- **Contas a Pagar e Receber** - Gestão completa de receitas e despesas
- **Gestão de Receita** - Faturamento recorrente e pontual
- **Folha de Pagamento** - Cálculos automáticos CLT e PJ
- **Gestão de Impostos** - Simples Nacional e regime normal
- **Controle de Caixa** - Projeções e simulações
- **Gestão de Contratos** - Acompanhamento de clientes
- **Relatórios Estratégicos** - DRE, ROI, rentabilidade

### Características Técnicas
- **Executável Único** - Aplicação desktop com Electron
- **Banco SQLite** - Dados locais integrados
- **Interface Moderna** - Dashboard responsivo e intuitivo
- **Cálculos Automáticos** - Impostos, folha, margens
- **Relatórios Avançados** - Exportação PDF/Excel

## 📦 Instalação

### Pré-requisitos
- Node.js 16+ 
- npm ou yarn

### Instalação
```bash
# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev

# Build para produção
npm run build
```

## 🎯 Uso

### Login Inicial
- **Email:** admin@financeiromkt.com
- **Senha:** admin123

### Principais Telas
1. **Dashboard** - Visão geral financeira
2. **Receitas** - Gestão de entradas
3. **Despesas** - Controle de saídas
4. **Clientes** - Cadastro e contratos
5. **Folha** - Pagamentos e encargos
6. **Impostos** - Cálculos tributários
7. **Relatórios** - Análises estratégicas

## 🔧 Configuração

### Regime Tributário
O sistema suporta:
- Simples Nacional (Anexo III/IV)
- Lucro Presumido
- Lucro Real

### Cálculos Automáticos
- **INSS/IRRF** - Tabelas 2024
- **FGTS** - 8% sobre salário bruto
- **DAS** - Simples Nacional
- **PIS/COFINS** - Regime normal

## 📊 Relatórios

### DRE (Demonstração do Resultado)
- Receitas e despesas por categoria
- Margem de contribuição
- Lucro líquido

### Fluxo de Caixa
- Projeções semanais/mensais
- Cenários de simulação
- Alertas de vencimento

### Rentabilidade
- Análise por cliente
- ROI de campanhas
- Ticket médio

## 🛠️ Desenvolvimento

### Estrutura do Projeto
```
FinanceiroMKT/
├── main.js              # Processo principal Electron
├── preload.js           # Script de pré-carregamento
├── package.json         # Dependências e scripts
├── api/                 # Backend API
│   ├── database/        # Banco SQLite
│   └── routes/          # Rotas da API
└── src/                 # Frontend
    ├── index.html       # Interface principal
    ├── styles/          # CSS
    └── js/              # JavaScript
```

### Scripts Disponíveis
```bash
npm start          # Executar aplicação
npm run dev        # Modo desenvolvimento
npm run build      # Build produção
npm run build-win  # Build Windows
npm run build-mac  # Build macOS
npm run build-linux # Build Linux
```

## 📱 Interface

### Design Responsivo
- Desktop, tablet e mobile
- Tema claro e moderno
- Navegação intuitiva

### Componentes
- Cards de métricas
- Gráficos interativos
- Tabelas dinâmicas
- Formulários validados

## 🔒 Segurança

### Autenticação
- Login com email/senha
- Tokens JWT
- Controle de sessão

### Permissões
- Níveis de acesso (1-3)
- Funcionário, Gerente, CEO
- Controle granular

## 📈 Métricas

### Indicadores Principais
- Receita total
- Despesas por categoria
- Lucro líquido
- Margem de contribuição
- ROI de campanhas
- Ticket médio

### Alertas
- Contas vencidas
- Próximos vencimentos
- Metas não atingidas
- Inadimplência

## 🚀 Deploy

### Executável Windows
```bash
npm run build-win
```

### Executável macOS
```bash
npm run build-mac
```

### Executável Linux
```bash
npm run build-linux
```

## 📄 Licença

MIT License - veja arquivo LICENSE para detalhes.

---

**FinanceiroMKT** - Desenvolvido para agências de marketing digital que precisam de controle financeiro completo e automatizado. (Em fase de testes e manutenção)
