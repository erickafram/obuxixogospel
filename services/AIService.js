const axios = require('axios');
const cheerio = require('cheerio');
const Parser = require('rss-parser');
const fetch = require('node-fetch');
const { SystemConfig } = require('../models');

class AIService {
  /**
   * Verifica se a IA está ativa
   */
  static async isActive() {
    const ativa = await SystemConfig.getConfig('ia_ativa');
    return ativa === 'true';
  }

  /**
   * Obtém as configurações da IA
   */
  static async getConfig() {
    const [apiKey, apiUrl, model] = await Promise.all([
      SystemConfig.getConfig('ia_api_key'),
      SystemConfig.getConfig('ia_api_url'),
      SystemConfig.getConfig('ia_model')
    ]);

    return { apiKey, apiUrl, model };
  }

  /**
   * Faz uma requisição para a API da IA
   */
  static async makeRequest(messages, temperature = 0.7, maxTokens = 2000) {
    const { apiKey, apiUrl, model } = await this.getConfig();

    if (!apiKey || !apiUrl || !model) {
      throw new Error('Configurações da IA não encontradas');
    }

    try {
      const response = await axios.post(
        apiUrl,
        {
          model: model,
          messages: messages,
          temperature: temperature,
          max_tokens: maxTokens
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60 segundos
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Erro na API da IA:', error.response?.data || error.message);
      throw new Error('Erro ao comunicar com a IA: ' + (error.response?.data?.error?.message || error.message));
    }
  }

  /**
   * Pesquisa informações na internet usando DuckDuckGo
   */
  static async pesquisarInternet(query) {
    try {
      // Usando DuckDuckGo HTML (gratuito, sem API key)
      const response = await axios.get('https://html.duckduckgo.com/html/', {
        params: { q: query },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const resultados = [];

      $('.result').slice(0, 5).each((i, elem) => {
        const titulo = $(elem).find('.result__title').text().trim();
        const snippet = $(elem).find('.result__snippet').text().trim();
        resultados.push({ titulo, snippet });
      });

      return resultados;
    } catch (error) {
      console.error('Erro ao pesquisar:', error.message);
      return [];
    }
  }

  /**
   * Extrai conteúdo de uma URL (incluindo Instagram)
   */
  static async extrairConteudoURL(url) {
    try {
      // Detectar se é Instagram
      if (url.includes('instagram.com')) {
        return await this.extrairConteudoInstagram(url);
      }

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);

      // Remover scripts e estilos
      $('script, style, nav, footer, header').remove();

      // Extrair texto principal
      const texto = $('article, main, .content, .post-content, .entry-content, body')
        .first()
        .text()
        .trim()
        .replace(/\s+/g, ' ')
        .substring(0, 2000); // Limitar a 2000 caracteres

      return texto;
    } catch (error) {
      console.error('Erro ao extrair conteúdo:', error.message);
      return '';
    }
  }

  /**
   * Extrai conteúdo do Instagram (texto da postagem + comentários)
   */
  static async extrairConteudoInstagram(url) {
    try {
      console.log('Extraindo conteúdo do Instagram:', url);
      
      // Método 1: Usar API pública do Instagram através de embed
      const postId = url.match(/\/p\/([^\/\?]+)|\/reel\/([^\/\?]+)/)?.[1] || url.match(/\/p\/([^\/\?]+)|\/reel\/([^\/\?]+)/)?.[2];
      
      if (postId) {
        // Método 1A: Tentar oEmbed API
        try {
          console.log('Tentando oEmbed API para post:', postId);
          const cleanUrl = `https://www.instagram.com/p/${postId}/`;
          const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(cleanUrl)}&omitscript=true`;
          const oembedResponse = await axios.get(oembedUrl, { 
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; bot/1.0)'
            }
          });
          
          if (oembedResponse.data && oembedResponse.data.title) {
            let conteudo = '\n\n📱 CONTEÚDO DO INSTAGRAM:\n\n';
            conteudo += `TEXTO DA POSTAGEM:\n${oembedResponse.data.title}\n\n`;
            
            if (oembedResponse.data.author_name) {
              conteudo += `AUTOR: ${oembedResponse.data.author_name}\n\n`;
            }
            
            console.log('✅ Conteúdo extraído via oEmbed:', conteudo.length, 'caracteres');
            return conteudo;
          }
        } catch (oembedError) {
          console.log('❌ oEmbed falhou:', oembedError.message);
        }
        
        // Método 1B: Tentar através de proxy público (allorigins.win)
        try {
          console.log('Tentando através de proxy AllOrigins');
          const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
          const proxyResponse = await axios.get(proxyUrl, { timeout: 15000 });
          
          if (proxyResponse.data && proxyResponse.data.contents) {
            const $ = cheerio.load(proxyResponse.data.contents);
            let conteudo = '\n\n📱 CONTEÚDO DO INSTAGRAM:\n\n';
            
            // Procurar por meta tags
            const description = $('meta[property="og:description"]').attr('content') || 
                               $('meta[name="description"]').attr('content');
            
            if (description && description.length > 50) {
              conteudo += `TEXTO DA POSTAGEM:\n${description}\n\n`;
              console.log('✅ Conteúdo extraído via proxy:', conteudo.length, 'caracteres');
              return conteudo;
            }
          }
        } catch (proxyError) {
          console.log('❌ Proxy falhou:', proxyError.message);
        }
        
        // Método 1C: Tentar através de outro proxy (corsproxy.io)
        try {
          console.log('Tentando através de proxy CORS');
          const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
          const corsResponse = await axios.get(corsProxyUrl, { 
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          const $ = cheerio.load(corsResponse.data);
          let conteudo = '\n\n📱 CONTEÚDO DO INSTAGRAM:\n\n';
          
          // Procurar por JSON embutido
          const scripts = $('script').toArray();
          for (const script of scripts) {
            const scriptContent = $(script).html();
            if (scriptContent && scriptContent.includes('window._sharedData')) {
              try {
                const jsonMatch = scriptContent.match(/window\._sharedData\s*=\s*({.+?});/);
                if (jsonMatch) {
                  const sharedData = JSON.parse(jsonMatch[1]);
                  const post = sharedData.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
                  
                  if (post && post.edge_media_to_caption?.edges?.[0]?.node?.text) {
                    conteudo += `TEXTO DA POSTAGEM:\n${post.edge_media_to_caption.edges[0].node.text}\n\n`;
                    
                    if (post.owner?.username) {
                      conteudo += `AUTOR: @${post.owner.username}\n\n`;
                    }
                    
                    console.log('✅ Conteúdo extraído via CORS proxy:', conteudo.length, 'caracteres');
                    return conteudo.substring(0, 3000);
                  }
                }
              } catch (e) {
                // Continuar tentando
              }
            }
          }
          
          // Tentar meta tags como fallback
          const description = $('meta[property="og:description"]').attr('content');
          if (description && description.length > 50) {
            conteudo += `TEXTO DA POSTAGEM:\n${description}\n\n`;
            console.log('✅ Conteúdo extraído via meta tags (CORS):', conteudo.length, 'caracteres');
            return conteudo;
          }
        } catch (corsError) {
          console.log('❌ CORS proxy falhou:', corsError.message);
        }
      }
      
      // Método 2: Tentar adicionar ?__a=1 ao URL para obter JSON
      try {
        console.log('Tentando obter JSON direto do Instagram');
        const jsonUrl = url.includes('?') ? `${url}&__a=1` : `${url}?__a=1`;
        
        const jsonResponse = await axios.get(jsonUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
            'Accept': '*/*',
            'Accept-Language': 'pt-BR,pt;q=0.9'
          },
          timeout: 15000
        });
        
        if (jsonResponse.data && jsonResponse.data.graphql) {
          const post = jsonResponse.data.graphql.shortcode_media;
          let conteudo = '\n\n📱 CONTEÚDO DO INSTAGRAM:\n\n';
          
          if (post.edge_media_to_caption?.edges?.[0]?.node?.text) {
            conteudo += `TEXTO DA POSTAGEM:\n${post.edge_media_to_caption.edges[0].node.text}\n\n`;
          }
          
          if (post.owner?.username) {
            conteudo += `AUTOR: @${post.owner.username}\n\n`;
          }
          
          console.log('✅ Conteúdo extraído via JSON:', conteudo.length, 'caracteres');
          return conteudo.substring(0, 3000);
        }
      } catch (jsonError) {
        console.log('❌ Método JSON falhou:', jsonError.message);
      }
      
      // Método 3: Scraping HTML tradicional
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cookie': 'sessionid=; csrftoken='
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      let conteudo = '\n\n📱 CONTEÚDO DO INSTAGRAM:\n\n';
      
      // Procurar por JSON embutido no HTML
      const scripts = $('script').toArray();
      for (const script of scripts) {
        const scriptContent = $(script).html();
        if (scriptContent && scriptContent.includes('window._sharedData')) {
          try {
            const jsonMatch = scriptContent.match(/window\._sharedData\s*=\s*({.+?});/);
            if (jsonMatch) {
              const sharedData = JSON.parse(jsonMatch[1]);
              const post = sharedData.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
              
              if (post) {
                if (post.edge_media_to_caption?.edges?.[0]?.node?.text) {
                  conteudo += `TEXTO DA POSTAGEM:\n${post.edge_media_to_caption.edges[0].node.text}\n\n`;
                }
                
                if (post.owner?.username) {
                  conteudo += `AUTOR: @${post.owner.username}\n\n`;
                }
                
                console.log('Conteúdo extraído via _sharedData:', conteudo.length, 'caracteres');
                return conteudo.substring(0, 3000);
              }
            }
          } catch (e) {
            // Continuar tentando outros métodos
          }
        }
      }
      
      // Método 4: Extrair de meta tags
      const description = $('meta[property="og:description"]').attr('content') || 
                         $('meta[name="description"]').attr('content');
      if (description && description.length > 50) {
        conteudo += `DESCRIÇÃO:\n${description}\n\n`;
        console.log('Conteúdo extraído via meta tags:', conteudo.length, 'caracteres');
        return conteudo;
      }
      
      console.log('Nenhum método funcionou, retornando mensagem de erro');
      return '\n\n📱 Não foi possível extrair o conteúdo automaticamente do Instagram.\n\nPor favor, copie o texto da postagem e cole no campo "Cole o Texto da Postagem".\n';
      
    } catch (error) {
      console.error('Erro ao extrair Instagram:', error.message);
      return '\n\n📱 Não foi possível extrair o conteúdo automaticamente do Instagram.\n\nPor favor, copie o texto da postagem e cole no campo "Cole o Texto da Postagem".\n';
    }
  }

  /**
   * Busca notícias atuais usando Google News RSS
   */
  static async buscarNoticiasAtuais(query) {
    try {
      const parser = new Parser();
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
      
      const feed = await parser.parseURL(url);
      const noticias = feed.items.slice(0, 5).map(item => ({
        titulo: item.title,
        descricao: item.contentSnippet || item.content,
        link: item.link,
        data: item.pubDate
      }));
      
      return noticias;
    } catch (error) {
      console.error('Erro ao buscar notícias:', error.message);
      return [];
    }
  }

  /**
   * Busca imagens relacionadas ao tema usando Unsplash API (gratuita)
   */
  static async buscarImagensSugeridas(query) {
    try {
      // Unsplash API gratuita (sem necessidade de key para busca básica)
      // Alternativa: usar Pexels API que também é gratuita
      const response = await fetch(
        `https://source.unsplash.com/1200x630/?${encodeURIComponent(query)},gospel,church,christian`,
        { redirect: 'manual' }
      );
      
      // A URL de redirecionamento é a imagem
      const imageUrl = response.headers.get('location');
      
      if (imageUrl) {
        return [{
          url: imageUrl,
          descricao: `Imagem relacionada a: ${query}`,
          fonte: 'Unsplash'
        }];
      }
      
      // Fallback: buscar usando Pexels API (gratuita, mas precisa de key)
      // Por enquanto, retornar array vazio se Unsplash falhar
      return [];
    } catch (error) {
      console.error('Erro ao buscar imagens:', error.message);
      return [];
    }
  }

  /**
   * Busca imagens usando Bing Image Search (mais permissivo que Google)
   */
  static async buscarImagensPexels(query) {
    try {
      console.log('Buscando imagens no Bing para:', query);
      
      // Bing Image Search - mais permissivo que Google
      const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=1&count=10`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9',
          'Referer': 'https://www.bing.com/'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const imagens = [];
      
      // Método 1: Extrair de atributo m (metadata JSON do Bing)
      $('a.iusc').each((i, elem) => {
        if (imagens.length >= 5) return false;
        
        const m = $(elem).attr('m');
        if (m) {
          try {
            const metadata = JSON.parse(m);
            if (metadata.murl) {
              imagens.push({
                url: metadata.murl,
                thumbnail: metadata.turl || metadata.murl,
                descricao: metadata.t || `Imagem relacionada a ${query}`,
                fonte: 'Bing Images'
              });
            }
          } catch (e) {
            // Ignorar erros de parse
          }
        }
      });
      
      console.log('Imagens do Bing encontradas:', imagens.length);
      
      if (imagens.length > 0) {
        return imagens;
      }
      
      // Método 2: Fallback - extrair de tags img
      $('img.mimg').each((i, elem) => {
        if (imagens.length >= 5) return false;
        
        const src = $(elem).attr('src');
        if (src && src.startsWith('http')) {
          imagens.push({
            url: src,
            thumbnail: src,
            descricao: `Imagem relacionada a ${query}`,
            fonte: 'Bing Images'
          });
        }
      });
      
      console.log('Total de imagens encontradas:', imagens.length);
      
      if (imagens.length > 0) {
        return imagens;
      }
      
      // Se não encontrou imagens do Google, usar fallback
      console.log('Nenhuma imagem encontrada no Google, usando fallback...');
      
      // Fallback: usar Picsum
      const imagensFallback = [];
      for (let i = 0; i < 5; i++) {
        const randomId = 100 + Math.floor(Math.random() * 900);
        imagensFallback.push({
          url: `https://picsum.photos/800/600?random=${randomId}`,
          thumbnail: `https://picsum.photos/200/150?random=${randomId}`,
          descricao: `Imagem ${i + 1}`,
          fonte: 'Picsum'
        });
      }
      return imagensFallback;
      
    } catch (error) {
      console.error('Erro ao buscar imagens do Google:', error.message);
      
      // Fallback: retornar imagens do Picsum
      try {
        console.log('Usando imagens genéricas de fallback (Picsum)');
        const imagens = [];
        
        for (let i = 0; i < 5; i++) {
          const randomId = 200 + Math.floor(Math.random() * 800);
          imagens.push({
            url: `https://picsum.photos/800/600?random=${randomId}`,
            thumbnail: `https://picsum.photos/200/150?random=${randomId}`,
            descricao: `Imagem ${i + 1}`,
            fonte: 'Picsum'
          });
        }
        
        console.log('Imagens fallback geradas:', imagens.length);
        return imagens;
      } catch (fallbackError) {
        console.error('Erro no fallback:', fallbackError.message);
        // Retornar array vazio como último recurso
        return [];
      }
    }
  }

  /**
   * Extrai palavras-chave principais de um título para busca de imagens
   */
  static extrairPalavrasChave(titulo) {
    // Palavras a remover (conectores, artigos, etc)
    const stopWords = [
      'a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas',
      'com', 'para', 'por', 'que', 'e', 'um', 'uma', 'uns', 'umas', 'ao', 'à', 'aos', 'às',
      'pelo', 'pela', 'pelos', 'pelas', 'seu', 'sua', 'seus', 'suas', 'após', 'sobre',
      'durante', 'entre', 'sem', 'sob', 'até', 'desde', 'quando', 'onde', 'como', 'porque',
      'mas', 'ou', 'se', 'já', 'mais', 'muito', 'muita', 'muitos', 'muitas', 'todo', 'toda',
      'todos', 'todas', 'outro', 'outra', 'outros', 'outras', 'mesmo', 'mesma', 'mesmos', 'mesmas',
      'qual', 'quais', 'quanto', 'quanta', 'quantos', 'quantas', 'esse', 'essa', 'esses', 'essas',
      'este', 'esta', 'estes', 'estas', 'aquele', 'aquela', 'aqueles', 'aquelas', 'isto', 'isso', 'aquilo',
      'jovem', 'nova', 'novo', 'novas', 'novos', 'brasil', 'brasileira', 'brasileiro', 'brasileiras', 'brasileiros'
    ];
    
    // Remover pontuação e converter para minúsculas
    let palavras = titulo
      .toLowerCase()
      .replace(/[:\-–—,;.!?()[\]{}'"]/g, ' ')
      .split(/\s+/)
      .filter(p => p.length > 2 && !stopWords.includes(p));
    
    // Priorizar nomes próprios (começam com maiúscula no título original)
    const palavrasOriginais = titulo.split(/\s+/);
    const nomeProprio = [];
    
    for (let i = 0; i < palavrasOriginais.length; i++) {
      const palavra = palavrasOriginais[i];
      // Se começa com maiúscula e não é a primeira palavra (que sempre é maiúscula)
      if (i > 0 && palavra.length > 2 && palavra[0] === palavra[0].toUpperCase()) {
        nomeProprio.push(palavra);
        // Se próxima palavra também é maiúscula, adicionar (nome composto)
        if (i + 1 < palavrasOriginais.length && 
            palavrasOriginais[i + 1][0] === palavrasOriginais[i + 1][0].toUpperCase()) {
          nomeProprio.push(palavrasOriginais[i + 1]);
          i++; // Pular próxima
        }
      }
    }
    
    // Se encontrou nome próprio, usar ele + primeiras palavras relevantes
    if (nomeProprio.length > 0) {
      const nomeCompleto = nomeProprio.join(' ');
      const palavrasExtras = palavras.slice(0, 2).join(' ');
      return `${nomeCompleto} ${palavrasExtras}`.trim().substring(0, 100);
    }
    
    // Caso contrário, pegar as 3-4 primeiras palavras relevantes
    return palavras.slice(0, 4).join(' ').substring(0, 100);
  }

  /**
   * Cria uma matéria baseada em texto colado (Instagram, Facebook, etc)
   */
  static async criarMateriaPorTexto(texto, categoria = 'Notícias', linkReferencia = '') {
    if (!await this.isActive()) {
      throw new Error('O assistente de IA está desativado');
    }

    // Buscar imagens baseadas no texto
    console.log('Buscando imagens baseadas no texto fornecido');
    
    // Limpar o texto de metadados e ruído
    let textoLimpo = texto
      .replace(/\d+,?\d* likes,/g, '') // Remove "5,044 likes,"
      .replace(/\d+,?\d* comments/g, '') // Remove "818 comments"
      .replace(/@\w+/g, '') // Remove @mentions
      .replace(/\d{4}-\d{2}-\d{2}/g, '') // Remove datas
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();
    
    const palavrasParaImagem = textoLimpo.substring(0, 300);
    console.log('Palavras-chave para busca de imagens:', palavrasParaImagem.substring(0, 100) + '...');
    
    const imagensSugeridas = await this.buscarImagensPexels(palavrasParaImagem);

    const prompt = `Você é um jornalista gospel profissional.

⚠️ IMPORTANTE: Crie uma matéria jornalística baseada EXCLUSIVAMENTE no texto fornecido abaixo.
NÃO invente informações. Use APENAS os fatos, declarações e detalhes presentes no texto.

INSTRUÇÕES:
- Reescreva o texto em formato de matéria jornalística profissional
- Mantenha TODOS os fatos, nomes, declarações e detalhes do texto original
- Use estilo editorial do G1: objetivo, claro e informativo
- Inclua citações diretas quando houver no texto
- Organize em introdução, desenvolvimento e conclusão
- NÃO adicione informações que não estejam no texto fornecido
- Use apenas uma quebra de linha entre parágrafos (<br>)

CATEGORIA: ${categoria}
${linkReferencia ? `LINK DE REFERÊNCIA: ${linkReferencia}` : ''}

TEXTO FORNECIDO:
${texto}

ESTRUTURA OBRIGATÓRIA:

1. TÍTULO (máximo 80 caracteres):
   - Impactante e claro que resume o tema principal do texto

2. DESCRIÇÃO (máximo 160 caracteres):
   - Resumo objetivo do conteúdo

3. CONTEÚDO EM HTML:
   - Use tags: <p>, <h2>, <h3>, <strong>, <em>, <blockquote>
   - Introdução com contexto
   - Desenvolvimento com todos os detalhes do texto
   - Citações diretas se houver
   - Conclusão
   - Use <br> para quebras de linha (apenas uma vez)
   - Mínimo 300 palavras

IMPORTANTE: Retorne APENAS um objeto JSON válido no formato:
{
  "titulo": "título da matéria",
  "descricao": "descrição curta",
  "conteudo": "HTML completo em uma única linha"
}`;

    const messages = [
      {
        role: 'system',
        content: 'Você é um assistente especializado em criar conteúdo jornalístico gospel de alta qualidade baseado em textos fornecidos.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const response = await this.makeRequest(messages, 0.7, 3000);
    
    // Parse da resposta
    try {
      let jsonStr = response.trim();
      
      // Remover blocos de código markdown se houver
      if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      
      // Remover quebras de linha dentro do JSON
      jsonStr = jsonStr.replace(/\n/g, ' ');
      
      // Tentar parsear
      const resultado = JSON.parse(jsonStr);
      
      // Extrair palavras-chave do título e buscar imagens
      const palavrasChave = this.extrairPalavrasChave(resultado.titulo);
      console.log('🔍 Título completo:', resultado.titulo);
      console.log('🔑 Palavras-chave extraídas:', palavrasChave);
      console.log('📸 Buscando imagens no Bing...');
      
      const imagensRelevantes = await this.buscarImagensPexels(palavrasChave);
      
      // Adicionar imagens sugeridas (prioriza as baseadas no título)
      resultado.imagensSugeridas = imagensRelevantes.length > 0 ? imagensRelevantes : imagensSugeridas;
      
      return resultado;
    } catch (error) {
      console.error('Erro ao parsear JSON:', error);
      console.log('Resposta da IA:', response);
      
      // Tentar extrair manualmente
      const tituloMatch = response.match(/"titulo":\s*"([^"]+)"/);
      const descricaoMatch = response.match(/"descricao":\s*"([^"]+)"/);
      const conteudoMatch = response.match(/"conteudo":\s*"([\s\S]+?)"\s*}/);
      
      if (tituloMatch && descricaoMatch && conteudoMatch) {
        // Extrair palavras-chave e buscar imagens
        const palavrasChave = this.extrairPalavrasChave(tituloMatch[1]);
        console.log('🔍 Título extraído:', tituloMatch[1]);
        console.log('🔑 Palavras-chave:', palavrasChave);
        const imagensRelevantes = await this.buscarImagensPexels(palavrasChave);
        
        return {
          titulo: tituloMatch[1],
          descricao: descricaoMatch[1],
          conteudo: conteudoMatch[1],
          imagensSugeridas: imagensRelevantes.length > 0 ? imagensRelevantes : imagensSugeridas
        };
      }
      
      throw new Error('Não foi possível processar a resposta da IA');
    }
  }

  /**
   * Cria uma matéria completa baseada em um tema
   */
  static async criarMateria(tema, categoria = 'Notícias', palavrasChave = '', pesquisarInternet = false, links = []) {
    if (!await this.isActive()) {
      throw new Error('O assistente de IA está desativado');
    }

    // Coletar informações adicionais
    let informacoesAdicionais = '';
    let imagensSugeridas = [];
    
    // Pesquisar na internet se solicitado
    if (pesquisarInternet) {
      console.log('Pesquisando notícias atuais:', tema);
      
      // Buscar notícias atuais do Google News
      const noticias = await this.buscarNoticiasAtuais(tema + ' gospel evangélico');
      if (noticias.length > 0) {
        informacoesAdicionais += '\n\nNOTÍCIAS ATUAIS (Google News):\n';
        noticias.forEach((n, i) => {
          informacoesAdicionais += `${i + 1}. ${n.titulo}\n`;
          informacoesAdicionais += `   ${n.descricao}\n`;
          informacoesAdicionais += `   Data: ${n.data}\n\n`;
        });
      }
      
      // Buscar também no DuckDuckGo como fallback
      const resultados = await this.pesquisarInternet(tema + ' gospel evangélico');
      if (resultados.length > 0) {
        informacoesAdicionais += '\n\nINFORMAÇÕES ADICIONAIS:\n';
        resultados.forEach((r, i) => {
          informacoesAdicionais += `${i + 1}. ${r.titulo}\n${r.snippet}\n\n`;
        });
      }
      
      // Buscar imagens sugeridas
      console.log('Buscando imagens sugeridas:', tema);
      const imagensPixabay = await this.buscarImagensPexels(tema);
      if (imagensPixabay.length > 0) {
        imagensSugeridas = imagensPixabay;
      } else {
        // Fallback para Unsplash
        const imagensUnsplash = await this.buscarImagensSugeridas(tema);
        if (imagensUnsplash.length > 0) {
          imagensSugeridas = imagensUnsplash;
        }
      }
    }
    
    // Extrair conteúdo dos links fornecidos
    let conteudoExtraido = '';
    if (links && links.length > 0) {
      console.log('Extraindo conteúdo de', links.length, 'links');
      
      for (const link of links) {
        const conteudo = await this.extrairConteudoURL(link);
        if (conteudo) {
          conteudoExtraido += `\n${conteudo}\n\n`;
        }
      }
      
      // Verificar se a extração falhou (retornou mensagem de erro)
      if (conteudoExtraido.includes('Não foi possível extrair o conteúdo automaticamente')) {
        throw new Error('Não foi possível extrair o conteúdo do link automaticamente. Por favor, use a aba "Por Link" e cole o texto manualmente no campo opcional.');
      }
      
      // Se tem conteúdo extraído, adicionar com destaque
      if (conteudoExtraido && conteudoExtraido.length > 100) {
        informacoesAdicionais += '\n\n⚠️ IMPORTANTE - USE ESTE CONTEÚDO COMO BASE PRINCIPAL:\n';
        informacoesAdicionais += `Fonte: ${links[0]}\n${conteudoExtraido}`;
        
        // Buscar imagens baseadas no conteúdo extraído
        if (!pesquisarInternet) {
          console.log('Buscando imagens baseadas no conteúdo extraído');
          
          // Extrair palavras-chave mais relevantes do conteúdo
          let textoLimpo = conteudoExtraido
            .replace(/📱 CONTEÚDO DO INSTAGRAM:/g, '')
            .replace(/TEXTO DA POSTAGEM:/g, '')
            .replace(/AUTOR:/g, '')
            .replace(/COMENTÁRIOS DESTACADOS:/g, '')
            .replace(/\d+,?\d* likes,/g, '') // Remove "5,044 likes,"
            .replace(/\d+,?\d* comments/g, '') // Remove "818 comments"
            .replace(/@\w+/g, '') // Remove @mentions
            .replace(/\d{4}-\d{2}-\d{2}/g, '') // Remove datas
            .replace(/\s+/g, ' ') // Normaliza espaços
            .trim();
          
          // Pegar as primeiras palavras significativas (após limpeza)
          const palavrasParaImagem = textoLimpo.substring(0, 300);
          
          console.log('Palavras-chave para busca de imagens:', palavrasParaImagem.substring(0, 100) + '...');
          
          const imagensBing = await this.buscarImagensPexels(palavrasParaImagem);
          if (imagensBing.length > 0) {
            imagensSugeridas = imagensBing;
          }
        }
      } else if (links.length > 0) {
        // Se não conseguiu extrair nada útil
        throw new Error('Não foi possível extrair conteúdo suficiente do link. Por favor, use a aba "Por Link" e cole o texto manualmente.');
      }
    }

    // Ajustar prompt baseado se tem conteúdo extraído ou não
    let promptInstrucao = '';
    if (conteudoExtraido) {
      promptInstrucao = `Você é um jornalista gospel profissional. 

⚠️ IMPORTANTE: Crie uma matéria jornalística baseada EXCLUSIVAMENTE no conteúdo fornecido abaixo. 
NÃO invente informações. Use APENAS os fatos, declarações e detalhes presentes no conteúdo extraído.

INSTRUÇÕES:
- Reescreva o conteúdo em formato de matéria jornalística profissional
- Mantenha TODOS os fatos, nomes, declarações e detalhes do conteúdo original
- Use estilo editorial do G1: objetivo, claro e informativo
- Inclua citações diretas quando houver no conteúdo
- Organize em introdução, desenvolvimento e conclusão
- NÃO adicione informações que não estejam no conteúdo fornecido`;
    } else {
      promptInstrucao = `Você é um jornalista gospel profissional. Crie uma matéria jornalística sobre o tema abaixo, seguindo o estilo editorial do portal G1, mas sem copiar trechos.`;
    }

    const prompt = `${promptInstrucao}

TEMA: ${tema}
CATEGORIA: ${categoria}
${palavrasChave ? `PALAVRAS-CHAVE: ${palavrasChave}` : ''}
${informacoesAdicionais ? `\n${informacoesAdicionais}` : ''}

ESTRUTURA OBRIGATÓRIA:

1. TÍTULO (máximo 80 caracteres):
   - Impactante e claro que resume o tema principal
   - Direto ao ponto

2. DESCRIÇÃO/RESUMO (máximo 160 caracteres):
   - Breve introdução reforçando os principais fatos
   - Linguagem simples e direta

3. CONTEÚDO HTML (mínimo 500 palavras):
   
   a) CONTEXTUALIZAÇÃO (2-3 parágrafos):
      - Explique rapidamente o que aconteceu
      - Quando, onde e quem são os envolvidos
      - Use frases curtas e variadas
      - Misture frases longas e curtas para ritmo natural
   
   b) CITAÇÕES DIRETAS E TESTEMUNHOS (obrigatório):
      - Inclua pelo menos 2-3 citações diretas entre aspas
      - Use <blockquote> para depoimentos mais longos
      - Falas humanas e autênticas (ex: "Isso mudou minha vida", disse Maria)
      - Aproxime o leitor com emoção e realidade
   
   c) DADOS + PERCEPÇÕES HUMANAS:
      - Misture dados concretos com sensações coletivas
      - Exemplo: "O número de participantes dobrou. 'A igreja está cheia', comenta João"
      - Inclua exemplos cotidianos específicos (bairros, cidades, situações reais)
   
   d) CONSEQUÊNCIAS E PRÓXIMAS ETAPAS:
      - Use <h3> para subtítulos explicativos
      - Use <strong> apenas para informações realmente importantes
      - Varie os conectores (além disso, por outro lado, enquanto isso, etc.)
   
   e) EXPLICAÇÕES NATURAIS:
      - Evite jargões técnicos ou explique de forma simples
      - Use linguagem cotidiana ("busca por respostas" ao invés de "busca por espiritualidade e significado")
      - Tom conversacional mas profissional
   
   f) IMPACTO PESSOAL E FECHAMENTO:
      - Como isso afeta as pessoas comuns
      - Tom acolhedor e próximo
      - Finalize com perspectiva ou reflexão

DIRETRIZES DE NATURALIDADE:
- VARIE o tamanho das frases (curtas, médias, longas)
- USE conectores variados (além disso, enquanto isso, por outro lado, no entanto)
- INCLUA exemplos cotidianos específicos ("No bairro Jardim das Flores, por exemplo...")
- MISTURE dados objetivos com falas humanas
- EVITE tom excessivamente didático ou formal
- USE citações diretas frequentemente
- QUEBRE parágrafos longos em menores (máximo 4-5 linhas cada)
- TOM jornalístico mas acessível e humano

FORMATAÇÃO:
- Use <p></p> para CADA parágrafo
- Use <br> (UMA quebra apenas) entre parágrafos para espaçamento
- Máximo 3-4 frases por parágrafo
- Use <h3> para subtítulos de seções
- Use <blockquote> para citações destacadas
- Use <strong> com moderação (só o essencial)

TAGS HTML PERMITIDAS: <p>, <h2>, <h3>, <strong>, <em>, <blockquote>, <ul>, <li>, <br>

IMPORTANTE: O conteúdo HTML deve estar em UMA ÚNICA LINHA (sem quebras de linha reais, apenas tags HTML).

Retorne APENAS um objeto JSON válido:
{"titulo": "título da matéria", "descricao": "descrição curta", "conteudo": "HTML completo em uma linha com <br> entre parágrafos"}`;

    const messages = [
      {
        role: 'system',
        content: 'Você é um assistente especializado em criar conteúdo jornalístico gospel de alta qualidade.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const response = await this.makeRequest(messages, 0.7, 3000);
    
    try {
      // Limpar a resposta removendo markdown code blocks se existirem
      let cleanResponse = response.trim();
      
      // Remover ```json e ``` se existirem
      cleanResponse = cleanResponse.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
      
      // Tentar extrair JSON da resposta
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let jsonStr = jsonMatch[0];
        
        // Tentar parsear diretamente primeiro
        try {
          const parsed = JSON.parse(jsonStr);
          
          // Validar se tem os campos necessários
          if (parsed.titulo && parsed.descricao && parsed.conteudo) {
            // Extrair palavras-chave do título e buscar imagens
            const palavrasChave = this.extrairPalavrasChave(parsed.titulo);
            console.log('🔍 Título completo:', parsed.titulo);
            console.log('🔑 Palavras-chave extraídas:', palavrasChave);
            console.log('📸 Buscando imagens no Bing...');
            
            const imagensRelevantes = await this.buscarImagensPexels(palavrasChave);
            
            // Adicionar imagens sugeridas ao resultado (prioriza as baseadas no título)
            return {
              ...parsed,
              imagensSugeridas: imagensRelevantes.length > 0 ? imagensRelevantes : imagensSugeridas
            };
          }
        } catch (parseError) {
          // Se falhar, tentar limpar quebras de linha dentro das strings
          console.log('Primeira tentativa de parse falhou, tentando limpar...');
          
          // Remover TODAS as quebras de linha do JSON
          jsonStr = jsonStr.replace(/\n/g, ' ').replace(/\r/g, '');
          
          // Limpar múltiplos espaços
          jsonStr = jsonStr.replace(/\s+/g, ' ');
          
          // Tentar parsear novamente
          try {
            const parsed = JSON.parse(jsonStr);
            
            // Validar se tem os campos necessários
            if (parsed.titulo && parsed.descricao && parsed.conteudo) {
              // Extrair palavras-chave do título e buscar imagens
              const palavrasChave = this.extrairPalavrasChave(parsed.titulo);
              console.log('🔍 Título completo (2ª tentativa):', parsed.titulo);
              console.log('🔑 Palavras-chave extraídas:', palavrasChave);
              console.log('📸 Buscando imagens no Bing...');
              
              const imagensRelevantes = await this.buscarImagensPexels(palavrasChave);
              
              // Adicionar imagens sugeridas ao resultado (prioriza as baseadas no título)
              return {
                ...parsed,
                imagensSugeridas: imagensRelevantes.length > 0 ? imagensRelevantes : imagensSugeridas
              };
            }
          } catch (secondError) {
            console.error('Segunda tentativa falhou:', secondError.message);
            
            // Última tentativa: extrair manualmente
            try {
              const tituloMatch = jsonStr.match(/"titulo"\s*:\s*"([^"]+)"/);
              const descricaoMatch = jsonStr.match(/"descricao"\s*:\s*"([^"]+)"/);
              const conteudoMatch = jsonStr.match(/"conteudo"\s*:\s*"(.+)"\s*\}/);
              
              if (tituloMatch && descricaoMatch && conteudoMatch) {
                // Extrair palavras-chave e buscar imagens
                const palavrasChave = this.extrairPalavrasChave(tituloMatch[1]);
                console.log('🔍 Título extraído manualmente:', tituloMatch[1]);
                console.log('🔑 Palavras-chave:', palavrasChave);
                console.log('📸 Buscando imagens no Bing...');
                
                const imagensRelevantes = await this.buscarImagensPexels(palavrasChave);
                
                return {
                  titulo: tituloMatch[1],
                  descricao: descricaoMatch[1],
                  conteudo: conteudoMatch[1],
                  imagensSugeridas: imagensRelevantes.length > 0 ? imagensRelevantes : imagensSugeridas
                };
              }
            } catch (manualError) {
              console.error('Extração manual falhou:', manualError.message);
            }
          }
        }
      }
      
      throw new Error('Resposta da IA não está no formato esperado');
    } catch (error) {
      console.error('Erro ao parsear resposta da IA:', error.message);
      console.error('Resposta recebida (primeiros 500 chars):', response.substring(0, 500));
      throw new Error('Erro ao processar resposta da IA');
    }
  }

  /**
   * Corrige erros de português em um texto
   */
  static async corrigirTexto(texto, tipo = 'conteudo') {
    if (!await this.isActive()) {
      throw new Error('O assistente de IA está desativado');
    }

    const tipoTexto = {
      'titulo': 'título',
      'descricao': 'descrição',
      'conteudo': 'conteúdo'
    }[tipo] || 'texto';

    const prompt = `Você é um revisor de textos especializado em português brasileiro.

Corrija o seguinte ${tipoTexto}, mantendo o sentido original:

${texto}

REGRAS:
- Corrija erros de ortografia, gramática e pontuação
- Melhore a clareza e fluidez do texto
- Mantenha o tom e estilo original
- Se for HTML, preserve todas as tags
- Não adicione informações novas
- Retorne APENAS o texto corrigido, sem explicações

TEXTO CORRIGIDO:`;

    const messages = [
      {
        role: 'system',
        content: 'Você é um revisor profissional de textos em português brasileiro.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    return await this.makeRequest(messages, 0.3, 2000);
  }

  /**
   * Gera sugestões de título baseado no conteúdo
   */
  static async sugerirTitulos(conteudo, quantidade = 3) {
    if (!await this.isActive()) {
      throw new Error('O assistente de IA está desativado');
    }

    const prompt = `Com base no seguinte conteúdo, sugira ${quantidade} títulos atrativos e informativos (máximo 80 caracteres cada):

${conteudo.substring(0, 500)}...

Retorne APENAS os títulos, um por linha, sem numeração.`;

    const messages = [
      {
        role: 'system',
        content: 'Você é um especialista em criar títulos jornalísticos atrativos.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const response = await this.makeRequest(messages, 0.8, 500);
    return response.split('\n').filter(t => t.trim()).slice(0, quantidade);
  }

  /**
   * Gera uma descrição/resumo baseado no conteúdo
   */
  static async gerarDescricao(conteudo) {
    if (!await this.isActive()) {
      throw new Error('O assistente de IA está desativado');
    }

    const prompt = `Crie uma descrição curta e atrativa (máximo 160 caracteres) para o seguinte conteúdo:

${conteudo.substring(0, 500)}...

Retorne APENAS a descrição, sem explicações.`;

    const messages = [
      {
        role: 'system',
        content: 'Você é um especialista em criar descrições concisas e atrativas.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    return await this.makeRequest(messages, 0.7, 200);
  }
}

module.exports = AIService;
