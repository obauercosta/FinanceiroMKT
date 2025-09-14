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

// DRE - Demonstração do Resultado do Exercício
router.get('/dre', authenticateToken, async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;

    if (!data_inicio || !data_fim) {
      return res.status(400).json({ error: 'Data início e data fim são obrigatórias' });
    }

    // Receitas
    const receitas = await Database.get(
      `SELECT 
         SUM(valor) as total,
         SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END) as recebido
       FROM receitas 
       WHERE data_prevista >= ? AND data_prevista <= ?`,
      [data_inicio, data_fim]
    );

    // Despesas por categoria
    const despesasCategoria = await Database.all(
      `SELECT categoria, SUM(valor) as total
       FROM despesas 
       WHERE data_prevista >= ? AND data_prevista <= ?
       GROUP BY categoria
       ORDER BY total DESC`,
      [data_inicio, data_fim]
    );

    // Folha de pagamento
    const folha = await Database.get(
      `SELECT 
         SUM(salario_bruto) as total_bruto,
         SUM(salario_liquido) as total_liquido,
         SUM(inss) as total_inss,
         SUM(irrf) as total_irrf,
         SUM(fgts) as total_fgts
       FROM folha_pagamento 
       WHERE data_pagamento >= ? AND data_pagamento <= ?`,
      [data_inicio, data_fim]
    );

    // Impostos
    const impostos = await Database.get(
      `SELECT SUM(valor) as total FROM impostos 
       WHERE data_vencimento >= ? AND data_vencimento <= ?`,
      [data_inicio, data_fim]
    );

    // Calcular totais
    const receitaTotal = receitas.total || 0;
    const despesaTotal = despesasCategoria.reduce((sum, item) => sum + item.total, 0);
    const folhaTotal = folha.total_liquido || 0;
    const impostoTotal = impostos.total || 0;
    
    const lucroBruto = receitaTotal - despesaTotal;
    const lucroLiquido = lucroBruto - folhaTotal - impostoTotal;

    res.json({
      periodo: {
        inicio: data_inicio,
        fim: data_fim
      },
      receitas: {
        total: receitaTotal,
        recebido: receitas.recebido || 0,
        pendente: receitaTotal - (receitas.recebido || 0)
      },
      despesas: {
        total: despesaTotal,
        por_categoria: despesasCategoria
      },
      folha_pagamento: {
        total_bruto: folha.total_bruto || 0,
        total_liquido: folhaTotal,
        encargos: {
          inss: folha.total_inss || 0,
          irrf: folha.total_irrf || 0,
          fgts: folha.total_fgts || 0
        }
      },
      impostos: {
        total: impostoTotal
      },
      resultado: {
        lucro_bruto: lucroBruto,
        lucro_liquido: lucroLiquido,
        margem_bruta: receitaTotal > 0 ? (lucroBruto / receitaTotal) * 100 : 0,
        margem_liquida: receitaTotal > 0 ? (lucroLiquido / receitaTotal) * 100 : 0
      }
    });
  } catch (error) {
    console.error('Erro ao gerar DRE:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Relatório de rentabilidade por cliente
router.get('/rentabilidade-clientes', authenticateToken, async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;

    if (!data_inicio || !data_fim) {
      return res.status(400).json({ error: 'Data início e data fim são obrigatórias' });
    }

    const clientes = await Database.all(
      `SELECT 
         c.id,
         c.nome_empresa,
         c.cnpj_cpf,
         SUM(r.valor) as receita_total,
         COUNT(r.id) as quantidade_receitas,
         AVG(r.valor) as ticket_medio,
         MIN(r.data_prevista) as primeira_receita,
         MAX(r.data_prevista) as ultima_receita
       FROM clientes c
       JOIN contratos ct ON c.id = ct.id_cliente
       JOIN receitas r ON ct.id = r.id_contrato
       WHERE r.data_prevista >= ? AND r.data_prevista <= ?
       GROUP BY c.id, c.nome_empresa, c.cnpj_cpf
       ORDER BY receita_total DESC`,
      [data_inicio, data_fim]
    );

    // Calcular custos estimados por cliente (simplificado)
    const receitaTotal = clientes.reduce((sum, cliente) => sum + cliente.receita_total, 0);
    const custoTotalEstimado = receitaTotal * 0.6; // 60% de custos estimados

    const clientesComRentabilidade = clientes.map(cliente => {
      const custoEstimado = (cliente.receita_total / receitaTotal) * custoTotalEstimado;
      const lucroEstimado = cliente.receita_total - custoEstimado;
      const margemEstimada = cliente.receita_total > 0 ? (lucroEstimado / cliente.receita_total) * 100 : 0;

      return {
        ...cliente,
        custo_estimado: custoEstimado,
        lucro_estimado: lucroEstimado,
        margem_estimada: Math.round(margemEstimada * 100) / 100
      };
    });

    res.json({
      periodo: {
        inicio: data_inicio,
        fim: data_fim
      },
      clientes: clientesComRentabilidade,
      resumo: {
        total_clientes: clientes.length,
        receita_total: receitaTotal,
        custo_total_estimado: custoTotalEstimado,
        lucro_total_estimado: receitaTotal - custoTotalEstimado,
        margem_media: clientesComRentabilidade.length > 0 ? 
          clientesComRentabilidade.reduce((sum, c) => sum + c.margem_estimada, 0) / clientesComRentabilidade.length : 0
      }
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de rentabilidade:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Relatório de fluxo de caixa
router.get('/fluxo-caixa', authenticateToken, async (req, res) => {
  try {
    const { data_inicio, data_fim, agrupamento = 'diario' } = req.query;

    if (!data_inicio || !data_fim) {
      return res.status(400).json({ error: 'Data início e data fim são obrigatórias' });
    }

    let groupBy, dateFormat;
    
    if (agrupamento === 'diario') {
      groupBy = 'DATE(data_prevista)';
      dateFormat = '%Y-%m-%d';
    } else if (agrupamento === 'semanal') {
      groupBy = 'strftime("%Y-%W", data_prevista)';
      dateFormat = '%Y-%W';
    } else if (agrupamento === 'mensal') {
      groupBy = 'strftime("%Y-%m", data_prevista)';
      dateFormat = '%Y-%m';
    }

    // Receitas por período
    const receitas = await Database.all(
      `SELECT 
         ${groupBy} as periodo,
         SUM(valor) as total,
         SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END) as recebido,
         SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END) as pendente
       FROM receitas 
       WHERE data_prevista >= ? AND data_prevista <= ?
       GROUP BY ${groupBy}
       ORDER BY periodo`,
      [data_inicio, data_fim]
    );

    // Despesas por período
    const despesas = await Database.all(
      `SELECT 
         ${groupBy} as periodo,
         SUM(valor) as total,
         SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END) as pago,
         SUM(CASE WHEN status = 'pendente' THEN valor ELSE 0 END) as pendente
       FROM despesas 
       WHERE data_prevista >= ? AND data_prevista <= ?
       GROUP BY ${groupBy}
       ORDER BY periodo`,
      [data_inicio, data_fim]
    );

    // Combinar dados
    const periodos = new Set([
      ...receitas.map(r => r.periodo),
      ...despesas.map(d => d.periodo)
    ]);

    const fluxoCaixa = Array.from(periodos).map(periodo => {
      const receita = receitas.find(r => r.periodo === periodo) || { total: 0, recebido: 0, pendente: 0 };
      const despesa = despesas.find(d => d.periodo === periodo) || { total: 0, pago: 0, pendente: 0 };
      
      const saldo = receita.recebido - despesa.pago;
      
      return {
        periodo,
        receitas: receita,
        despesas: despesa,
        saldo_periodo: saldo
      };
    }).sort((a, b) => a.periodo.localeCompare(b.periodo));

    // Calcular saldo acumulado
    let saldoAcumulado = 0;
    const fluxoComAcumulado = fluxoCaixa.map(item => {
      saldoAcumulado += item.saldo_periodo;
      return {
        ...item,
        saldo_acumulado: saldoAcumulado
      };
    });

    res.json({
      periodo: {
        inicio: data_inicio,
        fim: data_fim,
        agrupamento
      },
      fluxo_caixa: fluxoComAcumulado,
      resumo: {
        receita_total: receitas.reduce((sum, r) => sum + r.total, 0),
        receita_recebida: receitas.reduce((sum, r) => sum + r.recebido, 0),
        despesa_total: despesas.reduce((sum, d) => sum + d.total, 0),
        despesa_paga: despesas.reduce((sum, d) => sum + d.pago, 0),
        saldo_final: saldoAcumulado
      }
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de fluxo de caixa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Relatório de inadimplência
router.get('/inadimplencia', authenticateToken, async (req, res) => {
  try {
    const { dias_atraso = 30 } = req.query;
    
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - parseInt(dias_atraso));
    const dataLimiteStr = dataLimite.toISOString().split('T')[0];

    const inadimplentes = await Database.all(
      `SELECT 
         c.nome_empresa,
         c.cnpj_cpf,
         c.contato_email,
         c.contato_telefone,
         r.id as receita_id,
         r.descricao,
         r.valor,
         r.data_prevista,
         r.data_recebida,
         julianday('now') - julianday(r.data_prevista) as dias_atraso
       FROM clientes c
       JOIN contratos ct ON c.id = ct.id_cliente
       JOIN receitas r ON ct.id = r.id_contrato
       WHERE r.status = 'pendente' 
       AND r.data_prevista < ?
       ORDER BY r.data_prevista ASC`,
      [dataLimiteStr]
    );

    const totalInadimplencia = inadimplentes.reduce((sum, item) => sum + item.valor, 0);

    res.json({
      dias_atraso_minimo: parseInt(dias_atraso),
      total_inadimplencia: totalInadimplencia,
      quantidade_clientes: new Set(inadimplentes.map(i => i.nome_empresa)).size,
      quantidade_titulos: inadimplentes.length,
      inadimplentes: inadimplentes
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de inadimplência:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Relatório de ROI de campanhas
router.get('/roi-campanhas', authenticateToken, async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;

    if (!data_inicio || !data_fim) {
      return res.status(400).json({ error: 'Data início e data fim são obrigatórias' });
    }

    // Buscar despesas de campanhas/mídia
    const campanhas = await Database.all(
      `SELECT 
         descricao,
         valor as investimento,
         data_prevista,
         observacoes
       FROM despesas 
       WHERE categoria IN ('midia_paga', 'campanhas', 'trafego_pago')
       AND data_prevista >= ? AND data_prevista <= ?
       ORDER BY data_prevista DESC`,
      [data_inicio, data_fim]
    );

    // Calcular ROI estimado (simplificado)
    const campanhasComROI = campanhas.map(campanha => {
      // ROI estimado baseado em 3x o investimento (300% de retorno)
      const receitaEstimada = campanha.investimento * 3;
      const lucroEstimado = receitaEstimada - campanha.investimento;
      const roi = campanha.investimento > 0 ? (lucroEstimado / campanha.investimento) * 100 : 0;

      return {
        ...campanha,
        receita_estimada: receitaEstimada,
        lucro_estimado: lucroEstimado,
        roi: Math.round(roi * 100) / 100
      };
    });

    const totalInvestimento = campanhas.reduce((sum, c) => sum + c.investimento, 0);
    const totalReceitaEstimada = campanhasComROI.reduce((sum, c) => sum + c.receita_estimada, 0);
    const totalLucroEstimado = campanhasComROI.reduce((sum, c) => sum + c.lucro_estimado, 0);
    const roiMedio = campanhasComROI.length > 0 ? 
      campanhasComROI.reduce((sum, c) => sum + c.roi, 0) / campanhasComROI.length : 0;

    res.json({
      periodo: {
        inicio: data_inicio,
        fim: data_fim
      },
      campanhas: campanhasComROI,
      resumo: {
        total_campanhas: campanhas.length,
        total_investimento: totalInvestimento,
        total_receita_estimada: totalReceitaEstimada,
        total_lucro_estimado: totalLucroEstimado,
        roi_medio: Math.round(roiMedio * 100) / 100
      }
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de ROI:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
