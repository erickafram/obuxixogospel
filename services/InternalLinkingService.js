const { Article } = require('../models');
const { Op } = require('sequelize');
const AIService = require('./AIService');

class InternalLinkingService {
  /**
   * Adiciona links internos automaticamente em um artigo
   * @param {string} conteudo - Conteúdo HTML do artigo
   * @param {string} titulo - Título do artigo atual
   * @param {number} articleId - ID do artigo atual (para não linkar para si mesmo)
   * @param {number} maxLinks - Número máximo de links a adicionar (padrão: 2)
   * @returns {Promise<string>} - Conteúdo com links internos adicionados
   */
  static async addInternalLinks(conteudo, titulo, articleId = null, maxLinks = 2) {
    try {
      console.log('🔗 Iniciando processo de links internos...');
      console.log('   Título:', titulo);
      console.log('   Article ID:', articleId);
      
      // Verifica se a IA está ativa
      const iaAtiva = await AIService.isActive();
      console.log('   IA ativa?', iaAtiva);
      
      if (!iaAtiva) {
        console.log('❌ IA não está ativa. Links internos não serão adicionados.');
        return conteudo;
      }

      // Remove tags HTML para análise de texto puro
      const textoLimpo = this.stripHtml(conteudo);
      console.log('   Texto limpo (primeiros 100 chars):', textoLimpo.substring(0, 100));
      
      // Busca artigos relacionados
      const artigosRelacionados = await this.findRelatedArticles(titulo, textoLimpo, articleId);
      console.log('   Artigos relacionados encontrados:', artigosRelacionados.length);
      
      if (artigosRelacionados.length === 0) {
        console.log('❌ Nenhum artigo relacionado encontrado.');
        return conteudo;
      }
      
      console.log('   Artigos:', artigosRelacionados.map(a => `"${a.titulo}" (${a.url})`).join(', '));

      // Usa IA para identificar os melhores trechos para linkar
      const linksParaAdicionar = await this.identifyLinkOpportunities(
        textoLimpo,
        artigosRelacionados,
        maxLinks
      );

      if (linksParaAdicionar.length === 0) {
        console.log('Nenhuma oportunidade de link identificada pela IA.');
        return conteudo;
      }

      // Adiciona os links no conteúdo
      let conteudoComLinks = conteudo;
      for (const link of linksParaAdicionar) {
        conteudoComLinks = this.insertLink(conteudoComLinks, link);
      }

      console.log(`✅ ${linksParaAdicionar.length} link(s) interno(s) adicionado(s) com sucesso!`);
      return conteudoComLinks;

    } catch (error) {
      console.error('Erro ao adicionar links internos:', error);
      return conteudo; // Retorna conteúdo original em caso de erro
    }
  }

  /**
   * Remove tags HTML de um texto
   */
  static stripHtml(html) {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Busca artigos relacionados no banco de dados
   */
  static async findRelatedArticles(titulo, conteudo, excludeId = null) {
    try {
      console.log('   🔍 Buscando artigos relacionados...');
      
      // Extrai palavras-chave do título e conteúdo
      const palavrasChave = this.extractKeywords(titulo + ' ' + conteudo);
      console.log('   Palavras-chave extraídas:', palavrasChave);
      
      if (palavrasChave.length === 0) {
        console.log('   ⚠️ Nenhuma palavra-chave extraída');
        return [];
      }

      // Busca artigos que contenham essas palavras-chave
      const whereConditions = {
        publicado: 1,
        [Op.or]: palavrasChave.map(palavra => ({
          [Op.or]: [
            { titulo: { [Op.like]: `%${palavra}%` } },
            { descricao: { [Op.like]: `%${palavra}%` } },
            { conteudo: { [Op.like]: `%${palavra}%` } }
          ]
        }))
      };

      // Exclui o artigo atual
      if (excludeId) {
        whereConditions.id = { [Op.ne]: excludeId };
      }

      const artigos = await Article.findAll({
        where: whereConditions,
        attributes: ['id', 'titulo', 'descricao', 'categoria', 'urlAmigavel'],
        limit: 10,
        order: [['dataPublicacao', 'DESC']]
      });

      return artigos.map(a => ({
        id: a.id,
        titulo: a.titulo,
        descricao: a.descricao,
        url: `/${a.categoria}/${a.urlAmigavel}`
      }));

    } catch (error) {
      console.error('Erro ao buscar artigos relacionados:', error);
      return [];
    }
  }

  /**
   * Extrai palavras-chave relevantes do texto
   */
  static extractKeywords(texto) {
    // Remove palavras comuns (stop words)
    const stopWords = [
      'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das',
      'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem', 'sob',
      'e', 'ou', 'mas', 'que', 'se', 'como', 'quando', 'onde', 'porque',
      'é', 'são', 'foi', 'foram', 'ser', 'estar', 'ter', 'haver', 'fazer'
    ];

    const palavras = texto
      .toLowerCase()
      .replace(/[^\wáàâãéèêíïóôõöúçñ\s]/gi, '')
      .split(/\s+/)
      .filter(p => p.length > 3 && !stopWords.includes(p));

    // Conta frequência
    const frequencia = {};
    palavras.forEach(p => {
      frequencia[p] = (frequencia[p] || 0) + 1;
    });

    // Retorna as 10 palavras mais frequentes
    return Object.entries(frequencia)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([palavra]) => palavra);
  }

  /**
   * Usa IA para identificar as melhores oportunidades de link
   */
  static async identifyLinkOpportunities(conteudo, artigosRelacionados, maxLinks) {
    try {
      const prompt = `Você é um especialista em SEO e links internos. Analise o conteúdo abaixo e identifique os MELHORES trechos de texto para adicionar links internos.

CONTEÚDO DO ARTIGO:
${conteudo.substring(0, 3000)}

ARTIGOS DISPONÍVEIS PARA LINKAR:
${artigosRelacionados.map((a, i) => `${i + 1}. "${a.titulo}" - ${a.descricao} (URL: ${a.url})`).join('\n')}

INSTRUÇÕES:
1. Identifique até ${maxLinks} trechos de texto no conteúdo que mencionem temas dos artigos disponíveis
2. O trecho deve ser natural e fazer sentido contextualmente
3. Priorize trechos com 3-8 palavras
4. O trecho deve existir EXATAMENTE como está no conteúdo
5. Não invente trechos que não existem no texto

RESPONDA APENAS EM JSON (sem markdown, sem explicações):
[
  {
    "texto": "trecho exato do conteúdo para linkar",
    "url": "url do artigo relacionado",
    "titulo_artigo": "título do artigo relacionado"
  }
]

Se não encontrar boas oportunidades, retorne: []`;

      const messages = [
        { role: 'system', content: 'Você é um assistente especializado em SEO e links internos. Responda APENAS com JSON válido.' },
        { role: 'user', content: prompt }
      ];

      const resposta = await AIService.makeRequest(messages, 0.3, 1000);
      
      // Parse da resposta
      let links = [];
      try {
        // Remove markdown se houver
        let jsonText = resposta.trim();
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        }
        
        links = JSON.parse(jsonText);
        
        // Valida estrutura
        if (!Array.isArray(links)) {
          console.error('Resposta da IA não é um array');
          return [];
        }

        // Filtra apenas links válidos
        links = links.filter(link => 
          link.texto && 
          link.url && 
          link.texto.length > 5 &&
          link.texto.length < 150
        );

      } catch (parseError) {
        console.error('Erro ao fazer parse da resposta da IA:', parseError);
        console.log('Resposta recebida:', resposta);
        return [];
      }

      return links.slice(0, maxLinks);

    } catch (error) {
      console.error('Erro ao identificar oportunidades de link:', error);
      return [];
    }
  }

  /**
   * Insere um link no conteúdo HTML
   */
  static insertLink(conteudo, linkInfo) {
    try {
      const { texto, url, titulo_artigo } = linkInfo;
      
      // Escapa caracteres especiais para regex
      const textoEscapado = texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Cria regex para encontrar o texto (case insensitive, fora de tags HTML)
      const regex = new RegExp(`(?<![">])\\b${textoEscapado}\\b(?![^<]*>)`, 'i');
      
      // Verifica se o texto já está linkado
      if (conteudo.includes(`>${texto}<`)) {
        console.log(`Texto "${texto}" já está linkado, pulando...`);
        return conteudo;
      }

      // Substitui apenas a primeira ocorrência
      const linkHtml = `<a href="${url}" title="${titulo_artigo}" class="internal-link">${texto}</a>`;
      const conteudoAtualizado = conteudo.replace(regex, linkHtml);

      if (conteudoAtualizado === conteudo) {
        console.log(`Texto "${texto}" não encontrado no conteúdo`);
      } else {
        console.log(`✓ Link adicionado: "${texto}" -> ${url}`);
      }

      return conteudoAtualizado;

    } catch (error) {
      console.error('Erro ao inserir link:', error);
      return conteudo;
    }
  }
}

module.exports = InternalLinkingService;
