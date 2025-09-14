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

// Dashboard principal
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { periodo = 'mes' } = req.query;
    
    let dataInicio, dataFim;
    const hoje = new Date();
    
    if (periodo === 'mes') {
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    } else if (periodo === 'ano') {
      dataInicio = new Date(hoje.getFullYear(), 0, 1);
      dataFim = new Date(hoje.getFullYear(), 11, 31);
    } else if (periodo === 'semana') {
      const inicioSemana = hoje.getDate() - hoje.getDay();
      dataInicio = new Date(hoje.setDate(inicioSemana));
      dataFim = new Date(hoje.setDate(inicioSemana + 6));
    }

    const dataInicioStr = dataInicio.toISOString().split('T')[0];
    const dataFimStr = dataFim.toISOString().split('T')[0];

    // Receitas do período
    const receitas = await Database.get(
      `SELECT 
         SUM(valor) as total,
         SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END) as recebido,
         SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END) as pendente
       FROM receitas 
       WHERE data_prevista >= ? AND data_prevista <= ?`,
      [dataInicioStr, dataFimStr]
    );

    // Despesas do período
    const despesas = await Database.get(
      `SELECT 
         SUM(valor) as total,
         SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END) as pago,
         SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END) as pendente
       FROM despesas 
       WHERE data_prevista >= ? AND data_prevista <= ?`,
      [dataInicioStr, dataFimStr]
    );

    // Folha de pagamento do período
    const folha = await Database.get(
      `SELECT 
         SUM(salario_bruto) as total_bruto,
         SUM(salario_liquido) as total_liquido,
         SUM(inss) as total_inss,
         SUM(irrf) as total_irrf,
         SUM(fgts) as total_fgts
       FROM folha_pagamento 
       WHERE mes_referencia = ? AND ano_referencia = ?`,
      [hoje.getMonth() + 1, hoje.getFullYear()]
    );

    // Impostos do período
    const impostos = await Database.get(
      `SELECT 
         SUM(valor) as total,
         SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END) as pago,
         SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END) as pendente
       FROM impostos 
       WHERE data_vencimento >= ? AND data_vencimento <= ?`,
      [dataInicioStr, dataFimStr]
    );

    // Contas vencidas
    const hojeStr = new Date().toISOString().split('T')[0];
    const contasVencidas = await Database.all(
      `SELECT 'receita' as tipo, id, descricao, valor, data_prevista as data_vencimento, status
       FROM receitas 
       WHERE status = 'pendente' AND data_prevista < ?
       UNION ALL
       SELECT 'despesa' as tipo, id, descricao, valor, data_prevista as data_vencimento, status
       FROM despesas 
       WHERE status = 'pendente' AND data_prevista < ?
       ORDER BY data_vencimento ASC`,
      [hojeStr, hojeStr]
    );

    // Próximos vencimentos (7 dias)
    const proximosVencimentos = await Database.all(
      `SELECT 'receita' as tipo, id, descricao, valor, data_prevista as data_vencimento, status
       FROM receitas 
       WHERE status = 'pendente' AND data_prevista BETWEEN ? AND ?
       UNION ALL
       SELECT 'despesa' as tipo, id, descricao, valor, data_prevista as data_vencimento, status
       FROM despesas 
       WHERE status = 'pendente' AND data_prevista BETWEEN ? AND ?
       ORDER BY data_vencimento ASC`,
      [hojeStr, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
       hojeStr, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]]
    );

    // Top clientes por receita
    const topClientes = await Database.all(
      `SELECT c.nome_empresa, SUM(r.valor) as total_receita
       FROM clientes c
       JOIN contratos ct ON c.id = ct.id_cliente
       JOIN receitas r ON ct.id = r.id_contrato
       WHERE r.data_prevista >= ? AND r.data_prevista <= ?
       GROUP BY c.id, c.nome_empresa
       ORDER BY total_receita DESC
       LIMIT 5`,
      [dataInicioStr, dataFimStr]
    );

    // Categorias de despesas
    const categoriasDespesas = await Database.all(
      `SELECT categoria, SUM(valor) as total
       FROM despesas 
       WHERE data_prevista >= ? AND data_prevista <= ?
       GROUP BY categoria
       ORDER BY total DESC`,
      [dataInicioStr, dataFimStr]
    );

    // Cálculo do lucro líquido
    const receitaTotal = receitas.total || 0;
    const despesaTotal = despesas.total || 0;
    const folhaTotal = folha.total_liquido || 0;
    const impostoTotal = impostos.total || 0;
    
    const lucroLiquido = receitaTotal - despesaTotal - folhaTotal - impostoTotal;

    res.json({
      periodo: {
        inicio: dataInicioStr,
        fim: dataFimStr,
        tipo: periodo
      },
      resumo_financeiro: {
        receitas: {
          total: receitaTotal,
          recebido: receitas.recebido || 0,
          pendente: receitas.pendente || 0
        },
        despesas: {
          total: despesaTotal,
          pago: despesas.pago || 0,
          pendente: despesas.pendente || 0
        },
        folha_pagamento: {
          total_bruto: folha.total_bruto || 0,
          total_liquido: folhaTotal,
          total_inss: folha.total_inss || 0,
          total_irrf: folha.total_irrf || 0,
          total_fgts: folha.total_fgts || 0
        },
        impostos: {
          total: impostoTotal,
          pago: impostos.pago || 0,
          pendente: impostos.pendente || 0
        },
        lucro_liquido: lucroLiquido
      },
      alertas: {
        contas_vencidas: contasVencidas.length,
        proximos_vencimentos: proximosVencimentos.length
      },
      contas_vencidas: contasVencidas,
      proximos_vencimentos: proximosVencimentos,
      top_clientes: topClientes,
      categorias_despesas: categoriasDespesas
    });
  } catch (error) {
    console.error('Erro ao obter dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Evolução de receitas e despesas
router.get('/evolucao', authenticateToken, async (req, res) => {
  try {
    const { meses = 12 } = req.query;
    
    const evolucao = [];
    const hoje = new Date();
    
    for (let i = parseInt(meses) - 1; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const dataInicio = new Date(data.getFullYear(), data.getMonth(), 1);
      const dataFim = new Date(data.getFullYear(), data.getMonth() + 1, 0);
      
      const dataInicioStr = dataInicio.toISOString().split('T')[0];
      const dataFimStr = dataFim.toISOString().split('T')[0];
      
      const receitas = await Database.get(
        `SELECT SUM(valor) as total FROM receitas 
         WHERE data_prevista >= ? AND data_prevista <= ?`,
        [dataInicioStr, dataFimStr]
      );
      
      const despesas = await Database.get(
        `SELECT SUM(valor) as total FROM despesas 
         WHERE data_prevista >= ? AND data_prevista <= ?`,
        [dataInicioStr, dataFimStr]
      );
      
      evolucao.push({
        mes: data.getMonth() + 1,
        ano: data.getFullYear(),
        receitas: receitas.total || 0,
        despesas: despesas.total || 0,
        lucro: (receitas.total || 0) - (despesas.total || 0)
      });
    }
    
    res.json(evolucao);
  } catch (error) {
    console.error('Erro ao obter evolução:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Indicadores de performance
router.get('/indicadores', authenticateToken, async (req, res) => {
  try {
    const { periodo = 'mes' } = req.query;
    
    let dataInicio, dataFim;
    const hoje = new Date();
    
    if (periodo === 'mes') {
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    } else if (periodo === 'ano') {
      dataInicio = new Date(hoje.getFullYear(), 0, 1);
      dataFim = new Date(hoje.getFullYear(), 11, 31);
    }

    const dataInicioStr = dataInicio.toISOString().split('T')[0];
    const dataFimStr = dataFim.toISOString().split('T')[0];

    // Receita total
    const receitaTotal = await Database.get(
      `SELECT SUM(valor) as total FROM receitas 
       WHERE data_prevista >= ? AND data_prevista <= ?`,
      [dataInicioStr, dataFimStr]
    );

    // Despesas totais
    const despesaTotal = await Database.get(
      `SELECT SUM(valor) as total FROM despesas 
       WHERE data_prevista >= ? AND data_prevista <= ?`,
      [dataInicioStr, dataFimStr]
    );

    // Número de clientes ativos
    const clientesAtivos = await Database.get(
      `SELECT COUNT(*) as count FROM clientes WHERE status = 'ativo'`
    );

    // Ticket médio
    const ticketMedio = await Database.get(
      `SELECT AVG(valor) as ticket_medio FROM receitas 
       WHERE data_prevista >= ? AND data_prevista <= ?`,
      [dataInicioStr, dataFimStr]
    );

    // Margem de contribuição
    const receita = receitaTotal.total || 0;
    const despesa = despesaTotal.total || 0;
    const margemContribuicao = receita > 0 ? ((receita - despesa) / receita) * 100 : 0;

    // Ponto de equilíbrio (simplificado)
    const pontoEquilibrio = despesa;

    // ROI (simplificado)
    const roi = despesa > 0 ? ((receita - despesa) / despesa) * 100 : 0;

    res.json({
      receita_total: receita,
      despesa_total: despesa,
      lucro_liquido: receita - despesa,
      clientes_ativos: clientesAtivos.count,
      ticket_medio: ticketMedio.ticket_medio || 0,
      margem_contribuicao: Math.round(margemContribuicao * 100) / 100,
      ponto_equilibrio: pontoEquilibrio,
      roi: Math.round(roi * 100) / 100
    });
  } catch (error) {
    console.error('Erro ao obter indicadores:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
