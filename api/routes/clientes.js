const express = require('express');
const Database = require('../database/database');

const router = express.Router();

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso necessário' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, 'financeiro_mkt_secret_key_2024', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Listar clientes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    
    let whereClause = 'WHERE 1=1';
    let params = [];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      whereClause += ' AND (nome_empresa LIKE ? OR cnpj_cpf LIKE ? OR contato_nome LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const offset = (page - 1) * limit;
    
    const clientes = await Database.all(
      `SELECT * FROM clientes ${whereClause} 
       ORDER BY nome_empresa ASC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const total = await Database.get(
      `SELECT COUNT(*) as count FROM clientes ${whereClause}`,
      params
    );

    res.json({
      clientes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.count,
        pages: Math.ceil(total.count / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter cliente por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const cliente = await Database.get(
      'SELECT * FROM clientes WHERE id = ?',
      [id]
    );

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Buscar contratos do cliente
    const contratos = await Database.all(
      `SELECT * FROM contratos WHERE id_cliente = ? ORDER BY data_inicio DESC`,
      [id]
    );

    // Buscar receitas do cliente
    const receitas = await Database.all(
      `SELECT r.*, ct.valor_mensal 
       FROM receitas r 
       JOIN contratos ct ON r.id_contrato = ct.id 
       WHERE ct.id_cliente = ? 
       ORDER BY r.data_prevista DESC 
       LIMIT 10`,
      [id]
    );

    res.json({
      ...cliente,
      contratos,
      receitas_recentes: receitas
    });
  } catch (error) {
    console.error('Erro ao obter cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar cliente
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      nome_empresa,
      cnpj_cpf,
      contato_nome,
      contato_email,
      contato_telefone,
      endereco,
      status = 'ativo'
    } = req.body;

    if (!nome_empresa || !cnpj_cpf) {
      return res.status(400).json({ 
        error: 'Nome da empresa e CNPJ/CPF são obrigatórios' 
      });
    }

    const result = await Database.run(
      `INSERT INTO clientes 
       (nome_empresa, cnpj_cpf, contato_nome, contato_email, contato_telefone, endereco, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nome_empresa, cnpj_cpf, contato_nome, contato_email, contato_telefone, endereco, status]
    );

    // Log da operação
    await Database.run(
      `INSERT INTO log_financeiro (tipo, id_referencia, acao, usuario_responsavel, observacoes) 
       VALUES (?, ?, ?, ?, ?)`,
      ['cliente', result.id, 'criar', req.user.id, `Cliente criado: ${nome_empresa}`]
    );

    res.json({ 
      id: result.id, 
      message: 'Cliente criado com sucesso' 
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'CNPJ/CPF já cadastrado' });
    }
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar cliente
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nome_empresa,
      cnpj_cpf,
      contato_nome,
      contato_email,
      contato_telefone,
      endereco,
      status
    } = req.body;

    // Buscar cliente atual para log
    const clienteAtual = await Database.get(
      'SELECT * FROM clientes WHERE id = ?',
      [id]
    );

    if (!clienteAtual) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    await Database.run(
      `UPDATE clientes SET 
       nome_empresa = ?, cnpj_cpf = ?, contato_nome = ?, contato_email = ?, 
       contato_telefone = ?, endereco = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [nome_empresa, cnpj_cpf, contato_nome, contato_email, contato_telefone, endereco, status, id]
    );

    // Log da operação
    await Database.run(
      `INSERT INTO log_financeiro (tipo, id_referencia, acao, usuario_responsavel, observacoes) 
       VALUES (?, ?, ?, ?, ?)`,
      ['cliente', id, 'atualizar', req.user.id, `Cliente atualizado: ${nome_empresa}`]
    );

    res.json({ message: 'Cliente atualizado com sucesso' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'CNPJ/CPF já cadastrado' });
    }
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir cliente
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const cliente = await Database.get(
      'SELECT * FROM clientes WHERE id = ?',
      [id]
    );

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Verificar se há contratos ativos
    const contratosAtivos = await Database.get(
      'SELECT COUNT(*) as count FROM contratos WHERE id_cliente = ? AND status = "ativo"',
      [id]
    );

    if (contratosAtivos.count > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir cliente com contratos ativos' 
      });
    }

    await Database.run('DELETE FROM clientes WHERE id = ?', [id]);

    // Log da operação
    await Database.run(
      `INSERT INTO log_financeiro (tipo, id_referencia, acao, usuario_responsavel, observacoes) 
       VALUES (?, ?, ?, ?, ?)`,
      ['cliente', id, 'excluir', req.user.id, `Cliente excluído: ${cliente.nome_empresa}`]
    );

    res.json({ message: 'Cliente excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Estatísticas do cliente
router.get('/:id/estatisticas', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { data_inicio, data_fim } = req.query;

    let whereClause = 'WHERE ct.id_cliente = ?';
    let params = [id];

    if (data_inicio) {
      whereClause += ' AND r.data_prevista >= ?';
      params.push(data_inicio);
    }

    if (data_fim) {
      whereClause += ' AND r.data_prevista <= ?';
      params.push(data_fim);
    }

    // Receita total
    const receitaTotal = await Database.get(
      `SELECT 
         SUM(r.valor) as total,
         SUM(CASE WHEN r.status = 'pago' THEN r.valor ELSE 0 END) as recebido,
         SUM(CASE WHEN r.status = 'pendente' THEN r.valor ELSE 0 END) as pendente
       FROM receitas r 
       JOIN contratos ct ON r.id_contrato = ct.id 
       ${whereClause}`,
      params
    );

    // Contratos ativos
    const contratosAtivos = await Database.get(
      'SELECT COUNT(*) as count FROM contratos WHERE id_cliente = ? AND status = "ativo"',
      [id]
    );

    // Ticket médio
    const ticketMedio = await Database.get(
      `SELECT AVG(r.valor) as ticket_medio 
       FROM receitas r 
       JOIN contratos ct ON r.id_contrato = ct.id 
       ${whereClause}`,
      params
    );

    // Última receita
    const ultimaReceita = await Database.get(
      `SELECT r.*, ct.valor_mensal 
       FROM receitas r 
       JOIN contratos ct ON r.id_contrato = ct.id 
       WHERE ct.id_cliente = ? 
       ORDER BY r.data_prevista DESC 
       LIMIT 1`,
      [id]
    );

    res.json({
      receita_total: receitaTotal.total || 0,
      receita_recebida: receitaTotal.recebido || 0,
      receita_pendente: receitaTotal.pendente || 0,
      contratos_ativos: contratosAtivos.count,
      ticket_medio: ticketMedio.ticket_medio || 0,
      ultima_receita: ultimaReceita
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas do cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
