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

// Função para calcular impostos do Simples Nacional
function calcularSimplesNacional(receitaBruta, anexo = 'III') {
  let aliquota = 0;
  let valor = 0;

  // Anexo III - Serviços (2024)
  if (anexo === 'III') {
    if (receitaBruta <= 180000) {
      aliquota = 6.00;
    } else if (receitaBruta <= 360000) {
      aliquota = 8.50;
    } else if (receitaBruta <= 720000) {
      aliquota = 10.00;
    } else if (receitaBruta <= 1800000) {
      aliquota = 11.20;
    } else if (receitaBruta <= 3600000) {
      aliquota = 14.70;
    } else if (receitaBruta <= 4800000) {
      aliquota = 18.00;
    } else {
      aliquota = 18.00;
    }
  }

  valor = receitaBruta * (aliquota / 100);

  return {
    aliquota: Math.round(aliquota * 100) / 100,
    valor: Math.round(valor * 100) / 100,
    base_calculo: receitaBruta
  };
}

// Função para calcular ISS
function calcularISS(receitaBruta, aliquotaISS = 5.00) {
  return {
    aliquota: aliquotaISS,
    valor: Math.round(receitaBruta * (aliquotaISS / 100) * 100) / 100,
    base_calculo: receitaBruta
  };
}

// Listar impostos
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { tipo, status, data_inicio, data_fim, page = 1, limit = 50 } = req.query;
    
    let whereClause = 'WHERE 1=1';
    let params = [];

    if (tipo) {
      whereClause += ' AND tipo = ?';
      params.push(tipo);
    }

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (data_inicio) {
      whereClause += ' AND data_vencimento >= ?';
      params.push(data_inicio);
    }

    if (data_fim) {
      whereClause += ' AND data_vencimento <= ?';
      params.push(data_fim);
    }

    const offset = (page - 1) * limit;
    
    const impostos = await Database.all(
      `SELECT * FROM impostos ${whereClause} 
       ORDER BY data_vencimento ASC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const total = await Database.get(
      `SELECT COUNT(*) as count FROM impostos ${whereClause}`,
      params
    );

    res.json({
      impostos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.count,
        pages: Math.ceil(total.count / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar impostos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter imposto por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const imposto = await Database.get(
      'SELECT * FROM impostos WHERE id = ?',
      [id]
    );

    if (!imposto) {
      return res.status(404).json({ error: 'Imposto não encontrado' });
    }

    res.json(imposto);
  } catch (error) {
    console.error('Erro ao obter imposto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar imposto
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      tipo,
      base_calculo,
      aliquota,
      valor,
      data_vencimento,
      observacoes
    } = req.body;

    if (!tipo || !base_calculo || !data_vencimento) {
      return res.status(400).json({ 
        error: 'Tipo, base de cálculo e data de vencimento são obrigatórios' 
      });
    }

    const result = await Database.run(
      `INSERT INTO impostos 
       (tipo, base_calculo, aliquota, valor, data_vencimento, observacoes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tipo, base_calculo, aliquota, valor, data_vencimento, observacoes]
    );

    // Log da operação
    await Database.run(
      `INSERT INTO log_financeiro (tipo, id_referencia, acao, valor_novo, usuario_responsavel, observacoes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['imposto', result.id, 'criar', valor, req.user.id, `Imposto criado: ${tipo}`]
    );

    res.json({ 
      id: result.id, 
      message: 'Imposto criado com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao criar imposto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar imposto
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      tipo,
      base_calculo,
      aliquota,
      valor,
      data_vencimento,
      data_pago,
      status,
      observacoes
    } = req.body;

    // Buscar imposto atual para log
    const impostoAtual = await Database.get(
      'SELECT * FROM impostos WHERE id = ?',
      [id]
    );

    if (!impostoAtual) {
      return res.status(404).json({ error: 'Imposto não encontrado' });
    }

    await Database.run(
      `UPDATE impostos SET 
       tipo = ?, base_calculo = ?, aliquota = ?, valor = ?, data_vencimento = ?, 
       data_pago = ?, status = ?, observacoes = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [tipo, base_calculo, aliquota, valor, data_vencimento, data_pago, status, observacoes, id]
    );

    // Log da operação
    await Database.run(
      `INSERT INTO log_financeiro (tipo, id_referencia, acao, valor_anterior, valor_novo, usuario_responsavel, observacoes) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['imposto', id, 'atualizar', impostoAtual.valor, valor, req.user.id, `Imposto atualizado: ${tipo}`]
    );

    res.json({ message: 'Imposto atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar imposto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Marcar como pago
router.patch('/:id/pagar', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { data_pago } = req.body;

    const imposto = await Database.get(
      'SELECT * FROM impostos WHERE id = ?',
      [id]
    );

    if (!imposto) {
      return res.status(404).json({ error: 'Imposto não encontrado' });
    }

    await Database.run(
      `UPDATE impostos SET 
       status = 'pago', data_pago = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [data_pago || new Date().toISOString().split('T')[0], id]
    );

    // Log da operação
    await Database.run(
      `INSERT INTO log_financeiro (tipo, id_referencia, acao, usuario_responsavel, observacoes) 
       VALUES (?, ?, ?, ?, ?)`,
      ['imposto', id, 'pagar', req.user.id, `Imposto marcado como pago: ${imposto.tipo}`]
    );

    res.json({ message: 'Imposto marcado como pago' });
  } catch (error) {
    console.error('Erro ao marcar imposto como pago:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir imposto
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const imposto = await Database.get(
      'SELECT * FROM impostos WHERE id = ?',
      [id]
    );

    if (!imposto) {
      return res.status(404).json({ error: 'Imposto não encontrado' });
    }

    await Database.run('DELETE FROM impostos WHERE id = ?', [id]);

    // Log da operação
    await Database.run(
      `INSERT INTO log_financeiro (tipo, id_referencia, acao, valor_anterior, usuario_responsavel, observacoes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['imposto', id, 'excluir', imposto.valor, req.user.id, `Imposto excluído: ${imposto.tipo}`]
    );

    res.json({ message: 'Imposto excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir imposto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Calcular impostos do mês
router.post('/calcular-mes', authenticateToken, async (req, res) => {
  try {
    const { mes, ano, regime_tributario = 'simples_nacional' } = req.body;

    if (!mes || !ano) {
      return res.status(400).json({ error: 'Mês e ano são obrigatórios' });
    }

    // Buscar receita do mês
    const receitaMes = await Database.get(
      `SELECT SUM(valor) as total 
       FROM receitas 
       WHERE strftime('%Y', data_prevista) = ? AND strftime('%m', data_prevista) = ?`,
      [ano, mes.toString().padStart(2, '0')]
    );

    const receitaBruta = receitaMes.total || 0;
    const impostosCalculados = [];

    if (regime_tributario === 'simples_nacional') {
      // DAS - Simples Nacional
      const das = calcularSimplesNacional(receitaBruta);
      
      const dataVencimento = new Date(ano, mes, 20); // DAS vence no dia 20
      
      const resultDAS = await Database.run(
        `INSERT INTO impostos (tipo, base_calculo, aliquota, valor, data_vencimento, observacoes) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['DAS', das.base_calculo, das.aliquota, das.valor, dataVencimento.toISOString().split('T')[0], 'DAS - Simples Nacional']
      );

      impostosCalculados.push({
        id: resultDAS.id,
        tipo: 'DAS',
        valor: das.valor,
        aliquota: das.aliquota
      });
    } else {
      // Regime Normal - PIS/COFINS, ISS, IRPJ, CSLL
      const pisCofins = {
        aliquota: 9.25, // PIS 1.65% + COFINS 7.6%
        valor: Math.round(receitaBruta * 0.0925 * 100) / 100
      };

      const iss = calcularISS(receitaBruta, 5.00);

      const irpj = {
        aliquota: 8.00,
        valor: Math.round(receitaBruta * 0.08 * 100) / 100
      };

      const csll = {
        aliquota: 1.00,
        valor: Math.round(receitaBruta * 0.01 * 100) / 100
      };

      // Criar impostos
      const impostos = [
        { tipo: 'PIS/COFINS', ...pisCofins },
        { tipo: 'ISS', ...iss },
        { tipo: 'IRPJ', ...irpj },
        { tipo: 'CSLL', ...csll }
      ];

      for (const imposto of impostos) {
        const dataVencimento = new Date(ano, mes, 20);
        
        const result = await Database.run(
          `INSERT INTO impostos (tipo, base_calculo, aliquota, valor, data_vencimento, observacoes) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [imposto.tipo, receitaBruta, imposto.aliquota, imposto.valor, dataVencimento.toISOString().split('T')[0], `Imposto ${imposto.tipo}`]
        );

        impostosCalculados.push({
          id: result.id,
          tipo: imposto.tipo,
          valor: imposto.valor,
          aliquota: imposto.aliquota
        });
      }
    }

    res.json({
      message: `Impostos calculados para ${mes}/${ano}`,
      receita_bruta: receitaBruta,
      regime_tributario,
      impostos_criados: impostosCalculados.length,
      detalhes: impostosCalculados
    });
  } catch (error) {
    console.error('Erro ao calcular impostos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Impostos próximos do vencimento
router.get('/vencimento/proximos', authenticateToken, async (req, res) => {
  try {
    const { dias = 7 } = req.query;
    
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() + parseInt(dias));
    
    const impostos = await Database.all(
      `SELECT * FROM impostos 
       WHERE status = 'pendente' 
       AND data_vencimento <= ? 
       ORDER BY data_vencimento ASC`,
      [dataLimite.toISOString().split('T')[0]]
    );

    res.json(impostos);
  } catch (error) {
    console.error('Erro ao obter impostos próximos do vencimento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Resumo de impostos por período
router.get('/resumo/periodo', authenticateToken, async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;

    if (!data_inicio || !data_fim) {
      return res.status(400).json({ error: 'Data início e data fim são obrigatórias' });
    }

    const resumo = await Database.all(
      `SELECT 
         tipo,
         COUNT(*) as quantidade,
         SUM(valor) as total,
         SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END) as total_pago,
         SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END) as total_pendente
       FROM impostos 
       WHERE data_vencimento >= ? AND data_vencimento <= ?
       GROUP BY tipo 
       ORDER BY total DESC`,
      [data_inicio, data_fim]
    );

    const totalGeral = await Database.get(
      `SELECT 
         SUM(valor) as total_geral,
         SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END) as total_pago_geral,
         SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END) as total_pendente_geral
       FROM impostos 
       WHERE data_vencimento >= ? AND data_vencimento <= ?`,
      [data_inicio, data_fim]
    );

    res.json({
      resumo_por_tipo: resumo,
      total_geral: totalGeral.total_geral || 0,
      total_pago: totalGeral.total_pago_geral || 0,
      total_pendente: totalGeral.total_pendente_geral || 0
    });
  } catch (error) {
    console.error('Erro ao obter resumo de impostos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
