const { Page, Form } = require('../models');

// Listar todas as páginas (Dashboard)
exports.index = async (req, res) => {
  try {
    const pages = await Page.findAll({
      order: [['ordem', 'ASC'], ['titulo', 'ASC']]
    });

    res.render('dashboard/paginas/index', {
      user: req.session.user,
      pages
    });
  } catch (error) {
    console.error('Erro ao listar páginas:', error);
    res.status(500).send('Erro ao carregar páginas');
  }
};

// Exibir formulário de nova página
exports.novo = async (req, res) => {
  try {
    const forms = await Form.findAll({
      where: { ativo: true },
      attributes: ['id', 'nome'],
      order: [['nome', 'ASC']]
    });

    res.render('dashboard/paginas/form', {
      user: req.session.user,
      isEdit: false,
      page: {},
      forms
    });
  } catch (error) {
    console.error('Erro ao carregar formulário:', error);
    res.status(500).send('Erro ao carregar formulário');
  }
};

// Exibir formulário de edição
exports.editar = async (req, res) => {
  try {
    const page = await Page.findByPk(req.params.id);

    if (!page) {
      return res.status(404).send('Página não encontrada');
    }

    const forms = await Form.findAll({
      where: { ativo: true },
      attributes: ['id', 'nome'],
      order: [['nome', 'ASC']]
    });

    res.render('dashboard/paginas/form', {
      user: req.session.user,
      isEdit: true,
      page,
      forms
    });
  } catch (error) {
    console.error('Erro ao carregar página:', error);
    res.status(500).send('Erro ao carregar página');
  }
};

// Criar nova página
exports.criar = async (req, res) => {
  try {
    const { titulo, slug, conteudo, descricao, ativo, ordem, exibirFooter, exibirMenu, formId } = req.body;

    await Page.create({
      titulo,
      slug,
      conteudo,
      descricao,
      ativo: ativo === 'on' || ativo === true,
      ordem: parseInt(ordem) || 0,
      exibirFooter: exibirFooter === 'on' || exibirFooter === true,
      exibirMenu: exibirMenu === 'on' || exibirMenu === true,
      formId: formId ? parseInt(formId) : null
    });

    res.redirect('/dashboard/paginas?success=Página criada com sucesso');
  } catch (error) {
    console.error('Erro ao criar página:', error);
    res.status(500).send('Erro ao criar página');
  }
};

// Atualizar página
exports.atualizar = async (req, res) => {
  try {
    const { titulo, slug, conteudo, descricao, ativo, ordem, exibirFooter, exibirMenu, formId } = req.body;

    const page = await Page.findByPk(req.params.id);

    if (!page) {
      return res.status(404).send('Página não encontrada');
    }

    await page.update({
      titulo,
      slug,
      conteudo,
      descricao,
      ativo: ativo === 'on' || ativo === true,
      ordem: parseInt(ordem) || 0,
      exibirFooter: exibirFooter === 'on' || exibirFooter === true,
      exibirMenu: exibirMenu === 'on' || exibirMenu === true,
      formId: formId ? parseInt(formId) : null
    });

    res.redirect('/dashboard/paginas?success=Página atualizada com sucesso');
  } catch (error) {
    console.error('Erro ao atualizar página:', error);
    res.status(500).send('Erro ao atualizar página');
  }
};

// Deletar página
exports.deletar = async (req, res) => {
  try {
    const page = await Page.findByPk(req.params.id);

    if (!page) {
      return res.status(404).json({ success: false, error: 'Página não encontrada' });
    }

    await page.destroy();

    res.json({ success: true, message: 'Página deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar página:', error);
    res.status(500).json({ success: false, error: 'Erro ao deletar página' });
  }
};

// Reordenar páginas
exports.reordenar = async (req, res) => {
  try {
    const { ordem } = req.body;

    if (!ordem || !Array.isArray(ordem)) {
      return res.status(400).json({ success: false, error: 'Dados inválidos' });
    }

    // Atualizar ordem de cada página
    const promises = ordem.map((item, index) => {
      return Page.update({ ordem: index }, {
        where: { id: item.id }
      });
    });

    await Promise.all(promises);

    res.json({ success: true, message: 'Ordem atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao reordenar páginas:', error);
    res.status(500).json({ success: false, error: 'Erro ao reordenar páginas' });
  }
};

// Exibir página pública
exports.exibir = async (req, res) => {
  try {
    const page = await Page.findOne({
      where: { slug: req.params.slug, ativo: true },
      include: [{
        model: Form,
        as: 'form',
        required: false
      }]
    });

    if (!page) {
      return res.status(404).send('Página não encontrada');
    }

    // SEO específico para a página
    const baseUrl = process.env.SITE_URL || 'https://www.obuxixogospel.com.br';
    const seo = {
      title: `${page.titulo} - O Buxixo Gospel - Notícias Gospel e Evangélicas`,
      description: page.descricao || `${page.titulo} - Obuxixo Gospel`,
      keywords: `${page.titulo}, obuxixo gospel, gospel`,
      url: `${baseUrl}/pagina/${page.slug}`,
      type: 'website',
      image: `${baseUrl}/images/og-image.jpg`
    };

    // Schema.org para página
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": page.titulo,
      "description": page.descricao || page.titulo,
      "url": `${baseUrl}/pagina/${page.slug}`,
      "isPartOf": {
        "@type": "WebSite",
        "name": "Obuxixo Gospel",
        "url": baseUrl
      },
      "publisher": {
        "@type": "Organization",
        "name": "Obuxixo Gospel",
        "logo": {
          "@type": "ImageObject",
          "url": `${baseUrl}/images/logo.png`
        }
      }
    };

    res.render('page', {
      page,
      form: page.form || null,
      user: req.user || null,
      seo,
      schemaData
    });
  } catch (error) {
    console.error('Erro ao exibir página:', error);
    res.status(500).send('Erro ao carregar página');
  }
};
