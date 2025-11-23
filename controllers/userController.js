const { User } = require('../models');

/**
 * Listar todos os usuários
 */
exports.listarUsuarios = async (req, res) => {
  try {
    // Verificar se usuário está logado
    if (!req.session || !req.session.user) {
      return res.redirect('/login');
    }

    const usuarios = await User.findAll({
      attributes: ['id', 'nome', 'email', 'role', 'ativo', 'ultimo_login', 'created_at'],
      order: [['created_at', 'DESC']]
    });

    res.render('dashboard/usuarios/index', {
      title: 'Usuários',
      usuarios,
      user: req.session.user
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).send('Erro ao carregar usuários');
  }
};

/**
 * Exibir formulário de novo usuário
 */
exports.novoUsuarioForm = async (req, res) => {
  // Pegar dados da query string se existirem
  const { nome, email, senha, confirmarSenha, role, ativo } = req.query;
  
  const usuarioPreenchido = {
    nome: nome || '',
    email: email || '',
    senha: senha || '',
    confirmarSenha: confirmarSenha || '',
    role: role || 'autor',
    ativo: ativo === 'on' || ativo === 'true'
  };

  res.render('dashboard/usuarios/form', {
    title: 'Novo Usuário',
    user: req.session.user,
    usuario: usuarioPreenchido,
    isEdit: false
  });
};

/**
 * Criar novo usuário
 */
exports.criarUsuario = async (req, res) => {
  try {
    const { nome, email, senha, role, ativo } = req.body;

    // Verificar se email já existe
    const usuarioExistente = await User.findOne({ where: { email } });
    if (usuarioExistente) {
      return res.status(400).json({
        success: false,
        error: 'Este e-mail já está cadastrado'
      });
    }

    // Criar usuário (o hash da senha é feito automaticamente pelo hook beforeCreate do model)
    const usuario = await User.create({
      nome,
      email,
      senha: senha, // Não fazer hash aqui, o model já faz
      role: role || 'autor',
      ativo: ativo === 'true' || ativo === true
    });

    res.json({
      success: true,
      message: 'Usuário criado com sucesso',
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
      }
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar usuário'
    });
  }
};

/**
 * Exibir formulário de edição
 */
exports.editarUsuarioForm = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await User.findByPk(id, {
      attributes: ['id', 'nome', 'email', 'role', 'ativo']
    });

    if (!usuario) {
      return res.status(404).send('Usuário não encontrado');
    }

    res.render('dashboard/usuarios/form', {
      title: 'Editar Usuário',
      user: req.session.user,
      usuario,
      isEdit: true
    });
  } catch (error) {
    console.error('Erro ao carregar usuário:', error);
    res.status(500).send('Erro ao carregar usuário');
  }
};

/**
 * Atualizar usuário
 */
exports.atualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, senha, role, ativo } = req.body;

    const usuario = await User.findByPk(id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    // Verificar se email já existe em outro usuário
    if (email !== usuario.email) {
      const emailExiste = await User.findOne({
        where: { email }
      });
      if (emailExiste) {
        return res.status(400).json({
          success: false,
          error: 'Este e-mail já está cadastrado'
        });
      }
    }

    // Atualizar dados
    usuario.nome = nome;
    usuario.email = email;
    usuario.role = role;
    usuario.ativo = ativo === 'true' || ativo === true;

    // Atualizar senha se fornecida (o hash é feito automaticamente pelo hook beforeUpdate do model)
    if (senha && senha.trim() !== '') {
      usuario.senha = senha; // Não fazer hash aqui, o model já faz
    }

    await usuario.save();

    res.json({
      success: true,
      message: 'Usuário atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar usuário'
    });
  }
};

/**
 * Deletar usuário
 */
exports.deletarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    // Não permitir deletar o próprio usuário
    if (parseInt(id) === req.session.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Você não pode deletar seu próprio usuário'
      });
    }

    const usuario = await User.findByPk(id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    await usuario.destroy();

    res.json({
      success: true,
      message: 'Usuário deletado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao deletar usuário'
    });
  }
};

/**
 * Alternar status ativo/inativo
 */
exports.toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await User.findByPk(id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    // Não permitir desativar o próprio usuário
    if (parseInt(id) === req.session.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Você não pode desativar seu próprio usuário'
      });
    }

    usuario.ativo = !usuario.ativo;
    await usuario.save();

    res.json({
      success: true,
      message: `Usuário ${usuario.ativo ? 'ativado' : 'desativado'} com sucesso`,
      ativo: usuario.ativo
    });
  } catch (error) {
    console.error('Erro ao alterar status:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao alterar status'
    });
  }
};
