const { Redirect } = require('../models');
const { Op } = require('sequelize');

class RedirectController {
  
  // Listar todos os redirecionamentos
  static async listar(req, res) {
    try {
      console.log('🔍 Iniciando listagem de redirecionamentos...');
      console.log('📦 Redirect model:', Redirect);
      
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';
      
      const where = {};
      
      if (search) {
        where[Op.or] = [
          { urlAntiga: { [Op.like]: `%${search}%` } },
          { urlNova: { [Op.like]: `%${search}%` } },
          { descricao: { [Op.like]: `%${search}%` } }
        ];
      }
      
      console.log('🔍 Buscando redirects no banco...');
      const { count, rows: redirects } = await Redirect.findAndCountAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });
      
      console.log(`✅ Encontrados ${count} redirecionamentos`);
      
      const totalPages = Math.ceil(count / limit);
      
      res.render('dashboard/configuracoes/redirects', {
        redirects,
        currentPage: page,
        totalPages,
        totalRedirects: count,
        search,
        user: req.session.user
      });
      
    } catch (error) {
      console.error('❌ Erro ao listar redirecionamentos:', error);
      console.error('Stack:', error.stack);
      res.status(500).send('Erro ao carregar redirecionamentos: ' + error.message);
    }
  }
  
  // Criar novo redirecionamento
  static async criar(req, res) {
    try {
      const { urlAntiga, urlNova, tipoRedirecionamento, descricao, ativo } = req.body;
      
      // Validações
      if (!urlAntiga || !urlNova) {
        return res.status(400).json({
          success: false,
          message: 'URL antiga e URL nova são obrigatórias'
        });
      }
      
      // Normalizar URLs
      const urlAntigaNormalizada = Redirect.normalizarUrl(urlAntiga);
      
      // Verificar se já existe
      const existente = await Redirect.findOne({
        where: { urlAntiga: urlAntigaNormalizada }
      });
      
      if (existente) {
        return res.status(400).json({
          success: false,
          message: 'Já existe um redirecionamento para esta URL antiga'
        });
      }
      
      // Criar redirecionamento
      const redirect = await Redirect.create({
        urlAntiga: urlAntigaNormalizada,
        urlNova: urlNova.trim(),
        tipoRedirecionamento: tipoRedirecionamento || '301',
        descricao: descricao || null,
        ativo: ativo !== 'false',
        criadoPor: req.session.user?.id
      });
      
      res.json({
        success: true,
        message: 'Redirecionamento criado com sucesso',
        redirect
      });
      
    } catch (error) {
      console.error('Erro ao criar redirecionamento:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao criar redirecionamento'
      });
    }
  }
  
  // Atualizar redirecionamento
  static async atualizar(req, res) {
    try {
      const { id } = req.params;
      const { urlAntiga, urlNova, tipoRedirecionamento, descricao, ativo } = req.body;
      
      const redirect = await Redirect.findByPk(id);
      
      if (!redirect) {
        return res.status(404).json({
          success: false,
          message: 'Redirecionamento não encontrado'
        });
      }
      
      // Verificar se a URL antiga mudou e se já existe outra com esse valor
      if (urlAntiga && urlAntiga !== redirect.urlAntiga) {
        const urlAntigaNormalizada = Redirect.normalizarUrl(urlAntiga);
        const existente = await Redirect.findOne({
          where: {
            urlAntiga: urlAntigaNormalizada,
            id: { [Op.ne]: id }
          }
        });
        
        if (existente) {
          return res.status(400).json({
            success: false,
            message: 'Já existe outro redirecionamento para esta URL antiga'
          });
        }
        
        redirect.urlAntiga = urlAntigaNormalizada;
      }
      
      if (urlNova) redirect.urlNova = urlNova.trim();
      if (tipoRedirecionamento) redirect.tipoRedirecionamento = tipoRedirecionamento;
      if (descricao !== undefined) redirect.descricao = descricao;
      if (ativo !== undefined) redirect.ativo = ativo !== 'false';
      
      await redirect.save();
      
      res.json({
        success: true,
        message: 'Redirecionamento atualizado com sucesso',
        redirect
      });
      
    } catch (error) {
      console.error('Erro ao atualizar redirecionamento:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao atualizar redirecionamento'
      });
    }
  }
  
  // Deletar redirecionamento
  static async deletar(req, res) {
    try {
      const { id } = req.params;
      
      const redirect = await Redirect.findByPk(id);
      
      if (!redirect) {
        return res.status(404).json({
          success: false,
          message: 'Redirecionamento não encontrado'
        });
      }
      
      await redirect.destroy();
      
      res.json({
        success: true,
        message: 'Redirecionamento deletado com sucesso'
      });
      
    } catch (error) {
      console.error('Erro ao deletar redirecionamento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao deletar redirecionamento'
      });
    }
  }
  
  // Ativar/Desativar redirecionamento
  static async toggleAtivo(req, res) {
    try {
      const { id } = req.params;
      
      const redirect = await Redirect.findByPk(id);
      
      if (!redirect) {
        return res.status(404).json({
          success: false,
          message: 'Redirecionamento não encontrado'
        });
      }
      
      redirect.ativo = !redirect.ativo;
      await redirect.save();
      
      res.json({
        success: true,
        message: `Redirecionamento ${redirect.ativo ? 'ativado' : 'desativado'} com sucesso`,
        ativo: redirect.ativo
      });
      
    } catch (error) {
      console.error('Erro ao alternar status:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao alternar status'
      });
    }
  }
  
  // Estatísticas
  static async estatisticas(req, res) {
    try {
      const total = await Redirect.count();
      const ativos = await Redirect.count({ where: { ativo: true } });
      const inativos = total - ativos;
      
      const maisUsados = await Redirect.findAll({
        where: { ativo: true },
        order: [['contadorAcessos', 'DESC']],
        limit: 10
      });
      
      const recentes = await Redirect.findAll({
        order: [['createdAt', 'DESC']],
        limit: 5
      });
      
      res.json({
        success: true,
        estatisticas: {
          total,
          ativos,
          inativos,
          maisUsados,
          recentes
        }
      });
      
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar estatísticas'
      });
    }
  }
  
  // Importar redirecionamentos em massa (CSV)
  static async importarCSV(req, res) {
    try {
      const { redirects } = req.body; // Array de {urlAntiga, urlNova, tipo, descricao}
      
      if (!Array.isArray(redirects) || redirects.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum redirecionamento fornecido'
        });
      }
      
      const criados = [];
      const erros = [];
      
      for (const item of redirects) {
        try {
          const urlAntigaNormalizada = Redirect.normalizarUrl(item.urlAntiga);
          
          // Verificar se já existe
          const existente = await Redirect.findOne({
            where: { urlAntiga: urlAntigaNormalizada }
          });
          
          if (existente) {
            erros.push({
              urlAntiga: item.urlAntiga,
              erro: 'Já existe'
            });
            continue;
          }
          
          const redirect = await Redirect.create({
            urlAntiga: urlAntigaNormalizada,
            urlNova: item.urlNova.trim(),
            tipoRedirecionamento: item.tipo || '301',
            descricao: item.descricao || null,
            ativo: true,
            criadoPor: req.session.user?.id
          });
          
          criados.push(redirect);
          
        } catch (error) {
          erros.push({
            urlAntiga: item.urlAntiga,
            erro: error.message
          });
        }
      }
      
      res.json({
        success: true,
        message: `${criados.length} redirecionamentos criados`,
        criados: criados.length,
        erros: erros.length,
        detalhesErros: erros
      });
      
    } catch (error) {
      console.error('Erro ao importar redirecionamentos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao importar redirecionamentos'
      });
    }
  }
}

module.exports = RedirectController;
