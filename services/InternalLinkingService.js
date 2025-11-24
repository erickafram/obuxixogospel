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
      // Melhoria: Exige que pelo menos uma palavra-chave esteja no título para maior relevância
      // ou que múltiplas palavras-chave estejam no conteúdo
      const whereConditions = {
        publicado: 1,
        [Op.or]: [
          // Prioridade: Palavra-chave no título (muito relevante)
          {
            [Op.or]: palavrasChave.map(palavra => ({
              titulo: { [Op.like]: `%${palavra}%` }
            }))
          },
          // Secundário: Palavra-chave na descrição
          {
            [Op.or]: palavrasChave.map(palavra => ({
              descricao: { [Op.like]: `%${palavra}%` }
            }))
          }
        ]
      };

      // Exclui o artigo atual
      if (excludeId) {
        whereConditions.id = { [Op.ne]: excludeId };
      }

      const artigos = await Article.findAll({
        where: whereConditions,
        attributes: ['id', 'titulo', 'descricao', 'categoria', 'urlAmigavel'],
        limit: 15, // Aumentei o limite para dar mais opções para a IA filtrar
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
    // Remove palavras comuns (stop words) gerais
    const stopWords = [
      'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das',
      'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem', 'sob',
      'e', 'ou', 'mas', 'que', 'se', 'como', 'quando', 'onde', 'porque',
      'é', 'são', 'foi', 'foram', 'ser', 'estar', 'ter', 'haver', 'fazer',
      'sobre', 'pelo', 'pela', 'entre', 'após', 'antes', 'durante'
    ];

    // Remove termos muito genéricos do nicho gospel que geram falsos positivos
    const gospelStopWords = [
      'igreja', 'deus', 'jesus', 'cristo', 'senhor', 'pastor', 'bispo', 'gospel',
      'evangelho', 'biblia', 'culto', 'fiéis', 'religião', 'sagrado', 'divino',
      'oração', 'louvor', 'adoração', 'ministério', 'altar', 'templo', 'mundo',
      'brasil', 'hoje', 'agora', 'notícia', 'polêmica', 'famoso', 'cantor', 'cantora'
    ];

    const allStopWords = [...stopWords, ...gospelStopWords];

    const palavras = texto
      .toLowerCase()
      .replace(/[^\wáàâãéèêíïóôõöúçñ\s]/gi, '')
      .split(/\s+/)
      .filter(p => p.length > 4 && !allStopWords.includes(p)); // Aumentei para > 4 chars

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
      const prompt = `Você é um especialista Sênior em SEO e Semântica. Sua tarefa é encontrar oportunidades de linkagem interna EXTREMAMENTE RELEVANTES.
Analise o conteúdo e os artigos disponíveis.

CONTEÚDO DO ARTIGO:
${conteudo.substring(0, 3000)}

ARTIGOS DISPONÍVEIS PARA LINKAR:
${artigosRelacionados.map((a, i) => `${i + 1}. "${a.titulo}" - ${a.descricao} (URL: ${a.url})`).join('\n')}

OBJETIVO:
Encontrar trechos no texto que possam servir de âncora para os artigos relacionados.

REGRAS CRÍTICAS (SIGA RIGOROSAMENTE):
1. RELEVÂNCIA TOTAL: Só crie um link se o artigo de destino for DIRETAMENTE relacionado ao assunto do trecho.
2. EVITE ASSOCIAÇÕES GENÉRICAS:
   - NÃO linke "Igreja Universal" para uma notícia sobre "Igreja Batista" ou "Nova Igreja" só porque ambas são igrejas.
   - NÃO linke "crise financeira" para uma notícia sobre "perda de seguidores" a menos que a notícia fale explicitamente de dinheiro.
3. ENTIDADES ESPECÍFICAS: Se o texto cita uma pessoa ou instituição específica (ex: "Andressa Urach"), dê preferência absoluta a artigos sobre ESSA pessoa.
4. TEXTO ÂNCORA NATURAL: O link deve fluir naturalmente no texto.
5. LIMITE: Identifique no MÁXIMO ${maxLinks} links. Se não houver nenhum link PERFEITO, retorne lista vazia. Melhor nenhum link do que um link ruim.

RESPONDA APENAS EM JSON:
[
  {
    "texto": "trecho exato do conteúdo",
    "url": "url do artigo relacionado",
    "titulo_artigo": "título do artigo relacionado"
  }
]

Se não houver links de alta qualidade, retorne: []`;

      const messages = [
        { role: 'system', content: 'Você é um assistente de SEO rigoroso. Responda APENAS com JSON válido. Se tiver dúvida sobre a relevância, NÃO faça o link.' },
        { role: 'user', content: prompt }
      ];

      // Temperatura baixa para ser mais conservador e preciso
      const resposta = await AIService.makeRequest(messages, 0.1, 1000);

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
          link.texto.length > 3 &&
          link.texto.length < 100
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
      const regex = new RegExp(`(?<![">\\w])${textoEscapado}(?![\\w<])`, 'i');

      // Verifica se o texto já está linkado
      if (conteudo.includes(`>${texto}<`) || conteudo.includes(`"${url}"`)) {
        console.log(`Texto "${texto}" ou URL já está linkado, pulando...`);
        return conteudo;
      }

      // Tenta encontrar no conteúdo
      const match = conteudo.match(regex);
      if (!match) {
        console.log(`Texto "${texto}" não encontrado no conteúdo (Regex falhou). Tentando busca simples...`);

        // Fallback para busca simples se regex falhar
        if (conteudo.toLowerCase().includes(texto.toLowerCase())) {
          const linkHtml = `<a href="${url}" title="${titulo_artigo}" class="internal-link" style="color: #e63946; text-decoration: underline; font-weight: 500;">${texto}</a>`;
          // Substitui apenas a primeira ocorrência case-insensitive
          const conteudoAtualizado = conteudo.replace(new RegExp(textoEscapado, 'i'), linkHtml);
          console.log(`✓ Link adicionado (Busca Simples): "${texto}" -> ${url}`);
          return conteudoAtualizado;
        }

        return conteudo;
      }

      // Substitui apenas a primeira ocorrência
      const linkHtml = `<a href="${url}" title="${titulo_artigo}" class="internal-link" style="color: #e63946; text-decoration: underline; font-weight: 500;">${match[0]}</a>`;
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
