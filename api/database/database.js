const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

class Database {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      // Garantir que o diretório data existe
      const fs = require('fs');
      const dataDir = path.join(__dirname, '../../data');
      
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const dbPath = path.join(dataDir, 'financeiro_mkt.db');
      
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Erro ao conectar com o banco de dados:', err);
          reject(err);
        } else {
          console.log('Conectado ao banco de dados SQLite');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const tables = [
      // Tabela de usuários
      `CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        cargo TEXT NOT NULL,
        nivel_acesso INTEGER DEFAULT 1,
        ativo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Tabela de clientes
      `CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome_empresa TEXT NOT NULL,
        cnpj_cpf TEXT UNIQUE NOT NULL,
        contato_nome TEXT,
        contato_email TEXT,
        contato_telefone TEXT,
        endereco TEXT,
        status TEXT DEFAULT 'ativo',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Tabela de contratos
      `CREATE TABLE IF NOT EXISTS contratos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_cliente INTEGER NOT NULL,
        valor_mensal DECIMAL(10,2) NOT NULL,
        data_inicio DATE NOT NULL,
        data_fim DATE,
        reajuste_percentual DECIMAL(5,2) DEFAULT 0,
        observacoes TEXT,
        status TEXT DEFAULT 'ativo',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_cliente) REFERENCES clientes (id)
      )`,

      // Tabela de receitas
      `CREATE TABLE IF NOT EXISTS receitas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_contrato INTEGER,
        descricao TEXT NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        categoria TEXT NOT NULL,
        data_prevista DATE NOT NULL,
        data_recebida DATE,
        status TEXT DEFAULT 'pendente',
        forma_pagamento TEXT,
        observacoes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_contrato) REFERENCES contratos (id)
      )`,

      // Tabela de despesas
      `CREATE TABLE IF NOT EXISTS despesas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        categoria TEXT NOT NULL,
        subcategoria TEXT,
        descricao TEXT NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        data_prevista DATE NOT NULL,
        data_pago DATE,
        status TEXT DEFAULT 'pendente',
        forma_pagamento TEXT,
        fornecedor TEXT,
        observacoes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Tabela de folha de pagamento
      `CREATE TABLE IF NOT EXISTS folha_pagamento (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INTEGER NOT NULL,
        mes_referencia INTEGER NOT NULL,
        ano_referencia INTEGER NOT NULL,
        salario_bruto DECIMAL(10,2) NOT NULL,
        inss DECIMAL(10,2) DEFAULT 0,
        irrf DECIMAL(10,2) DEFAULT 0,
        vale_transporte DECIMAL(10,2) DEFAULT 0,
        vale_refeicao DECIMAL(10,2) DEFAULT 0,
        outros_descontos DECIMAL(10,2) DEFAULT 0,
        salario_liquido DECIMAL(10,2) NOT NULL,
        fgts DECIMAL(10,2) DEFAULT 0,
        data_pagamento DATE,
        status TEXT DEFAULT 'pendente',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_usuario) REFERENCES usuarios (id)
      )`,

      // Tabela de impostos
      `CREATE TABLE IF NOT EXISTS impostos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL,
        base_calculo DECIMAL(10,2) NOT NULL,
        aliquota DECIMAL(5,2) NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        data_vencimento DATE NOT NULL,
        data_pago DATE,
        status TEXT DEFAULT 'pendente',
        observacoes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Tabela de log financeiro
      `CREATE TABLE IF NOT EXISTS log_financeiro (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL,
        id_referencia INTEGER NOT NULL,
        acao TEXT NOT NULL,
        valor_anterior DECIMAL(10,2),
        valor_novo DECIMAL(10,2),
        usuario_responsavel INTEGER NOT NULL,
        observacoes TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_responsavel) REFERENCES usuarios (id)
      )`,

      // Tabela de configurações
      `CREATE TABLE IF NOT EXISTS configuracoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chave TEXT UNIQUE NOT NULL,
        valor TEXT NOT NULL,
        descricao TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const table of tables) {
      await this.run(table);
    }

    // Inserir usuário padrão
    await this.createDefaultUser();
    
    // Inserir configurações padrão
    await this.createDefaultSettings();
  }

  async createDefaultUser() {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const user = await this.get('SELECT * FROM usuarios WHERE email = ?', ['admin@financeiromkt.com']);
    
    if (!user) {
      await this.run(
        `INSERT INTO usuarios (nome, email, senha, cargo, nivel_acesso) 
         VALUES (?, ?, ?, ?, ?)`,
        ['Administrador', 'admin@financeiromkt.com', hashedPassword, 'CEO', 3]
      );
    }
  }

  async createDefaultSettings() {
    const settings = [
      ['regime_tributario', 'simples_nacional', 'Regime tributário da empresa'],
      ['aliquota_simples', '6.00', 'Alíquota do Simples Nacional (%)'],
      ['reserva_emergencia', '10.00', 'Percentual para reserva de emergência (%)'],
      ['reserva_reinvestimento', '20.00', 'Percentual para reinvestimento (%)'],
      ['empresa_nome', 'FinanceiroMKT', 'Nome da empresa'],
      ['empresa_cnpj', '00.000.000/0001-00', 'CNPJ da empresa'],
      ['empresa_endereco', 'Endereço da empresa', 'Endereço completo da empresa']
    ];

    for (const [chave, valor, descricao] of settings) {
      await this.run(
        `INSERT OR IGNORE INTO configuracoes (chave, valor, descricao) 
         VALUES (?, ?, ?)`,
        [chave, valor, descricao]
      );
    }
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = new Database();
