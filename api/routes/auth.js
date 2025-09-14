const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('../database/database');

const router = express.Router();

// JWT Secret (em produção, usar variável de ambiente)
const JWT_SECRET = 'financeiro_mkt_secret_key_2024';

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso necessário' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const usuario = await Database.get(
      'SELECT * FROM usuarios WHERE email = ? AND ativo = 1',
      [email]
    );

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { 
        id: usuario.id, 
        email: usuario.email, 
        nivel_acesso: usuario.nivel_acesso 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        cargo: usuario.cargo,
        nivel_acesso: usuario.nivel_acesso
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ 
    valid: true, 
    user: req.user 
  });
});

// Alterar senha
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { senha_atual, nova_senha } = req.body;

    if (!senha_atual || !nova_senha) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    const usuario = await Database.get(
      'SELECT * FROM usuarios WHERE id = ?',
      [req.user.id]
    );

    const senhaValida = await bcrypt.compare(senha_atual, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    const novaSenhaHash = await bcrypt.hash(nova_senha, 10);
    
    await Database.run(
      'UPDATE usuarios SET senha = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [novaSenhaHash, req.user.id]
    );

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar usuários (apenas para administradores)
router.get('/usuarios', authenticateToken, async (req, res) => {
  try {
    if (req.user.nivel_acesso < 3) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const usuarios = await Database.all(
      'SELECT id, nome, email, cargo, nivel_acesso, ativo, created_at FROM usuarios ORDER BY nome'
    );

    res.json(usuarios);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar usuário (apenas para administradores)
router.post('/usuarios', authenticateToken, async (req, res) => {
  try {
    if (req.user.nivel_acesso < 3) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { nome, email, senha, cargo, nivel_acesso } = req.body;

    if (!nome || !email || !senha || !cargo) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    
    const result = await Database.run(
      `INSERT INTO usuarios (nome, email, senha, cargo, nivel_acesso) 
       VALUES (?, ?, ?, ?, ?)`,
      [nome, email, senhaHash, cargo, nivel_acesso || 1]
    );

    res.json({ 
      id: result.id, 
      message: 'Usuário criado com sucesso' 
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar usuário
router.put('/usuarios/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, cargo, nivel_acesso, ativo } = req.body;

    // Verificar se o usuário pode editar (próprio perfil ou admin)
    if (req.user.id != id && req.user.nivel_acesso < 3) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    await Database.run(
      `UPDATE usuarios SET 
       nome = ?, email = ?, cargo = ?, nivel_acesso = ?, ativo = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [nome, email, cargo, nivel_acesso, ativo, id]
    );

    res.json({ message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
