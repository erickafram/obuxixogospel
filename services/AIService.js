const axios = require('axios');
const cheerio = require('cheerio');
const Parser = require('rss-parser');
const fetch = require('node-fetch');
const { SystemConfig } = require('../models');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const FormData = require('form-data');
const { igApi } = require('insta-fetcher');

// Configurar caminho do ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

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
   * Retorna objeto com texto e imagem (se for artigo/matéria)
   */
  static async extrairConteudoURL(url) {
    try {
      // Detectar se é Instagram
      if (url.includes('instagram.com')) {
        const conteudo = await this.extrairConteudoInstagram(url);
        return { texto: conteudo, imagem: null };
      }

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);

      // Tentar extrair imagem destaque de artigo/matéria
      const imagemDestaque = await this.extrairImagemDestaque($, url);

      // Remover scripts e estilos
      $('script, style, nav, footer, header').remove();

      // Extrair texto principal
      const texto = $('article, main, .content, .post-content, .entry-content, body')
        .first()
        .text()
        .trim()
        .replace(/\s+/g, ' ')
        .substring(0, 2000); // Limitar a 2000 caracteres

      return { texto, imagem: imagemDestaque };
    } catch (error) {
      console.error('Erro ao extrair conteúdo:', error.message);
      return { texto: '', imagem: null };
    }
  }

  /**
   * Extrai imagem destaque de um artigo/matéria
   */
  static async extrairImagemDestaque($, urlBase) {
    try {
      let imagemUrl = null;

      // Método 1: Open Graph image (mais confiável)
      imagemUrl = $('meta[property="og:image"]').attr('content') ||
        $('meta[property="og:image:secure_url"]').attr('content');

      // Método 2: Twitter Card image
      if (!imagemUrl) {
        imagemUrl = $('meta[name="twitter:image"]').attr('content') ||
          $('meta[name="twitter:image:src"]').attr('content');
      }

      // Método 3: Schema.org image
      if (!imagemUrl) {
        const schemaScript = $('script[type="application/ld+json"]').html();
        if (schemaScript) {
          try {
            const schema = JSON.parse(schemaScript);
            imagemUrl = schema.image?.url || schema.image || schema.thumbnailUrl;
          } catch (e) {
            // Ignorar erro de parse
          }
        }
      }

      // Método 4: Link rel="image_src"
      if (!imagemUrl) {
        imagemUrl = $('link[rel="image_src"]').attr('href');
      }

      // Método 5: Primeira imagem grande no artigo
      if (!imagemUrl) {
        const primeiraImagem = $('article img, .post-content img, .entry-content img, main img').first();
        imagemUrl = primeiraImagem.attr('src') || primeiraImagem.attr('data-src');
      }

      // Se encontrou imagem, normalizar URL
      if (imagemUrl) {
        // Se for URL relativa, converter para absoluta
        if (imagemUrl.startsWith('/')) {
          const urlObj = new URL(urlBase);
          imagemUrl = `${urlObj.protocol}//${urlObj.host}${imagemUrl}`;
        } else if (!imagemUrl.startsWith('http')) {
          const urlObj = new URL(urlBase);
          imagemUrl = `${urlObj.protocol}//${urlObj.host}/${imagemUrl}`;
        }

        // Validar se é uma imagem válida (não é ícone pequeno)
        if (imagemUrl.includes('icon') || imagemUrl.includes('logo') || imagemUrl.includes('avatar')) {
          console.log('Imagem ignorada (parece ser ícone/logo):', imagemUrl);
          return null;
        }

        console.log('✅ Imagem destaque encontrada:', imagemUrl);
        return imagemUrl;
      }

      console.log('❌ Nenhuma imagem destaque encontrada');
      return null;
    } catch (error) {
      console.error('Erro ao extrair imagem destaque:', error.message);
      return null;
    }
  }

  /**
   * Extrai conteúdo do Instagram (texto da postagem + comentários)
   */
  static async extrairConteudoInstagram(url) {
    try {
      console.log('Extraindo conteúdo do Instagram:', url);

      let textoLegenda = '';
      let textoTranscricao = '';

      // 1. Tentar extrair texto da postagem (Legenda) via oEmbed ou Proxy
      const postId = url.match(/\/p\/([^\/\?]+)|\/reel\/([^\/\?]+)/)?.[1] || url.match(/\/p\/([^\/\?]+)|\/reel\/([^\/\?]+)/)?.[2];

      if (postId) {
        // Método 1A: Tentar oEmbed API (Oficial e rápido para dados públicos)
        try {
          console.log('Tentando oEmbed API para post:', postId);
          const cleanUrl = `https://www.instagram.com/p/${postId}/`;
          const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(cleanUrl)}&omitscript=true`;

          const oembedResponse = await axios.get(oembedUrl, {
            timeout: 5000,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot/1.0)' }
          });

          if (oembedResponse.data && oembedResponse.data.title) {
            textoLegenda += `TEXTO DA POSTAGEM (LEGENDA):\n${oembedResponse.data.title}\n\n`;
            if (oembedResponse.data.author_name) {
              textoLegenda += `AUTOR: ${oembedResponse.data.author_name}\n\n`;
            }
            console.log('✅ Legenda extraída via oEmbed');
          }
        } catch (oembedError) {
          console.log('⚠️ oEmbed falhou, tentando próximos métodos...');
        }

        // Método 1B: Tentar via instagram-url-direct
        if (!textoLegenda) {
          try {
            console.log('Tentando extrair legenda via instagram-url-direct...');
            let instagramGetUrl;
            try {
              const lib = require("instagram-url-direct");
              instagramGetUrl = lib.instagramGetUrl;
            } catch (e) { }

            if (instagramGetUrl) {
              const links = await instagramGetUrl(url);
              // Verificar se há caption nos dados retornados
              if (links.caption) {
                textoLegenda += `TEXTO DA POSTAGEM (LEGENDA):\n${links.caption}\n\n`;
                console.log('✅ Legenda extraída via instagram-url-direct');
              }
            }
          } catch (e) {
            console.log('⚠️ Falha ao extrair legenda via instagram-url-direct:', e.message);
          }
        }

        // Método 1C: Tentar via insta-fetcher
        if (!textoLegenda) {
          try {
            console.log('Tentando extrair legenda via insta-fetcher...');
            const ig = new igApi();
            const postData = await ig.fetchPost(url);

            if (postData && (postData.caption || postData.description)) {
              const caption = postData.caption || postData.description;
              textoLegenda += `TEXTO DA POSTAGEM (LEGENDA):\n${caption}\n\n`;
              if (postData.username || postData.owner?.username) {
                const author = postData.username || postData.owner?.username;
                textoLegenda += `AUTOR: ${author}\n\n`;
              }
              console.log('✅ Legenda extraída via insta-fetcher');
            }
          } catch (e) {
            console.log('⚠️ Falha ao extrair legenda via insta-fetcher:', e.message);
          }
        }

        // Método 1D: Scraping direto do HTML do Instagram
        if (!textoLegenda) {
          try {
            console.log('Tentando scraping direto do HTML...');
            const response = await axios.get(url, {
              timeout: 15000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'max-age=0'
              }
            });

            const html = response.data;

            // Método 1: Extrair do JSON embutido no HTML
            const scriptRegex = /<script type="application\/ld\+json">(.*?)<\/script>/gs;
            const scriptMatches = html.matchAll(scriptRegex);

            for (const match of scriptMatches) {
              try {
                const jsonData = JSON.parse(match[1]);
                if (jsonData.articleBody) {
                  textoLegenda += `TEXTO DA POSTAGEM (LEGENDA):\n${jsonData.articleBody}\n\n`;
                  console.log('✅ Legenda extraída via JSON-LD');
                  break;
                }
              } catch (e) {
                // Ignorar erros de parse
              }
            }

            // Método 2: Extrair do meta tag og:description
            if (!textoLegenda) {
              const $ = cheerio.load(html);
              const ogDescription = $('meta[property="og:description"]').attr('content');
              const twitterDescription = $('meta[name="twitter:description"]').attr('content');
              const description = ogDescription || twitterDescription;

              if (description && description.length > 20) {
                // Remover contadores de likes/comentários que vêm no og:description
                const cleanDescription = description.replace(/^\d+\s+(Likes|Comments|Followers|Following),?\s*/i, '');
                if (cleanDescription.length > 10) {
                  textoLegenda += `TEXTO DA POSTAGEM (LEGENDA):\n${cleanDescription}\n\n`;
                  console.log('✅ Legenda extraída via meta tags');
                }
              }
            }

            // Método 3: Extrair do window._sharedData
            if (!textoLegenda) {
              const sharedDataMatch = html.match(/window\._sharedData\s*=\s*({.+?});/);
              if (sharedDataMatch) {
                try {
                  const sharedData = JSON.parse(sharedDataMatch[1]);
                  const postData = sharedData?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;

                  if (postData?.edge_media_to_caption?.edges?.[0]?.node?.text) {
                    const caption = postData.edge_media_to_caption.edges[0].node.text;
                    textoLegenda += `TEXTO DA POSTAGEM (LEGENDA):\n${caption}\n\n`;
                    console.log('✅ Legenda extraída via _sharedData');
                  }
                } catch (e) {
                  console.log('⚠️ Erro ao parsear _sharedData:', e.message);
                }
              }
            }

          } catch (scrapingError) {
            console.log('❌ Scraping direto falhou:', scrapingError.message);
          }
        }

        // Método 1E: Tentar API pública Instagram Downloader
        if (!textoLegenda) {
          try {
            console.log('Tentando API pública Instagram Downloader...');
            const apiUrl = `https://instagram-scraper-api2.p.rapidapi.com/v1/post_info?code_or_id_or_url=${encodeURIComponent(url)}`;

            const apiResponse = await axios.get(apiUrl, {
              timeout: 10000,
              headers: {
                'User-Agent': 'Mozilla/5.0'
              }
            });

            if (apiResponse.data && apiResponse.data.data) {
              const postData = apiResponse.data.data;
              const caption = postData.caption?.text || postData.edge_media_to_caption?.edges?.[0]?.node?.text;

              if (caption && caption.length > 10) {
                textoLegenda += `TEXTO DA POSTAGEM (LEGENDA):\n${caption}\n\n`;
                if (postData.owner?.username) {
                  textoLegenda += `AUTOR: ${postData.owner.username}\n\n`;
                }
                console.log('✅ Legenda extraída via API pública');
              }
            }
          } catch (apiError) {
            console.log('❌ API pública falhou:', apiError.message);
          }
        }

        // Método 1F: Tentar proxy (allorigins) como último recurso
        if (!textoLegenda) {
          try {
            console.log('Tentando proxy allorigins...');
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const proxyResponse = await axios.get(proxyUrl, { timeout: 15000 });

            if (proxyResponse.data && proxyResponse.data.contents) {
              const $ = cheerio.load(proxyResponse.data.contents);
              const description = $('meta[property="og:description"]').attr('content') ||
                $('meta[name="description"]').attr('content');

              if (description && description.length > 20) {
                const cleanDescription = description.replace(/^\d+\s+(Likes|Comments|Followers|Following),?\s*/i, '');
                if (cleanDescription.length > 10) {
                  textoLegenda += `TEXTO DA POSTAGEM (LEGENDA):\n${cleanDescription}\n\n`;
                  console.log('✅ Legenda extraída via proxy');
                }
              }
            }
          } catch (proxyError) {
            console.log('❌ Proxy falhou:', proxyError.message);
          }
        }

        // Método 1G: Tentar extrair do próprio objeto retornado pelo instagram-url-direct (dados completos)
        if (!textoLegenda) {
          try {
            console.log('Tentando extrair dados completos via instagram-url-direct...');
            const lib = require("instagram-url-direct");
            const result = await lib.instagramGetUrl(url);

            // Tentar diferentes campos onde a legenda pode estar
            const possibleCaptions = [
              result.caption,
              result.edge_media_to_caption?.edges?.[0]?.node?.text,
              result.title,
              result.description
            ];

            for (const caption of possibleCaptions) {
              if (caption && typeof caption === 'string' && caption.length > 10) {
                textoLegenda += `TEXTO DA POSTAGEM (LEGENDA):\n${caption}\n\n`;
                console.log('✅ Legenda extraída via instagram-url-direct (dados completos)');
                break;
              }
            }
          } catch (e) {
            console.log('❌ Extração completa via instagram-url-direct falhou:', e.message);
          }
        }
      }

      // 2. Tentar transcrever vídeo (Reels ou Posts de vídeo)
      if (url.includes('/reel/') || url.includes('/reels/') || url.includes('/p/')) {
        try {
          console.log('🎥 Verificando se há vídeo para transcrição...');
          const transcricao = await this.processarVideoInstagram(url);
          if (transcricao) {
            textoTranscricao = `📱 CONTEÚDO DO VÍDEO (TRANSCRITO):\n\n${transcricao}\n\n`;
          }
        } catch (e) {
          console.log('⚠️ Não foi possível transcrever vídeo (pode ser apenas foto):', e.message);
        }
      }

      // 3. Combinar resultados
      let conteudoFinal = '\n\n📱 CONTEÚDO DO INSTAGRAM:\n\n';

      if (textoLegenda) conteudoFinal += textoLegenda;
      if (textoTranscricao) conteudoFinal += textoTranscricao;

      if (!textoLegenda && !textoTranscricao) {
        return '\n\n📱 Não foi possível extrair o conteúdo automaticamente do Instagram.\n\nPor favor, copie o texto da postagem e cole no campo "Cole o Texto da Postagem".\n';
      }

      return conteudoFinal;

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
   * Busca imagens usando Google Custom Search API
   */
  static async buscarImagensGoogle(query) {
    try {
      // Limpar e preparar a query
      let cleanQuery = query
        .replace(/TEXTO DA POSTAGEM \(LEGENDA\):/gi, '')
        .replace(/CONTEÚDO DO VÍDEO \(TRANSCRITO\):/gi, '')
        .replace(/📱/g, '')
        .replace(/AUTOR:/gi, '')
        .replace(/-\s*\w+\s+no\s+\w+\s+\d+,\s+\d{4}:/gi, '') // Remove "- username no Month DD, YYYY:"
        .replace(/\d+\s+(Likes|Comments|Followers|Following)/gi, '')
        .replace(/@\w+/g, '')
        .replace(/https?:\/\/[^\s]+/g, '')
        .replace(/["""]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      // Limitar a 100 caracteres (limite seguro para Google Custom Search)
      if (cleanQuery.length > 100) {
        cleanQuery = cleanQuery.substring(0, 100).trim();
      }

      // Se ficou muito curto ou vazio, usar fallback genérico
      if (cleanQuery.length < 3) {
        cleanQuery = 'igreja gospel evangélico';
      }

      console.log('Query limpa para Google:', cleanQuery.substring(0, 100));

      // Configurar credenciais do Google Custom Search
      const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
      const GOOGLE_CX = process.env.GOOGLE_CX;

      if (!GOOGLE_API_KEY || !GOOGLE_CX) {
        console.log('⚠️ Google API não configurada, usando fallback Picsum');
        throw new Error('GOOGLE_API_KEY ou GOOGLE_CX não configuradas');
      }

      // Adicionar contexto gospel/evangélico se não estiver na query
      let finalQuery = cleanQuery;
      if (!cleanQuery.toLowerCase().includes('gospel') && 
          !cleanQuery.toLowerCase().includes('evangélico') && 
          !cleanQuery.toLowerCase().includes('igreja') &&
          !cleanQuery.toLowerCase().includes('pastor') &&
          !cleanQuery.toLowerCase().includes('cantor')) {
        // Adicionar contexto apenas se for nome de pessoa ou termo genérico
        const palavras = cleanQuery.toLowerCase().split(' ');
        const temNomeProprio = cleanQuery.split(' ').some(p => p[0] === p[0].toUpperCase());
        if (temNomeProprio || palavras.length <= 2) {
          finalQuery = `${cleanQuery} gospel evangélico`;
        }
      }
      
      console.log('Query final para Google:', finalQuery.substring(0, 100));
      
      // Buscar imagens em alta resolução (xlarge) e apenas fotos (não clipart/lineart)
      // Aumentado de 10 para 15 imagens
      const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(finalQuery)}&searchType=image&num=10&imgSize=xlarge&imgType=photo&safe=active`;

      const response = await axios.get(searchUrl, {
        timeout: 15000
      });

      const imagens = [];

      if (response.data && response.data.items) {
        for (const item of response.data.items) {
          if (imagens.length >= 15) break;

          // Tentar múltiplas fontes de URL em ordem de prioridade
          let imageUrl = null;
          let isHighQuality = false;

          // 1. Tentar item.link (URL original da imagem)
          if (item.link) {
            const isValidImageUrl = /\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(item.link) ||
              item.link.includes('googleusercontent.com') ||
              item.link.includes('ggpht.com') ||
              item.link.includes('gstatic.com');

            if (isValidImageUrl) {
              imageUrl = item.link;
              isHighQuality = true;
            }
          }

          // 2. Se não encontrou, tentar contextLink (URL da página que contém a imagem)
          if (!imageUrl && item.image?.contextLink) {
            const contextUrl = item.image.contextLink;
            const isValidImageUrl = /\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(contextUrl) ||
              contextUrl.includes('googleusercontent.com') ||
              contextUrl.includes('ggpht.com') ||
              contextUrl.includes('gstatic.com');

            if (isValidImageUrl) {
              imageUrl = contextUrl;
              isHighQuality = true;
            }
          }

          // 3. Último recurso: usar thumbnailLink (baixa qualidade)
          // Filtrar redes sociais que sempre retornam thumbnails
          const isSocialMedia = item.displayLink && (
            item.displayLink.includes('instagram.com') ||
            item.displayLink.includes('facebook.com') ||
            item.displayLink.includes('twitter.com') ||
            item.displayLink.includes('tiktok.com')
          );
          
          if (!imageUrl && item.image?.thumbnailLink && !isSocialMedia) {
            imageUrl = item.image.thumbnailLink;
            isHighQuality = false;
            console.log('⚠️ Usando thumbnail (baixa qualidade) para:', item.displayLink);
          }

          // Adicionar imagem se encontrou alguma URL válida
          if (imageUrl) {
            imagens.push({
              url: imageUrl,
              thumbnail: item.image?.thumbnailLink || imageUrl,
              descricao: item.title || `Imagem relacionada a ${query}`,
              fonte: item.displayLink || 'Google Images',
              highQuality: isHighQuality,
              relevancia: item.image?.contextLink ? 10 : (isHighQuality ? 8 : 5) // Score de relevância
            });
          } else {
            console.log('⚠️ URL ignorada (nenhuma fonte válida ou rede social):', item.displayLink);
          }
        }
      }

      // Fazer segunda busca se não conseguiu 15 imagens
      if (imagens.length < 15 && imagens.length > 0) {
        console.log(`Apenas ${imagens.length} imagens encontradas, fazendo busca complementar...`);
        try {
          const searchUrl2 = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(cleanQuery)}&searchType=image&num=10&start=11&imgSize=large&imgType=photo&safe=active`;
          const response2 = await axios.get(searchUrl2, { timeout: 10000 });
          
          if (response2.data && response2.data.items) {
            for (const item of response2.data.items) {
              if (imagens.length >= 15) break;
              
              if (item.link) {
                const isValidImageUrl = /\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(item.link);
                if (isValidImageUrl) {
                  imagens.push({
                    url: item.link,
                    thumbnail: item.image?.thumbnailLink || item.link,
                    descricao: item.title || `Imagem relacionada a ${query}`,
                    fonte: item.displayLink || 'Google Images',
                    highQuality: true,
                    relevancia: 7
                  });
                }
              }
            }
          }
        } catch (err) {
          console.log('Erro na busca complementar, continuando com', imagens.length, 'imagens');
        }
      }
      
      // Ordenar imagens: relevância e qualidade
      imagens.sort((a, b) => {
        // Primeiro por relevância
        if (a.relevancia !== b.relevancia) return b.relevancia - a.relevancia;
        // Depois por qualidade
        if (a.highQuality && !b.highQuality) return -1;
        if (!a.highQuality && b.highQuality) return 1;
        return 0;
      });

      const highQualityCount = imagens.filter(img => img.highQuality).length;
      const lowQualityCount = imagens.length - highQualityCount;

      console.log('Imagens do Google encontradas:', imagens.length);
      console.log(`  ✅ Alta qualidade: ${highQualityCount}`);
      console.log(`  ⚠️ Baixa qualidade (thumbnails): ${lowQualityCount}`);

      if (imagens.length > 0) {
        return imagens;
      }

      // Fallback: usar Picsum se não encontrar nada
      console.log('Nenhuma imagem encontrada no Google, usando fallback...');
      const imagensFallback = [];
      for (let i = 0; i < 5; i++) {
        const randomId = 300 + Math.floor(Math.random() * 700);
        imagensFallback.push({
          url: `https://picsum.photos/800/600?random=${randomId}`,
          thumbnail: `https://picsum.photos/200/150?random=${randomId}`,
          descricao: `Imagem ${i + 1}`,
          fonte: 'Picsum'
        });
      }
      return imagensFallback;

    } catch (error) {
      console.error('Erro ao buscar imagens no Google:', error.message);

      // Fallback: retornar imagens do Picsum
      try {
        console.log('Usando imagens genéricas de fallback (Picsum)');
        const imagens = [];

        for (let i = 0; i < 5; i++) {
          const randomId = 400 + Math.floor(Math.random() * 600);
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
   * @param {string} texto - Texto extraído do post/vídeo
   * @param {string} categoria - Categoria da matéria
   * @param {string} linkReferencia - Link original do conteúdo
   * @param {boolean} pesquisarInternet - Se deve pesquisar informações adicionais na internet
   */
  static async criarMateriaPorTexto(texto, categoria = 'Notícias', linkReferencia = '', pesquisarInternet = false) {
    if (!await this.isActive()) {
      throw new Error('O assistente de IA está desativado');
    }

    console.log('📝 Criando matéria por texto...');
    console.log('🌐 Pesquisar na internet:', pesquisarInternet);

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

    const imagensSugeridas = await this.buscarImagensGoogle(palavrasParaImagem);

    // 🌐 PESQUISAR NA INTERNET PARA COMPLEMENTAR A MATÉRIA
    let informacoesAdicionais = '';
    if (pesquisarInternet) {
      console.log('🌐 Pesquisando informações adicionais na internet...');
      
      // Extrair palavras-chave do texto para pesquisa
      const palavrasChavePesquisa = textoLimpo.substring(0, 200);
      
      try {
        // Buscar no DuckDuckGo
        const resultadosDDG = await this.pesquisarInternet(palavrasChavePesquisa + ' gospel evangélico');
        if (resultadosDDG.length > 0) {
          informacoesAdicionais += '\n\n📚 INFORMAÇÕES ADICIONAIS DA INTERNET (use para enriquecer a matéria):\n';
          resultadosDDG.forEach((r, i) => {
            informacoesAdicionais += `\n${i + 1}. ${r.titulo}\n   ${r.snippet}\n`;
          });
          console.log(`✅ Encontradas ${resultadosDDG.length} informações adicionais no DuckDuckGo`);
        }
        
        // Buscar também no Google News
        const noticiasGoogle = await this.buscarNoticiasAtuais(palavrasChavePesquisa);
        if (noticiasGoogle.length > 0) {
          informacoesAdicionais += '\n\n📰 NOTÍCIAS RELACIONADAS:\n';
          noticiasGoogle.forEach((n, i) => {
            informacoesAdicionais += `\n${i + 1}. ${n.titulo}\n   ${n.descricao || ''}\n`;
          });
          console.log(`✅ Encontradas ${noticiasGoogle.length} notícias relacionadas`);
        }
      } catch (error) {
        console.error('⚠️ Erro ao pesquisar na internet:', error.message);
        // Continua sem as informações adicionais
      }
    }

    // Construir prompt com ou sem informações adicionais
    const instrucaoAdicional = pesquisarInternet && informacoesAdicionais 
      ? `\n\n🌐 INFORMAÇÕES COMPLEMENTARES DA INTERNET:\nUse as informações abaixo para ENRIQUECER a matéria com contexto adicional (quem é a pessoa, histórico, etc). Mas mantenha o foco no conteúdo original.\n${informacoesAdicionais}`
      : '';

    const prompt = `⚠️ TAREFA CRÍTICA: Crie uma matéria jornalística no estilo do portal Metrópoles baseada ${pesquisarInternet ? 'no texto fornecido, ENRIQUECIDA com as informações complementares da internet' : 'EXCLUSIVAMENTE no texto fornecido abaixo'}.

🚨 REGRA ABSOLUTA - NÃO INVENTE NADA:
- ❌ NÃO invente números, datas, horários ou locais que NÃO foram mencionados
- ❌ NÃO adicione eventos, pessoas ou declarações que NÃO foram citados
- ❌ NÃO especule quantidades ("500 pessoas", "milhares de fiéis", "centenas de comentários")
- ❌ NÃO invente nomes de igrejas, cidades, bairros ou lugares
- ❌ NÃO adicione citações ou falas que NÃO existem no texto original
- ❌ NÃO invente contexto histórico ou background que NÃO foi mencionado
- ❌ NÃO adicione informações sobre "velório", "sepultamento", "horários" se NÃO foram citados
- ❌ JAMAIS escreva: "O conteúdo foi publicado em...", "O post obteve X curtidas", "O perfil @tal publicou..."
- ❌ JAMAIS use meta-linguagem: "Segundo o texto fornecido...", "Baseado nas informações..."
- ⚠️ SE O TEXTO É VAGO (ex: "Descanse em paz"), NÃO invente detalhes - faça uma matéria curta e genérica

✅ O QUE VOCÊ DEVE FAZER (ESTILO METRÓPOLES):
1. ✅ Use APENAS as informações que estão no texto original
2. ✅ Reorganize essas informações em estrutura jornalística profissional
3. ✅ Melhore a fluidez e conectivos entre as frases
4. ✅ Use sinônimos mantendo o sentido exato
5. ✅ Torne o texto informativo e direto
6. ✅ Se houver citações no original, mantenha-as exatamente como estão
7. ✅ Se NÃO houver citações, NÃO invente nenhuma

📏 TAMANHO DO CONTEÚDO:
- Escreva APENAS com base no que foi fornecido
- Se o texto original é curto, a matéria será curta (200-300 palavras está OK)
- Se o texto original é longo, a matéria será mais longa
- NÃO force expansão artificial do conteúdo

ESTRUTURA OBRIGATÓRIA:

1. TÍTULO (máximo 80 caracteres):
   - Impactante, jornalístico e direto (estilo Metrópoles)
   - Baseado APENAS no fato principal mencionado
   - Sem sensacionalismo exagerado, foco na notícia

2. DESCRIÇÃO/RESUMO (máximo 160 caracteres):
   - Brief, direct introduction summarizing the lead
   - Linguagem simples e direta

3. CONTEÚDO HTML:

   a) LIDE (1-2 parágrafos): Fato principal de forma DIRETA
      - Comece com o fato mais importante (Quem, o quê, onde, quando)
      - Texto objetivo, sem rodeios

   b) DESENVOLVIMENTO (1-3 parágrafos conforme o conteúdo disponível):
      - Use <h3> para subtítulos APENAS se fizer sentido e o texto for longo
      - Mantenha parágrafos de tamanho médio (3-5 linhas)
      - Desenvolva APENAS os pontos mencionados no original
      - Conecte os parágrafos de forma lógica

   c) CITAÇÕES (SE HOUVER no texto original):
      - Use <blockquote> para citações que já existem
      - NÃO crie citações novas
      - Se NÃO há citações, NÃO adicione nenhuma

   d) CONCLUSÃO (1 parágrafo):
      - Encerramento informativo baseado no contexto
      - EVITE: "hora de repensar", "chamado à reflexão"
      - PREFIRA: Informações sobre desdobramentos ou contexto final

FORMATAÇÃO HTML - MUITO IMPORTANTE:
- Use <p>texto aqui</p> para CADA parágrafo
- NÃO adicione <p></p> vazios entre parágrafos
- NÃO adicione <br> entre parágrafos
- Use <h3>Subtítulo</h3> APENAS se necessário
- Use <blockquote>citação</blockquote> APENAS para citações que JÁ EXISTEM
- Use <strong> apenas para nomes importantes
- Formato: <p>texto1</p><p>texto2</p><h3>título</h3><p>texto3</p>

LINGUAGEM (ESTILO METRÓPOLES):
- ✅ Tom informativo, sério e direto
- ✅ Parágrafos bem estruturados
- ✅ Uso de voz ativa preferencialmente
- ✅ Vocabulário jornalístico padrão
- ❌ Evite gírias, exclamações excessivas ou linguagem muito informal
- ❌ Evite opiniões pessoais ou juízos de valor

CATEGORIA: ${categoria}
${linkReferencia ? `LINK DE REFERÊNCIA: ${linkReferencia}` : ''}

TEXTO FORNECIDO (BASE PRINCIPAL):
${texto}
${instrucaoAdicional}

⚠️ LEMBRE-SE: ${pesquisarInternet ? 'Use as informações da internet para ENRIQUECER a matéria com contexto, mas mantenha o foco no conteúdo original!' : 'É MELHOR uma matéria curta e fiel ao original do que uma matéria longa com informações inventadas!'}

IMPORTANTE: O conteúdo HTML deve estar em UMA ÚNICA LINHA (sem quebras de linha reais, apenas tags HTML).

Retorne APENAS um objeto JSON válido:
{
  "titulo": "título da matéria",
  "descricao": "descrição curta",
  "conteudo": "HTML completo em uma única linha"
}`;

    const messages = [
      {
        role: 'system',
        content: 'Você é um jornalista experiente do portal Metrópoles. Seu estilo de escrita é direto, informativo, objetivo e levemente formal, mas acessível. Você prioriza a clareza e a precisão dos fatos.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    // Temperatura 0.3 (baixa) para ser mais fiel ao conteúdo e evitar invenções
    const response = await this.makeRequest(messages, 0.3, 3000);

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
      console.log('📸 Buscando imagens no Google...');

      const imagensRelevantes = await this.buscarImagensGoogle(palavrasChave);

      // Adicionar embed do Instagram se houver link de referência
      let conteudoFinal = resultado.conteudo;
      
      // Verificar se o conteúdo já contém um embed do Instagram
      const jaTemEmbed = conteudoFinal.includes('instagram-media') || conteudoFinal.includes('instagram.com/p/');

      if (!jaTemEmbed && linkReferencia && linkReferencia.includes('instagram.com')) {
        console.log('📱 Adicionando embed completo do Instagram:', linkReferencia);
        
        // Normalizar URL do Instagram para formato embed
        let embedUrl = linkReferencia;
        if (!embedUrl.includes('utm_source=ig_embed')) {
          embedUrl = embedUrl.replace(/\/$/, '') + '/?utm_source=ig_embed&utm_campaign=loading';
        }
        
        // Embed completo do Instagram com todos os estilos e estrutura
        const embedCode = `<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="${embedUrl}" data-instgrm-version="14" style=" background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);"><div style="padding:16px;"> <a href="${embedUrl}" style=" background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%;" target="_blank"> <div style=" display: flex; flex-direction: row; align-items: center;"> <div style="background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 40px; margin-right: 14px; width: 40px;"></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 100px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 60px;"></div></div></div><div style="padding: 19% 0;"></div> <div style="display:block; height:50px; margin:0 auto 12px; width:50px;"><svg width="50px" height="50px" viewBox="0 0 60 60" version="1.1" xmlns="https://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g transform="translate(-511.000000, -20.000000)" fill="#000000"><g><path d="M556.869,30.41 C554.814,30.41 553.148,32.076 553.148,34.131 C553.148,36.186 554.814,37.852 556.869,37.852 C558.924,37.852 560.59,36.186 560.59,34.131 C560.59,32.076 558.924,30.41 556.869,30.41 M541,60.657 C535.114,60.657 530.342,55.887 530.342,50 C530.342,44.114 535.114,39.342 541,39.342 C546.887,39.342 551.658,44.114 551.658,50 C551.658,55.887 546.887,60.657 541,60.657 M541,33.886 C532.1,33.886 524.886,41.1 524.886,50 C524.886,58.899 532.1,66.113 541,66.113 C549.9,66.113 557.115,58.899 557.115,50 C557.115,41.1 549.9,33.886 541,33.886 M565.378,62.101 C565.244,65.022 564.756,66.606 564.346,67.663 C563.803,69.06 563.154,70.057 562.106,71.106 C561.058,72.155 560.06,72.803 558.662,73.347 C557.607,73.757 556.021,74.244 553.102,74.378 C549.944,74.521 548.997,74.552 541,74.552 C533.003,74.552 532.056,74.521 528.898,74.378 C525.979,74.244 524.393,73.757 523.338,73.347 C521.94,72.803 520.942,72.155 519.894,71.106 C518.846,70.057 518.197,69.06 517.654,67.663 C517.244,66.606 516.755,65.022 516.623,62.101 C516.479,58.943 516.448,57.996 516.448,50 C516.448,42.003 516.479,41.056 516.623,37.899 C516.755,34.978 517.244,33.391 517.654,32.338 C518.197,30.938 518.846,29.942 519.894,28.894 C520.942,27.846 521.94,27.196 523.338,26.654 C524.393,26.244 525.979,25.756 528.898,25.623 C532.057,25.479 533.004,25.448 541,25.448 C548.997,25.448 549.943,25.479 553.102,25.623 C556.021,25.756 557.607,26.244 558.662,26.654 C560.06,27.196 561.058,27.846 562.106,28.894 C563.154,29.942 563.803,30.938 564.346,32.338 C564.756,33.391 565.244,34.978 565.378,37.899 C565.522,41.056 565.552,42.003 565.552,50 C565.552,57.996 565.522,58.943 565.378,62.101 M570.82,37.631 C570.674,34.438 570.167,32.258 569.425,30.349 C568.659,28.377 567.633,26.702 565.965,25.035 C564.297,23.368 562.623,22.342 560.652,21.575 C558.743,20.834 556.562,20.326 553.369,20.18 C550.169,20.033 549.148,20 541,20 C532.853,20 531.831,20.033 528.631,20.18 C525.438,20.326 523.257,20.834 521.349,21.575 C519.376,22.342 517.703,23.368 516.035,25.035 C514.368,26.702 513.342,28.377 512.574,30.349 C511.834,32.258 511.326,34.438 511.181,37.631 C511.035,40.831 511,41.851 511,50 C511,58.147 511.035,59.17 511.181,62.369 C511.326,65.562 511.834,67.743 512.574,69.651 C513.342,71.625 514.368,73.296 516.035,74.965 C517.703,76.634 519.376,77.658 521.349,78.425 C523.257,79.167 525.438,79.673 528.631,79.82 C531.831,79.965 532.853,80.001 541,80.001 C549.148,80.001 550.169,79.965 553.369,79.82 C556.562,79.673 558.743,79.167 560.652,78.425 C562.623,77.658 564.297,76.634 565.965,74.965 C567.633,73.296 568.659,71.625 569.425,69.651 C570.167,67.743 570.674,65.562 570.82,62.369 C570.966,59.17 571,58.147 571,50 C571,41.851 570.966,40.831 570.82,37.631"></path></g></g></g></svg></div><div style="padding-top: 8px;"> <div style=" color:#3897f0; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:550; line-height:18px;">Ver essa foto no Instagram</div></div><div style="padding: 12.5% 0;"></div> <div style="display: flex; flex-direction: row; margin-bottom: 14px; align-items: center;"><div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(0px) translateY(7px);"></div> <div style="background-color: #F4F4F4; height: 12.5px; transform: rotate(-45deg) translateX(3px) translateY(1px); width: 12.5px; flex-grow: 0; margin-right: 14px; margin-left: 2px;"></div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(9px) translateY(-18px);"></div></div><div style="margin-left: 8px;"> <div style=" background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 20px; width: 20px;"></div> <div style=" width: 0; height: 0; border-top: 2px solid transparent; border-left: 6px solid #f4f4f4; border-bottom: 2px solid transparent; transform: translateX(16px) translateY(-4px) rotate(30deg)"></div></div><div style="margin-left: auto;"> <div style=" width: 0px; border-top: 8px solid #F4F4F4; border-right: 8px solid transparent; transform: translateY(16px);"></div> <div style=" background-color: #F4F4F4; flex-grow: 0; height: 12px; width: 16px; transform: translateY(-4px);"></div> <div style=" width: 0; height: 0; border-top: 8px solid #F4F4F4; border-left: 8px solid transparent; transform: translateY(-4px) translateX(8px);"></div></div></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center; margin-bottom: 24px;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 224px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 144px;"></div></div></a><p style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; line-height:17px; margin-bottom:0; margin-top:8px; overflow:hidden; padding:8px 0 7px; text-align:center; text-overflow:ellipsis; white-space:nowrap;"><a href="${embedUrl}" style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:normal; line-height:17px; text-decoration:none;" target="_blank">Uma publicação compartilhada no Instagram</a></p></div></blockquote><script async src="//www.instagram.com/embed.js"></script>`;

        // Adicionar embed no final do conteúdo
        conteudoFinal += embedCode;
        console.log('✅ Embed completo do Instagram adicionado ao conteúdo');
      } else if (jaTemEmbed) {
        console.log('ℹ️ Conteúdo já contém embed do Instagram, pulando adição');
      }

      // Adicionar imagens sugeridas (prioriza as baseadas no título)
      resultado.imagensSugeridas = imagensRelevantes.length > 0 ? imagensRelevantes : imagensSugeridas;
      resultado.conteudo = conteudoFinal;

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
        const imagensRelevantes = await this.buscarImagensGoogle(palavrasChave);

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
   * Cria uma matéria a partir de um link (Instagram, Facebook, YouTube, etc)
   * Com suporte a transcrição de vídeo e pesquisa na internet
   * @param {string} link - URL do post/vídeo
   * @param {string} categoria - Categoria da matéria
   * @param {boolean} pesquisarInternet - Se deve pesquisar informações adicionais
   * @param {boolean} transcreverVideo - Se deve transcrever o áudio do vídeo
   */
  static async criarMateriaPorLink(link, categoria = 'Notícias', pesquisarInternet = true, transcreverVideo = true) {
    console.log('🔗 Criando matéria por link...');
    console.log('📎 Link:', link);
    console.log('🌐 Pesquisar na internet:', pesquisarInternet);
    console.log('🎥 Transcrever vídeo:', transcreverVideo);

    if (!await this.isActive()) {
      throw new Error('O assistente de IA está desativado');
    }

    // Detectar tipo de link
    const isInstagram = link.includes('instagram.com');
    const isFacebook = link.includes('facebook.com') || link.includes('fb.watch') || link.includes('fb.com');
    const isYouTube = link.includes('youtube.com') || link.includes('youtu.be');
    const isVideo = link.includes('/reel') || link.includes('/reels') || 
                   link.includes('/watch') || link.includes('fb.watch') ||
                   link.includes('/videos/') || isYouTube;

    console.log('📱 Tipo de link - Instagram:', isInstagram, 'Facebook:', isFacebook, 'YouTube:', isYouTube, 'Vídeo:', isVideo);

    let conteudoExtraido = '';
    let imagemExtraida = null;

    // 1. EXTRAIR CONTEÚDO DO LINK
    if (isInstagram) {
      console.log('📸 Extraindo conteúdo do Instagram...');
      try {
        // Usar função que já faz transcrição de vídeo
        conteudoExtraido = await this.extrairConteudoInstagram(link);
        console.log('✅ Conteúdo do Instagram extraído:', conteudoExtraido.length, 'caracteres');
      } catch (error) {
        console.error('⚠️ Erro ao extrair Instagram:', error.message);
      }
    } else if (isFacebook) {
      console.log('📘 Extraindo conteúdo do Facebook...');
      try {
        conteudoExtraido = await this.extrairConteudoFacebook(link, transcreverVideo);
        console.log('✅ Conteúdo do Facebook extraído:', conteudoExtraido.length, 'caracteres');
      } catch (error) {
        console.error('⚠️ Erro ao extrair Facebook:', error.message);
      }
    } else {
      // Outros sites - usar extração genérica
      console.log('🌐 Extraindo conteúdo de site genérico...');
      try {
        const resultado = await this.extrairConteudoURL(link);
        if (resultado && resultado.texto) {
          conteudoExtraido = resultado.texto;
          imagemExtraida = resultado.imagem;
        }
      } catch (error) {
        console.error('⚠️ Erro ao extrair conteúdo:', error.message);
      }
    }

    // Verificar se conseguiu extrair conteúdo
    if (!conteudoExtraido || conteudoExtraido.length < 50) {
      throw new Error('Não foi possível extrair conteúdo suficiente do link. Por favor, cole o texto manualmente.');
    }

    // 2. PESQUISAR NA INTERNET (se habilitado)
    let informacoesInternet = '';
    if (pesquisarInternet) {
      console.log('🌐 Pesquisando informações complementares na internet...');
      
      // Limpar texto para query de pesquisa
      const queryPesquisa = conteudoExtraido
        .replace(/📱 CONTEÚDO DO INSTAGRAM:/g, '')
        .replace(/📘 CONTEÚDO DO FACEBOOK:/g, '')
        .replace(/TEXTO DA POSTAGEM:/g, '')
        .replace(/🎥 TRANSCRIÇÃO DO VÍDEO:/g, '')
        .replace(/AUTOR:/g, '')
        .replace(/COMENTÁRIOS DESTACADOS:/g, '')
        .replace(/\d+,?\d* likes,/g, '')
        .replace(/\d+,?\d* comments/g, '')
        .replace(/@\w+/g, '')
        .replace(/https?:\/\/[^\s]+/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 200);
      
      console.log('🔍 Query de pesquisa:', queryPesquisa.substring(0, 100) + '...');
      
      try {
        // Buscar notícias no Google News
        const noticias = await this.buscarNoticiasAtuais(queryPesquisa);
        if (noticias.length > 0) {
          informacoesInternet += '\n\n📰 NOTÍCIAS RELACIONADAS:\n';
          noticias.forEach((n, i) => {
            informacoesInternet += `${i + 1}. ${n.titulo}\n   ${n.descricao || ''}\n`;
          });
          console.log(`✅ Encontradas ${noticias.length} notícias`);
        }

        // Buscar no DuckDuckGo
        const resultadosDDG = await this.pesquisarInternet(queryPesquisa + ' gospel evangélico');
        if (resultadosDDG.length > 0) {
          informacoesInternet += '\n\n📚 INFORMAÇÕES ADICIONAIS:\n';
          resultadosDDG.forEach((r, i) => {
            informacoesInternet += `${i + 1}. ${r.titulo}\n   ${r.snippet}\n`;
          });
          console.log(`✅ Encontradas ${resultadosDDG.length} informações adicionais`);
        }
      } catch (error) {
        console.error('⚠️ Erro na pesquisa:', error.message);
      }
    }

    // 3. GERAR MATÉRIA COM IA
    console.log('✨ Gerando matéria com IA...');
    const materia = await this.gerarMateriaEstiloG1ComPesquisa(
      conteudoExtraido,
      categoria,
      link,
      informacoesInternet
    );

    // 4. BUSCAR IMAGENS
    let imagensSugeridas = materia.imagensSugeridas || [];
    
    // Se extraiu imagem do link, adicionar como primeira opção
    if (imagemExtraida) {
      imagensSugeridas.unshift({
        url: imagemExtraida,
        descricao: 'Imagem do post original',
        origem: isInstagram ? 'instagram' : isFacebook ? 'facebook' : 'link'
      });
    }

    console.log('✅ Matéria criada com sucesso!');
    console.log('📊 Título:', materia.titulo);
    console.log('🖼️ Imagens sugeridas:', imagensSugeridas.length);

    return {
      ...materia,
      imagensSugeridas
    };
  }

  /**
   * Extrai conteúdo do Facebook (posts e vídeos)
   * @param {string} url - URL do Facebook
   * @param {boolean} transcreverVideo - Se deve transcrever o vídeo
   */
  static async extrairConteudoFacebook(url, transcreverVideo = true) {
    console.log('📘 Extraindo conteúdo do Facebook:', url);
    
    let conteudo = '';
    let transcricao = '';
    
    // Verificar se é vídeo
    const isVideo = url.includes('/watch') || url.includes('fb.watch') || url.includes('/videos/') || url.includes('/reel');
    
    // Se é vídeo e deve transcrever, usar yt-dlp diretamente
    if (isVideo && transcreverVideo) {
      console.log('🎥 Detectado vídeo do Facebook, usando yt-dlp para baixar e transcrever...');
      
      try {
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);
        const path = require('path');
        const fs = require('fs');
        
        const tempDir = path.join(__dirname, '..', 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const timestamp = Date.now();
        const audioPath = path.join(tempDir, `fb_audio_${timestamp}.mp3`);
        
        console.log('📥 Baixando áudio do Facebook com yt-dlp...');
        
        // Baixar apenas o áudio usando yt-dlp
        const ytdlpCommand = `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${audioPath}" "${url}" --no-warnings --quiet`;
        
        try {
          await execPromise(ytdlpCommand, { timeout: 120000 });
          console.log('✅ Áudio do Facebook baixado:', audioPath);
          
          // Verificar se o arquivo existe
          if (fs.existsSync(audioPath)) {
            // Transcrever usando Whisper (via Groq)
            console.log('🎤 Transcrevendo áudio do Facebook...');
            transcricao = await this.transcreverAudio(audioPath);
            
            // Limpar arquivo temporário
            try { fs.unlinkSync(audioPath); } catch (e) {}
            
            if (transcricao && transcricao.length > 50) {
              console.log('✅ Vídeo do Facebook transcrito:', transcricao.length, 'caracteres');
            }
          }
        } catch (ytError) {
          console.log('⚠️ yt-dlp falhou para Facebook:', ytError.message);
        }
      } catch (error) {
        console.log('⚠️ Erro ao processar vídeo do Facebook:', error.message);
      }
    }
    
    // Extrair texto/descrição do post via scraping
    try {
      const axios = require('axios');
      const cheerio = require('cheerio');
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      
      // Tentar extrair texto do post
      const textoPost = $('meta[property="og:description"]').attr('content') ||
                       $('meta[name="description"]').attr('content') ||
                       $('.userContent').text() ||
                       $('[data-testid="post_message"]').text();
      
      if (textoPost) {
        conteudo = '📘 CONTEÚDO DO FACEBOOK:\n\nTEXTO DA POSTAGEM:\n' + textoPost;
      }

    } catch (error) {
      console.log('⚠️ Erro ao extrair texto do Facebook:', error.message);
    }
    
    // Adicionar transcrição se disponível
    if (transcricao && transcricao.length > 50) {
      conteudo += '\n\n🎥 TRANSCRIÇÃO DO VÍDEO:\n' + transcricao;
    }

    // Se não conseguiu extrair nada
    if (!conteudo || conteudo.length < 50) {
      if (transcricao && transcricao.length > 50) {
        conteudo = '📘 CONTEÚDO DO FACEBOOK:\n\n🎥 TRANSCRIÇÃO DO VÍDEO:\n' + transcricao;
      } else {
        throw new Error('Não foi possível extrair conteúdo suficiente do Facebook. Tente colar o texto manualmente.');
      }
    }

    return conteudo;
  }

  /**
   * Cria uma matéria completa baseada em um tema
   */
  static async criarMateria(tema, categoria = 'Notícias', palavrasChave = '', pesquisarInternet = false, links = []) {
    console.log('🎬 INÍCIO criarMateria');
    console.log('Tema:', tema.substring(0, 100));
    console.log('Categoria:', categoria);
    console.log('PesquisarInternet:', pesquisarInternet);
    console.log('Links:', links);

    if (!await this.isActive()) {
      throw new Error('O assistente de IA está desativado');
    }

    console.log('✅ IA está ativa');

    // Coletar informações adicionais
    let informacoesAdicionais = '';
    let imagensSugeridas = [];
    console.log('📋 Variáveis inicializadas');

    // Buscar imagens sugeridas iniciais (baseadas no tema)
    if (pesquisarInternet) {
      console.log('Buscando imagens sugeridas:', tema);
      const imagensGoogle = await this.buscarImagensGoogle(tema);
      if (imagensGoogle.length > 0) {
        imagensSugeridas = imagensGoogle;
      } else {
        // Fallback para Unsplash
        const imagensUnsplash = await this.buscarImagensSugeridas(tema);
        if (imagensUnsplash.length > 0) {
          imagensSugeridas = imagensUnsplash;
        }
      }
    }
    
    // NOTA: A pesquisa na internet será feita APÓS extrair o conteúdo do link
    // para usar o conteúdo real como base da pesquisa

    // Extrair conteúdo dos links fornecidos
    let conteudoExtraido = '';
    let imagemExtraida = null;
    if (links && links.length > 0) {
      console.log('Extraindo conteúdo de', links.length, 'links');

      for (const link of links) {
        const resultado = await this.extrairConteudoURL(link);
        if (resultado && resultado.texto) {
          conteudoExtraido += `\n${resultado.texto}\n\n`;

          // Se encontrou imagem e ainda não tem uma, guardar
          if (resultado.imagem && !imagemExtraida) {
            imagemExtraida = resultado.imagem;
            console.log('📸 Imagem destaque encontrada no link:', imagemExtraida);
          }
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

          const imagensGoogle = await this.buscarImagensGoogle(palavrasParaImagem);
          if (imagensGoogle.length > 0) {
            imagensSugeridas = imagensGoogle;
          }

          // Se extraiu imagem do artigo, adicionar como primeira sugestão
          if (imagemExtraida) {
            console.log('✅ Adicionando imagem extraída do artigo como primeira sugestão');
            imagensSugeridas.unshift({
              url: imagemExtraida,
              thumbnail: imagemExtraida,
              descricao: 'Imagem destaque do artigo original',
              fonte: 'Artigo Original'
            });
          }
        }
      } else if (links.length > 0) {
        // Se não conseguiu extrair nada útil
        throw new Error('Não foi possível extrair conteúdo suficiente do link. Por favor, use a aba "Por Link" e cole o texto manualmente.');
      }
    }

    console.log('📝 Conteúdo extraído:', conteudoExtraido.length, 'caracteres');
    console.log('🖼️ Imagem extraída:', imagemExtraida ? 'SIM' : 'NÃO');
    console.log('📸 Imagens sugeridas até agora:', imagensSugeridas.length);

    // 🌐 PESQUISAR NA INTERNET - SEMPRE que pesquisarInternet estiver ativo
    // Usar o conteúdo extraído OU o tema como base da pesquisa
    let informacoesPesquisaInternet = '';
    if (pesquisarInternet) {
      console.log('🌐 Pesquisando informações na internet...');
      
      // Determinar query de pesquisa: usar conteúdo extraído se disponível, senão usar o tema
      let queryPesquisa = '';
      
      if (conteudoExtraido && conteudoExtraido.length > 100) {
        // Limpar o conteúdo extraído para usar como query de pesquisa
        queryPesquisa = conteudoExtraido
          .replace(/📱 CONTEÚDO DO INSTAGRAM:/g, '')
          .replace(/TEXTO DA POSTAGEM:/g, '')
          .replace(/🎥 TRANSCRIÇÃO DO VÍDEO:/g, '')
          .replace(/AUTOR:/g, '')
          .replace(/COMENTÁRIOS DESTACADOS:/g, '')
          .replace(/\d+,?\d* likes,/g, '')
          .replace(/\d+,?\d* comments/g, '')
          .replace(/@\w+/g, '')
          .replace(/https?:\/\/[^\s]+/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 200);
        console.log('🔍 Query baseada no conteúdo extraído');
      } else {
        // Usar o tema diretamente
        queryPesquisa = tema;
        console.log('🔍 Query baseada no tema');
      }
      
      console.log('🔍 Query de pesquisa:', queryPesquisa.substring(0, 100) + '...');
      
      try {
        // 1. Buscar notícias atuais do Google News (mais recentes e relevantes)
        console.log('📰 Buscando notícias no Google News...');
        const noticias = await this.buscarNoticiasAtuais(queryPesquisa);
        if (noticias.length > 0) {
          informacoesPesquisaInternet += '\n\n📰 NOTÍCIAS ATUAIS (Google News) - USE ESTAS INFORMAÇÕES:\n';
          noticias.forEach((n, i) => {
            informacoesPesquisaInternet += `\n${i + 1}. ${n.titulo}`;
            if (n.descricao) informacoesPesquisaInternet += `\n   Resumo: ${n.descricao}`;
            if (n.data) informacoesPesquisaInternet += `\n   Data: ${n.data}`;
            informacoesPesquisaInternet += '\n';
          });
          console.log(`✅ Encontradas ${noticias.length} notícias no Google News`);
        }

        // 2. Buscar no DuckDuckGo para informações gerais
        console.log('🔎 Buscando informações no DuckDuckGo...');
        const resultadosDDG = await this.pesquisarInternet(queryPesquisa + ' gospel evangélico');
        if (resultadosDDG.length > 0) {
          informacoesPesquisaInternet += '\n\n📚 INFORMAÇÕES ADICIONAIS DA INTERNET:\n';
          resultadosDDG.forEach((r, i) => {
            informacoesPesquisaInternet += `\n${i + 1}. ${r.titulo}\n   ${r.snippet}\n`;
          });
          console.log(`✅ Encontradas ${resultadosDDG.length} informações no DuckDuckGo`);
        }
        
        // 3. Buscar notícias específicas sobre o tema (segunda pesquisa mais focada)
        if (!conteudoExtraido || conteudoExtraido.length < 100) {
          console.log('📰 Buscando notícias específicas sobre o tema...');
          const noticiasTema = await this.buscarNoticiasAtuais(tema + ' últimas notícias');
          if (noticiasTema.length > 0) {
            informacoesPesquisaInternet += '\n\n📰 NOTÍCIAS ESPECÍFICAS SOBRE O TEMA:\n';
            noticiasTema.forEach((n, i) => {
              if (!informacoesPesquisaInternet.includes(n.titulo)) { // Evitar duplicatas
                informacoesPesquisaInternet += `\n${i + 1}. ${n.titulo}`;
                if (n.descricao) informacoesPesquisaInternet += `\n   ${n.descricao}`;
                informacoesPesquisaInternet += '\n';
              }
            });
            console.log(`✅ Encontradas ${noticiasTema.length} notícias específicas`);
          }
        }
        
        // Adicionar ao informacoesAdicionais
        if (informacoesPesquisaInternet) {
          informacoesAdicionais += '\n\n🌐 INFORMAÇÕES DA INTERNET (USE PARA CRIAR A MATÉRIA COM FATOS REAIS):' + informacoesPesquisaInternet;
          console.log('✅ Total de informações da internet adicionadas ao prompt');
        } else {
          console.log('⚠️ Nenhuma informação encontrada na internet');
        }
      } catch (error) {
        console.error('⚠️ Erro ao pesquisar na internet:', error.message);
        // Continua sem as informações adicionais
      }
    }

    // Ajustar prompt baseado se tem conteúdo extraído ou não
    let promptInstrucao = '';
    console.log('🔨 Construindo prompt...');

    const systemRole = 'Você é um jornalista experiente do portal Metrópoles. Seu estilo de escrita é direto, informativo, objetivo e levemente formal, mas acessível. Você prioriza a clareza e a precisão dos fatos.';

    if (conteudoExtraido) {
      // Verificar se tem informações da internet para enriquecer
      const temInfoInternet = pesquisarInternet && informacoesPesquisaInternet && informacoesPesquisaInternet.length > 50;
      
      promptInstrucao = `⚠️ TAREFA CRÍTICA: Crie uma matéria jornalística no estilo do portal Metrópoles baseada ${temInfoInternet ? 'no conteúdo fornecido, ENRIQUECIDA com as informações complementares da internet' : 'EXCLUSIVAMENTE no conteúdo fornecido abaixo'}.

🚨 REGRA ABSOLUTA - NÃO INVENTE NADA:
- ❌ NÃO invente números, datas, horários ou locais que NÃO foram mencionados
- ❌ NÃO adicione eventos, pessoas ou declarações que NÃO foram citados
- ❌ NÃO especule quantidades ("500 pessoas", "milhares de fiéis", "centenas de comentários")
- ❌ NÃO invente nomes de igrejas, cidades, bairros ou lugares
- ❌ NÃO adicione citações ou falas que NÃO existem no texto original
- ❌ NÃO invente contexto histórico ou background que NÃO foi mencionado
- ❌ NÃO adicione informações sobre "velório", "sepultamento", "horários" se NÃO foram citados
- ❌ JAMAIS escreva: "O conteúdo foi publicado em...", "O post obteve X curtidas", "O perfil @tal publicou..."
- ❌ JAMAIS use meta-linguagem: "Segundo o texto fornecido...", "Baseado nas informações..."
- ⚠️ SE O TEXTO É VAGO (ex: "Descanse em paz"), NÃO invente detalhes - faça uma matéria curta e genérica

✅ O QUE VOCÊ DEVE FAZER (ESTILO METRÓPOLES):
1. ✅ Use as informações que estão no texto original como BASE PRINCIPAL
2. ✅ ${temInfoInternet ? 'Use as informações da internet para ENRIQUECER com contexto (quem é a pessoa, histórico, etc)' : 'Use APENAS as informações do texto original'}
3. ✅ Reorganize essas informações em estrutura jornalística profissional
4. ✅ Melhore a fluidez e conectivos entre as frases
5. ✅ Use sinônimos mantendo o sentido exato
6. ✅ Torne o texto informativo e direto
7. ✅ Se houver citações no original, mantenha-as exatamente como estão
8. ✅ Se NÃO houver citações, NÃO invente nenhuma

📏 TAMANHO DO CONTEÚDO:
- ${temInfoInternet ? 'A matéria pode ser mais completa usando as informações da internet' : 'Escreva APENAS com base no que foi fornecido'}
- Se o texto original é curto, a matéria será curta (200-300 palavras está OK)
- Se o texto original é longo, a matéria será mais longa
- NÃO force expansão artificial do conteúdo`;
    } else {
      // Verificar se tem informações da internet para usar
      const temInfoInternet = pesquisarInternet && informacoesPesquisaInternet && informacoesPesquisaInternet.length > 50;
      
      if (temInfoInternet) {
        // TEM informações da internet - usar como base factual
        promptInstrucao = `⚠️ TAREFA IMPORTANTE: Crie uma matéria jornalística COMPLETA no estilo do portal Metrópoles sobre o tema abaixo.

📰 VOCÊ TEM INFORMAÇÕES REAIS DA INTERNET - USE-AS!
As informações abaixo foram pesquisadas na internet e são FATOS REAIS. Use-as para criar uma matéria factual e atualizada.

🚨 REGRAS IMPORTANTES:
- ✅ USE as informações da internet fornecidas como BASE PRINCIPAL da matéria
- ✅ Cite fatos, datas, declarações e eventos mencionados nas notícias
- ✅ Mantenha um tom jornalístico profissional, direto e objetivo (Estilo Metrópoles)
- ✅ Combine as informações de diferentes fontes de forma coerente
- ✅ Priorize as informações mais recentes e relevantes
- ❌ NÃO invente informações além do que foi fornecido
- ❌ NÃO adicione citações que não existem nas fontes
- ❌ JAMAIS use meta-linguagem: "Segundo informações...", "Baseado em..."

✅ O QUE VOCÊ DEVE FAZER:
1. ✅ Usar as informações da internet como base factual
2. ✅ Organizar as informações em estrutura jornalística
3. ✅ Manter tom profissional e sério
4. ✅ Ser objetivo e direto
5. ✅ Criar uma narrativa coerente com os fatos disponíveis

📏 TAMANHO DO CONTEÚDO:
- Matéria completa (400-600 palavras)
- Use todas as informações relevantes disponíveis
- Seja detalhado mas objetivo`;
      } else {
        // NÃO tem informações da internet - usar conhecimento geral
        promptInstrucao = `⚠️ TAREFA: Crie uma matéria jornalística no estilo do portal Metrópoles sobre o tema abaixo.

🚨 REGRAS IMPORTANTES:
- ✅ Use informações gerais e conhecimento público VERIFICÁVEL sobre o tema
- ✅ Mantenha um tom jornalístico profissional, direto e objetivo (Estilo Metrópoles)
- ✅ Se você NÃO tem informações específicas sobre o tema, seja genérico mas factual
- ❌ NÃO invente números específicos, datas ou eventos que você não tem certeza
- ❌ NÃO invente declarações ou citações de pessoas específicas
- ❌ NÃO especule sobre quantidades ("500 pessoas", "milhares de fiéis") sem base
- ❌ JAMAIS escreva: "O conteúdo foi publicado em...", "O post obteve X curtidas"
- ❌ JAMAIS use meta-linguagem: "Segundo informações...", "Baseado em..."

✅ O QUE VOCÊ PODE FAZER:
1. ✅ Escrever sobre o tema de forma geral e contextual
2. ✅ Usar conhecimento público sobre o assunto
3. ✅ Manter tom jornalístico profissional e sério
4. ✅ Ser objetivo e direto
5. ✅ Se mencionar pessoas, use apenas informações públicas conhecidas

📏 TAMANHO DO CONTEÚDO:
- Matéria de tamanho médio (300-500 palavras)
- Não force expansão artificial
- Seja conciso e direto`;
      }
    }

    const prompt = `${promptInstrucao}

TEMA: ${tema}
CATEGORIA: ${categoria}
${palavrasChave ? `PALAVRAS-CHAVE: ${palavrasChave}` : ''}
${informacoesAdicionais ? `\n${informacoesAdicionais}` : ''}

ESTRUTURA OBRIGATÓRIA:

1. TÍTULO (máximo 80 caracteres):
   - Impactante, jornalístico e direto (estilo Metrópoles)
   - Baseado APENAS no fato principal mencionado
   - Sem sensacionalismo exagerado, foco na notícia

2. DESCRIÇÃO/RESUMO (máximo 160 caracteres):
   - Brief, direct introduction summarizing the lead
   - Linguagem simples e direta

3. CONTEÚDO HTML:

   a) LIDE (1-2 parágrafos): Fato principal de forma DIRETA
      - Comece com o fato mais importante (Quem, o quê, onde, quando)
      - Texto objetivo, sem rodeios

   b) DESENVOLVIMENTO (1-3 parágrafos conforme o conteúdo disponível):
      - Use <h3> para subtítulos APENAS se fizer sentido e o texto for longo
      - Mantenha parágrafos de tamanho médio (3-5 linhas)
      - Desenvolva APENAS os pontos mencionados no original ou fatos públicos conhecidos
      - Conecte os parágrafos de forma lógica

   c) CITAÇÕES (SE HOUVER):
      - Use <blockquote> para citações que já existem
      - NÃO crie citações novas
      - Se NÃO há citações, NÃO adicione nenhuma

   d) CONCLUSÃO (1 parágrafo):
      - Encerramento informativo baseado no contexto
      - EVITE: "hora de repensar", "chamado à reflexão"
      - PREFIRA: Informações sobre desdobramentos ou contexto final

FORMATAÇÃO HTML - MUITO IMPORTANTE:
- Use <p>texto aqui</p> para CADA parágrafo
- NÃO adicione <p></p> vazios entre parágrafos
- NÃO adicione <br> entre parágrafos
- Use <h3>Subtítulo</h3> APENAS se necessário
- Use <blockquote>citação</blockquote> APENAS para citações que JÁ EXISTEM
- Use <strong> apenas para nomes importantes
- Formato: <p>texto1</p><p>texto2</p><h3>título</h3><p>texto3</p>

LINGUAGEM (ESTILO METRÓPOLES):
- ✅ Tom informativo, sério e direto
- ✅ Parágrafos bem estruturados
- ✅ Uso de voz ativa preferencialmente
- ✅ Vocabulário jornalístico padrão
- ❌ Evite gírias, exclamações excessivas ou linguagem muito informal
- ❌ Evite opiniões pessoais ou juízos de valor

⚠️ LEMBRE-SE: É MELHOR uma matéria curta e fiel ao original do que uma matéria longa com informações inventadas!

IMPORTANTE: O conteúdo HTML deve estar em UMA ÚNICA LINHA (sem quebras de linha reais, apenas tags HTML).

Retorne APENAS um objeto JSON válido:
{"titulo": "título da matéria", "descricao": "descrição curta", "conteudo": "HTML completo em uma linha"}`;

    const messages = [
      {
        role: 'system',
        content: systemRole
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    console.log('🤖 Fazendo requisição para a IA...');
    // Temperatura 0.3 (baixa) para ser mais fiel ao conteúdo e evitar invenções
    const response = await this.makeRequest(messages, 0.3, 3000);
    console.log('✅ Resposta recebida da IA (primeiros 200 chars):', response.substring(0, 200));

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
            console.log('📸 Buscando imagens no Google...');

            const imagensRelevantes = await this.buscarImagensGoogle(palavrasChave);

            // Adicionar embed do Instagram se houver link de referência
            let conteudoFinal = parsed.conteudo;
            console.log('🔗 Links recebidos:', links);

            // Verificar se o conteúdo já contém um embed do Instagram
            const jaTemEmbed = conteudoFinal.includes('instagram-media') || conteudoFinal.includes('instagram.com/p/');

            if (!jaTemEmbed && links && links.length > 0 && links[0].includes('instagram.com')) {
              console.log('📱 Adicionando embed completo do Instagram:', links[0]);
              
              // Normalizar URL do Instagram para formato embed
              let embedUrl = links[0];
              if (!embedUrl.includes('utm_source=ig_embed')) {
                embedUrl = embedUrl.replace(/\/$/, '') + '/?utm_source=ig_embed&utm_campaign=loading';
              }
              
              // Embed completo do Instagram com todos os estilos e estrutura
              const embedCode = `<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="${embedUrl}" data-instgrm-version="14" style=" background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);"><div style="padding:16px;"> <a href="${embedUrl}" style=" background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%;" target="_blank"> <div style=" display: flex; flex-direction: row; align-items: center;"> <div style="background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 40px; margin-right: 14px; width: 40px;"></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 100px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 60px;"></div></div></div><div style="padding: 19% 0;"></div> <div style="display:block; height:50px; margin:0 auto 12px; width:50px;"><svg width="50px" height="50px" viewBox="0 0 60 60" version="1.1" xmlns="https://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g transform="translate(-511.000000, -20.000000)" fill="#000000"><g><path d="M556.869,30.41 C554.814,30.41 553.148,32.076 553.148,34.131 C553.148,36.186 554.814,37.852 556.869,37.852 C558.924,37.852 560.59,36.186 560.59,34.131 C560.59,32.076 558.924,30.41 556.869,30.41 M541,60.657 C535.114,60.657 530.342,55.887 530.342,50 C530.342,44.114 535.114,39.342 541,39.342 C546.887,39.342 551.658,44.114 551.658,50 C551.658,55.887 546.887,60.657 541,60.657 M541,33.886 C532.1,33.886 524.886,41.1 524.886,50 C524.886,58.899 532.1,66.113 541,66.113 C549.9,66.113 557.115,58.899 557.115,50 C557.115,41.1 549.9,33.886 541,33.886 M565.378,62.101 C565.244,65.022 564.756,66.606 564.346,67.663 C563.803,69.06 563.154,70.057 562.106,71.106 C561.058,72.155 560.06,72.803 558.662,73.347 C557.607,73.757 556.021,74.244 553.102,74.378 C549.944,74.521 548.997,74.552 541,74.552 C533.003,74.552 532.056,74.521 528.898,74.378 C525.979,74.244 524.393,73.757 523.338,73.347 C521.94,72.803 520.942,72.155 519.894,71.106 C518.846,70.057 518.197,69.06 517.654,67.663 C517.244,66.606 516.755,65.022 516.623,62.101 C516.479,58.943 516.448,57.996 516.448,50 C516.448,42.003 516.479,41.056 516.623,37.899 C516.755,34.978 517.244,33.391 517.654,32.338 C518.197,30.938 518.846,29.942 519.894,28.894 C520.942,27.846 521.94,27.196 523.338,26.654 C524.393,26.244 525.979,25.756 528.898,25.623 C532.057,25.479 533.004,25.448 541,25.448 C548.997,25.448 549.943,25.479 553.102,25.623 C556.021,25.756 557.607,26.244 558.662,26.654 C560.06,27.196 561.058,27.846 562.106,28.894 C563.154,29.942 563.803,30.938 564.346,32.338 C564.756,33.391 565.244,34.978 565.378,37.899 C565.522,41.056 565.552,42.003 565.552,50 C565.552,57.996 565.522,58.943 565.378,62.101 M570.82,37.631 C570.674,34.438 570.167,32.258 569.425,30.349 C568.659,28.377 567.633,26.702 565.965,25.035 C564.297,23.368 562.623,22.342 560.652,21.575 C558.743,20.834 556.562,20.326 553.369,20.18 C550.169,20.033 549.148,20 541,20 C532.853,20 531.831,20.033 528.631,20.18 C525.438,20.326 523.257,20.834 521.349,21.575 C519.376,22.342 517.703,23.368 516.035,25.035 C514.368,26.702 513.342,28.377 512.574,30.349 C511.834,32.258 511.326,34.438 511.181,37.631 C511.035,40.831 511,41.851 511,50 C511,58.147 511.035,59.17 511.181,62.369 C511.326,65.562 511.834,67.743 512.574,69.651 C513.342,71.625 514.368,73.296 516.035,74.965 C517.703,76.634 519.376,77.658 521.349,78.425 C523.257,79.167 525.438,79.673 528.631,79.82 C531.831,79.965 532.853,80.001 541,80.001 C549.148,80.001 550.169,79.965 553.369,79.82 C556.562,79.673 558.743,79.167 560.652,78.425 C562.623,77.658 564.297,76.634 565.965,74.965 C567.633,73.296 568.659,71.625 569.425,69.651 C570.167,67.743 570.674,65.562 570.82,62.369 C570.966,59.17 571,58.147 571,50 C571,41.851 570.966,40.831 570.82,37.631"></path></g></g></g></svg></div><div style="padding-top: 8px;"> <div style=" color:#3897f0; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:550; line-height:18px;">Ver essa foto no Instagram</div></div><div style="padding: 12.5% 0;"></div> <div style="display: flex; flex-direction: row; margin-bottom: 14px; align-items: center;"><div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(0px) translateY(7px);"></div> <div style="background-color: #F4F4F4; height: 12.5px; transform: rotate(-45deg) translateX(3px) translateY(1px); width: 12.5px; flex-grow: 0; margin-right: 14px; margin-left: 2px;"></div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(9px) translateY(-18px);"></div></div><div style="margin-left: 8px;"> <div style=" background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 20px; width: 20px;"></div> <div style=" width: 0; height: 0; border-top: 2px solid transparent; border-left: 6px solid #f4f4f4; border-bottom: 2px solid transparent; transform: translateX(16px) translateY(-4px) rotate(30deg)"></div></div><div style="margin-left: auto;"> <div style=" width: 0px; border-top: 8px solid #F4F4F4; border-right: 8px solid transparent; transform: translateY(16px);"></div> <div style=" background-color: #F4F4F4; flex-grow: 0; height: 12px; width: 16px; transform: translateY(-4px);"></div> <div style=" width: 0; height: 0; border-top: 8px solid #F4F4F4; border-left: 8px solid transparent; transform: translateY(-4px) translateX(8px);"></div></div></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center; margin-bottom: 24px;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 224px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 144px;"></div></div></a><p style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; line-height:17px; margin-bottom:0; margin-top:8px; overflow:hidden; padding:8px 0 7px; text-align:center; text-overflow:ellipsis; white-space:nowrap;"><a href="${embedUrl}" style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:normal; line-height:17px; text-decoration:none;" target="_blank">Uma publicação compartilhada no Instagram</a></p></div></blockquote><script async src="//www.instagram.com/embed.js"></script>`;

              // Adicionar embed no final do conteúdo
              conteudoFinal += embedCode;
              console.log('✅ Embed completo do Instagram adicionado ao conteúdo');
            } else if (jaTemEmbed) {
              console.log('ℹ️ Conteúdo já contém embed do Instagram, pulando adição');
            } else {
              console.log('⚠️ Nenhum link do Instagram encontrado');
            }

            // Adicionar imagens sugeridas ao resultado (prioriza as baseadas no título)
            const resultado = {
              ...parsed,
              conteudo: conteudoFinal,
              imagensSugeridas: imagensRelevantes.length > 0 ? imagensRelevantes : imagensSugeridas
            };

            // Log para debug
            console.log('📝 Conteúdo final contém embed?', conteudoFinal.includes('instagram-media'));
            console.log('📏 Tamanho do conteúdo:', conteudoFinal.length);

            return resultado;
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
              console.log('📸 Buscando imagens no Google...');

              const imagensRelevantes = await this.buscarImagensGoogle(palavrasChave);

              // Adicionar embed do Instagram se houver link de referência
              let conteudoFinal = parsed.conteudo;
              console.log('🔗 Links recebidos (2ª tentativa):', links);

              // Verificar se o conteúdo já contém um embed do Instagram
              const jaTemEmbed = conteudoFinal.includes('instagram-media') || conteudoFinal.includes('instagram.com/p/');

              if (!jaTemEmbed && links && links.length > 0 && links[0].includes('instagram.com')) {
                console.log('📱 Adicionando embed do Instagram (2ª tentativa):', links[0]);
                const embedCode = `<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="${links[0]}" data-instgrm-version="14" style="margin: 30px auto; max-width: 540px;"></blockquote>`;

                // Adicionar embed no final do conteúdo
                conteudoFinal += embedCode;
                console.log('✅ Embed adicionado ao conteúdo (2ª tentativa)');
              } else if (jaTemEmbed) {
                console.log('ℹ️ Conteúdo já contém embed do Instagram (2ª tentativa), pulando adição');
              } else {
                console.log('⚠️ Nenhum link do Instagram encontrado (2ª tentativa)');
              }

              // Adicionar imagens sugeridas ao resultado (prioriza as baseadas no título)
              const resultado = {
                ...parsed,
                conteudo: conteudoFinal,
                imagensSugeridas: imagensRelevantes.length > 0 ? imagensRelevantes : imagensSugeridas
              };

              // Log para debug
              console.log('📝 Conteúdo final contém embed? (2ª tentativa)', conteudoFinal.includes('instagram-media'));
              console.log('📏 Tamanho do conteúdo: (2ª tentativa)', conteudoFinal.length);

              return resultado;
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
                console.log('📸 Buscando imagens no Google...');

                const imagensRelevantes = await this.buscarImagensGoogle(palavrasChave);

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

    // 🔹 PRESERVAR EMBEDS DO INSTAGRAM (apenas para conteúdo)
    let embedsInstagram = [];
    let textoSemEmbeds = texto;
    
    if (tipo === 'conteudo') {
      const embedRegex = /<blockquote[^>]*class="instagram-media"[^>]*>[\s\S]*?<\/blockquote>(?:\s*<script[^>]*src="[^"]*instagram\.com[^"]*"[^>]*><\/script>)?/gi;
      
      let match;
      while ((match = embedRegex.exec(texto)) !== null) {
        embedsInstagram.push(match[0]);
        console.log(`📱 Embed do Instagram #${embedsInstagram.length} encontrado e preservado (corrigir texto)`);
      }
      
      textoSemEmbeds = texto.replace(embedRegex, '');
      console.log(`✅ ${embedsInstagram.length} embed(s) do Instagram preservado(s) (corrigir texto)`);
    }

    const prompt = `Você é um revisor de textos especializado em português brasileiro.

          Corrija o seguinte ${tipoTexto}, mantendo o sentido original:

          ${textoSemEmbeds}

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

    let resultado = await this.makeRequest(messages, 0.3, 2000);
    
    // 🔹 REINSERIR EMBEDS DO INSTAGRAM NO FINAL
    if (embedsInstagram.length > 0) {
      console.log(`📱 Reinserindo ${embedsInstagram.length} embed(s) do Instagram (corrigir texto)`);
      embedsInstagram.forEach((embed, index) => {
        resultado += `<br><br>${embed}`;
        console.log(`✅ Embed #${index + 1} reinserido (corrigir texto)`);
      });
    }
    
    return resultado;
  }

  /**
   * Processa mensagens do Assistente IA contextual
   * Entende o que o usuário quer e gera sugestões apropriadas
   */
  static async processarAssistenteIA(mensagem, contexto = {}, pesquisarInternet = false) {
    if (!await this.isActive()) {
      throw new Error('O assistente de IA está desativado');
    }

    console.log('🤖 Processando assistente IA...');
    console.log('📝 Mensagem:', mensagem);
    console.log('🌐 Pesquisar Internet:', pesquisarInternet);

    const { titulo, descricao, conteudo } = contexto;
    const mensagemLower = mensagem.toLowerCase();

    // Detectar intenção do usuário
    let intencao = 'completa'; // padrão
    let campoAlvo = 'todos';
    
    // Detectar se quer alterar apenas o título
    if ((mensagemLower.includes('título') || mensagemLower.includes('titulo')) && 
        !mensagemLower.includes('descrição') && !mensagemLower.includes('descricao') && 
        !mensagemLower.includes('conteúdo') && !mensagemLower.includes('conteudo') &&
        !mensagemLower.includes('matéria') && !mensagemLower.includes('materia') &&
        !mensagemLower.includes('completa') && !mensagemLower.includes('tudo')) {
      intencao = 'titulo';
      campoAlvo = 'titulo';
    }
    // Detectar se quer alterar apenas a descrição
    else if ((mensagemLower.includes('descrição') || mensagemLower.includes('descricao')) && 
             !mensagemLower.includes('título') && !mensagemLower.includes('titulo') && 
             !mensagemLower.includes('conteúdo') && !mensagemLower.includes('conteudo') &&
             !mensagemLower.includes('matéria') && !mensagemLower.includes('materia') &&
             !mensagemLower.includes('completa') && !mensagemLower.includes('tudo')) {
      intencao = 'descricao';
      campoAlvo = 'descricao';
    }
    // Detectar se quer alterar apenas o conteúdo
    else if ((mensagemLower.includes('conteúdo') || mensagemLower.includes('conteudo') || 
              mensagemLower.includes('texto') || mensagemLower.includes('corpo')) && 
             !mensagemLower.includes('título') && !mensagemLower.includes('titulo') && 
             !mensagemLower.includes('descrição') && !mensagemLower.includes('descricao') &&
             !mensagemLower.includes('matéria completa') && !mensagemLower.includes('materia completa') &&
             !mensagemLower.includes('tudo')) {
      intencao = 'conteudo';
      campoAlvo = 'conteudo';
    }
    // Detectar se quer matéria completa
    else if (mensagemLower.includes('matéria completa') || mensagemLower.includes('materia completa') ||
             mensagemLower.includes('crie uma matéria') || mensagemLower.includes('crie uma materia') ||
             mensagemLower.includes('faça uma matéria') || mensagemLower.includes('faca uma materia') ||
             mensagemLower.includes('criar matéria') || mensagemLower.includes('criar materia') ||
             mensagemLower.includes('gere uma matéria') || mensagemLower.includes('gere uma materia') ||
             (mensagemLower.includes('crie') && mensagemLower.includes('sobre')) ||
             (mensagemLower.includes('faça') && mensagemLower.includes('sobre')) ||
             (mensagemLower.includes('escreva') && mensagemLower.includes('sobre'))) {
      intencao = 'completa';
      campoAlvo = 'todos';
    }

    console.log('🎯 Intenção detectada:', intencao, '| Campo alvo:', campoAlvo);

    // Se pesquisar na internet, buscar informações relevantes
    let informacoesInternet = '';
    if (pesquisarInternet) {
      try {
        console.log('🔍 Buscando informações na internet...');
        const resultadosPesquisa = await this.buscarNoticiasAtuais(mensagem);
        if (resultadosPesquisa && resultadosPesquisa.length > 0) {
          informacoesInternet = '\n\nINFORMAÇÕES ENCONTRADAS NA INTERNET:\n';
          resultadosPesquisa.slice(0, 5).forEach((r, i) => {
            informacoesInternet += `\n${i + 1}. ${r.titulo}\n   ${r.resumo || r.descricao || ''}\n   Fonte: ${r.fonte || r.link}\n`;
          });
          console.log('✅ Encontradas', resultadosPesquisa.length, 'notícias relevantes');
        }
      } catch (err) {
        console.error('⚠️ Erro ao pesquisar na internet:', err.message);
      }
    }

    // Montar prompt baseado na intenção
    let promptInstrucao = '';
    let formatoResposta = '';

    if (intencao === 'titulo') {
      promptInstrucao = `O usuário quer APENAS alterar o TÍTULO. NÃO mexa na descrição nem no conteúdo.
Analise o pedido e crie um novo título baseado na instrução do usuário.`;
      formatoResposta = `{
  "resposta": "Mensagem explicando a alteração do título",
  "sugestoes": [{
    "campo": "titulo",
    "texto": "Novo título aqui (máximo 100 caracteres)"
  }]
}`;
    } else if (intencao === 'descricao') {
      promptInstrucao = `O usuário quer APENAS alterar a DESCRIÇÃO. NÃO mexa no título nem no conteúdo.
Analise o pedido e crie uma nova descrição baseada na instrução do usuário.`;
      formatoResposta = `{
  "resposta": "Mensagem explicando a alteração da descrição",
  "sugestoes": [{
    "campo": "descricao",
    "texto": "Nova descrição aqui (máximo 200 caracteres)"
  }]
}`;
    } else if (intencao === 'conteudo') {
      promptInstrucao = `O usuário quer APENAS alterar o CONTEÚDO. NÃO mexa no título nem na descrição.
Analise o pedido e modifique/acrescente ao conteúdo baseado na instrução do usuário.`;
      formatoResposta = `{
  "resposta": "Mensagem explicando a alteração do conteúdo",
  "sugestoes": [{
    "campo": "conteudo",
    "texto": "Conteúdo em HTML com <p>, <h3>, <ul>, etc"
  }]
}`;
    } else {
      promptInstrucao = `O usuário quer criar uma MATÉRIA COMPLETA. Crie título, descrição e conteúdo.`;
      formatoResposta = `{
  "resposta": "Mensagem explicando o que foi criado",
  "sugestoes": [{
    "campo": "todos",
    "titulo": "Título impactante (máximo 100 caracteres)",
    "descricao": "Descrição atraente (máximo 200 caracteres)",
    "conteudo": "Matéria completa em HTML com <p>, <h3>, <ul>, etc (mínimo 800 palavras)"
  }]
}`;
    }

    // Prompt para entender a intenção e gerar resposta
    const prompt = `Você é um assistente de IA para criação de matérias jornalísticas gospel.

CONTEXTO ATUAL DO POST:
${titulo ? `- Título: "${titulo}"` : '- Título: (vazio)'}
${descricao ? `- Descrição: "${descricao}"` : '- Descrição: (vazio)'}
${conteudo ? `- Conteúdo: "${conteudo.substring(0, 500)}${conteudo.length > 500 ? '...' : ''}"` : '- Conteúdo: (vazio)'}
${informacoesInternet}

PEDIDO DO USUÁRIO: "${mensagem}"

INSTRUÇÃO IMPORTANTE:
${promptInstrucao}

${pesquisarInternet ? 'Use as informações encontradas na internet para enriquecer o conteúdo.' : ''}

REGRAS:
- Estilo jornalístico profissional (Metrópoles/G1)
- Linguagem clara e envolvente
- Seja factual e evite sensacionalismo exagerado
${intencao === 'titulo' ? '- Crie um título impactante e chamativo (máximo 100 caracteres)' : ''}
${intencao === 'descricao' ? '- Crie uma descrição atraente e informativa (máximo 200 caracteres)' : ''}
${intencao === 'conteudo' ? '- Modifique apenas o conteúdo conforme solicitado, mantendo a estrutura HTML' : ''}
${intencao === 'completa' ? '- Crie uma matéria completa com mínimo de 800 palavras' : ''}

Responda APENAS com JSON válido no formato:
${formatoResposta}`;

    const messages = [
      {
        role: 'system',
        content: 'Você é um assistente de IA especializado em jornalismo gospel. Crie matérias completas, bem estruturadas e informativas. Responda sempre em JSON válido.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    try {
      const response = await this.makeRequest(messages, 0.7, 4000);
      
      // Parse do JSON
      let jsonStr = response.trim();
      if (jsonStr.includes('```')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      
      const resultado = JSON.parse(jsonStr);
      
      return {
        success: true,
        resposta: resultado.resposta || 'Aqui está a matéria que criei para você:',
        sugestoes: resultado.sugestoes || []
      };
    } catch (error) {
      console.error('Erro ao processar assistente:', error);
      return {
        success: false,
        error: 'Não consegui processar seu pedido. Tente ser mais específico.'
      };
    }
  }

  /**
   * Torna título ou descrição mais polêmico e chamativo
   */
  static async tornarPolemico(texto, tipo = 'titulo') {
    if (!await this.isActive()) {
      throw new Error('O assistente de IA está desativado');
    }

    const tipoTexto = {
      'titulo': 'título',
      'descricao': 'descrição'
    }[tipo] || 'texto';

    const prompt = `Você é um especialista em criar ${tipoTexto}s polêmicos e chamativos para notícias gospel.

Transforme o seguinte ${tipoTexto} em algo mais polêmico, impactante e que gere curiosidade:

${texto}

REGRAS:
- Mantenha a essência e veracidade da informação
- Use palavras fortes e impactantes (ex: "choca", "revolta", "surpreende", "expõe", "denuncia")
- Crie senso de urgência ou controvérsia
- Seja direto e objetivo
- Não invente fatos, apenas reformule de forma mais polêmica
- ${tipo === 'titulo' ? 'Máximo 100 caracteres' : 'Máximo 200 caracteres'}
- Retorne APENAS o ${tipoTexto} reformulado, sem explicações

${tipoTexto.toUpperCase()} POLÊMICO:`;

    const messages = [
      {
        role: 'system',
        content: 'Você é um especialista em criar títulos e descrições polêmicas e impactantes para notícias gospel, sempre mantendo a veracidade.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    return await this.makeRequest(messages, 0.7, 150);
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

  /**
   * Processa múltiplos posts do Instagram e gera matérias
   * @param {Array} posts - Array de posts do Instagram
   * @param {string} categoria - Categoria das matérias
   * @param {boolean} pesquisarInternet - Se deve pesquisar informações adicionais na internet
   */
  static async processarPostsEmLote(posts, categoria = 'Notícias', pesquisarInternet = false) {
    if (!await this.isActive()) {
      throw new Error('O assistente de IA está desativado');
    }

    console.log(`🚀 Processando ${posts.length} posts em lote...`);
    console.log('🌐 Pesquisar na internet:', pesquisarInternet);
    console.log('📊 Posts recebidos:', JSON.stringify(posts, null, 2));
    const materias = [];
    const erros = [];

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];

      try {
        const postId = post.shortcode || post.id || post.url || `post-${i}`;
        console.log(`\n📝 Processando post ${i + 1}/${posts.length}: ${postId}`);
        console.log('📄 Dados do post:', JSON.stringify(post, null, 2));

        // 🎥 EXTRAIR CONTEÚDO COMPLETO DO INSTAGRAM (incluindo transcrição de vídeo)
        let conteudoCompleto = post.caption || '';
        
        // Se é um vídeo/reel, tentar transcrever
        if (post.url && (post.url.includes('/reel/') || post.url.includes('/reels/') || post.isVideo)) {
          console.log('🎥 Detectado vídeo/reel, tentando transcrever...');
          try {
            const conteudoExtraido = await this.extrairConteudoInstagram(post.url);
            if (conteudoExtraido && !conteudoExtraido.includes('Não foi possível extrair')) {
              // Combinar legenda com transcrição
              conteudoCompleto = conteudoExtraido;
              console.log('✅ Conteúdo extraído com transcrição:', conteudoCompleto.length, 'caracteres');
            }
          } catch (transcricaoError) {
            console.log('⚠️ Erro na transcrição, usando apenas caption:', transcricaoError.message);
          }
        }

        // Verificar se o post tem conteúdo suficiente
        const textoParaValidar = conteudoCompleto.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        if (textoParaValidar.length < 50) {
          console.log(`⚠️ Post ${postId} ignorado: texto muito curto (${textoParaValidar.length} caracteres)`);
          erros.push({
            post: post,
            erro: 'Texto da postagem muito curto (mínimo 50 caracteres)'
          });
          continue;
        }

        // Validar qualidade do caption (evitar apenas hashtags/emojis)
        const captionLimpo = textoParaValidar.replace(/[#@\u{1F300}-\u{1F9FF}]/gu, '').trim();
        if (captionLimpo.length < 50) {
          console.log(`⚠️ Post ${postId} ignorado: caption sem conteúdo significativo (apenas hashtags/emojis)`);
          erros.push({
            post: post,
            erro: 'Caption sem conteúdo textual suficiente (apenas hashtags/emojis)'
          });
          continue;
        }

        // Log do conteúdo que será enviado para a IA
        console.log('📋 Conteúdo do post (primeiros 300 chars):', conteudoCompleto.substring(0, 300));
        console.log('📏 Tamanho do conteúdo:', conteudoCompleto.length, 'caracteres');

        // 🌐 PESQUISAR NA INTERNET PARA COMPLEMENTAR (se habilitado)
        let informacoesInternet = '';
        if (pesquisarInternet) {
          console.log('🌐 Pesquisando informações complementares na internet...');
          try {
            // Limpar texto para query de pesquisa
            const queryPesquisa = captionLimpo.substring(0, 200);
            console.log('🔍 Query de pesquisa:', queryPesquisa.substring(0, 100) + '...');
            
            // Buscar notícias relacionadas
            const noticias = await this.buscarNoticiasAtuais(queryPesquisa);
            if (noticias.length > 0) {
              informacoesInternet += '\n\n📰 NOTÍCIAS RELACIONADAS:\n';
              noticias.forEach((n, idx) => {
                informacoesInternet += `${idx + 1}. ${n.titulo}\n   ${n.descricao || ''}\n`;
              });
              console.log(`✅ Encontradas ${noticias.length} notícias relacionadas`);
            }
            
            // Buscar no DuckDuckGo
            const resultadosDDG = await this.pesquisarInternet(queryPesquisa + ' gospel evangélico');
            if (resultadosDDG.length > 0) {
              informacoesInternet += '\n\n📚 INFORMAÇÕES ADICIONAIS:\n';
              resultadosDDG.forEach((r, idx) => {
                informacoesInternet += `${idx + 1}. ${r.titulo}\n   ${r.snippet}\n`;
              });
              console.log(`✅ Encontradas ${resultadosDDG.length} informações adicionais`);
            }
          } catch (pesquisaError) {
            console.log('⚠️ Erro na pesquisa na internet:', pesquisaError.message);
          }
        }

        // Criar matéria usando o prompt do estilo G1 com informações da internet
        const materia = await this.gerarMateriaEstiloG1ComPesquisa(
          conteudoCompleto, // conteúdo do post (com transcrição se houver)
          categoria,
          post.url, // link do post como referência
          informacoesInternet // informações da internet
        );

        // Priorizar imagem do Instagram se disponível
        let imagensSugeridas = materia.imagensSugeridas || [];

        // Se o post tem thumbnail, tentar baixar e adicionar como primeira opção
        if (post.thumbnail) {
          console.log(`📸 Baixando imagem do Instagram: ${post.thumbnail.substring(0, 80)}...`);

          try {
            // Baixar imagem diretamente no serviço ao invés de chamar API
            const axios = require('axios');
            const fs = require('fs');
            const path = require('path');
            const sharp = require('sharp');
            const { Media } = require('../models');

            // Baixar a imagem
            const response = await axios.get(post.thumbnail, {
              responseType: 'arraybuffer',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                'Referer': 'https://www.instagram.com/',
                'Origin': 'https://www.instagram.com'
              },
              timeout: 15000
            });

            // Gerar nome único para o arquivo
            const timestamp = Date.now();
            const randomStr = Math.round(Math.random() * 1E9);
            const webpFilename = `instagram-${timestamp}-${randomStr}.webp`;
            const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
            const webpPath = path.join(uploadDir, webpFilename);

            // Criar diretório se não existir
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }

            // Converter para WebP e salvar
            await sharp(response.data)
              .webp({ quality: 85 })
              .toFile(webpPath);

            // Pegar tamanho do arquivo
            const stats = fs.statSync(webpPath);
            const fileSize = stats.size;

            const publicUrl = `/uploads/${webpFilename}`;
            console.log(`✅ Imagem baixada e salva: ${publicUrl}`);

            // Salvar na biblioteca de mídia
            try {
              const media = await Media.create({
                nome: webpFilename,
                nomeOriginal: `Instagram - ${materia.titulo.substring(0, 50)}`,
                tipo: 'imagem',
                mimeType: 'image/webp',
                tamanho: fileSize,
                url: publicUrl,
                userId: 3 // ID do admin (atualizado para 3 pois 1 não existe mais)
              });
              console.log(`✅ Imagem salva na biblioteca de mídia: ID ${media.id}`);
            } catch (dbError) {
              console.error('⚠️ Erro ao salvar na biblioteca, mas arquivo foi salvo:', dbError.message);
            }

            imagensSugeridas.unshift({
              url: publicUrl,
              descricao: 'Imagem original do post do Instagram',
              origem: 'instagram',
              local: true
            });
          } catch (error) {
            console.log(`⚠️ Erro ao baixar imagem: ${error.message}, usando URL direta`);
            imagensSugeridas.unshift({
              url: post.thumbnail,
              descricao: 'Imagem original do post do Instagram',
              origem: 'instagram'
            });
          }
        }

        console.log(`🖼️ Total de imagens disponíveis: ${imagensSugeridas.length} (Instagram: ${post.thumbnail ? 'Sim' : 'Não'})`);

        // Adicionar informações do post original
        materias.push({
          ...materia,
          imagensSugeridas, // Imagens com Instagram em primeiro
          instagramPostId: post.id || post.url, // ID do post para tracking
          postOriginal: {
            url: post.url,
            shortcode: post.shortcode,
            likes: post.likes,
            comments: post.comments,
            timestamp: post.timestamp,
            thumbnail: post.thumbnail
          },
          status: 'gerada'
        });

        console.log(`✅ Matéria ${i + 1} gerada com sucesso: ${materia.titulo}`);

        // Aguardar 2 segundos entre requisições para não sobrecarregar a API
        if (i < posts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        const postId = post.shortcode || post.id || post.url || `post-${i}`;
        console.error(`❌ Erro ao processar post ${postId}:`, error.message);
        console.error('Stack trace:', error.stack);
        erros.push({
          post: post,
          erro: error.message
        });
      }
    }

    console.log(`\n✅ Processamento concluído: ${materias.length} matérias geradas, ${erros.length} erros`);

    return {
      materias,
      erros,
      total: posts.length,
      sucesso: materias.length,
      falhas: erros.length
    };
  }

  /**
   * Expandir conteúdo com IA - gera mais informações baseadas no texto fornecido
   */
  static async expandirConteudo(conteudo) {
    if (!await this.isActive()) {
      throw new Error('O assistente de IA está desativado');
    }

    if (!conteudo || conteudo.trim().length < 20) {
      throw new Error('Conteúdo muito curto para expandir (mínimo 20 caracteres)');
    }

    console.log('🔄 Expandindo conteúdo com IA...');

    // 🔹 PRESERVAR EMBEDS DO INSTAGRAM
    const embedsInstagram = [];
    let conteudoSemEmbeds = conteudo;
    
    const embedRegex = /<blockquote[^>]*class="instagram-media"[^>]*>[\s\S]*?<\/blockquote>(?:\s*<script[^>]*src="[^"]*instagram\.com[^"]*"[^>]*><\/script>)?/gi;
    
    let match;
    while ((match = embedRegex.exec(conteudo)) !== null) {
      embedsInstagram.push(match[0]);
      console.log(`📱 Embed do Instagram #${embedsInstagram.length} encontrado e preservado (expandir conteúdo)`);
    }
    
    conteudoSemEmbeds = conteudo.replace(embedRegex, '');
    console.log(`✅ ${embedsInstagram.length} embed(s) do Instagram preservado(s) (expandir conteúdo)`);

    const messages = [
      {
        role: 'system',
        content: 'Você é um assistente jornalístico que ajuda a organizar e estruturar melhor informações já fornecidas, sem inventar novos fatos.'
      },
      {
        role: 'user',
        content: `Você recebeu as seguintes informações sobre uma matéria:

${conteudoSemEmbeds}

Sua tarefa é REORGANIZAR e MELHORAR a estrutura dessas informações, tornando-as mais claras e organizadas para criar uma matéria jornalística.

⚠️ REGRAS CRÍTICAS - SIGA RIGOROSAMENTE:

1. ✅ MANTENHA TODOS os fatos exatamente como foram fornecidos
2. ✅ APENAS reorganize e melhore a estrutura do texto
3. ✅ Adicione conectivos e transições entre as informações
4. ✅ Separe em parágrafos lógicos (lide, desenvolvimento, repercussão)
5. ❌ NÃO invente detalhes que não foram mencionados
6. ❌ NÃO adicione nomes de lugares, datas ou números que não existem no texto original
7. ❌ NÃO especule sobre "onde foi gravado", "quantas visualizações teve", etc
8. ❌ NÃO adicione análises de "especialistas" ou "analistas" que não foram citados
9. ❌ NÃO expanda citações ou declarações além do que foi dito

FORMATO DE SAÍDA:
- Texto corrido, bem estruturado
- Parágrafos separados por quebras de linha duplas
- NÃO use formatação HTML
- NÃO adicione título
- Máximo 3-4 parágrafos

Exemplo CORRETO:
Entrada: "Pastor anuncia projeto social. Vai ajudar 100 famílias. Começa em janeiro."
Saída: "Um pastor anunciou um novo projeto social que vai beneficiar 100 famílias. A iniciativa está prevista para começar em janeiro."

Exemplo ERRADO (NÃO FAÇA ISSO):
"Um pastor da Igreja Batista Central, localizada no bairro Jardim das Flores, anunciou durante o culto de domingo à noite um ambicioso projeto social que pretende beneficiar 100 famílias carentes da região. Segundo especialistas em assistência social..."

Agora reorganize o conteúdo fornecido acima:`
      }
    ];

    try {
      // Temperatura baixa (0.3) para respostas mais conservadoras e fiéis ao original
      // Tokens limitados (800) para evitar expansões excessivas
      const response = await this.makeRequest(messages, 0.3, 800);

      if (!response || response.trim().length === 0) {
        throw new Error('IA retornou resposta vazia');
      }

      let conteudoExpandido = response.trim();
      
      // 🔹 REINSERIR EMBEDS DO INSTAGRAM NO FINAL
      if (embedsInstagram.length > 0) {
        console.log(`📱 Reinserindo ${embedsInstagram.length} embed(s) do Instagram (expandir conteúdo)`);
        embedsInstagram.forEach((embed, index) => {
          conteudoExpandido += `\n\n${embed}`;
          console.log(`✅ Embed #${index + 1} reinserido (expandir conteúdo)`);
        });
      }
      
      console.log('✅ Conteúdo reorganizado com sucesso');
      return conteudoExpandido;
    } catch (error) {
      console.error('❌ Erro ao expandir conteúdo:', error);
      throw error;
    }
  }

  /**
   * Gera matéria no estilo jornalístico G1 a partir de conteúdo
   * Usa o mesmo prompt do "Reescrever Matéria (Estilo G1)"
   */
  static async gerarMateriaEstiloG1(conteudoOriginal, categoria = 'Notícias', linkReferencia = null) {
    console.log('📝 Gerando matéria no estilo G1...');

    if (!conteudoOriginal || conteudoOriginal.trim().length < 50) {
      throw new Error('Conteúdo muito curto para gerar matéria (mínimo 50 caracteres)');
    }

    // Extrair texto limpo se vier com HTML
    const textoLimpo = conteudoOriginal
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const messages = [
      {
        role: 'system',
        content: 'Você é um jornalista experiente do portal Metrópoles. Seu estilo de escrita é direto, informativo, objetivo e levemente formal, mas acessível. Você prioriza a clareza e a precisão dos fatos.'
      },
      {
        role: 'user',
        content: `⚠️ TAREFA CRÍTICA: Crie uma matéria jornalística no estilo do portal Metrópoles baseada EXCLUSIVAMENTE no conteúdo abaixo.

🚨 REGRA ABSOLUTA - NÃO INVENTE NADA:
- ❌ NÃO invente números, datas, horários ou locais que NÃO foram mencionados
- ❌ NÃO adicione eventos, pessoas ou declarações que NÃO foram citados
- ❌ NÃO especule quantidades ("500 pessoas", "milhares de fiéis", "centenas de comentários")
- ❌ NÃO invente nomes de igrejas, cidades, bairros ou lugares
- ❌ NÃO adicione citações ou falas que NÃO existem no texto original
- ❌ NÃO invente contexto histórico ou background que NÃO foi mencionado
- ❌ NÃO adicione informações sobre "velório", "sepultamento", "horários" se NÃO foram citados
- ❌ JAMAIS escreva: "O conteúdo foi publicado em...", "O post obteve X curtidas", "O perfil @tal publicou..."
- ❌ JAMAIS use meta-linguagem: "Segundo o texto fornecido...", "Baseado nas informações..."
- ⚠️ SE O TEXTO É VAGO (ex: "Descanse em paz"), NÃO invente detalhes - faça uma matéria curta e genérica

✅ O QUE VOCÊ DEVE FAZER (ESTILO METRÓPOLES):
1. ✅ Use APENAS as informações que estão no texto original
2. ✅ Reorganize essas informações em estrutura jornalística profissional
3. ✅ Melhore a fluidez e conectivos entre as frases
4. ✅ Use sinônimos mantendo o sentido exato
5. ✅ Torne o texto informativo e direto
6. ✅ Se houver citações no original, mantenha-as exatamente como estão
7. ✅ Se NÃO houver citações, NÃO invente nenhuma

📏 TAMANHO DO CONTEÚDO:
- Escreva APENAS com base no que foi fornecido
- Se o texto original é curto, a matéria será curta (200-300 palavras está OK)
- Se o texto original é longo, a matéria será mais longa
- NÃO force expansão artificial do conteúdo

ESTRUTURA OBRIGATÓRIA:

1. TÍTULO (máximo 80 caracteres):
   - Impactante, jornalístico e direto (estilo Metrópoles)
   - Baseado APENAS no fato principal mencionado
   - Sem sensacionalismo exagerado, foco na notícia

2. DESCRIÇÃO/RESUMO (máximo 160 caracteres):
   - Breve introdução reforçando os principais fatos DO TEXTO ORIGINAL
   - Linguagem simples e direta, resumindo o lide

3. CONTEÚDO HTML:

   a) LIDE (1-2 parágrafos): Fato principal de forma DIRETA
      - Comece com o fato mais importante (Quem, o quê, onde, quando)
      - Texto objetivo, sem rodeios

   b) DESENVOLVIMENTO (1-3 parágrafos conforme o conteúdo disponível):
      - Use <h3> para subtítulos APENAS se fizer sentido e o texto for longo
      - Mantenha parágrafos de tamanho médio (3-5 linhas)
      - Desenvolva APENAS os pontos mencionados no original
      - Conecte os parágrafos de forma lógica

   c) CITAÇÕES (SE HOUVER no texto original):
      - Use <blockquote> para citações que já existem
      - NÃO crie citações novas
      - Se NÃO há citações no original, NÃO adicione nenhuma

   d) CONCLUSÃO (1 parágrafo):
      - Encerramento informativo baseado no contexto
      - EVITE: "hora de repensar", "chamado à reflexão"
      - PREFIRA: Informações sobre desdobramentos (se houver no texto) ou contexto final

FORMATAÇÃO HTML - MUITO IMPORTANTE:
- Use <p>texto aqui</p> para CADA parágrafo
- NÃO adicione <p></p> vazios entre parágrafos
- NÃO adicione <br> entre parágrafos
- Use <h3>Subtítulo</h3> APENAS se necessário
- Use <blockquote>citação</blockquote> APENAS para citações que JÁ EXISTEM
- Use <strong> apenas para nomes importantes
- Formato: <p>texto1</p><p>texto2</p><h3>título</h3><p>texto3</p>

LINGUAGEM (ESTILO METRÓPOLES):
- ✅ Tom informativo, sério e direto
- ✅ Parágrafos bem estruturados
- ✅ Uso de voz ativa preferencialmente
- ✅ Vocabulário jornalístico padrão
- ❌ Evite gírias, exclamações excessivas ou linguagem muito informal
- ❌ Evite opiniões pessoais ou juízos de valor

CONTEÚDO ORIGINAL (USE APENAS ISSO):
${textoLimpo}

CATEGORIA: ${categoria}

⚠️ LEMBRE-SE: É MELHOR uma matéria curta e fiel ao original do que uma matéria longa com informações inventadas!

IMPORTANTE: O conteúdo HTML deve estar em UMA ÚNICA LINHA (sem quebras de linha reais, apenas tags HTML).

Retorne APENAS um objeto JSON válido:
{"titulo": "título da matéria", "descricao": "descrição curta", "conteudo": "HTML completo em uma linha"}`
      }
    ];

    try {
      // Log do conteúdo que será enviado para a IA
      console.log('📄 Conteúdo do post (primeiros 200 chars):', textoLimpo.substring(0, 200));
      console.log('📏 Tamanho total do conteúdo:', textoLimpo.length, 'caracteres');

      // Temperatura 0.2 (MUITO baixa) para ser EXTREMAMENTE fiel ao original e evitar qualquer invenção
      const response = await this.makeRequest(messages, 0.2, 3000);

      if (!response || response.trim().length === 0) {
        throw new Error('IA retornou resposta vazia');
      }

      // Limpar a resposta removendo markdown code blocks se existirem
      let cleanResponse = response.trim();
      cleanResponse = cleanResponse.replace(/^```json\s*/i, '').replace(/\s*```$/, '');

      // Tentar extrair JSON da resposta
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Resposta da IA não contém JSON válido');
      }

      let jsonStr = jsonMatch[0];

      // Tentar parsear
      try {
        const parsed = JSON.parse(jsonStr);

        // Validar se tem os campos necessários
        if (!parsed.titulo || !parsed.descricao || !parsed.conteudo) {
          throw new Error('JSON não contém todos os campos necessários (titulo, descricao, conteudo)');
        }

        // Limpar tags vazias e adicionar espaçamento moderado
        let conteudoLimpo = parsed.conteudo.trim()
          .replace(/>\s+</g, '><')
          .replace(/<p>\s*<\/p>/gi, '')
          .replace(/<p>[\s\n\r]*<\/p>/gi, '')
          .replace(/<p><\/p>/gi, '')
          .replace(/<\/p><p><\/p><p>/gi, '</p><p>')
          .replace(/<\/p><p>\s*<\/p><p>/gi, '</p><p>')
          .replace(/(<br\s*\/?>\s*){2,}/gi, '<br>')
          .replace(/\s+<\//g, '</')
          .replace(/<\/p><p>/gi, '</p><br><p>')
          .replace(/<\/h3><p>/gi, '</h3><br><p>')
          .replace(/<\/blockquote><p>/gi, '</blockquote><br><p>');

        // Adicionar embed do Instagram se houver link de referência
        if (linkReferencia && linkReferencia.includes('instagram.com')) {
          const jaTemEmbed = conteudoLimpo.includes('instagram-media') || conteudoLimpo.includes('instagram.com/p/');

          if (!jaTemEmbed) {
            console.log('📱 Adicionando embed do Instagram:', linkReferencia);
            const embedCode = `<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="${linkReferencia}" data-instgrm-version="14" style="margin: 30px auto; max-width: 540px;"></blockquote>`;
            conteudoLimpo += embedCode;
          }
        }

        // Buscar imagens baseadas no título
        const palavrasChave = this.extrairPalavrasChave(parsed.titulo);
        console.log('🔍 Título:', parsed.titulo);
        console.log('🔑 Palavras-chave extraídas:', palavrasChave);
        console.log('📸 Buscando imagens no Google...');

        const imagensSugeridas = await this.buscarImagensGoogle(palavrasChave);

        console.log('✅ Matéria gerada com sucesso no estilo G1');

        return {
          titulo: parsed.titulo,
          descricao: parsed.descricao,
          conteudo: conteudoLimpo,
          imagensSugeridas: imagensSugeridas
        };

      } catch (parseError) {
        console.error('Erro ao parsear JSON:', parseError.message);

        // Tentar limpar e parsear novamente
        jsonStr = jsonStr.replace(/\n/g, ' ').replace(/\r/g, '').replace(/\s+/g, ' ');

        try {
          const parsed = JSON.parse(jsonStr);

          if (!parsed.titulo || !parsed.descricao || !parsed.conteudo) {
            throw new Error('JSON não contém todos os campos necessários');
          }

          // Buscar imagens
          const palavrasChave = this.extrairPalavrasChave(parsed.titulo);
          const imagensSugeridas = await this.buscarImagensGoogle(palavrasChave);

          return {
            titulo: parsed.titulo,
            descricao: parsed.descricao,
            conteudo: parsed.conteudo,
            imagensSugeridas: imagensSugeridas
          };

        } catch (secondError) {
          console.error('Segunda tentativa de parse falhou:', secondError.message);
          throw new Error('Não foi possível processar a resposta da IA');
        }
      }

    } catch (error) {
      console.error('❌ Erro ao gerar matéria estilo G1:', error);
      throw error;
    }
  }

  /**
   * Gera matéria no estilo G1 COM informações da internet para enriquecer
   * Usado pelo processamento em lote quando pesquisarInternet está ativo
   */
  static async gerarMateriaEstiloG1ComPesquisa(conteudoOriginal, categoria = 'Notícias', linkReferencia = null, informacoesInternet = '') {
    console.log('📝 Gerando matéria no estilo G1 com pesquisa na internet...');
    console.log('🌐 Informações da internet:', informacoesInternet ? 'SIM' : 'NÃO');

    if (!conteudoOriginal || conteudoOriginal.trim().length < 50) {
      throw new Error('Conteúdo muito curto para gerar matéria (mínimo 50 caracteres)');
    }

    // Extrair texto limpo se vier com HTML
    const textoLimpo = conteudoOriginal
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Verificar se tem informações da internet
    const temInfoInternet = informacoesInternet && informacoesInternet.length > 50;

    const messages = [
      {
        role: 'system',
        content: 'Você é um jornalista experiente do portal Metrópoles. Seu estilo de escrita é direto, informativo, objetivo e levemente formal, mas acessível. Você prioriza a clareza e a precisão dos fatos.'
      },
      {
        role: 'user',
        content: `⚠️ TAREFA CRÍTICA: Crie uma matéria jornalística no estilo do portal Metrópoles baseada ${temInfoInternet ? 'no conteúdo fornecido, ENRIQUECIDA com as informações complementares da internet' : 'EXCLUSIVAMENTE no conteúdo abaixo'}.

🚨 REGRA ABSOLUTA - NÃO INVENTE NADA:
- ❌ NÃO invente números, datas, horários ou locais que NÃO foram mencionados
- ❌ NÃO adicione eventos, pessoas ou declarações que NÃO foram citados
- ❌ NÃO especule quantidades ("500 pessoas", "milhares de fiéis", "centenas de comentários")
- ❌ NÃO invente nomes de igrejas, cidades, bairros ou lugares
- ❌ NÃO adicione citações ou falas que NÃO existem no texto original
- ❌ NÃO invente contexto histórico ou background que NÃO foi mencionado
- ❌ JAMAIS escreva: "O conteúdo foi publicado em...", "O post obteve X curtidas", "O perfil @tal publicou..."
- ❌ JAMAIS use meta-linguagem: "Segundo o texto fornecido...", "Baseado nas informações..."
- ⚠️ SE O TEXTO É VAGO (ex: "Descanse em paz"), NÃO invente detalhes - faça uma matéria curta e genérica

✅ O QUE VOCÊ DEVE FAZER (ESTILO METRÓPOLES):
1. ✅ Use as informações que estão no texto original como BASE PRINCIPAL
2. ✅ ${temInfoInternet ? 'Use as informações da internet para ENRIQUECER com contexto (quem é a pessoa, histórico, etc)' : 'Use APENAS as informações do texto original'}
3. ✅ Reorganize essas informações em estrutura jornalística profissional
4. ✅ Melhore a fluidez e conectivos entre as frases
5. ✅ Use sinônimos mantendo o sentido exato
6. ✅ Torne o texto informativo e direto
7. ✅ Se houver citações no original, mantenha-as exatamente como estão
8. ✅ Se NÃO houver citações, NÃO invente nenhuma

📏 TAMANHO DO CONTEÚDO:
- ${temInfoInternet ? 'A matéria pode ser mais completa usando as informações da internet' : 'Escreva APENAS com base no que foi fornecido'}
- Se o texto original é curto, a matéria será curta (200-300 palavras está OK)
- Se o texto original é longo, a matéria será mais longa
- NÃO force expansão artificial do conteúdo

ESTRUTURA OBRIGATÓRIA:

1. TÍTULO (máximo 80 caracteres):
   - Impactante, jornalístico e direto (estilo Metrópoles)
   - Baseado APENAS no fato principal mencionado
   - Sem sensacionalismo exagerado, foco na notícia

2. DESCRIÇÃO/RESUMO (máximo 160 caracteres):
   - Breve introdução reforçando os principais fatos DO TEXTO ORIGINAL
   - Linguagem simples e direta, resumindo o lide

3. CONTEÚDO HTML:
   a) LIDE (1-2 parágrafos): Fato principal de forma DIRETA
   b) DESENVOLVIMENTO (1-3 parágrafos conforme o conteúdo disponível)
   c) CITAÇÕES (SE HOUVER no texto original) - Use <blockquote>
   d) CONCLUSÃO (1 parágrafo)

FORMATAÇÃO HTML:
- Use <p>texto aqui</p> para CADA parágrafo
- Use <h3>Subtítulo</h3> APENAS se necessário
- Use <blockquote>citação</blockquote> APENAS para citações que JÁ EXISTEM
- Formato: <p>texto1</p><p>texto2</p><h3>título</h3><p>texto3</p>

CONTEÚDO ORIGINAL (BASE PRINCIPAL):
${textoLimpo}
${temInfoInternet ? `

🌐 INFORMAÇÕES COMPLEMENTARES DA INTERNET (use para enriquecer a matéria com contexto):
${informacoesInternet}` : ''}

CATEGORIA: ${categoria}

⚠️ LEMBRE-SE: ${temInfoInternet ? 'Use as informações da internet para ENRIQUECER a matéria com contexto, mas mantenha o foco no conteúdo original!' : 'É MELHOR uma matéria curta e fiel ao original do que uma matéria longa com informações inventadas!'}

IMPORTANTE: O conteúdo HTML deve estar em UMA ÚNICA LINHA (sem quebras de linha reais, apenas tags HTML).

Retorne APENAS um objeto JSON válido:
{"titulo": "título da matéria", "descricao": "descrição curta", "conteudo": "HTML completo em uma linha"}`
      }
    ];

    try {
      console.log('📄 Conteúdo do post (primeiros 200 chars):', textoLimpo.substring(0, 200));
      console.log('📏 Tamanho total do conteúdo:', textoLimpo.length, 'caracteres');

      const response = await this.makeRequest(messages, 0.2, 3000);

      if (!response || response.trim().length === 0) {
        throw new Error('IA retornou resposta vazia');
      }

      let cleanResponse = response.trim();
      cleanResponse = cleanResponse.replace(/^```json\s*/i, '').replace(/\s*```$/, '');

      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Resposta da IA não contém JSON válido');
      }

      let jsonStr = jsonMatch[0];

      try {
        const parsed = JSON.parse(jsonStr);

        if (!parsed.titulo || !parsed.descricao || !parsed.conteudo) {
          throw new Error('JSON não contém todos os campos necessários');
        }

        // Limpar tags vazias
        let conteudoLimpo = parsed.conteudo.trim()
          .replace(/>\s+</g, '><')
          .replace(/<p>\s*<\/p>/gi, '')
          .replace(/<p><\/p>/gi, '')
          .replace(/<\/p><p>/gi, '</p><br><p>')
          .replace(/<\/h3><p>/gi, '</h3><br><p>');

        // Adicionar embed do Instagram
        if (linkReferencia && linkReferencia.includes('instagram.com')) {
          const jaTemEmbed = conteudoLimpo.includes('instagram-media');
          if (!jaTemEmbed) {
            console.log('📱 Adicionando embed do Instagram:', linkReferencia);
            const embedCode = `<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="${linkReferencia}" data-instgrm-version="14" style="margin: 30px auto; max-width: 540px;"></blockquote>`;
            conteudoLimpo += embedCode;
          }
        }

        // Buscar imagens
        const palavrasChave = this.extrairPalavrasChave(parsed.titulo);
        console.log('🔍 Título:', parsed.titulo);
        console.log('🔑 Palavras-chave:', palavrasChave);
        const imagensSugeridas = await this.buscarImagensGoogle(palavrasChave);

        console.log('✅ Matéria gerada com sucesso (com pesquisa na internet)');

        return {
          titulo: parsed.titulo,
          descricao: parsed.descricao,
          conteudo: conteudoLimpo,
          imagensSugeridas: imagensSugeridas
        };

      } catch (parseError) {
        console.error('Erro ao parsear JSON:', parseError.message);
        throw new Error('Não foi possível processar a resposta da IA');
      }

    } catch (error) {
      console.error('❌ Erro ao gerar matéria com pesquisa:', error);
      throw error;
    }
  }

  /**
   * Reescrever matéria no estilo jornalístico G1
   */
  static async reescreverMateriaG1(conteudoHTML) {
    console.log('📝 Reescrevendo matéria no estilo G1...');

    // 🔹 PRESERVAR EMBEDS DO INSTAGRAM
    const embedsInstagram = [];
    let conteudoSemEmbeds = conteudoHTML;
    
    // Regex para capturar blockquote do Instagram
    const embedRegex = /<blockquote[^>]*class="instagram-media"[^>]*>[\s\S]*?<\/blockquote>(?:\s*<script[^>]*src="[^"]*instagram\.com[^"]*"[^>]*><\/script>)?/gi;
    
    // Extrair e guardar todos os embeds
    let match;
    while ((match = embedRegex.exec(conteudoHTML)) !== null) {
      embedsInstagram.push(match[0]);
      console.log(`📱 Embed do Instagram #${embedsInstagram.length} encontrado e preservado`);
    }
    
    // Remover embeds temporariamente do conteúdo
    conteudoSemEmbeds = conteudoHTML.replace(embedRegex, '');
    console.log(`✅ ${embedsInstagram.length} embed(s) do Instagram preservado(s)`);

    // Extrair texto do HTML (agora sem os embeds)
    const textoLimpo = conteudoSemEmbeds
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!textoLimpo || textoLimpo.length < 50) {
      throw new Error('Conteúdo muito curto para reescrever');
    }

    const messages = [
      {
        role: 'system',
        content: 'Você é um jornalista experiente do portal Metrópoles. Seu estilo de escrita é direto, informativo, objetivo e levemente formal, mas acessível. Você prioriza a clareza e a precisão dos fatos.'
      },
      {
        role: 'user',
        content: `⚠️ TAREFA: Reescreva a matéria abaixo no estilo jornalístico do portal Metrópoles, mantendo TODOS os fatos e contexto da matéria original.

🎯 REGRA PRINCIPAL - MANTENHA O CONTEXTO:
- ✅ Mantenha TODOS os nomes, lugares, datas e fatos mencionados no texto original
- ✅ NÃO saia do assunto principal da matéria
- ✅ Se a matéria fala sobre um falecimento, mantenha o foco nisso
- ✅ Se menciona uma igreja/organização específica, mantenha o nome exato
- ✅ Se cita pessoas, mantenha os nomes e cargos exatos

🚫 NUNCA INVENTE FATOS NOVOS:
1. ❌ NÃO invente números, datas, horários ou locais que não foram mencionados
2. ❌ NÃO adicione eventos que não foram citados (velório, sepultamento, etc)
3. ❌ NÃO especule quantidades ("500 pessoas", "milhares de fiéis")
4. ❌ NÃO invente declarações de pessoas não mencionadas
5. ❌ NÃO mude nomes de pessoas ou organizações

✅ PODE FAZER (ESTILO METRÓPOLES):
1. ✅ Reorganizar as informações em melhor estrutura jornalística profissional
2. ✅ Adicionar contexto genérico sobre o tema (sem inventar fatos)
3. ✅ Usar sinônimos e variar a linguagem mantendo o sentido
4. ✅ Melhorar conectivos e fluidez do texto
5. ✅ Tornar o texto informativo e direto

ESTRUTURA OBRIGATÓRIA:
1. **Lide** (1-2 parágrafos): Fato principal de forma DIRETA e informativa
   - Exemplo: "A pastora Ivaneide faleceu nesta terça-feira (20/11), deixando fiéis comovidos."
   - Foco no quê, quem, quando e onde.
   
2. **Desenvolvimento** (2-3 parágrafos): Detalhes e contexto
   - Use <h3> para subtítulos quando apropriado
   - Mantenha parágrafos de tamanho médio (3-5 linhas)
   
3. **Conclusão** (1 parágrafo): Encerramento informativo
   - Informações sobre desdobramentos ou contexto final

FORMATAÇÃO HTML - MUITO IMPORTANTE:
- Use <p>texto aqui</p> para CADA parágrafo
- NÃO adicione <p></p> vazios entre parágrafos
- NÃO adicione <br> entre parágrafos
- NÃO adicione espaços ou quebras de linha entre as tags
- Use <h3>Subtítulo</h3> para subtítulos
- Use <blockquote>citação</blockquote> para citações diretas
- Use <strong> apenas para nomes importantes
- Formato: <p>texto1</p><p>texto2</p><h3>título</h3><p>texto3</p>

LINGUAGEM (ESTILO METRÓPOLES):
- ✅ "Morre a pastora Ivaneide, da Obra Restauração Saquassú"
- ✅ "O falecimento foi confirmado pela igreja onde ela atuava"
- ✅ "Ela era conhecida pelo trabalho comunitário na região"
- ✅ Tom informativo, sério e direto
- ✅ Parágrafos bem estruturados
- ❌ Evite: "está de luto", "manifestaram apoio" (clichês excessivos)
- ❌ Evite: jargões técnicos ou linguagem rebuscada

TEXTO ORIGINAL:
${textoLimpo}

EXEMPLO DE FORMATAÇÃO CORRETA (SEM ESPAÇOS ENTRE TAGS):
<p>A pastora Ivaneide, da Obra Restauração Saquassú, faleceu deixando a comunidade gospel comovida. Reconhecida por sua dedicação, ela construiu um legado de fé que marcou a vida de diversos fiéis na região.</p><p>Sua trajetória foi pautada pelo compromisso com o evangelho e pelo auxílio ao próximo. O ministério liderado pela pastora se destacou pelas ações de compaixão e pelo exemplo de vida cristã.</p><h3>Homenagens</h3><p>Em nota, o pastor Nilson Luiz e a equipe da Obra Restauração Saquassú lamentaram a perda. "Sua missão na terra foi cumprida com excelência", afirmaram.</p><p>Nas redes sociais, fiéis e admiradores compartilharam mensagens de pesar e recordaram o impacto do trabalho realizado pela religiosa.</p>

RETORNE APENAS O HTML (sem título ou descrição):`
      }
    ];

    try {
      // Temperatura baixa (0.4) para ser mais fiel ao original e evitar invenções
      const response = await this.makeRequest(messages, 0.4, 2500);

      if (!response || response.trim().length === 0) {
        throw new Error('IA retornou resposta vazia');
      }

      // Limpar tags vazias e adicionar espaçamento moderado
      let conteudoLimpo = response.trim()
        // Remover quebras de linha e espaços dentro das tags
        .replace(/>\s+</g, '><')
        // Remover <p> vazios (com ou sem espaços/quebras)
        .replace(/<p>\s*<\/p>/gi, '')
        .replace(/<p>[\s\n\r]*<\/p>/gi, '')
        .replace(/<p><\/p>/gi, '')
        // Limpar padrões específicos problemáticos: </p><p></p><p>
        .replace(/<\/p><p><\/p><p>/gi, '</p><p>')
        .replace(/<\/p><p>\s*<\/p><p>/gi, '</p><p>')
        // Remover múltiplos <br> seguidos
        .replace(/(<br\s*\/?>){2,}/gi, '<br>')
        // Remover espaços antes de tags de fechamento
        .replace(/\s+<\//g, '</')
        // ADICIONAR um <br> entre parágrafos para espaçamento moderado
        .replace(/<\/p><p>/gi, '</p><br><p>')
        .replace(/<\/h3><p>/gi, '</h3><br><p>')
        .replace(/<\/blockquote><p>/gi, '</blockquote><br><p>');

      // 🔹 REINSERIR EMBEDS DO INSTAGRAM NO FINAL
      if (embedsInstagram.length > 0) {
        console.log(`📱 Reinserindo ${embedsInstagram.length} embed(s) do Instagram no final do conteúdo`);
        embedsInstagram.forEach((embed, index) => {
          conteudoLimpo += `<br><br>${embed}`;
          console.log(`✅ Embed #${index + 1} reinserido`);
        });
      }

      console.log('✅ Matéria reescrita com sucesso no estilo G1');
      return conteudoLimpo;
    } catch (error) {
      console.error('❌ Erro ao reescrever matéria:', error);
      throw error;
    }
  }

  /**
   * Acrescentar ou modificar informações no título e conteúdo
   */
  static async acrescentarInformacao(titulo, conteudoHTML, instrucao) {
    console.log('🔧 Acrescentando informação com IA...');
    console.log('Instrução:', instrucao);

    if (!await this.isActive()) {
      throw new Error('O assistente de IA está desativado');
    }

    // Extrair texto do HTML
    const textoConteudo = conteudoHTML ? conteudoHTML
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() : '';

    const messages = [
      {
        role: 'system',
        content: 'Você é um assistente de redação jornalística especializado em modificar e aprimorar matérias de acordo com instruções específicas. Você mantém o estilo profissional do portal Metrópoles.'
      },
      {
        role: 'user',
        content: `⚠️ TAREFA: Modifique o título e/ou conteúdo da matéria de acordo com a instrução fornecida.

TÍTULO ATUAL:
${titulo || '(sem título)'}

CONTEÚDO ATUAL:
${textoConteudo || '(sem conteúdo)'}

INSTRUÇÃO DO USUÁRIO:
${instrucao}

🎯 REGRAS IMPORTANTES:
1. ✅ Siga EXATAMENTE a instrução do usuário
2. ✅ Se a instrução pede para modificar o título, retorne um novo título
3. ✅ Se a instrução pede para modificar o conteúdo, retorne o conteúdo modificado em HTML
4. ✅ Se a instrução pede para acrescentar informações, adicione ao conteúdo existente
5. ✅ Mantenha o estilo jornalístico profissional (estilo Metrópoles)
6. ✅ Se não houver instrução específica sobre título ou conteúdo, mantenha como está
7. ❌ NÃO invente fatos que não foram mencionados
8. ❌ NÃO remova informações importantes do conteúdo original

FORMATAÇÃO HTML DO CONTEÚDO:
- Use <p>texto aqui</p> para CADA parágrafo
- Use <h3>Subtítulo</h3> para subtítulos
- Use <blockquote>citação</blockquote> para citações
- Use <strong> para nomes importantes
- NÃO adicione <p></p> vazios
- NÃO adicione <br> entre parágrafos
- Formato: <p>texto1</p><p>texto2</p><h3>título</h3><p>texto3</p>

RETORNE APENAS UM OBJETO JSON VÁLIDO:
{
  "titulo": "novo título (ou título atual se não foi pedido para mudar)",
  "conteudo": "HTML do conteúdo modificado (ou conteúdo atual se não foi pedido para mudar)"
}`
      }
    ];

    try {
      const response = await this.makeRequest(messages, 0.5, 2000);

      if (!response || response.trim().length === 0) {
        throw new Error('IA retornou resposta vazia');
      }

      // Limpar resposta e extrair JSON
      let cleanResponse = response.trim();
      cleanResponse = cleanResponse.replace(/^```json\s*/i, '').replace(/\s*```$/, '');

      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Resposta da IA não contém JSON válido');
      }

      const resultado = JSON.parse(jsonMatch[0]);

      // Limpar conteúdo HTML
      if (resultado.conteudo) {
        resultado.conteudo = resultado.conteudo.trim()
          .replace(/>\s+</g, '><')
          .replace(/<p>\s*<\/p>/gi, '')
          .replace(/<\/p><p>/gi, '</p><br><p>')
          .replace(/<\/h3><p>/gi, '</h3><br><p>');
      }

      console.log('✅ Informação acrescentada com sucesso');
      return resultado;
    } catch (error) {
      console.error('❌ Erro ao acrescentar informação:', error);
      throw error;
    }
  }

  /**
   * Baixa vídeo do Instagram temporariamente
   */
  static async baixarVideoInstagram(url) {
    try {
      console.log('📥 Baixando vídeo do Instagram:', url);
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const timestamp = Date.now();
      const videoPath = path.join(tempDir, `instagram_${timestamp}.mp4`);

      // Método 1: API Cobalt (Prioritário - Melhor para contornar bloqueios de IP)
      try {
        console.log('🔄 Tentando método 1: Cobalt API (Multi-instâncias)');

        // Lista de instâncias públicas do Cobalt
        const cobaltInstances = [
          'https://api.cobalt.tools/api/json',
          'https://cobalt.api.wuk.sh/api/json',
          'https://api.server.cobalt.tools/api/json',
          'https://co.wuk.sh/api/json',
          'https://cobalt.tools/api/json'
        ];

        for (const endpoint of cobaltInstances) {
          try {
            console.log(`   Tentando instância: ${endpoint}`);
            const cobaltResponse = await axios.post(endpoint, {
              url: url,
              vCodec: 'h264',
              vQuality: '720',
              aFormat: 'mp3',
              filenamePattern: 'basic'
            }, {
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Origin': 'https://cobalt.tools',
                'Referer': 'https://cobalt.tools/'
              },
              timeout: 20000 // Aumentado para 20s
            });

            if (cobaltResponse.data && cobaltResponse.data.url) {
              console.log('✅ URL do vídeo obtida via Cobalt:', cobaltResponse.data.url);
              const videoUrl = cobaltResponse.data.url;

              const videoResponse = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                timeout: 60000,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
              });

              fs.writeFileSync(videoPath, videoResponse.data);
              console.log('✅ Vídeo salvo via Cobalt:', videoPath);
              return videoPath;
            } else if (cobaltResponse.data && cobaltResponse.data.status === 'error') {
              console.log(`   Erro na instância ${endpoint}:`, cobaltResponse.data.text || 'Erro desconhecido');
            }
          } catch (innerErr) {
            console.log(`   Falha na instância ${endpoint}:`, innerErr.message);
          }
        }
        console.log('⚠️ Todas as instâncias Cobalt falharam.');
      } catch (e) {
        console.log('❌ Método 1 (Cobalt) falhou:', e.message);
      }

      // Método 2: instagram-url-direct (Biblioteca)
      try {
        console.log('🔄 Tentando método 2: instagram-url-direct');
        let instagramLib;
        try {
          instagramLib = require("instagram-url-direct");
        } catch (e) {
          console.log('⚠️ Biblioteca instagram-url-direct não encontrada');
        }

        if (instagramLib && instagramLib.instagramGetUrl) {
          const links = await instagramLib.instagramGetUrl(url);

          if (links.url_list && links.url_list.length > 0) {
            const videoUrl = links.url_list[0];
            console.log('✅ URL do vídeo encontrada via instagram-url-direct');

            const videoResponse = await axios.get(videoUrl, {
              responseType: 'arraybuffer',
              timeout: 60000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });

            fs.writeFileSync(videoPath, videoResponse.data);
            console.log('✅ Vídeo salvo com sucesso:', videoPath);
            return videoPath;
          }
        }
      } catch (e) {
        console.log('❌ Método 2 (instagram-url-direct) falhou:', e.message);
      }

      // Método 3: Insta-fetcher (Fallback antigo)
      try {
        console.log('🔄 Tentando método 3: insta-fetcher');
        const ig = new igApi();
        const postData = await ig.fetchPost(url);

        let videoUrl = null;
        if (postData.links) {
          for (const link of postData.links) {
            if (link.type === 'video' || link.url.includes('.mp4')) {
              videoUrl = link.url;
              break;
            }
          }
        }

        if (videoUrl) {
          const videoResponse = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            timeout: 60000
          });
          fs.writeFileSync(videoPath, videoResponse.data);
          console.log('✅ Vídeo salvo via insta-fetcher:', videoPath);
          return videoPath;
        }
      } catch (e) {
        console.log('❌ Método 3 (insta-fetcher) falhou:', e.message);
      }

      // Método 4: yt-dlp (Último recurso - mais robusto)
      try {
        console.log('🔄 Tentando método 4: yt-dlp');
        const videoUrl = await this.obterUrlVideoComYtDlp(url);

        if (videoUrl) {
          console.log('✅ URL do vídeo obtida via yt-dlp');
          const videoResponse = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          fs.writeFileSync(videoPath, videoResponse.data);
          console.log('✅ Vídeo salvo via yt-dlp:', videoPath);
          return videoPath;
        }
      } catch (e) {
        console.log('❌ Método 4 (yt-dlp) falhou:', e.message);
      }

      throw new Error('Não foi possível baixar o vídeo por nenhum método.');
    } catch (error) {
      console.error('❌ Erro fatal ao baixar vídeo:', error.message);
      throw new Error('Não foi possível baixar o vídeo do Instagram. Por favor, cole o texto manualmente.');
    }
  }

  /**
   * Baixa e configura yt-dlp se necessário
   */
  static async garantirYtDlp() {
    const binDir = path.join(__dirname, '../bin');
    const ytDlpPath = path.join(binDir, 'yt-dlp');

    // Se já existe, retorna o caminho
    if (fs.existsSync(ytDlpPath)) {
      return ytDlpPath;
    }

    console.log('📦 Baixando yt-dlp...');

    // Criar diretório bin se não existir
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }

    // Baixar yt-dlp (versão Linux)
    const ytDlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
    const response = await axios.get(ytDlpUrl, {
      responseType: 'arraybuffer',
      timeout: 60000
    });

    fs.writeFileSync(ytDlpPath, response.data);

    // Dar permissão de execução (Linux/Mac)
    if (process.platform !== 'win32') {
      const { execSync } = require('child_process');
      execSync(`chmod +x ${ytDlpPath}`);
    }

    console.log('✅ yt-dlp instalado com sucesso');
    return ytDlpPath;
  }

  /**
   * Obtém URL do vídeo usando yt-dlp
   */
  static async obterUrlVideoComYtDlp(instagramUrl) {
    try {
      const { execSync } = require('child_process');
      const ytDlpPath = await this.garantirYtDlp();

      // Verificar se existe arquivo de cookies manual
      const cookiesPath = path.join(__dirname, '../instagram-cookies.txt');
      const hasCookiesFile = fs.existsSync(cookiesPath);

      // Tentar diferentes estratégias
      const strategies = [];

      // Estratégia 0: Com arquivo de cookies manual (se existir) - PRIORIDADE MÁXIMA
      if (hasCookiesFile) {
        strategies.push(`${ytDlpPath} -g --no-warnings --cookies "${cookiesPath}" "${instagramUrl}"`);
        console.log('✅ Arquivo de cookies encontrado, será usado como prioridade');
      }

      // Estratégia 1: Sem autenticação (funciona para posts públicos se não houver rate limit)
      strategies.push(`${ytDlpPath} -g --no-warnings "${instagramUrl}"`);

      // Estratégia 2: Com cookies do Firefox (se disponível no servidor)
      strategies.push(`${ytDlpPath} -g --no-warnings --cookies-from-browser firefox "${instagramUrl}"`);

      // Estratégia 3: Com cookies do Chrome (se disponível no servidor)
      strategies.push(`${ytDlpPath} -g --no-warnings --cookies-from-browser chrome "${instagramUrl}"`);

      // Estratégia 4: Com User-Agent específico
      strategies.push(`${ytDlpPath} -g --no-warnings --user-agent "Instagram 123.0.0.21.114 Android" "${instagramUrl}"`);

      // Estratégia 5: Ignorar erros e tentar extrair URL mesmo assim
      strategies.push(`${ytDlpPath} -g --no-warnings --ignore-errors "${instagramUrl}"`);

      for (let i = 0; i < strategies.length; i++) {
        try {
          console.log(`🔧 Tentando estratégia ${i + 1}/${strategies.length} do yt-dlp`);

          const output = execSync(strategies[i], {
            encoding: 'utf8',
            timeout: 30000,
            maxBuffer: 10 * 1024 * 1024 // 10MB
          });

          const videoUrl = output.trim().split('\n')[0]; // Primeira linha é a URL do vídeo

          if (videoUrl && videoUrl.startsWith('http')) {
            console.log('✅ URL do vídeo obtida via yt-dlp');
            return videoUrl;
          }
        } catch (strategyError) {
          console.log(`⚠️ Estratégia ${i + 1} falhou`);

          // Se é rate limit, logar mensagem específica
          if (strategyError.message.includes('rate-limit') || strategyError.message.includes('login required')) {
            console.log('⚠️ Instagram bloqueou acesso (rate-limit ou login necessário)');
            console.log('💡 Dica: Para resolver, seria necessário configurar cookies do Instagram no yt-dlp');
          }
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Erro ao executar yt-dlp:', error.message);
      return null;
    }
  }

  /**
   * Extrai áudio do vídeo usando ffmpeg
   */
  static async extrairAudioDoVideo(videoPath) {
    return new Promise((resolve, reject) => {
      const audioPath = videoPath.replace('.mp4', '.mp3');
      console.log('🔊 Extraindo áudio para:', audioPath);

      ffmpeg(videoPath)
        .toFormat('mp3')
        .on('end', () => {
          console.log('✅ Áudio extraído com sucesso');
          resolve(audioPath);
        })
        .on('error', (err) => {
          console.error('❌ Erro ao extrair áudio:', err.message);
          reject(err);
        })
        .save(audioPath);
    });
  }

  /**
   * Transcreve áudio usando Groq (Whisper V3) - Mais rápido e barato/grátis
   */
  static async transcreverAudio(audioPath) {
    try {
      console.log('🗣️ Transcrevendo áudio com Whisper (via Groq)...');

      const formData = new FormData();
      formData.append('file', fs.createReadStream(audioPath));
      formData.append('model', 'whisper-large-v3'); // Modelo superior da Groq
      formData.append('language', 'pt');
      formData.append('response_format', 'json');

      // Usar chave da Groq fornecida especificamente para áudio
      // Isso evita conflito com a chave do Together usada para texto
      const apiKey = process.env.GROQ_API_KEY;

      if (!apiKey) {
        throw new Error('GROQ_API_KEY não configurada no arquivo .env');
      }

      // Usar endpoint da Groq que é compatível com OpenAI e muito rápido
      const apiUrl = 'https://api.groq.com/openai/v1/audio/transcriptions';

      const response = await axios.post(apiUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 120000 // 2 minutos timeout
      });

      if (response.data && response.data.text) {
        console.log('✅ Transcrição concluída:', response.data.text.substring(0, 50) + '...');
        return response.data.text;
      } else {
        throw new Error('Resposta da API sem texto');
      }
    } catch (error) {
      console.error('❌ Erro na transcrição:', error.response?.data || error.message);

      // Fallback para OpenAI se a Groq falhar (caso a chave seja da OpenAI)
      if (error.response?.status === 401) {
        try {
          console.log('⚠️ Falha na Groq (401), tentando endpoint OpenAI...');
          const apiKey = await SystemConfig.getConfig('ia_api_key');
          const formData = new FormData();
          formData.append('file', fs.createReadStream(audioPath));
          formData.append('model', 'whisper-1');
          formData.append('language', 'pt');

          const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
            headers: {
              ...formData.getHeaders(),
              'Authorization': `Bearer ${apiKey}`
            },
            timeout: 120000
          });
          return response.data.text;
        } catch (e2) {
          throw error; // Lança o erro original se o fallback falhar
        }
      }

      throw error;
    }
  }

  /**
   * Limpa arquivos temporários
   */
  static async limparArquivosTemporarios(videoPath, audioPath) {
    try {
      if (videoPath && fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
      if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
      console.log('🧹 Arquivos temporários limpos');
    } catch (e) {
      console.error('Erro ao limpar arquivos:', e.message);
    }
  }

  /**
   * Processo completo de vídeo: Baixar -> Extrair Áudio -> Transcrever
   */
  static async processarVideoInstagram(url) {
    let videoPath = null;
    let audioPath = null;

    try {
      // 1. Baixar vídeo
      videoPath = await this.baixarVideoInstagram(url);

      // 2. Extrair áudio
      audioPath = await this.extrairAudioDoVideo(videoPath);

      // 3. Transcrever
      const transcricao = await this.transcreverAudio(audioPath);

      // 4. Limpar arquivos temporários
      this.limparArquivosTemporarios(videoPath, audioPath);

      console.log('✅ Processamento de vídeo concluído com sucesso');
      return transcricao;
    } catch (error) {
      // Limpar arquivos em caso de erro
      this.limparArquivosTemporarios(videoPath, audioPath);

      console.error('❌ Erro ao processar vídeo:', error.message);
      throw error;
    }
  }
}

module.exports = AIService;
