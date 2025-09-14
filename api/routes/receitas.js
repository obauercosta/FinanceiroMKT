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

// Listar receitas
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
    
    const receitas = await Database.all(
      `SELECT r.*, c.nome_empresa as cliente_nome 
       FROM receitas r 
       LEFT JOIN contratos ct ON r.id_contrato = ct.id 
       LEFT JOIN clientes c ON ct.id_cliente = c.id 
       ${whereClause} 
       ORDER BY r.data_prevista DESC, r.created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const total = await Database.get(
      `SELECT COUNT(*) as count FROM receitas r ${whereClause}`,
      params
    );

    res.json({
      receitas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.count,
        pages: Math.ceil(total.count / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar receitas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter receita por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const receita = await Database.get(
      `SELECT r.*, c.nome_empresa as cliente_nome 
       FROM receitas r 
       LEFT JOIN contratos ct ON r.id_contrato = ct.id 
       LEFT JOIN clientes c ON ct.id_cliente = c.id 
       WHERE r.id = ?`,
      [id]
    );

    if (!receita) {
      return res.status(404).json({ error: 'Receita não encontrada' });
    }

    res.json(receita);
  } catch (error) {
    console.error('Erro ao obter receita:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar receita
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      id_contrato,
      descricao,
      valor,
      categoria,
      data_prevista,
      forma_pagamento,
      observacoes
    } = req.body;

    if (!descricao || !valor || !categoria || !data_prevista) {
      return res.status(400).json({ 
        error: 'Descrição, valor, categoria e data prevista são obrigatórios' 
      });
    }

    const result = await Database.run(
      `INSERT INTO receitas 
       (id_contrato, descricao, valor, categoria, data_prevista, forma_pagamento, observacoes) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_contrato, descricao, valor, categoria, data_prevista, forma_pagamento, observacoes]
    );

    // Log da operação
    await Database.run(
      `INSERT INTO log_financeiro (tipo, id_referencia, acao, valor_novo, usuario_responsavel, observacoes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['receita', result.id, 'criar', valor, req.user.id, `Receita criada: ${descricao}`]
    );

    res.json({ 
      id: result.id, 
      message: 'Receita criada com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao criar receita:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar receita
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      id_contrato,
      descricao,
      valor,
      categoria,
      data_prevista,
      data_recebida,
      status,
      forma_pagamento,
      observacoes
    } = req.body;

    // Buscar receita atual para log
    const receitaAtual = await Database.get(
      'SELECT * FROM receitas WHERE id = ?',
      [id]
    );

    if (!receitaAtual) {
      return res.status(404).json({ error: 'Receita não encontrada' });
    }

    await Database.run(
      `UPDATE receitas SET 
       id_contrato = ?, descricao = ?, valor = ?, categoria = ?, data_prevista = ?, 
       data_recebida = ?, status = ?, forma_pagamento = ?, observacoes = ?, 
       updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [id_contrato, descricao, valor, categoria, data_prevista, data_recebida, status, 
       forma_pagamento, observacoes, id]
    );

    // Log da operação
    await Database.run(
      `INSERT INTO log_financeiro (tipo, id_referencia, acao, valor_anterior, valor_novo, usuario_responsavel, observacoes) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['receita', id, 'atualizar', receitaAtual.valor, valor, req.user.id, `Receita atualizada: ${descricao}`]
    );

    res.json({ message: 'Receita atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar receita:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Marcar como recebido
router.patch('/:id/receber', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { data_recebida, forma_pagamento } = req.body;

    const receita = await Database.get(
      'SELECT * FROM receitas WHERE id = ?',
      [id]
    );

    if (!receita) {
      return res.status(404).json({ error: 'Receita não encontrada' });
    }

    await Database.run(
      `UPDATE receitas SET 
       status = 'pago', data_recebida = ?, forma_pagamento = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [data_recebida || new Date().toISOString().split('T')[0], forma_pagamento, id]
    );

    // Log da operação
    await Database.run(
      `INSERT INTO log_financeiro (tipo, id_referencia, acao, usuario_responsavel, observacoes) 
       VALUES (?, ?, ?, ?, ?)`,
      ['receita', id, 'receber', req.user.id, `Receita marcada como recebida: ${receita.descricao}`]
    );

    res.json({ message: 'Receita marcada como recebida' });
  } catch (error) {
    console.error('Erro ao marcar receita como recebida:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir receita
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const receita = await Database.get(
      'SELECT * FROM receitas WHERE id = ?',
      [id]
    );

    if (!receita) {
      return res.status(404).json({ error: 'Receita não encontrada' });
    }

    await Database.run('DELETE FROM receitas WHERE id = ?', [id]);

    // Log da operação
    await Database.run(
      `INSERT INTO log_financeiro (tipo, id_referencia, acao, valor_anterior, usuario_responsavel, observacoes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['receita', id, 'excluir', receita.valor, req.user.id, `Receita excluída: ${receita.descricao}`]
    );

    res.json({ message: 'Receita excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir receita:', error);
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
         SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END) as total_recebido,
         SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END) as total_pendente
       FROM receitas 
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

// Receitas em atraso
router.get('/atrasadas', authenticateToken, async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    
    const receitasAtrasadas = await Database.all(
      `SELECT r.*, c.nome_empresa as cliente_nome 
       FROM receitas r 
       LEFT JOIN contratos ct ON r.id_contrato = ct.id 
       LEFT JOIN clientes c ON ct.id_cliente = c.id 
       WHERE r.status = 'pendente' AND r.data_prevista < ? 
       ORDER BY r.data_prevista ASC`,
      [hoje]
    );

    res.json(receitasAtrasadas);
  } catch (error) {
    console.error('Erro ao obter receitas em atraso:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Faturamento recorrente (baseado em contratos)
router.post('/faturamento-recorrente', authenticateToken, async (req, res) => {
  try {
    const { mes, ano } = req.body;
    
    if (!mes || !ano) {
      return res.status(400).json({ error: 'Mês e ano são obrigatórios' });
    }

    // Buscar contratos ativos
    const contratos = await Database.all(
      `SELECT c.*, cl.nome_empresa 
       FROM contratos c 
       JOIN clientes cl ON c.id_cliente = cl.id 
       WHERE c.status = 'ativo' 
       AND (c.data_fim IS NULL OR c.data_fim >= ?)`,
      [`${ano}-${mes.toString().padStart(2, '0')}-01`]
    );

    const receitasCriadas = [];

    for (const contrato of contratos) {
      // Verificar se já existe receita para este mês/ano
      const receitaExistente = await Database.get(
        `SELECT * FROM receitas 
         WHERE id_contrato = ? AND strftime('%Y', data_prevista) = ? AND strftime('%m', data_prevista) = ?`,
        [contrato.id, ano, mes.toString().padStart(2, '0')]
      );

      if (!receitaExistente) {
        const dataPrevista = `${ano}-${mes.toString().padStart(2, '0')}-05`;
        
        const result = await Database.run(
          `INSERT INTO receitas 
           (id_contrato, descricao, valor, categoria, data_prevista, status) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            contrato.id, 
            `Faturamento mensal - ${contrato.nome_empresa}`, 
            contrato.valor_mensal, 
            'contrato_mensal', 
            dataPrevista, 
            'pendente'
          ]
        );

        receitasCriadas.push({
          id: result.id,
          cliente: contrato.nome_empresa,
          valor: contrato.valor_mensal
        });
      }
    }

    res.json({
      message: `Faturamento recorrente processado para ${mes}/${ano}`,
      receitas_criadas: receitasCriadas.length,
      detalhes: receitasCriadas
    });
  } catch (error) {
    console.error('Erro ao processar faturamento recorrente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
