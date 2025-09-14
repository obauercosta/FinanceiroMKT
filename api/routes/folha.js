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

// Função para calcular descontos CLT
function calcularDescontosCLT(salarioBruto) {
  let inss = 0;
  let irrf = 0;
  let fgts = 0;

  // Cálculo do INSS (2024)
  if (salarioBruto <= 1320) {
    inss = salarioBruto * 0.075;
  } else if (salarioBruto <= 2571.29) {
    inss = 1320 * 0.075 + (salarioBruto - 1320) * 0.09;
  } else if (salarioBruto <= 3856.94) {
    inss = 1320 * 0.075 + (2571.29 - 1320) * 0.09 + (salarioBruto - 2571.29) * 0.12;
  } else if (salarioBruto <= 7507.49) {
    inss = 1320 * 0.075 + (2571.29 - 1320) * 0.09 + (3856.94 - 2571.29) * 0.12 + (salarioBruto - 3856.94) * 0.14;
  } else {
    inss = 1320 * 0.075 + (2571.29 - 1320) * 0.09 + (3856.94 - 2571.29) * 0.12 + (7507.49 - 3856.94) * 0.14;
  }

  // Cálculo do IRRF (2024)
  const baseIRRF = salarioBruto - inss;
  if (baseIRRF <= 1903.98) {
    irrf = 0;
  } else if (baseIRRF <= 2826.65) {
    irrf = baseIRRF * 0.075 - 142.80;
  } else if (baseIRRF <= 3751.05) {
    irrf = baseIRRF * 0.15 - 354.80;
  } else if (baseIRRF <= 4664.68) {
    irrf = baseIRRF * 0.225 - 636.13;
  } else {
    irrf = baseIRRF * 0.275 - 869.36;
  }

  // FGTS (8% sobre o salário bruto)
  fgts = salarioBruto * 0.08;

  return {
    inss: Math.round(inss * 100) / 100,
    irrf: Math.round(irrf * 100) / 100,
    fgts: Math.round(fgts * 100) / 100
  };
}

// Listar folha de pagamento
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { mes, ano, usuario_id, page = 1, limit = 50 } = req.query;
    
    let whereClause = 'WHERE 1=1';
    let params = [];

    if (mes) {
      whereClause += ' AND mes_referencia = ?';
      params.push(mes);
    }

    if (ano) {
      whereClause += ' AND ano_referencia = ?';
      params.push(ano);
    }

    if (usuario_id) {
      whereClause += ' AND id_usuario = ?';
      params.push(usuario_id);
    }

    const offset = (page - 1) * limit;
    
    const folha = await Database.all(
      `SELECT f.*, u.nome as usuario_nome, u.cargo 
       FROM folha_pagamento f 
       JOIN usuarios u ON f.id_usuario = u.id 
       ${whereClause} 
       ORDER BY f.ano_referencia DESC, f.mes_referencia DESC, u.nome ASC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const total = await Database.get(
      `SELECT COUNT(*) as count FROM folha_pagamento f ${whereClause}`,
      params
    );

    res.json({
      folha,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.count,
        pages: Math.ceil(total.count / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar folha de pagamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter folha por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const folha = await Database.get(
      `SELECT f.*, u.nome as usuario_nome, u.cargo, u.email 
       FROM folha_pagamento f 
       JOIN usuarios u ON f.id_usuario = u.id 
       WHERE f.id = ?`,
      [id]
    );

    if (!folha) {
      return res.status(404).json({ error: 'Registro de folha não encontrado' });
    }

    res.json(folha);
  } catch (error) {
    console.error('Erro ao obter folha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar registro de folha
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      id_usuario,
      mes_referencia,
      ano_referencia,
      salario_bruto,
      vale_transporte = 0,
      vale_refeicao = 0,
      outros_descontos = 0,
      tipo_contrato = 'CLT'
    } = req.body;

    if (!id_usuario || !mes_referencia || !ano_referencia || !salario_bruto) {
      return res.status(400).json({ 
        error: 'Usuário, mês, ano e salário bruto são obrigatórios' 
      });
    }

    // Verificar se já existe folha para este usuário/mês/ano
    const folhaExistente = await Database.get(
      'SELECT * FROM folha_pagamento WHERE id_usuario = ? AND mes_referencia = ? AND ano_referencia = ?',
      [id_usuario, mes_referencia, ano_referencia]
    );

    if (folhaExistente) {
      return res.status(400).json({ 
        error: 'Já existe folha de pagamento para este usuário no período informado' 
      });
    }

    let inss = 0;
    let irrf = 0;
    let fgts = 0;
    let salarioLiquido = salario_bruto;

    // Calcular descontos baseado no tipo de contrato
    if (tipo_contrato === 'CLT') {
      const descontos = calcularDescontosCLT(salario_bruto);
      inss = descontos.inss;
      irrf = descontos.irrf;
      fgts = descontos.fgts;
    }

    // Calcular salário líquido
    salarioLiquido = salario_bruto - inss - irrf - vale_transporte - outros_descontos;

    const result = await Database.run(
      `INSERT INTO folha_pagamento 
       (id_usuario, mes_referencia, ano_referencia, salario_bruto, inss, irrf, 
        vale_transporte, vale_refeicao, outros_descontos, salario_liquido, fgts) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id_usuario, mes_referencia, ano_referencia, salario_bruto, inss, irrf, 
       vale_transporte, vale_refeicao, outros_descontos, salarioLiquido, fgts]
    );

    // Log da operação
    await Database.run(
      `INSERT INTO log_financeiro (tipo, id_referencia, acao, valor_novo, usuario_responsavel, observacoes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['folha', result.id, 'criar', salarioLiquido, req.user.id, `Folha criada: ${mes_referencia}/${ano_referencia}`]
    );

    res.json({ 
      id: result.id, 
      message: 'Registro de folha criado com sucesso',
      calculos: {
        salario_bruto,
        inss,
        irrf,
        fgts,
        vale_transporte,
        outros_descontos,
        salario_liquido: salarioLiquido
      }
    });
  } catch (error) {
    console.error('Erro ao criar folha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar folha
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      salario_bruto,
      vale_transporte,
      vale_refeicao,
      outros_descontos,
      data_pagamento,
      status
    } = req.body;

    // Buscar folha atual
    const folhaAtual = await Database.get(
      'SELECT * FROM folha_pagamento WHERE id = ?',
      [id]
    );

    if (!folhaAtual) {
      return res.status(404).json({ error: 'Registro de folha não encontrado' });
    }

    // Recalcular descontos se o salário bruto mudou
    let inss = folhaAtual.inss;
    let irrf = folhaAtual.irrf;
    let fgts = folhaAtual.fgts;
    let salarioLiquido = folhaAtual.salario_liquido;

    if (salario_bruto && salario_bruto !== folhaAtual.salario_bruto) {
      const descontos = calcularDescontosCLT(salario_bruto);
      inss = descontos.inss;
      irrf = descontos.irrf;
      fgts = descontos.fgts;
      salarioLiquido = salario_bruto - inss - irrf - (vale_transporte || folhaAtual.vale_transporte) - (outros_descontos || folhaAtual.outros_descontos);
    }

    await Database.run(
      `UPDATE folha_pagamento SET 
       salario_bruto = ?, inss = ?, irrf = ?, vale_transporte = ?, vale_refeicao = ?, 
       outros_descontos = ?, salario_liquido = ?, fgts = ?, data_pagamento = ?, 
       status = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [salario_bruto || folhaAtual.salario_bruto, inss, irrf, 
       vale_transporte !== undefined ? vale_transporte : folhaAtual.vale_transporte,
       vale_refeicao !== undefined ? vale_refeicao : folhaAtual.vale_refeicao,
       outros_descontos !== undefined ? outros_descontos : folhaAtual.outros_descontos,
       salarioLiquido, fgts, data_pagamento, status, id]
    );

    // Log da operação
    await Database.run(
      `INSERT INTO log_financeiro (tipo, id_referencia, acao, valor_anterior, valor_novo, usuario_responsavel, observacoes) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['folha', id, 'atualizar', folhaAtual.salario_liquido, salarioLiquido, req.user.id, `Folha atualizada`]
    );

    res.json({ message: 'Registro de folha atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar folha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Marcar como pago
router.patch('/:id/pagar', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { data_pagamento } = req.body;

    const folha = await Database.get(
      'SELECT * FROM folha_pagamento WHERE id = ?',
      [id]
    );

    if (!folha) {
      return res.status(404).json({ error: 'Registro de folha não encontrado' });
    }

    await Database.run(
      `UPDATE folha_pagamento SET 
       status = 'pago', data_pagamento = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [data_pagamento || new Date().toISOString().split('T')[0], id]
    );

    // Log da operação
    await Database.run(
      `INSERT INTO log_financeiro (tipo, id_referencia, acao, usuario_responsavel, observacoes) 
       VALUES (?, ?, ?, ?, ?)`,
      ['folha', id, 'pagar', req.user.id, `Folha marcada como paga`]
    );

    res.json({ message: 'Folha marcada como paga' });
  } catch (error) {
    console.error('Erro ao marcar folha como paga:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir folha
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const folha = await Database.get(
      'SELECT * FROM folha_pagamento WHERE id = ?',
      [id]
    );

    if (!folha) {
      return res.status(404).json({ error: 'Registro de folha não encontrado' });
    }

    await Database.run('DELETE FROM folha_pagamento WHERE id = ?', [id]);

    // Log da operação
    await Database.run(
      `INSERT INTO log_financeiro (tipo, id_referencia, acao, valor_anterior, usuario_responsavel, observacoes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['folha', id, 'excluir', folha.salario_liquido, req.user.id, `Folha excluída`]
    );

    res.json({ message: 'Registro de folha excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir folha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Calcular folha para todos os funcionários
router.post('/calcular-todos', authenticateToken, async (req, res) => {
  try {
    const { mes, ano } = req.body;

    if (!mes || !ano) {
      return res.status(400).json({ error: 'Mês e ano são obrigatórios' });
    }

    // Buscar todos os usuários ativos
    const usuarios = await Database.all(
      'SELECT * FROM usuarios WHERE ativo = 1'
    );

    const folhasCalculadas = [];

    for (const usuario of usuarios) {
      // Verificar se já existe folha para este usuário/mês/ano
      const folhaExistente = await Database.get(
        'SELECT * FROM folha_pagamento WHERE id_usuario = ? AND mes_referencia = ? AND ano_referencia = ?',
        [usuario.id, mes, ano]
      );

      if (!folhaExistente) {
        // Aqui você pode implementar lógica para buscar o salário do usuário
        // Por simplicidade, vou usar um valor padrão
        const salarioBruto = 5000; // Em produção, isso viria de uma tabela de salários
        
        const descontos = calcularDescontosCLT(salarioBruto);
        const salarioLiquido = salarioBruto - descontos.inss - descontos.irrf;

        const result = await Database.run(
          `INSERT INTO folha_pagamento 
           (id_usuario, mes_referencia, ano_referencia, salario_bruto, inss, irrf, 
            salario_liquido, fgts) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [usuario.id, mes, ano, salarioBruto, descontos.inss, descontos.irrf, 
           salarioLiquido, descontos.fgts]
        );

        folhasCalculadas.push({
          id: result.id,
          usuario: usuario.nome,
          salario_bruto: salarioBruto,
          salario_liquido: salarioLiquido
        });
      }
    }

    res.json({
      message: `Folha calculada para ${mes}/${ano}`,
      folhas_criadas: folhasCalculadas.length,
      detalhes: folhasCalculadas
    });
  } catch (error) {
    console.error('Erro ao calcular folha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Resumo da folha por período
router.get('/resumo/periodo', authenticateToken, async (req, res) => {
  try {
    const { mes, ano } = req.query;

    if (!mes || !ano) {
      return res.status(400).json({ error: 'Mês e ano são obrigatórios' });
    }

    const resumo = await Database.get(
      `SELECT 
         COUNT(*) as total_funcionarios,
         SUM(salario_bruto) as total_salarios_brutos,
         SUM(salario_liquido) as total_salarios_liquidos,
         SUM(inss) as total_inss,
         SUM(irrf) as total_irrf,
         SUM(fgts) as total_fgts,
         SUM(vale_transporte) as total_vale_transporte,
         SUM(vale_refeicao) as total_vale_refeicao,
         SUM(outros_descontos) as total_outros_descontos
       FROM folha_pagamento 
       WHERE mes_referencia = ? AND ano_referencia = ?`,
      [mes, ano]
    );

    res.json(resumo);
  } catch (error) {
    console.error('Erro ao obter resumo da folha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
