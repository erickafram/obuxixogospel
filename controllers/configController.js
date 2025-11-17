const { SystemConfig } = require('../models');

// Listar todas as configurações agrupadas
exports.getAllConfigs = async (req, res) => {
  try {
    const configs = await SystemConfig.findAll({
      order: [['chave', 'ASC']]
    });

    // Agrupar configurações por categoria
    const grouped = {
      site: [],
      seo: [],
      ia: [],
      analytics: [],
      redes_sociais: [],
      amp: []
    };

    configs.forEach(config => {
      if (config.chave.startsWith('site_')) {
        grouped.site.push(config);
      } else if (config.chave.startsWith('seo_')) {
        grouped.seo.push(config);
      } else if (config.chave.startsWith('ia_')) {
        grouped.ia.push(config);
      } else if (config.chave.startsWith('analytics_')) {
        grouped.analytics.push(config);
      } else if (config.chave.startsWith('redes_sociais_')) {
        grouped.redes_sociais.push(config);
      } else if (config.chave.startsWith('amp_')) {
        grouped.amp.push(config);
      }
    });

    res.render('dashboard/configuracoes/index', {
      user: {
        nome: req.session.userName,
        email: req.session.userEmail,
        role: req.session.userRole
      },
      configs: grouped,
      success: req.query.success
    });
  } catch (error) {
    console.error('Erro ao carregar configurações:', error);
    res.status(500).send('Erro ao carregar configurações');
  }
};

// Atualizar configurações
exports.updateConfigs = async (req, res) => {
  try {
    const updates = req.body;

    // Atualizar cada configuração
    for (const [chave, valor] of Object.entries(updates)) {
      await SystemConfig.setConfig(chave, valor || '');
    }

    res.redirect('/dashboard/configuracoes?success=Configurações atualizadas com sucesso!');
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).send('Erro ao atualizar configurações');
  }
};

// API para obter configuração específica
exports.getConfig = async (req, res) => {
  try {
    const { chave } = req.params;
    const valor = await SystemConfig.getConfig(chave);
    
    if (valor === null) {
      return res.status(404).json({ success: false, message: 'Configuração não encontrada' });
    }

    res.json({ success: true, chave, valor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// API para atualizar configuração específica
exports.setConfig = async (req, res) => {
  try {
    const { chave } = req.params;
    const { valor } = req.body;

    await SystemConfig.setConfig(chave, valor);

    res.json({ success: true, message: 'Configuração atualizada com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
