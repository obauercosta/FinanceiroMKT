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

// Listar despesas
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { categoria, status, data_inicio, data_fim, page = 1, limit = 50 } = req.query;
    
    let whereClause = 'WHERE 1=1';
    let params = [];

    if (categoria) {
      whereClause += ' AND categoria = ?';
      params.push(categoria);
    }

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (data_inicio) {
      whereClause += ' AND data_prevista >= ?';
      params.push(data_inicio);
    }

    if (data_fim) {
      whereClause += ' AND data_prevista <= ?';
      params.push(data_fim);
    }

    const offset = (page - 1) * limit;
    
    const despesas = await Database.all(
      `SELECT * FROM despesas ${whereClause} 
       ORDER BY data_prevista DESC, created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const total = await Database.get(
      `SELECT COUNT(*) as count FROM despesas ${whereClause}`,
      params
    );

    res.json({
      despesas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.count,
        pages: Math.ceil(total.count / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar despesas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter despesa por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const despesa = await Database.get(
      'SELECT * FROM despesas WHERE id = ?',
      [id]
    );

    if (!despesa) {
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }

    res.json(despesa);
  } catch (error) {
    console.error('Erro ao obter despesa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar despesa
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      categoria,
      subcategoria,
      descricao,
      valor,
      data_prevista,
      forma_pagamento,
      fornecedor,
      observacoes
    } = req.body;

    if (!categoria || !descricao || !valor || !data_prevista) {
      return res.status(400).json({ 
        error: 'Categoria, descrição, valor e data prevista são obrigatórios' 
      });
    }

    const result = await Database.run(
      `INSERT INTO despesas 
       (categoria, subcategoria, descricao, valor, data_prevista, forma_pagamento, fornecedor, observacoes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [categoria, subcategoria, descricao, valor, data_prevista, forma_pagamento, fornecedor, observacoes]
    );

    // Log da operação
    await Database.run(
      `INSERT INTO log_financeiro (tipo, id_referencia, acao, valor_novo, usuario_responsavel, observacoes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['despesa', result.id, 'criar', valor, req.user.id, `Despesa criada: ${descricao}`]
    );

    res.json({ 
      id: result.id, 
      message: 'Despesa criada com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao criar despesa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar despesa
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      categoria,
      subcategoria,
      descricao,
      valor,
      data_prevista,
      data_pago,
      status,
      forma_pagamento,
      fornecedor,
      observacoes
    } = req.body;

    // Buscar despesa atual para log
    const despesaAtual = await Database.get(
      'SELECT * FROM despesas WHERE id = ?',
      [id]
    );

    if (!despesaAtual) {
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }

    await Database.run(
      `UPDATE despesas SET 
       categoria = ?, subcategoria = ?, descricao = ?, valor = ?, data_prevista = ?, 
       data_pago = ?, status = ?, forma_pagamento = ?, fornecedor = ?, observacoes = ?, 
       updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [categoria, subcategoria, descricao, valor, data_prevista, data_pago, status, 
       forma_pagamento, fornecedor, observacoes, id]
    );

    // Log da operação
    await Database.run(
      `INSERT INTO log_financeiro (tipo, id_referencia, acao, valor_anterior, valor_novo, usuario_responsavel, observacoes) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['despesa', id, 'atualizar', despesaAtual.valor, valor, req.user.id, `Despesa atualizada: ${descricao}`]
    );

    res.json({ message: 'Despesa atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar despesa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Marcar como pago
router.patch('/:id/pagar', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { data_pago, forma_pagamento } = req.body;

    const despesa = await Database.get(
      'SELECT * FROM despesas WHERE id = ?',
      [id]
    );

    if (!despesa) {
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }

    await Database.run(
      `UPDATE despesas SET 
       status = 'pago', data_pago = ?, forma_pagamento = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [data_pago || new Date().toISOString().split('T')[0], forma_pagamento, id]
    );

    // Log da operação
    await Database.run(
      `INSERT INTO log_financeiro (tipo, id_referencia, acao, usuario_responsavel, observacoes) 
       VALUES (?, ?, ?, ?, ?)`,
      ['despesa', id, 'pagar', req.user.id, `Despesa marcada como paga: ${despesa.descricao}`]
    );

    res.json({ message: 'Despesa marcada como paga' });
  } catch (error) {
    console.error('Erro ao marcar despesa como paga:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir despesa
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const despesa = await Database.get(
      'SELECT * FROM despesas WHERE id = ?',
      [id]
    );

    if (!despesa) {
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }

    await Database.run('DELETE FROM despesas WHERE id = ?', [id]);

    // Log da operação
    await Database.run(
      `INSERT INTO log_financeiro (tipo, id_referencia, acao, valor_anterior, usuario_responsavel, observacoes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['despesa', id, 'excluir', despesa.valor, req.user.id, `Despesa excluída: ${despesa.descricao}`]
    );

    res.json({ message: 'Despesa excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir despesa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Resumo por categoria
router.get('/resumo/categorias', authenticateToken, async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    
    let whereClause = 'WHERE 1=1';
    let params = [];

    if (data_inicio) {
      whereClause += ' AND data_prevista >= ?';
      params.push(data_inicio);
    }

    if (data_fim) {
      whereClause += ' AND data_prevista <= ?';
      params.push(data_fim);
    }

    const resumo = await Database.all(
      `SELECT 
         categoria,
         COUNT(*) as quantidade,
         SUM(valor) as total,
         AVG(valor) as media,
         SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END) as total_pago,
         SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END) as total_pendente
       FROM despesas 
       ${whereClause}
       GROUP BY categoria 
       ORDER BY total DESC`,
      params
    );

    res.json(resumo);
  } catch (error) {
    console.error('Erro ao obter resumo por categoria:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Despesas vencidas
router.get('/vencidas', authenticateToken, async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    
    const despesasVencidas = await Database.all(
      `SELECT * FROM despesas 
       WHERE status = 'pendente' AND data_prevista < ? 
       ORDER BY data_prevista ASC`,
      [hoje]
    );

    res.json(despesasVencidas);
  } catch (error) {
    console.error('Erro ao obter despesas vencidas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
