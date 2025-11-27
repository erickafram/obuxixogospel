const { Form, FormSubmission, Page } = require('../models');
const { Op } = require('sequelize');

// ==================== FORMULÁRIOS ====================

// Listar todos os formulários (Dashboard)
exports.index = async (req, res) => {
  try {
    const forms = await Form.findAll({
      order: [['createdAt', 'DESC']],
      include: [{
        model: FormSubmission,
        as: 'submissions',
        attributes: ['id']
      }]
    });
    
    res.render('dashboard/formularios/index', {
      user: req.session.user,
      forms
    });
  } catch (error) {
    console.error('Erro ao listar formulários:', error);
    res.status(500).send('Erro ao carregar formulários');
  }
};

// Exibir formulário de novo formulário
exports.novo = (req, res) => {
  res.render('dashboard/formularios/form', {
    user: req.session.user,
    isEdit: false,
    form: {
      campos: [],
      textoBotao: 'Enviar',
      mensagemSucesso: 'Formulário enviado com sucesso! Entraremos em contato em breve.'
    }
  });
};

// Exibir formulário de edição
exports.editar = async (req, res) => {
  try {
    const form = await Form.findByPk(req.params.id);
    
    if (!form) {
      return res.status(404).send('Formulário não encontrado');
    }
    
    res.render('dashboard/formularios/form', {
      user: req.session.user,
      isEdit: true,
      form
    });
  } catch (error) {
    console.error('Erro ao carregar formulário:', error);
    res.status(500).send('Erro ao carregar formulário');
  }
};

// Criar novo formulário
exports.criar = async (req, res) => {
  try {
    const { nome, descricao, campos, textoBotao, mensagemSucesso, emailNotificacao, ativo } = req.body;
    
    await Form.create({
      nome,
      descricao,
      campos: campos || '[]',
      textoBotao: textoBotao || 'Enviar',
      mensagemSucesso: mensagemSucesso || 'Formulário enviado com sucesso!',
      emailNotificacao,
      ativo: ativo === 'on' || ativo === true
    });
    
    res.redirect('/dashboard/formularios?success=Formulário criado com sucesso');
  } catch (error) {
    console.error('Erro ao criar formulário:', error);
    res.status(500).send('Erro ao criar formulário');
  }
};

// Atualizar formulário
exports.atualizar = async (req, res) => {
  try {
    const { nome, descricao, campos, textoBotao, mensagemSucesso, emailNotificacao, ativo } = req.body;
    
    const form = await Form.findByPk(req.params.id);
    
    if (!form) {
      return res.status(404).send('Formulário não encontrado');
    }
    
    await form.update({
      nome,
      descricao,
      campos: campos || '[]',
      textoBotao: textoBotao || 'Enviar',
      mensagemSucesso: mensagemSucesso || 'Formulário enviado com sucesso!',
      emailNotificacao,
      ativo: ativo === 'on' || ativo === true
    });
    
    res.redirect('/dashboard/formularios?success=Formulário atualizado com sucesso');
  } catch (error) {
    console.error('Erro ao atualizar formulário:', error);
    res.status(500).send('Erro ao atualizar formulário');
  }
};

// Deletar formulário
exports.deletar = async (req, res) => {
  try {
    const form = await Form.findByPk(req.params.id);
    
    if (!form) {
      return res.status(404).json({ success: false, error: 'Formulário não encontrado' });
    }
    
    // Remover vínculo das páginas
    await Page.update({ formId: null }, { where: { formId: form.id } });
    
    // Deletar submissões
    await FormSubmission.destroy({ where: { formId: form.id } });
    
    // Deletar formulário
    await form.destroy();
    
    res.json({ success: true, message: 'Formulário deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar formulário:', error);
    res.status(500).json({ success: false, error: 'Erro ao deletar formulário' });
  }
};

// ==================== SUBMISSÕES ====================

// Listar submissões de um formulário
exports.submissoes = async (req, res) => {
  try {
    const formId = req.params.id;
    const { status } = req.query;
    
    const form = await Form.findByPk(formId);
    
    if (!form) {
      return res.status(404).send('Formulário não encontrado');
    }
    
    const whereClause = { formId };
    if (status && ['novo', 'lido', 'respondido', 'arquivado'].includes(status)) {
      whereClause.status = status;
    }
    
    const submissions = await FormSubmission.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });
    
    // Contar por status
    const counts = await FormSubmission.findAll({
      where: { formId },
      attributes: ['status', [require('sequelize').fn('COUNT', 'id'), 'count']],
      group: ['status'],
      raw: true
    });
    
    const statusCounts = {
      novo: 0,
      lido: 0,
      respondido: 0,
      arquivado: 0,
      total: 0
    };
    
    counts.forEach(c => {
      statusCounts[c.status] = parseInt(c.count);
      statusCounts.total += parseInt(c.count);
    });
    
    res.render('dashboard/formularios/submissoes', {
      user: req.session.user,
      form,
      submissions,
      statusCounts,
      currentStatus: status || 'todos'
    });
  } catch (error) {
    console.error('Erro ao listar submissões:', error);
    res.status(500).send('Erro ao carregar submissões');
  }
};

// Ver detalhes de uma submissão
exports.verSubmissao = async (req, res) => {
  try {
    const submission = await FormSubmission.findByPk(req.params.submissionId, {
      include: [{
        model: Form,
        as: 'form'
      }]
    });
    
    if (!submission) {
      return res.status(404).json({ success: false, error: 'Submissão não encontrada' });
    }
    
    // Marcar como lido se for novo
    if (submission.status === 'novo') {
      await submission.update({ status: 'lido' });
    }
    
    res.json({
      success: true,
      submission: {
        id: submission.id,
        dados: submission.dados,
        status: submission.status,
        ip: submission.ip,
        paginaOrigem: submission.paginaOrigem,
        createdAt: submission.createdAt,
        form: submission.form
      }
    });
  } catch (error) {
    console.error('Erro ao carregar submissão:', error);
    res.status(500).json({ success: false, error: 'Erro ao carregar submissão' });
  }
};

// Atualizar status da submissão
exports.atualizarStatusSubmissao = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['novo', 'lido', 'respondido', 'arquivado'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status inválido' });
    }
    
    const submission = await FormSubmission.findByPk(req.params.submissionId);
    
    if (!submission) {
      return res.status(404).json({ success: false, error: 'Submissão não encontrada' });
    }
    
    await submission.update({ status });
    
    res.json({ success: true, message: 'Status atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ success: false, error: 'Erro ao atualizar status' });
  }
};

// Deletar submissão
exports.deletarSubmissao = async (req, res) => {
  try {
    const submission = await FormSubmission.findByPk(req.params.submissionId);
    
    if (!submission) {
      return res.status(404).json({ success: false, error: 'Submissão não encontrada' });
    }
    
    await submission.destroy();
    
    res.json({ success: true, message: 'Submissão deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar submissão:', error);
    res.status(500).json({ success: false, error: 'Erro ao deletar submissão' });
  }
};

// ==================== API PÚBLICA ====================

// Submeter formulário (API pública)
exports.submeter = async (req, res) => {
  try {
    const { formId, dados, paginaOrigem } = req.body;
    
    const form = await Form.findByPk(formId);
    
    if (!form || !form.ativo) {
      return res.status(404).json({ success: false, error: 'Formulário não encontrado ou inativo' });
    }
    
    // Validar campos obrigatórios
    const campos = form.campos;
    for (const campo of campos) {
      if (campo.required && (!dados[campo.name] || dados[campo.name].toString().trim() === '')) {
        return res.status(400).json({ 
          success: false, 
          error: `O campo "${campo.label}" é obrigatório` 
        });
      }
    }
    
    // Criar submissão
    await FormSubmission.create({
      formId,
      dados: JSON.stringify(dados),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      paginaOrigem,
      status: 'novo'
    });
    
    res.json({ 
      success: true, 
      message: form.mensagemSucesso 
    });
  } catch (error) {
    console.error('Erro ao submeter formulário:', error);
    res.status(500).json({ success: false, error: 'Erro ao enviar formulário' });
  }
};

// Obter formulário para renderização (API pública)
exports.obterFormulario = async (req, res) => {
  try {
    const form = await Form.findByPk(req.params.id, {
      attributes: ['id', 'nome', 'descricao', 'campos', 'textoBotao', 'ativo']
    });
    
    if (!form || !form.ativo) {
      return res.status(404).json({ success: false, error: 'Formulário não encontrado' });
    }
    
    res.json({ success: true, form });
  } catch (error) {
    console.error('Erro ao obter formulário:', error);
    res.status(500).json({ success: false, error: 'Erro ao carregar formulário' });
  }
};

// Listar todos os formulários ativos (para select em páginas)
exports.listarAtivos = async (req, res) => {
  try {
    const forms = await Form.findAll({
      where: { ativo: true },
      attributes: ['id', 'nome'],
      order: [['nome', 'ASC']]
    });
    
    res.json({ success: true, forms });
  } catch (error) {
    console.error('Erro ao listar formulários:', error);
    res.status(500).json({ success: false, error: 'Erro ao carregar formulários' });
  }
};

// Dashboard - Contagem de novos registros
exports.contarNovos = async (req, res) => {
  try {
    const count = await FormSubmission.count({
      where: { status: 'novo' }
    });
    
    res.json({ success: true, count });
  } catch (error) {
    console.error('Erro ao contar submissões:', error);
    res.status(500).json({ success: false, error: 'Erro ao contar submissões' });
  }
};
