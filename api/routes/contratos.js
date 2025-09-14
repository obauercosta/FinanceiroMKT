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

// Listar contratos
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, cliente_id, page = 1, limit = 50 } = req.query;
    
    let whereClause = 'WHERE 1=1';
    let params = [];

    if (status) {
      whereClause += ' AND c.status = ?';
      params.push(status);
    }

    if (cliente_id) {
      whereClause += ' AND c.id_cliente = ?';
      params.push(cliente_id);
    }

    const offset = (page - 1) * limit;
    
    const contratos = await Database.all(
      `SELECT c.*, cl.nome_empresa as cliente_nome, cl.cnpj_cpf as cliente_documento
       FROM contratos c 
       JOIN clientes cl ON c.id_cliente = cl.id 
       ${whereClause} 
       ORDER BY c.data_inicio DESC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const total = await Database.get(
      `SELECT COUNT(*) as count FROM contratos c ${whereClause}`,
      params
    );

    res.json({
      contratos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.count,
        pages: Math.ceil(total.count / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar contratos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter contrato por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const contrato = await Database.get(
      `SELECT c.*, cl.nome_empresa as cliente_nome, cl.cnpj_cpf as cliente_documento,
              cl.contato_nome, cl.contato_email, cl.contato_telefone
       FROM contratos c 
       JOIN clientes cl ON c.id_cliente = cl.id 
       WHERE c.id = ?`,
      [id]
    );

    if (!contrato) {
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }

    // Buscar receitas do contrato
    const receitas = await Database.all(
      `SELECT * FROM receitas WHERE id_contrato = ? ORDER BY data_prevista DESC`,
      [id]
    );

    res.json({
      ...contrato,
      receitas
    });
  } catch (error) {
    console.error('Erro ao obter contrato:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar contrato
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      id_cliente,
      valor_mensal,
      data_inicio,
      data_fim,
      reajuste_percentual = 0,
      observacoes,
      status = 'ativo'
    } = req.body;

    if (!id_cliente || !valor_mensal || !data_inicio) {
      return res.status(400).json({ 
        error: 'Cliente, valor mensal e data de início são obrigatórios' 
      });
    }

    // Verificar se o cliente existe
    const cliente = await Database.get(
      'SELECT * FROM clientes WHERE id = ?',
      [id_cliente]
    );

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const result = await Database.run(
      `INSERT INTO contratos 
       (id_cliente, valor_mensal, data_inicio, data_fim, reajuste_percentual, observacoes, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_cliente, valor_mensal, data_inicio, data_fim, reajuste_percentual, observacoes, status]
    );

    // Log da operação
    await Database.run(
      `INSERT INTO log_financeiro (tipo, id_referencia, acao, valor_novo, usuario_responsavel, observacoes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['contrato', result.id, 'criar', valor_mensal, req.user.id, `Contrato criado: ${cliente.nome_empresa}`]
    );

    res.json({ 
      id: result.id, 
      message: 'Contrato criado com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao criar contrato:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar contrato
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      id_cliente,
      valor_mensal,
      data_inicio,
      data_fim,
      reajuste_percentual,
      observacoes,
      status
    } = req.body;

    // Buscar contrato atual para log
    const contratoAtual = await Database.get(
      'SELECT * FROM contratos WHERE id = ?',
      [id]
    );

    if (!contratoAtual) {
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }

    await Database.run(
      `UPDATE contratos SET 
       id_cliente = ?, valor_mensal = ?, data_inicio = ?, data_fim = ?, 
       reajuste_percentual = ?, observacoes = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [id_cliente, valor_mensal, data_inicio, data_fim, reajuste_percentual, observacoes, status, id]
    );

    // Log da operação
    await Database.run(
      `INSERT INTO log_financeiro (tipo, id_referencia, acao, valor_anterior, valor_novo, usuario_responsavel, observacoes) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['contrato', id, 'atualizar', contratoAtual.valor_mensal, valor_mensal, req.user.id, `Contrato atualizado`]
    );

    res.json({ message: 'Contrato atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar contrato:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir contrato
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const contrato = await Database.get(
      'SELECT * FROM contratos WHERE id = ?',
      [id]
    );

    if (!contrato) {
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }

    // Verificar se há receitas vinculadas
    const receitasVinculadas = await Database.get(
      'SELECT COUNT(*) as count FROM receitas WHERE id_contrato = ?',
      [id]
    );

    if (receitasVinculadas.count > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir contrato com receitas vinculadas' 
      });
    }

    await Database.run('DELETE FROM contratos WHERE id = ?', [id]);

    // Log da operação
    await Database.run(
      `INSERT INTO log_financeiro (tipo, id_referencia, acao, valor_anterior, usuario_responsavel, observacoes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['contrato', id, 'excluir', contrato.valor_mensal, req.user.id, `Contrato excluído`]
    );

    res.json({ message: 'Contrato excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir contrato:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Aplicar reajuste anual
router.patch('/:id/reajuste', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { percentual_reajuste } = req.body;

    if (!percentual_reajuste) {
      return res.status(400).json({ error: 'Percentual de reajuste é obrigatório' });
    }

    const contrato = await Database.get(
      'SELECT * FROM contratos WHERE id = ?',
      [id]
    );

    if (!contrato) {
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }

    const novoValor = contrato.valor_mensal * (1 + percentual_reajuste / 100);

    await Database.run(
      `UPDATE contratos SET 
       valor_mensal = ?, reajuste_percentual = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [novoValor, percentual_reajuste, id]
    );

    // Log da operação
    await Database.run(
      `INSERT INTO log_financeiro (tipo, id_referencia, acao, valor_anterior, valor_novo, usuario_responsavel, observacoes) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['contrato', id, 'reajuste', contrato.valor_mensal, novoValor, req.user.id, `Reajuste aplicado: ${percentual_reajuste}%`]
    );

    res.json({ 
      message: 'Reajuste aplicado com sucesso',
      valor_anterior: contrato.valor_mensal,
      valor_novo: novoValor,
      percentual: percentual_reajuste
    });
  } catch (error) {
    console.error('Erro ao aplicar reajuste:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Contratos próximos do vencimento
router.get('/vencimento/proximos', authenticateToken, async (req, res) => {
  try {
    const { dias = 30 } = req.query;
    
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() + parseInt(dias));
    
    const contratos = await Database.all(
      `SELECT c.*, cl.nome_empresa as cliente_nome
       FROM contratos c 
       JOIN clientes cl ON c.id_cliente = cl.id 
       WHERE c.status = 'ativo' 
       AND c.data_fim IS NOT NULL 
       AND c.data_fim <= ? 
       ORDER BY c.data_fim ASC`,
      [dataLimite.toISOString().split('T')[0]]
    );

    res.json(contratos);
  } catch (error) {
    console.error('Erro ao obter contratos próximos do vencimento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Estatísticas de contratos
router.get('/estatisticas/geral', authenticateToken, async (req, res) => {
  try {
    // Total de contratos
    const totalContratos = await Database.get(
      'SELECT COUNT(*) as count FROM contratos'
    );

    // Contratos ativos
    const contratosAtivos = await Database.get(
      'SELECT COUNT(*) as count FROM contratos WHERE status = "ativo"'
    );

    // Valor total mensal
    const valorTotalMensal = await Database.get(
      'SELECT SUM(valor_mensal) as total FROM contratos WHERE status = "ativo"'
    );

    // Ticket médio
    const ticketMedio = await Database.get(
      'SELECT AVG(valor_mensal) as ticket_medio FROM contratos WHERE status = "ativo"'
    );

    // Contratos por status
    const contratosPorStatus = await Database.all(
      `SELECT status, COUNT(*) as count 
       FROM contratos 
       GROUP BY status`
    );

    res.json({
      total_contratos: totalContratos.count,
      contratos_ativos: contratosAtivos.count,
      valor_total_mensal: valorTotalMensal.total || 0,
      ticket_medio: ticketMedio.ticket_medio || 0,
      contratos_por_status: contratosPorStatus
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas de contratos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
